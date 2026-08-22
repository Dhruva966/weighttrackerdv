import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js';
import { Hono } from 'npm:hono@4.9.7';
import { z } from 'npm:zod@4.1.13';
import {
  corsHeaders as oauthCorsHeaders,
  isAuthorized,
  mountOauthRoutes,
  unauthorizedMcp,
} from './oauth.ts';
import {
  type ListRecentSessionsResponse,
  type GetSessionDetailResponse,
  type GetExerciseHistoryResponse,
  type ListRecentPrsResponse,
  type ResolveExerciseResponse,
  type ListRecentWeighInsResponse,
  type LogSetsResponse,
  type LogWeightResponse,
} from './schemas.ts';
import {
  errorResponse,
  dbError,
  validationError,
  notFoundError,
  writesDisabledError,
} from './errors.ts';

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
type ScoredExercise = RankedExercise & { score: number };

function scoreExerciseMatches(query: string, exercises: RankedExercise[]): ScoredExercise[] {
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
    return { ...ex, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function rankExerciseMatches(query: string, exercises: RankedExercise[]): RankedExercise[] {
  return scoreExerciseMatches(query, exercises).map(({ score: _s, ...ex }) => ex);
}

type ResolveStatus = 'exact' | 'ambiguous' | 'none';

function resolveExerciseStatus(
  scored: ScoredExercise[],
): { status: ResolveStatus; take: ScoredExercise[] } {
  if (scored.length === 0) return { status: 'none', take: [] };
  if (scored.length === 1) return { status: 'exact', take: scored };
  const top = scored[0]!;
  const second = scored[1]!;
  if (top.score >= 90 && top.score - second.score >= 20) {
    return { status: 'exact', take: [top] };
  }
  return { status: 'ambiguous', take: scored };
}

function todayKeyInTimeZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function normalizeBodyWeightLb(value: number): number | null {
  if (!Number.isFinite(value) || value < 50 || value > 500) return null;
  return Math.round(value * 100) / 100;
}

const DEFAULT_OWNER_TIMEZONE = 'America/Los_Angeles';
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;


const corsHeaders: Record<string, string> = oauthCorsHeaders();

/**
 * Format successful response with JSON data.
 * Response data should conform to the schema for the tool.
 */
function jsonResponse<T>(data: T): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function writesEnabled(): boolean {
  return Deno.env.get('LIFT_MCP_WRITES_ENABLED') === 'true';
}

/**
 * Check if writes are enabled and return error response if not.
 * Returns undefined if writes are enabled.
 */
function checkWritesEnabled(): ReturnType<typeof writesDisabledError> | undefined {
  if (!writesEnabled()) {
    return writesDisabledError();
  }
  return undefined;
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
        'List recent Lift gym sessions for the owner (most recent first), with set count, PR count, volume, and muscle groups. Empty 0-set sessions are hidden unless includeEmpty=true. Diary weight/walks are not included.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe('Max sessions (default 20)'),
        days: z.number().int().min(1).max(365).optional().describe('Only sessions in the last N days'),
        includeEmpty: z
          .boolean()
          .optional()
          .describe('Include 0-set sessions (default false — rest days have no session row)'),
      },
    },
    async ({ limit, days, includeEmpty }) => {
      const lim = clampLimit(limit, 20, 100);
      const fetchLim = includeEmpty === true ? lim : Math.min(100, lim * 5);
      let query = db
        .from('sessions')
        .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
        .eq('user_id', USER_ID)
        .order('started_at', { ascending: false })
        .limit(fetchLim);

      if (days != null) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('started_at', since);
      }

      const { data: sessions, error } = await query;
      if (error) return dbError('list_recent_sessions query', error);

      const sessionRows = (sessions ?? []) as SessionRow[];
      if (sessionRows.length === 0) {
        const response: ListRecentSessionsResponse = { sessions: [] };
        return jsonResponse(response);
      }

      const ids = sessionRows.map((s) => s.id);
      const { data: sets, error: setsError } = await db
        .from('sets')
        .select(
          'id,session_id,exercise_id,set_number,weight_lb,reps,rpe,is_warmup,is_pr,created_at,level,speed,duration_sec,calories',
        )
        .in('session_id', ids);
      if (setsError) return dbError('list_recent_sessions sets query', setsError);

      const setRows = (sets ?? []) as SetRow[];
      const exerciseIds = [...new Set(setRows.map((s) => s.exercise_id))];
      const exercisesById = new Map<string, ExerciseRow>();
      if (exerciseIds.length > 0) {
        const { data: exercises, error: exError } = await db
          .from('exercises')
          .select('id,slug,name,muscle_group,equipment,archived')
          .in('id', exerciseIds);
        if (exError) return dbError('list_recent_sessions exercises query', exError);
        for (const ex of (exercises ?? []) as ExerciseRow[]) exercisesById.set(ex.id, ex);
      }

      const setsBySession = new Map<string, SetRow[]>();
      for (const s of setRows) {
        const list = setsBySession.get(s.session_id) ?? [];
        list.push(s);
        setsBySession.set(s.session_id, list);
      }

      const response: ListRecentSessionsResponse = {
        sessions: sessionRows
          .map((session) => {
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
          })
          .filter((s) => includeEmpty === true || s.setCount > 0)
          .slice(0, lim),
      };
      return jsonResponse(response);
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
        matchNote:
          ranked.length > 1
            ? `Auto-picked best match; ${ranked.length} catalog hits for "${exerciseNameOrSlug}". Prefer resolve_exercise when unsure.`
            : undefined,
        lastWorkingSet: mapped[0]
          ? {
              date: mapped[0].sessionLocalDate,
              weightLb: mapped[0].weightLb,
              reps: mapped[0].reps,
              isPr: mapped[0].isPr,
              estimatedOneRmLb: mapped[0].estimatedOneRmLb,
            }
          : null,
        previousWorkingSets: mapped.slice(1, 4).map((s) => ({
          date: s.sessionLocalDate,
          weightLb: s.weightLb,
          reps: s.reps,
          estimatedOneRmLb: s.estimatedOneRmLb,
        })),
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

  server.registerTool(
    'resolve_exercise',
    {
      title: 'Resolve exercise name',
      description:
        'Search the Lift exercise catalog for a messy spoken/typed name. Returns status exact|ambiguous|none and a numbered candidates list (n=1..). When ambiguous, ask the user to pick a number before logging. Do not auto-pick when status is ambiguous.',
      inputSchema: {
        query: z.string().min(1).describe('Messy exercise name from the user'),
        limit: z.number().int().min(1).max(25).optional().describe('Max candidates (default 8)'),
      },
    },
    async ({ query, limit }) => {
      const lim = clampLimit(limit, 8, 25);
      const { data: exercises, error } = await db
        .from('exercises')
        .select('id,slug,name,muscle_group,equipment,archived');
      if (error) return errorText(`resolve_exercise failed: ${error.message}`);

      const rows = (exercises ?? []) as ExerciseRow[];
      const scored = scoreExerciseMatches(
        query,
        rows.map((e) => ({
          id: e.id,
          slug: e.slug,
          name: e.name,
          archived: Boolean(e.archived),
        })),
      );
      const { status, take } = resolveExerciseStatus(scored);
      const byId = new Map(rows.map((e) => [e.id, e]));
      const candidates = take.slice(0, lim).map((ex, i) => {
        const full = byId.get(ex.id);
        return {
          n: i + 1,
          id: ex.id,
          slug: ex.slug,
          name: ex.name,
          muscleGroup: full?.muscle_group ?? null,
          equipment: full?.equipment ?? null,
          archived: ex.archived,
          score: ex.score,
        };
      });

      return jsonText({
        query,
        status,
        candidates,
        hint:
          status === 'ambiguous'
            ? 'Present the numbered list to the user and wait for a pick (e.g. "1") before calling log_sets.'
            : status === 'none'
              ? 'No catalog match. Ask the user to rephrase or use a different name.'
              : 'Single clear match — confirm briefly if the dump had multiple similar names.',
      });
    },
  );

  server.registerTool(
    'list_recent_weigh_ins',
    {
      title: 'List recent body-weight logs',
      description: 'Owner body_weight_logs newest first (calendar days).',
      inputSchema: {
        limit: z.number().int().min(1).max(90).optional().describe('Max rows (default 14)'),
      },
    },
    async ({ limit }) => {
      const lim = clampLimit(limit, 14, 90);
      const { data, error } = await db
        .from('body_weight_logs')
        .select('id,logged_at,weight_lb')
        .eq('user_id', USER_ID)
        .order('logged_at', { ascending: false })
        .limit(lim);
      if (error) return errorText(`list_recent_weigh_ins failed: ${error.message}`);
      const logs = ((data ?? []) as Array<{ id: string; logged_at: string; weight_lb: number | string }>).map(
        (row) => ({
          id: row.id,
          loggedAt: String(row.logged_at).slice(0, 10),
          weightLb: Number(row.weight_lb),
        }),
      );
      return jsonText({
        count: logs.length,
        latest: logs[0] ?? null,
        logs,
      });
    },
  );

  server.registerTool(
    'log_sets',
    {
      title: 'Log lift sets for a calendar day',
      description:
        'Append lift sets to the owner session for a local calendar day. Creates that day\'s session only if missing (no daily empty sessions). Requires confirmed exerciseId values from resolve_exercise. Gated by LIFT_MCP_WRITES_ENABLED.',
      inputSchema: {
        localDate: z
          .string()
          .regex(DAY_KEY_RE)
          .optional()
          .describe('YYYY-MM-DD (default: today in timezone)'),
        timezone: z
          .string()
          .min(1)
          .optional()
          .describe(`IANA timezone (default ${DEFAULT_OWNER_TIMEZONE})`),
        sets: z
          .array(
            z.object({
              exerciseId: z.string().uuid().describe('Confirmed exercise UUID'),
              weightLb: z.number().positive().describe('Weight in pounds'),
              reps: z.number().int().positive().describe('Reps'),
              isWarmup: z.boolean().optional().describe('Warmup set (default false)'),
            }),
          )
          .min(1)
          .max(40)
          .describe('Sets to append (max 40 per call)'),
      },
    },
    async ({ localDate, timezone, sets }) => {
      const writesError = checkWritesEnabled();
      if (writesError) return writesError;

      const tz = timezone?.trim() || DEFAULT_OWNER_TIMEZONE;
      const day = localDate && DAY_KEY_RE.test(localDate) ? localDate : todayKeyInTimeZone(tz);

      const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
      const { data: exercises, error: exError } = await db
        .from('exercises')
        .select('id,slug,name,muscle_group,equipment,archived')
        .in('id', exerciseIds);
      if (exError) return errorText(`log_sets exercises failed: ${exError.message}`);
      const found = new Map(((exercises ?? []) as ExerciseRow[]).map((e) => [e.id, e]));
      const missing = exerciseIds.filter((id) => !found.has(id));
      if (missing.length > 0) {
        return errorText(`Unknown exerciseId(s): ${missing.join(', ')}. Call resolve_exercise first.`);
      }

      const { data: daySessions, error: sessError } = await db
        .from('sessions')
        .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
        .eq('user_id', USER_ID)
        .eq('local_date', day)
        .order('started_at', { ascending: true });
      if (sessError) return errorText(`log_sets sessions failed: ${sessError.message}`);

      const dayRows = (daySessions ?? []) as SessionRow[];
      let session: SessionRow | undefined;
      let createdSession = false;

      if (dayRows.length > 0) {
        const dayIds = dayRows.map((s) => s.id);
        const { data: daySetRows, error: daySetsError } = await db
          .from('sets')
          .select('session_id')
          .in('session_id', dayIds);
        if (daySetsError) return errorText(`log_sets day sets failed: ${daySetsError.message}`);
        const withSets = new Set(
          ((daySetRows ?? []) as { session_id: string }[]).map((r) => r.session_id),
        );
        session =
          dayRows.find((s) => !s.ended_at && withSets.has(s.id)) ??
          dayRows.find((s) => withSets.has(s.id)) ??
          dayRows.find((s) => !s.ended_at) ??
          dayRows[0];
      }

      if (!session) {
        const id = crypto.randomUUID();
        const startedAt = new Date().toISOString();
        const { data: inserted, error: insertSessError } = await db
          .from('sessions')
          .insert({
            id,
            user_id: USER_ID,
            started_at: startedAt,
            ended_at: null,
            notes: null,
            local_date: day,
            timezone: tz,
          })
          .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
          .single();
        if (insertSessError) return errorText(`log_sets create session failed: ${insertSessError.message}`);
        session = inserted as SessionRow;
        createdSession = true;
      } else if (session.ended_at) {
        const { data: reopened, error: reopenError } = await db
          .from('sessions')
          .update({ ended_at: null })
          .eq('id', session.id)
          .eq('user_id', USER_ID)
          .select('id,user_id,started_at,ended_at,notes,local_date,timezone')
          .single();
        if (reopenError) return errorText(`log_sets reopen session failed: ${reopenError.message}`);
        session = reopened as SessionRow;
      }

      const { data: existingSets, error: existingError } = await db
        .from('sets')
        .select('id,exercise_id,set_number')
        .eq('session_id', session.id);
      if (existingError) return errorText(`log_sets existing sets failed: ${existingError.message}`);

      const nextNumber = new Map<string, number>();
      for (const row of existingSets ?? []) {
        const exId = (row as { exercise_id: string; set_number: number }).exercise_id;
        const n = (row as { set_number: number }).set_number;
        nextNumber.set(exId, Math.max(nextNumber.get(exId) ?? 0, n));
      }

      const rowsToInsert = sets.map((s) => {
        const setNumber = (nextNumber.get(s.exerciseId) ?? 0) + 1;
        nextNumber.set(s.exerciseId, setNumber);
        return {
          id: crypto.randomUUID(),
          session_id: session!.id,
          exercise_id: s.exerciseId,
          set_number: setNumber,
          weight_lb: s.weightLb,
          reps: s.reps,
          rpe: null,
          is_warmup: Boolean(s.isWarmup),
          is_pr: false,
          level: null,
          speed: null,
          duration_sec: null,
          calories: null,
        };
      });

      const { data: insertedSets, error: insertSetsError } = await db
        .from('sets')
        .insert(rowsToInsert)
        .select(
          'id,session_id,exercise_id,set_number,weight_lb,reps,rpe,is_warmup,is_pr,created_at,level,speed,duration_sec,calories',
        );
      if (insertSetsError) return errorText(`log_sets insert failed: ${insertSetsError.message}`);

      const logged = ((insertedSets ?? []) as SetRow[]).map((s) => {
        const ex = found.get(s.exercise_id);
        return {
          id: s.id,
          exerciseId: s.exercise_id,
          exerciseName: ex?.name ?? null,
          exerciseSlug: ex?.slug ?? null,
          setNumber: s.set_number,
          weightLb: s.weight_lb,
          reps: s.reps,
          isWarmup: Boolean(s.is_warmup),
          isPr: Boolean(s.is_pr),
          createdAt: s.created_at,
        };
      });

      return jsonText({
        ok: true,
        createdSession,
        session: {
          id: session.id,
          localDate: session.local_date,
          timezone: session.timezone,
          startedAt: session.started_at,
          endedAt: session.ended_at,
        },
        loggedSetCount: logged.length,
        sets: logged,
      });
    },
  );

  server.registerTool(
    'log_weight',
    {
      title: 'Log body weight for a calendar day',
      description:
        'Upsert owner body_weight_logs for a local calendar day (one row per day). Gated by LIFT_MCP_WRITES_ENABLED. Weight in pounds.',
      inputSchema: {
        weightLb: z.number().describe('Body weight in pounds (50–500)'),
        localDate: z
          .string()
          .regex(DAY_KEY_RE)
          .optional()
          .describe('YYYY-MM-DD (default: today in timezone)'),
        timezone: z
          .string()
          .min(1)
          .optional()
          .describe(`IANA timezone (default ${DEFAULT_OWNER_TIMEZONE})`),
      },
    },
    async ({ weightLb, localDate, timezone }) => {
      const writesError = checkWritesEnabled();
      if (writesError) return writesError;

      const normalized = normalizeBodyWeightLb(weightLb);
      if (normalized == null) {
        return errorText('weightLb must be a finite number between 50 and 500 pounds.');
      }

      const tz = timezone?.trim() || DEFAULT_OWNER_TIMEZONE;
      const day = localDate && DAY_KEY_RE.test(localDate) ? localDate : todayKeyInTimeZone(tz);

      const { data: existing, error: existingError } = await db
        .from('body_weight_logs')
        .select('id,logged_at,weight_lb')
        .eq('user_id', USER_ID)
        .eq('logged_at', day)
        .maybeSingle();
      if (existingError) return errorText(`log_weight lookup failed: ${existingError.message}`);

      const previousLb =
        existing?.weight_lb == null ? null : Number((existing as { weight_lb: number | string }).weight_lb);
      const id = existing?.id ?? crypto.randomUUID();
      const row = {
        id,
        user_id: USER_ID,
        logged_at: day,
        weight_lb: normalized,
      };

      const { data: upserted, error: upsertError } = await db
        .from('body_weight_logs')
        .upsert(row, { onConflict: 'user_id,logged_at' })
        .select('id,logged_at,weight_lb')
        .single();
      if (upsertError) return errorText(`log_weight upsert failed: ${upsertError.message}`);

      const saved = upserted as { id: string; logged_at: string; weight_lb: number | string };
      return jsonText({
        ok: true,
        created: !existing,
        id: saved.id,
        loggedAt: String(saved.logged_at).slice(0, 10),
        weightLb: Number(saved.weight_lb),
        previousWeightLb: previousLb,
      });
    },
  );

  return server;
}

