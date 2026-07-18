import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calendarDayToStartedAt, findDaySession, toDayKey } from '../lib/calendar';
import { useWorkoutStore } from '../stores/workoutStore';

const MOVE_TIMEZONE = 'America/Los_Angeles';

export function SessionLauncher() {
  const createSession = useWorkoutStore((state) => state.createSession);
  const reopenSession = useWorkoutStore((state) => state.reopenSession);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const dateParam = searchParams.get('date');
    const dayKey =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : toDayKey(new Date(), MOVE_TIMEZONE);

    const existing = findDaySession(
      dayKey,
      useWorkoutStore.getState().sessions.map((session) => ({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        notes: session.notes,
      })),
      { timeZone: MOVE_TIMEZONE },
    );
    if (existing) {
      if (existing.endedAt) {
        reopenSession(existing.id);
      }
      navigate(`/session/${existing.id}`, { replace: true });
      return;
    }

    const startedAt = calendarDayToStartedAt(dayKey, MOVE_TIMEZONE);
    const session = createSession({ startedAt });
    navigate(`/session/${session.id}`, { replace: true });
  }, [createSession, navigate, reopenSession, searchParams]);

  return <p className="text-fgMuted">Opening workout…</p>;
}
