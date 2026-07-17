import { z } from 'zod';

export const captureSourceSchema = z.enum(['text', 'voice', 'photo', 'manual', 'import', 'seed']);

export const movementKindSchema = z.enum(['walk', 'run', 'hike', 'cardio', 'other']);

export const mealLogRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_at: z.string().datetime(),
  day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(120),
  summary: z.string().max(500),
  raw: z.string().min(1).max(2000),
  calories: z.number().int().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  fat_g: z.number().min(0).max(2000),
  capture_source: captureSourceSchema,
});

export const mealItemRowSchema = z.object({
  id: z.string().uuid(),
  meal_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  portion: z.string().max(120),
  calories: z.number().int().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  fat_g: z.number().min(0).max(2000),
  sort_order: z.number().int().min(0).max(100),
});

export const movementLogRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_at: z.string().datetime(),
  day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: movementKindSchema,
  title: z.string().min(1).max(120),
  summary: z.string().max(500),
  raw: z.string().min(1).max(2000),
  duration_min: z.number().min(0).max(1440).nullable(),
  distance_mi: z.number().min(0).max(500).nullable().optional(),
  calories_burned: z.number().int().min(0).max(20000).nullable().optional(),
  capture_source: captureSourceSchema,
});

export const bodyWeightRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_lb: z.number().min(50).max(500),
  notes: z.string().max(500).nullable().optional(),
  capture_source: captureSourceSchema.optional(),
});

export type CaptureSource = z.infer<typeof captureSourceSchema>;

export function captureSourceFromLabel(source: string): CaptureSource {
  if (/voice/i.test(source)) {
    return 'voice';
  }
  if (/photo/i.test(source)) {
    return 'photo';
  }
  if (/import/i.test(source)) {
    return 'import';
  }
  return 'text';
}
