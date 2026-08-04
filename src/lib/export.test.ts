import { describe, expect, it } from 'vitest';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { exportWorkoutData } from './export';

describe('exportWorkoutData', () => {
  it('includes workout, diary, and intention state', () => {
    useDiaryStore.setState({
      bodyWeightLogs: [{ id: 'bw-1', loggedAt: '2026-08-04', weightLb: 168 }],
      movements: [
        {
          id: 'mv-1',
          loggedAt: '2026-08-04T10:00:00.000Z',
          kind: 'walk',
          title: 'Walk',
          durationMin: 30,
          summary: '30 min walk',
          raw: 'walking 30 min',
        },
      ],
    });
    useUiStore.setState({
      intentions: [{ id: 'g1', name: 'Morning weigh-in', done: true }],
      unit: 'kg',
      restSeconds: 120,
    });
    useWorkoutStore.setState({
      sessions: [],
      sets: [],
    });

    const payload = JSON.parse(exportWorkoutData()) as Record<string, unknown>;

    expect(payload.bodyWeightLogs).toEqual([
      { id: 'bw-1', loggedAt: '2026-08-04', weightLb: 168 },
    ]);
    expect(payload.movements).toHaveLength(1);
    expect(payload.intentions).toEqual([{ id: 'g1', name: 'Morning weigh-in', done: true }]);
    expect(payload.unit).toBe('kg');
    expect(payload.restSeconds).toBe(120);
    expect(payload).toHaveProperty('exercises');
    expect(payload).toHaveProperty('sessions');
    expect(payload).toHaveProperty('sets');
  });
});