const mcpApp = new Hono();

mcpApp.options('/*', (c) => c.body(null, 204, corsHeaders));

/**
 * Health check endpoint with diagnostics.
 * Returns server status, configuration, and connectivity checks.
 */
mcpApp.get('/health', async (c) => {
  const checks: Record<string, boolean | string> = {
    server: true,
    writesEnabled: writesEnabled(),
    auth: 'oauth+bearer',
  };

  // Check database connectivity
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from('exercises').select('id').limit(1);
    checks.database = error ? `error: ${error.message}` : 'connected';
    checks.databaseRecords = data ? data.length : 0;
  } catch (error) {
    checks.database = `exception: ${error instanceof Error ? error.message : 'unknown'}`;
  }

  // Check environment variables
  checks.supabaseUrl = Boolean(Deno.env.get('SUPABASE_URL'));
  checks.supabaseServiceKey = Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  checks.liftMcpToken = Boolean(Deno.env.get('LIFT_MCP_TOKEN'));

  const allHealthy = 
    checks.server === true &&
    typeof checks.database === 'string' && checks.database === 'connected';

  return c.json(
    {
      ok: allHealthy,
      name: 'lift-mcp',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      checks,
    },
    allHealthy ? 200 : 503,
    corsHeaders,
  );
});

mountOauthRoutes(mcpApp);

mcpApp.all('/*', async (c) => {
  if (!(await isAuthorized(c.req.raw))) {
    return unauthorizedMcp(c.req.raw);
  }

  try {
    const db = supabaseAdmin();
    const server = createMcpServer(db);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(c.req.raw);
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
