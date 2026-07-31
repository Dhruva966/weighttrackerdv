import { ClipboardList, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EncouragementLine } from '../components/EncouragementLine';
import { PotOfGold } from '../components/PotOfGold';
import { isBoardBaselineSession } from '../data/catalog';
import { toDayKey } from '../lib/calendar';
import { getDeviceTimeZone } from '../lib/local-day';
import {
  getBodyWeightDelta,
  getLatestBodyWeight,
  movementsForDay,
  useDiaryStore,
} from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function Today() {
  const preferredName = useUiStore((state) => state.preferredName);
  const goldDays = useUiStore((state) => state.goldDays);

  const bodyWeightLogs = useDiaryStore((state) => state.bodyWeightLogs);
  const movements = useDiaryStore((state) => state.movements);
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);

  const latestWeight = getLatestBodyWeight(bodyWeightLogs);
  const weightDelta = getBodyWeightDelta(bodyWeightLogs);
  const todayMovements = movementsForDay(movements);
  const timeZone = getDeviceTimeZone();
  const todayKey = toDayKey(new Date(), timeZone);
  const todaySessions = sessions.filter(
    (session) =>
      !isBoardBaselineSession(session.id) &&
      toDayKey(session.startedAt, timeZone) === todayKey,
  );
  const todaySessionIds = new Set(todaySessions.map((session) => session.id));
  const openSessions = todaySessions.filter((session) => !session.endedAt).length;
  const setCount = sets.filter((setItem) => todaySessionIds.has(setItem.sessionId)).length;
  const greeting = preferredName ? `Hi ${preferredName}` : 'Welcome back';
  const trainingDetails = [
    setCount > 0 ? `${setCount} set${setCount === 1 ? '' : 's'} today` : null,
    openSessions > 0
      ? `${openSessions} open workout${openSessions === 1 ? '' : 's'}`
      : null,
    todayMovements.length > 0
      ? `${todayMovements.length} movement${todayMovements.length === 1 ? '' : 's'} today`
      : null,
  ].filter(Boolean);

  return (
    <div className="grid animate-rise gap-9">
      <section className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm text-fgMuted">{greeting}</p>
          <h1 className="page-title mt-2">Your pot of gold is filling</h1>
          <div className="mt-4">
            <EncouragementLine />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link className="button-primary min-h-9" to="/move">
              Open Move
            </Link>
          </div>
        </div>
        <PotOfGold days={goldDays} className="justify-self-center" />
      </section>

      <section className="app-card grid gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-fgMuted" strokeWidth={1.5} />
            <h2 className="text-lg font-medium text-fg">Body weight</h2>
          </div>
          {latestWeight ? (
            <span className="rounded-full bg-accentSoft px-3 py-1 text-xs text-fg">Logged</span>
          ) : null}
        </div>
        {latestWeight ? (
          <div className="flex items-end justify-between gap-4">
            <p className="tabular text-5xl font-medium leading-none tracking-tight text-fg">
              {latestWeight.weightLb}
            </p>
            <div className="pb-1 text-right">
              <p className="text-sm text-fgMuted">pounds</p>
              <p className="mt-1 text-sm text-fg">
                {weightDelta === null
                  ? 'Say “weighed 169” to update'
                  : `${weightDelta > 0 ? '+' : ''}${weightDelta} vs last log`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fgMuted">No weigh-ins yet. Say “weighed 169” in the bar above.</p>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-border/80 bg-mist/40 px-5 py-5">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 text-fgMuted" size={18} strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-medium text-fg">Training log</p>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              {trainingDetails.length === 0
                ? 'No lifts or walks yet — try “walking 30 min” in the bar or open Move.'
                : trainingDetails.join(' · ')}
            </p>
            <Link className="button-secondary mt-4 inline-flex min-h-9" to="/move">
              Open Move
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
