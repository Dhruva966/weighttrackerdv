import { useMemo, useState } from 'react';
import { CalendarDays, Dumbbell, Plus } from 'lucide-react';
import {
  buildMonthGrid,
  buildSessionDayMap,
  formatMonthLabel,
  shiftMonth,
  summarizeDayWorkout,
  summarizeMonth,
  toDayKey,
} from '../lib/calendar';
import { getDeviceTimeZone } from '../lib/local-day';
import { isBoardBaselineSession } from '../data/catalog';
import { useWorkoutStore } from '../stores/workoutStore';
import { DayWorkoutPanel } from './DayWorkoutPanel';
import { StatCard } from './StatCard';
import { WorkoutCalendar } from './WorkoutCalendar';

function currentMonthParts(timeZone: string): { year: number; month: number } {
  const now = new Date();
  return {
    year: Number(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric' }).format(now)),
    month: Number(new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit' }).format(now)),
  };
}

export function InteractiveGymCalendar({ showMonthStats = false }: { showMonthStats?: boolean }) {
  const sessions = useWorkoutStore((state) =>
    state.sessions.filter((session) => !isBoardBaselineSession(session.id)),
  );
  const sets = useWorkoutStore((state) =>
    state.sets.filter((setItem) => !isBoardBaselineSession(setItem.sessionId)),
  );
  const exercises = useWorkoutStore((state) => state.exercises);
  // Resolve TZ on each render so travel / DST policy changes without a full reload stay correct.
  const timeZone = getDeviceTimeZone();
  const todayKey = toDayKey(new Date(), timeZone);
  const [{ year, month }, setMonthParts] = useState(() => currentMonthParts(getDeviceTimeZone()));
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    toDayKey(new Date(), getDeviceTimeZone()),
  );

  const sessionInputs = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        notes: session.notes,
        localDate: session.localDate,
        timezone: session.timezone,
      })),
    [sessions],
  );

  const setInputs = useMemo(
    () =>
      sets.map((setItem) => ({
        id: setItem.id,
        sessionId: setItem.sessionId,
        exerciseId: setItem.exerciseId,
        setNumber: setItem.setNumber,
        weightLb: setItem.weightLb,
        reps: setItem.reps,
        rpe: setItem.rpe,
        isWarmup: setItem.isWarmup,
        isPr: setItem.isPr,
        createdAt: setItem.createdAt,
      })),
    [sets],
  );

  const exerciseRefs = useMemo(
    () =>
      exercises.map((exercise) => ({
        id: exercise.id,
        muscleGroup: exercise.muscleGroup,
      })),
    [exercises],
  );

  const calendarOptions = useMemo(
    () => ({ timeZone, today: todayKey }),
    [timeZone, todayKey],
  );

  const activityByDay = useMemo(
    () => buildSessionDayMap(sessionInputs, setInputs, calendarOptions),
    [calendarOptions, sessionInputs, setInputs],
  );

  const cells = useMemo(
    () => buildMonthGrid(year, month, activityByDay, calendarOptions),
    [activityByDay, calendarOptions, month, year],
  );

  const monthSummary = useMemo(
    () => summarizeMonth(activityByDay, year, month),
    [activityByDay, month, year],
  );

  const selectedSummary = useMemo(() => {
    if (!selectedDate) {
      return null;
    }
    return summarizeDayWorkout(
      selectedDate,
      sessionInputs,
      setInputs,
      exerciseRefs,
      calendarOptions,
    );
  }, [calendarOptions, exerciseRefs, selectedDate, sessionInputs, setInputs]);

  return (
    <div className="grid gap-4">
      {showMonthStats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Gym days" value={`${monthSummary.gymDays}`} icon={CalendarDays} />
          <StatCard label="Overload days" value={`${monthSummary.overloadDays}`} icon={Plus} />
          <StatCard label="Sets logged" value={`${monthSummary.totalSets}`} icon={Dumbbell} />
        </div>
      ) : null}

      <WorkoutCalendar
        monthLabel={formatMonthLabel(year, month)}
        cells={cells}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPreviousMonth={() => setMonthParts((current) => shiftMonth(current.year, current.month, -1))}
        onNextMonth={() => setMonthParts((current) => shiftMonth(current.year, current.month, 1))}
      />

      <DayWorkoutPanel selectedDate={selectedDate} summary={selectedSummary} />
    </div>
  );
}
