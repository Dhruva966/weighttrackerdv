import { describe, expect, it, vi } from 'vitest';

const tableRows: Record<string, unknown[]> = {
  exercises: [],
  sessions: [],
  sets: [],
  goals: [],
};
const tableErrors: Record<string, { message: string } | null> = {
  exercises: null,
  sessions: null,
  sets: null,
  goals: null,
};

vi.mock('./supabase', () => ({
  getSupabase: vi.fn(() => mockClient),
}));

const mockClient = {
  from: (table: string) => ({
    select: () => Promise.resolve({ data: tableRows[table], error: tableErrors[table] }),
  }),
};

import { getSupabase } from './supabase';
import { fetchRemoteSnapshot } from './supabase-hydrate';

function resetTables() {
  tableRows.exercises = [];
  tableRows.sessions = [];
  tableRows.sets = [];
  tableRows.goals = [];
  tableErrors.exercises = null;
  tableErrors.sessions = null;
  tableErrors.sets = null;
  tableErrors.goals = null;
}

describe('fetchRemoteSnapshot', () => {
  it('returns null when Supabase is not configured', async () => {
    resetTables();
    vi.mocked(getSupabase).mockReturnValueOnce(null);
    await expect(fetchRemoteSnapshot()).resolves.toBeNull();
  });

  it('returns null when any table errors', async () => {
    resetTables();
    tableErrors.sets = { message: 'boom' };
    await expect(fetchRemoteSnapshot()).resolves.toBeNull();
  });

  it('maps snake_case rows to camelCase models (UUID mapping)', async () => {
    resetTables();
    const exerciseId = 'de3c1f99-a64b-46c4-9f46-6afcc6d17f70';
    const sessionId = 'de3c1f99-a64b-46c4-9f46-6afcc6d17f71';
    const setId = 'de3c1f99-a64b-46c4-9f46-6afcc6d17f72';
    const goalId = 'de3c1f99-a64b-46c4-9f46-6afcc6d17f73';

    tableRows.exercises = [
      {
        id: exerciseId,
        slug: 'lat-pulldown',
        name: 'Lat Pulldown',
        muscle_group: 'back',
        secondary_muscles: ['biceps'],
        equipment: 'cable',
        instructions: [],
        setup_notes: ['Seat 5'],
        image_url: null,
        image_style: 'name-only',
        source: 'remote',
        archived: false,
      },
    ];
    tableRows.sessions = [
      {
        id: sessionId,
        user_id: 'user-1',
        started_at: '2026-07-13T00:00:00.000Z',
        ended_at: '2026-07-13T01:00:00.000Z',
        notes: null,
      },
    ];
    tableRows.sets = [
      {
        id: setId,
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: 1,
        weight_lb: '135.50',
        reps: 8,
        rpe: null,
        is_warmup: false,
        is_pr: true,
        created_at: '2026-07-13T00:10:00.000Z',
      },
    ];
    tableRows.goals = [
      {
        id: goalId,
        user_id: 'user-1',
        name: 'Bench 225 lb',
        target_value: '225',
        target_unit: 'lb',
        achieved: false,
        achieved_at: null,
        created_at: '2026-07-13T00:00:00.000Z',
      },
    ];

    const snapshot = await fetchRemoteSnapshot();

    expect(snapshot).not.toBeNull();
    expect(snapshot!.exercises[0]).toMatchObject({ id: exerciseId, muscleGroup: 'back', setupNotes: ['Seat 5'] });
    expect(snapshot!.sessions[0]).toMatchObject({ id: sessionId, userId: 'user-1' });
    expect(snapshot!.sets[0]).toMatchObject({ id: setId, weightLb: 135.5, isPr: true });
    expect(snapshot!.goals[0]).toMatchObject({ id: goalId, targetValue: 225 });
  });
});
