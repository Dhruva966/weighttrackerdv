/**
 * Zod schemas for Lift MCP tool responses and shared types.
 * Provides runtime validation and TypeScript type inference.
 */
import { z } from 'npm:zod@4.1.13';

// ============================================================================
// Common schemas
// ============================================================================

export const SessionSummarySchema = z.object({
  setCount: z.number().int().nonnegative(),
  prCount: z.number().int().nonnegative(),
  volumeLb: z.number().nonnegative(),
  muscleGroups: z.array(z.string()),
});

export const SessionMetaSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  timezone: z.string().nullable(),
  notes: z.string().nullable(),
});

export const SetKindSchema = z.enum(['lift', 'cardio', 'unknown']);

export const SetSchema = z.object({
  id: z.string().uuid(),
  setNumber: z.number().int().positive(),
  weightLb: z.number().nonnegative().nullable(),
  reps: z.number().int().positive().nullable(),
  rpe: z.number().nonnegative().nullable(),
  isWarmup: z.boolean(),
  isPr: z.boolean(),
  createdAt: z.string().datetime(),
  level: z.number().nonnegative().nullable(),
  speed: z.number().nonnegative().nullable(),
  durationSec: z.number().int().nonnegative().nullable(),
  calories: z.number().nonnegative().nullable(),
  kind: SetKindSchema,
});

export const ExerciseMetaSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  muscleGroup: z.string().nullable(),
  equipment: z.string().nullable(),
  archived: z.boolean(),
});

export const ResolveCandidateSchema = z.object({
  n: z.number().int().positive(),
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  muscleGroup: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  archived: z.boolean(),
  score: z.number().int().nonnegative(),
});

export const ResolveStatusSchema = z.enum(['exact', 'ambiguous', 'none']);

// ============================================================================
// Tool response schemas
// ============================================================================

export const ListRecentSessionsResponseSchema = z.object({
  sessions: z.array(
    SessionMetaSchema.merge(SessionSummarySchema)
  ),
});

export const GetSessionDetailResponseSchema = z.object({
  session: SessionMetaSchema,
  summary: SessionSummarySchema,
  exercises: z.array(
    z.object({
      exerciseId: z.string().uuid(),
      slug: z.string().nullable(),
      name: z.string().nullable(),
      muscleGroup: z.string().nullable(),
      sets: z.array(SetSchema),
    })
  ),
});

export const GetExerciseHistoryResponseSchema = z.object({
  exercise: ExerciseMetaSchema,
  matchNote: z.string().optional(),
  lastWorkingSet: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weightLb: z.number().nonnegative().nullable(),
      reps: z.number().int().positive().nullable(),
      isPr: z.boolean(),
      estimatedOneRmLb: z.number().nonnegative(),
    })
    .nullable(),
  previousWorkingSets: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weightLb: z.number().nonnegative().nullable(),
      reps: z.number().int().positive().nullable(),
      estimatedOneRmLb: z.number().nonnegative(),
    })
  ),
  stats: z.object({
    loggedSetCount: z.number().int().nonnegative(),
    bestEstimatedOneRmLb: z.number().nonnegative(),
  }),
  sets: z.array(
    z.object({
      id: z.string().uuid(),
      sessionId: z.string().uuid(),
      sessionLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      setNumber: z.number().int().positive(),
      weightLb: z.number().nonnegative().nullable(),
      reps: z.number().int().positive().nullable(),
      isWarmup: z.boolean(),
      isPr: z.boolean(),
      createdAt: z.string().datetime(),
      estimatedOneRmLb: z.number().nonnegative(),
    })
  ),
  progressPoints: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      t: z.number(),
      weightLb: z.number().nonnegative().nullable(),
      reps: z.number().int().positive().nullable(),
      oneRm: z.number().nonnegative(),
    })
  ),
});

export const ListRecentPrsResponseSchema = z.object({
  prs: z.array(
    z.object({
      setId: z.string().uuid(),
      sessionId: z.string().uuid(),
      sessionLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      exerciseId: z.string().uuid(),
      exerciseSlug: z.string().nullable(),
      exerciseName: z.string().nullable(),
      weightLb: z.number().nonnegative().nullable(),
      reps: z.number().int().positive().nullable(),
      isWarmup: z.literal(false),
      createdAt: z.string().datetime(),
    })
  ),
});

export const ResolveExerciseResponseSchema = z.object({
  query: z.string().min(1),
  status: ResolveStatusSchema,
  candidates: z.array(ResolveCandidateSchema),
  hint: z.string(),
});

export const ListRecentWeighInsResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  latest: z
    .object({
      id: z.string().uuid(),
      loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weightLb: z.number().nonnegative(),
    })
    .nullable(),
  logs: z.array(
    z.object({
      id: z.string().uuid(),
      loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weightLb: z.number().nonnegative(),
    })
  ),
});

export const LogSetsResponseSchema = z.object({
  ok: z.literal(true),
  createdSession: z.boolean(),
  session: z.object({
    id: z.string().uuid(),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    timezone: z.string().nullable(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().nullable(),
  }),
  loggedSetCount: z.number().int().positive(),
  sets: z.array(
    z.object({
      id: z.string().uuid(),
      exerciseId: z.string().uuid(),
      exerciseName: z.string().nullable(),
      exerciseSlug: z.string().nullable(),
      setNumber: z.number().int().positive(),
      weightLb: z.number().nonnegative().nullable(),
      reps: z.number().int().positive().nullable(),
      isWarmup: z.boolean(),
      isPr: z.boolean(),
      createdAt: z.string().datetime(),
    })
  ),
});

export const LogWeightResponseSchema = z.object({
  ok: z.literal(true),
  created: z.boolean(),
  id: z.string().uuid(),
  loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightLb: z.number().nonnegative(),
  previousWeightLb: z.number().nonnegative().nullable(),
});

// ============================================================================
// Error response schema
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// ============================================================================
// Type exports (inferred from schemas)
// ============================================================================

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type SessionMeta = z.infer<typeof SessionMetaSchema>;
export type SetKind = z.infer<typeof SetKindSchema>;
export type Set = z.infer<typeof SetSchema>;
export type ExerciseMeta = z.infer<typeof ExerciseMetaSchema>;
export type ResolveCandidate = z.infer<typeof ResolveCandidateSchema>;
export type ResolveStatus = z.infer<typeof ResolveStatusSchema>;

export type ListRecentSessionsResponse = z.infer<typeof ListRecentSessionsResponseSchema>;
export type GetSessionDetailResponse = z.infer<typeof GetSessionDetailResponseSchema>;
export type GetExerciseHistoryResponse = z.infer<typeof GetExerciseHistoryResponseSchema>;
export type ListRecentPrsResponse = z.infer<typeof ListRecentPrsResponseSchema>;
export type ResolveExerciseResponse = z.infer<typeof ResolveExerciseResponseSchema>;
export type ListRecentWeighInsResponse = z.infer<typeof ListRecentWeighInsResponseSchema>;
export type LogSetsResponse = z.infer<typeof LogSetsResponseSchema>;
export type LogWeightResponse = z.infer<typeof LogWeightResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
