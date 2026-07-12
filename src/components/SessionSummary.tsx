import CountUp from 'react-countup';
import { formatVolume } from '../lib/fmt';
import type { LoggedSet } from '../types';

export function SessionSummary({ sets }: { sets: LoggedSet[] }) {
  const volume = sets.reduce((sum, setItem) => sum + setItem.weightLb * setItem.reps, 0);
  const prs = sets.filter((setItem) => setItem.isPr).length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="app-card text-center">
        <p className="text-sm font-semibold text-fgMuted">Sets</p>
        <p className="tabular mt-2 text-2xl font-extrabold text-fg">
          <CountUp end={sets.length} duration={0.8} />
        </p>
      </div>
      <div className="app-card text-center">
        <p className="text-sm font-semibold text-fgMuted">Volume</p>
        <p className="tabular mt-2 text-2xl font-extrabold text-fg">{formatVolume(volume)}</p>
      </div>
      <div className="app-card text-center">
        <p className="text-sm font-semibold text-fgMuted">PRs</p>
        <p className="tabular mt-2 text-2xl font-extrabold text-pr">
          <CountUp end={prs} duration={0.8} />
        </p>
      </div>
    </div>
  );
}
