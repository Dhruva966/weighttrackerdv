import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { calendarDayToStartedAt, findDaySession, toDayKey } from '../lib/calendar';
import { getDeviceTimeZone } from '../lib/local-day';
import { waitForRemoteHydrateSettled } from '../lib/remote-hydrate-gate';
import { useWorkoutStore } from '../stores/workoutStore';

export function SessionLauncher() {
  const createSession = useWorkoutStore((state) => state.createSession);
  const reopenSession = useWorkoutStore((state) => state.reopenSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const launchedRef = useRef(false);
  const [hydrated, setHydrated] = useState(() => useWorkoutStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useWorkoutStore.persist.onFinishHydration(() => setHydrated(true));
    if (useWorkoutStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    void (async () => {
      // Wait for Supabase pull so Claude MCP day sessions are visible before we mint a blank one.
      await waitForRemoteHydrateSettled();
      if (cancelled || launchedRef.current) return;
      launchedRef.current = true;

      const timeZone = getDeviceTimeZone();
      const dateParam = searchParams.get('date');
      const dayKey =
        dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
          ? dateParam
          : toDayKey(new Date(), timeZone);

      const incomingFrom = (location.state as { from?: unknown } | null)?.from;
      const from =
        typeof incomingFrom === 'string' && incomingFrom.startsWith('/') && !incomingFrom.startsWith('//')
          ? incomingFrom
          : dateParam
            ? '/grow'
            : '/move';

      const workout = useWorkoutStore.getState();
      const sessionIdsWithSets = new Set(workout.sets.map((setItem) => setItem.sessionId));
      const existing = findDaySession(
        dayKey,
        workout.sessions.map((session) => ({
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          notes: session.notes,
          localDate: session.localDate,
          timezone: session.timezone,
        })),
        { timeZone, sessionIdsWithSets },
      );
      if (existing) {
        if (existing.endedAt) {
          reopenSession(existing.id);
        }
        navigate(`/session/${existing.id}`, { replace: true, state: { from } });
        return;
      }

      const startedAt = calendarDayToStartedAt(dayKey, timeZone);
      const session = createSession({ startedAt });
      navigate(`/session/${session.id}`, { replace: true, state: { from } });
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, createSession, location.state, navigate, reopenSession, searchParams]);

  return <p className="text-fgMuted">Opening workout…</p>;
}
