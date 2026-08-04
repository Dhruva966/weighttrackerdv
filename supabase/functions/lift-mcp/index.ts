import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js';
import { Hono } from 'npm:hono@4.9.7';
import { z } from 'npm:zod@4.1.13';

/** Keep in sync with src/lib/user.ts */
const USER_ID = 'de3c1f99-a64b-46c4-9f46-6afcc6d17f70';

/** Keep in sync with src/lib/lift-mcp-format.ts */
function slugifyExerciseQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function estimateOneRepMaxLb(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) return 0;
  return Math.round(weightLb * (1 + reps / 30) * 10) / 10;
}

function setVolumeLb(weightLb: number | null | undefined, reps: number | null | undefined): number {
  const w = weightLb ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) return 0;
  return w * r;
}

function isLiftWorkingSet(row: {
  is_warmup?: boolean | null;
  weight_lb?: number | null;
  reps?: number | null;
}): boolean {
  if (row.is_warmup) return false;
  const w = row.weight_lb ?? 0;
  const r = row.reps ?? 0;
  return w > 0 && r > 0;
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

type RankedExercise = { id: string; slug: string; name: string; archived: boolean };

function rankExerciseMatches(query: string, exercises: RankedExercise[]): RankedExercise[] {
  const q = query.trim().toLowerCase();
  const slugQ = slugifyExerciseQuery(query);
  if (!q) return [];

  const scored = exercises.map((ex) => {
    const name = ex.name.toLowerCase();
    const slug = ex.slug.toLowerCase();
    let score = 0;
    if (slug === slugQ || slug === q) score = 100;
    else if (name === q) score = 90;
    else if (slug.startsWith(slugQ) || name.startsWith(q)) score = 70;
    else if (slug.includes(slugQ) || name.includes(q)) score = 50;
    if (ex.archived) score -= 5;
    return { ex, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name))
    .map((s) => s.ex);
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-api-key, x-auth-token, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
};

function jsonText(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorText(message: string): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function writesEnabled(): boolean {
  return Deno.env.get('LIFT_MCP_WRITES_ENABLED') === 'true';
}

function assertBearer(req: Request): Response | null {
  const expected = Deno.env.get('LIFT_MCP_TOKEN');
  if (!expected) {
    return new Response(JSON.stringify({ error: 'LIFT_MCP_TOKEN is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const alt =
    req.headers.get('x-api-key') ??
    req.headers.get('x-auth-token') ??
    '';

  const ok =
    header === `Bearer ${expected}` ||
    header === expected ||
    alt === expected ||
    alt === `Bearer ${expected}`;

  if (!ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
    });
  }

  return null;
}

function supabaseAdmin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  local_date: string | null;
  timezone: string | null;
};

type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_lb: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean | null;
  is_pr: boolean | null;
  created_at: string;
  level: number | null;
  speed: number | null;
  duration_sec: number | null;
  calories: number | null;
};

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  muscle_group: string;
  equipment: string;
  archived: boolean | null;
};

function summarizeSets(sets: SetRow[], exercisesById: Map<string, ExerciseRow>) {
  let setCount = 0;
  let prCount = 0;
  let volumeLb = 0;
  const muscles = new Set<string>();

  for (const s of sets) {
    setCount += 1;
    if (s.is_pr && !s.is_warmup) prCount += 1;
    if (isLiftWorkingSet(s)) volumeLb += setVolumeLb(s.weight_lb, s.reps);
    const ex = exercisesById.get(s.exercise_id);
    if (ex?.muscle_group) muscles.add(ex.muscle_group);
  }

  return {
    setCount,
    prCount,
    volumeLb: Math.round(volumeLb * 10) / 10,
    muscleGroups: [...muscles].sort(),
  };
}

function createMcpServer(db: SupabaseClient): McpServer {
  const server = new McpServer({
    name: 'lift-mcp',
    version: '0.1.0',
  });

  server.registerTool(
    'list_recent_sessions',
    {
      title: 'List recent gym sessions',
      description:
        'List recent Lift gym sessions for the owner (most recent first), with set count, PR count, volume, and muscle groups. Diary weight/walks are not included.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe('Max sessions (default 20)'),
        days: z.number().int().min(1).max(365).optional().describe('Only sessions in the last N days'),
      },
    },
    async ({ limit, days }) => {
      const lim = clampLimit(limit, 20, 100);
      let query = db
        .from('sessions')
        .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
        .eq('user_id', USER_ID)
        .order('started_at', { ascending: false })
        .limit(lim);

      if (days != null) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('started_at', since);
      }

      const { data: sessions, error } = await query;
      if (error) return errorText(`list_recent_sessions failed: ${error.message}`);

      const sessionRows = (sessions ?? []) as SessionRow[];
      if (sessionRows.length === 0) return jsonText({ sessions: [] });

      const ids = sessionRows.map((s) => s.id);
      const { data: sets, error: setsError } = await db
        .from('sets')
        .select(
          'id,session_id,exercise_id,set_number,weight_lb,reps,rpe,is_warmup,is_pr,created_at,level,speed,duration_sec,calories',
        )
        .in('session_id', ids);
      if (setsError) return errorText(`list_recent_sessions sets failed: ${setsError.message}`);

      const setRows = (sets ?? []) as SetRow[];
      const exerciseIds = [...new Set(setRows.map((s) => s.exercise_id))];
      const exercisesById = new Map<string, ExerciseRow>();
      if (exerciseIds.length > 0) {
        const { data: exercises, error: exError } = await db
          .from('exercises')
          .select('id,slug,name,muscle_group,equipment,archived')
          .in('id', exerciseIds);
        if (exError) return errorText(`list_recent_sessions exercises failed: ${exError.message}`);
        for (const ex of (exercises ?? []) as ExerciseRow[]) exercisesById.set(ex.id, ex);
      }

      const setsBySession = new Map<string, SetRow[]>();
      for (const s of setRows) {
        const list = setsBySession.get(s.session_id) ?? [];
        list.push(s);
        setsBySession.set(s.session_id, list);
      }

      return jsonText({
        sessions: sessionRows.map((session) => {
          const summary = summarizeSets(setsBySession.get(session.id) ?? [], exercisesById);
          return {
            id: session.id,
            userId: session.user_id,
            startedAt: session.started_at,
            endedAt: session.ended_at,
            localDate: session.local_date,
            timezone: session.timezone,
            notes: session.notes,
            ...summary,
          };
        }),
      });
    },
  );

  server.registerTool(
    'get_session_detail',
    {
      title: 'Get session detail',
      description: 'Fetch one gym session with exercises and sets (lift + cardio fields).',
      inputSchema: {
        sessionId: z.string().uuid().describe('Session UUID'),
      },
    },
    async ({ sessionId }) => {
      const { data: session, error } = await db
        .from('sessions')
        .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
        .eq('id', sessionId)
        .eq('user_id', USER_ID)
        .maybeSingle();
      if (error) return errorText(`get_session_detail failed: ${error.message}`);
      if (!session) return errorText(`Session not found: ${sessionId}`);

      const sessionRow = session as SessionRow;
      const { data: sets, error: setsError } = await db
        .from('sets')
        .select(
          'id,session_id,exercise_id,set_number,weight_lb,reps,rpe,is_warmup,is_pr,created_at,level,speed,duration_sec,calories',
        )
        .eq('session_id', sessionId)
        .order('set_number', { ascending: true });
      if (setsError) return errorText(`get_session_detail sets failed: ${setsError.message}`);

      const setRows = (sets ?? []) as SetRow[];
      const exerciseIds = [...new Set(setRows.map((s) => s.exercise_id))];
      const exercisesById = new Map<string, ExerciseRow>();
      if (exerciseIds.length > 0) {
        const { data: exercises, error: exError } = await db
          .from('exercises')
          .select('id,slug,name,muscle_group,equipment,archived')
          .in('id', exerciseIds);
        if (exError) return errorText(`get_session_detail exercises failed: ${exError.message}`);
        for (const ex of (exercises ?? []) as ExerciseRow[]) exercisesById.set(ex.id, ex);
      }

      const byExercise = new Map<string, SetRow[]>();
      for (const s of setRows) {
        const list = byExercise.get(s.exercise_id) ?? [];
        list.push(s);
        byExercise.set(s.exercise_id, list);
      }

      const summary = summarizeSets(setRows, exercisesById);

      return jsonText({
        session: {
          id: sessionRow.id,
          userId: sessionRow.user_id,
          startedAt: sessionRow.started_at,
          endedAt: sessionRow.ended_at,
          localDate: sessionRow.local_date,
          timezone: sessionRow.timezone,
          notes: sessionRow.notes,
        },
        summary,
        exercises: [...byExercise.entries()].map(([exerciseId, exerciseSets]) => {
          const ex = exercisesById.get(exerciseId);
          return {
            exerciseId,
            slug: ex?.slug ?? null,
            name: ex?.name ?? null,
            muscleGroup: ex?.muscle_group ?? null,
            sets: exerciseSets
              .slice()
              .sort((a, b) => a.set_number - b.set_number)
              .map((s) => {
                const lift = isLiftWorkingSet(s) || ((s.weight_lb ?? 0) > 0 && (s.reps ?? 0) > 0);
                const cardio =
                  s.level != null || s.speed != null || s.duration_sec != null || s.calories != null;
                return {
                  id: s.id,
                  setNumber: s.set_number,
                  weightLb: s.weight_lb,
                  reps: s.reps,
                  rpe: s.rpe,
                  isWarmup: Boolean(s.is_warmup),
                  isPr: Boolean(s.is_pr),
                  createdAt: s.created_at,
                  level: s.level,
                  speed: s.speed,
                  durationSec: s.duration_sec,
                  calories: s.calories,
                  kind: lift && !cardio ? 'lift' : cardio ? 'cardio' : lift ? 'lift' : 'unknown',
                };
              }),
          };
        }),
      });
    },
  );

  server.registerTool(
    'get_exercise_history',
    {
      title: 'Get exercise history',
      description:
        'Resolve an exercise by name or slug and return recent working sets plus estimated 1RM progress points.',
      inputSchema: {
        exerciseNameOrSlug: z.string().min(1).describe('Exercise name or slug'),
        limit: z.number().int().min(1).max(200).optional().describe('Max sets (default 50)'),
      },
    },
    async ({ exerciseNameOrSlug, limit }) => {
      const lim = clampLimit(limit, 50, 200);
      const { data: exercises, error } = await db
        .from('exercises')
        .select('id,slug,name,muscle_group,equipment,archived');
      if (error) return errorText(`get_exercise_history exercises failed: ${error.message}`);

      const ranked = rankExerciseMatches(exerciseNameOrSlug, (exercises ?? []) as RankedExercise[]);
      const match = ranked[0];
      if (!match) return errorText(`No exercise matched: ${exerciseNameOrSlug}`);

      const full = ((exercises ?? []) as ExerciseRow[]).find((e) => e.id === match.id)!;

      const { data: sets, error: setsError } = await db
        .from('sets')
        .select(
          'id,session_id,exercise_id,set_number,weight_lb,reps,rpe,is_warmup,is_pr,created_at,level,speed,duration_sec,calories',
        )
        .eq('exercise_id', match.id)
        .order('created_at', { ascending: false })
        .limit(lim * 3);
      if (setsError) return errorText(`get_exercise_history sets failed: ${setsError.message}`);

      const setRows = (sets ?? []) as SetRow[];
      const sessionIds = [...new Set(setRows.map((s) => s.session_id))];
      const sessionById = new Map<string, SessionRow>();
      if (sessionIds.length > 0) {
        const { data: sessions, error: sessError } = await db
          .from('sessions')
          .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
          .eq('user_id', USER_ID)
          .in('id', sessionIds);
        if (sessError) return errorText(`get_exercise_history sessions failed: ${sessError.message}`);
        for (const s of (sessions ?? []) as SessionRow[]) sessionById.set(s.id, s);
      }

      const owned = setRows.filter((s) => sessionById.has(s.session_id));
      const working = owned.filter((s) => isLiftWorkingSet(s)).slice(0, lim);

      let bestEstimatedOneRmLb = 0;
      const mapped = working.map((s) => {
        const w = s.weight_lb ?? 0;
        const r = s.reps ?? 0;
        const e1 = estimateOneRepMaxLb(w, r);
        if (e1 > bestEstimatedOneRmLb) bestEstimatedOneRmLb = e1;
        const session = sessionById.get(s.session_id)!;
        return {
          id: s.id,
          sessionId: s.session_id,
          sessionLocalDate: session.local_date ?? session.started_at.slice(0, 10),
          setNumber: s.set_number,
          weightLb: s.weight_lb,
          reps: s.reps,
          isWarmup: Boolean(s.is_warmup),
          isPr: Boolean(s.is_pr),
          createdAt: s.created_at,
          estimatedOneRmLb: e1,
        };
      });

      const progressPoints = mapped
        .slice()
        .reverse()
        .map((s) => ({
          date: s.sessionLocalDate,
          t: Date.parse(s.createdAt),
          weightLb: s.weightLb,
          reps: s.reps,
          oneRm: s.estimatedOneRmLb,
        }));

      return jsonText({
        exercise: {
          id: full.id,
          slug: full.slug,
          name: full.name,
          muscleGroup: full.muscle_group,
          equipment: full.equipment,
          archived: Boolean(full.archived),
        },
        stats: {
          loggedSetCount: working.length,
          bestEstimatedOneRmLb,
        },
        sets: mapped,
        progressPoints,
      });
    },
  );

  server.registerTool(
    'list_recent_prs',
    {
      title: 'List recent PRs',
      description: 'List recent personal-record lift sets (is_pr, non-warmup) for the owner.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe('Max PRs (default 20)'),
        days: z.number().int().min(1).max(730).optional().describe('Only PRs in the last N days'),
      },
    },
    async ({ limit, days }) => {
      const lim = clampLimit(limit, 20, 100);
      let query = db
        .from('sets')
        .select(
          'id,session_id,exercise_id,set_number,weight_lb,reps,rpe,is_warmup,is_pr,created_at,level,speed,duration_sec,calories',
        )
        .eq('is_pr', true)
        .eq('is_warmup', false)
        .order('created_at', { ascending: false })
        .limit(lim * 5);

      if (days != null) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('created_at', since);
      }

      const { data: sets, error } = await query;
      if (error) return errorText(`list_recent_prs failed: ${error.message}`);

      const setRows = ((sets ?? []) as SetRow[]).filter((s) => isLiftWorkingSet(s));
      const sessionIds = [...new Set(setRows.map((s) => s.session_id))];
      const sessionById = new Map<string, SessionRow>();
      if (sessionIds.length > 0) {
        const { data: sessions, error: sessError } = await db
          .from('sessions')
          .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
          .eq('user_id', USER_ID)
          .in('id', sessionIds);
        if (sessError) return errorText(`list_recent_prs sessions failed: ${sessError.message}`);
        for (const s of (sessions ?? []) as SessionRow[]) sessionById.set(s.id, s);
      }

      const owned = setRows.filter((s) => sessionById.has(s.session_id)).slice(0, lim);
      const exerciseIds = [...new Set(owned.map((s) => s.exercise_id))];
      const exercisesById = new Map<string, ExerciseRow>();
      if (exerciseIds.length > 0) {
        const { data: exercises, error: exError } = await db
          .from('exercises')
          .select('id,slug,name,muscle_group,equipment,archived')
          .in('id', exerciseIds);
        if (exError) return errorText(`list_recent_prs exercises failed: ${exError.message}`);
        for (const ex of (exercises ?? []) as ExerciseRow[]) exercisesById.set(ex.id, ex);
      }

      return jsonText({
        prs: owned.map((s) => {
          const session = sessionById.get(s.session_id)!;
          const ex = exercisesById.get(s.exercise_id);
          return {
            setId: s.id,
            sessionId: s.session_id,
            sessionLocalDate: session.local_date ?? session.started_at.slice(0, 10),
            exerciseId: s.exercise_id,
            exerciseSlug: ex?.slug ?? null,
            exerciseName: ex?.name ?? null,
            weightLb: s.weight_lb,
            reps: s.reps,
            isWarmup: false,
            createdAt: s.created_at,
          };
        }),
      });
    },
  );

  // Placeholder write surface — disabled unless LIFT_MCP_WRITES_ENABLED=true
  server.registerTool(
    'log_set_draft',
    {
      title: 'Log set draft (disabled in v1)',
      description:
        'Reserved for future write support. Returns an error unless LIFT_MCP_WRITES_ENABLED=true. Prefer logging in the Lift app for now.',
      inputSchema: {
        note: z.string().optional().describe('Ignored in v1'),
      },
    },
    async () => {
      if (!writesEnabled()) {
        return errorText(
          'Write tools are disabled (LIFT_MCP_WRITES_ENABLED!=true). Log sets in the Lift app. Ask about history with the read tools.',
        );
      }
      return errorText('Write tools are enabled but not implemented yet.');
    },
  );

  return server;
}

const mcpApp = new Hono();

mcpApp.options('/*', (c) => c.body(null, 204, corsHeaders));

mcpApp.get('/health', (c) =>
  c.json(
    {
      ok: true,
      name: 'lift-mcp',
      writesEnabled: writesEnabled(),
    },
    200,
    corsHeaders,
  ),
);

mcpApp.all('/*', async (c) => {
  const unauthorized = assertBearer(c.req.raw);
  if (unauthorized) return unauthorized;

  try {
    const db = supabaseAdmin();
    const server = createMcpServer(db);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(c.req.raw);
    // Ensure CORS on MCP responses for Inspector
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Supabase prefixes paths with the function name; local Deno serve uses `/`.
const app = new Hono();
app.route('/lift-mcp', mcpApp);
if (Deno.env.get('LIFT_MCP_LOCAL') === '1') {
  app.route('/', mcpApp);
}

if (Deno.env.get('LIFT_MCP_LOCAL') === '1') {
  const port = Number(Deno.env.get('PORT') ?? '8787');
  Deno.serve({ port }, app.fetch);
} else {
  Deno.serve(app.fetch);
}
