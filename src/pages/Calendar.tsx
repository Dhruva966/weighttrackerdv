import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Dumbbell, Plus } from 'lucide-react';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { SessionSummary } from '../components/SessionSummary';
import { StatCard } from '../components/StatCard';
import { buildMonthGrid, buildSessionDayMap, formatMonthLabel, shiftMonth, summarizeMonth, toDayKey } from '../lib/calendar';
import { formatDateTime } from '../lib/fmt';
import { useWorkoutStore } from '../stores/workoutStore';

function currentMonthParts(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function Calendar() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const [{ year, month }, setMonthParts] = useState(currentMonthParts);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDayKey(new Date(), 'America/Los_Angeles'));

  const activityByDay = useMemo(
    () =>
      buildSessionDayMap(
        sessions.map((session) => ({
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        })),
        sets.map((setItem) => ({
          sessionId: setItem.sessionId,
          isPr: setItem.isPr,
          isWarmup: setItem.isWarmup,
        })),
      ),
    [sessions, sets],
  );

  const cells = useMemo(() => buildMonthGrid(year, month, activityByDay), [activityByDay, month, year]);
  const monthSummary = useMemo(() => summarizeMonth(activityByDay, year, month), [activityByDay, month, year]);
  const selectedActivity = selectedDate ? activityByDay.get(selectedDate) : undefined;
  const selectedSessions = useMemo(() => {
    if (!selectedActivity) {
      return [];
    }

    return sessions
      .filter((session) => selectedActivity.sessionIds.includes(session.id))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [selectedActivity, sessions]);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="mt-1 text-sm text-fgMuted">
          Gym days fill in as you complete workouts. A <span className="font-bold text-accent">+</span> means you hit a PR
          that day.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Gym days" value={`${monthSummary.gymDays}`} icon={CalendarDays} />
        <StatCard label="Overload days" value={`${monthSummary.overloadDays}`} icon={Plus} />
        <StatCard label="Sets logged" value={`${monthSummary.totalSets}`} icon={Dumbbell} />
      </div>

      <WorkoutCalendar
        monthLabel={formatMonthLabel(year, month)}
        cells={cells}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPreviousMonth={() => setMonthParts((current) => shiftMonth(current.year, current.month, -1))}
        onNextMonth={() => setMonthParts((current) => shiftMonth(current.year, current.month, 1))}
      />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-medium text-fg">
            {selectedDate
              ? new Intl.DateTimeFormat('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${selectedDate}T12:00:00Z`))
              : 'Pick a day'}
          </h2>
          <Link className="text-link" to="/session/new">
            Log workout
          </Link>
        </div>

        {selectedSessions.length > 0 ? (
          selectedSessions.map((session) => {
            const sessionSets = sets.filter((setItem) => setItem.sessionId === session.id);
            const prCount = sessionSets.filter((setItem) => setItem.isPr).length;

            return (
              <Link
                key={session.id}
                className="grid gap-3 rounded-lg border border-border bg-surface p-4 hover:border-fg/30"
                to={`/history/${session.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-fg">{formatDateTime(session.startedAt)}</p>
                  {prCount > 0 ? (
                    <span className="rounded-md bg-accentSoft px-2 py-1 text-xs font-bold text-accent">+{prCount} PR</span>
                  ) : null}
                </div>
                {session.notes ? <p className="text-sm text-fgMuted">{session.notes}</p> : null}
                <SessionSummary sets={sessionSets} />
              </Link>
            );
          })
        ) : (
          <p className="app-card text-fgMuted">
            {selectedDate ? 'No completed workout on this day yet.' : 'Select a day to see what you logged.'}
          </p>
        )}
      </section>
    </div>
  );
}
