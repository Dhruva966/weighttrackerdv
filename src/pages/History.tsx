import { Link } from 'react-router-dom';
import { uiMock } from '../data/uiMock';

const kindStyles = {
  weight: 'bg-accentSoft text-fg',
  meal: 'bg-surface text-fg',
  workout: 'bg-bg text-fgMuted',
} as const;

export function History() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="page-title">History</h1>
        <p className="mt-2 text-sm text-fgMuted">Weight, meals, and workouts in one place.</p>
      </div>

      <section className="app-card">
        <p className="text-sm text-fgMuted">This month</p>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-fgMuted">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, index) => {
            const day = index - 1;
            const inMonth = day >= 1 && day <= 31;
            const marked = [3, 5, 8, 12, 13].includes(day);
            const overload = day === 8;
            return (
              <div
                key={index}
                className={`relative grid aspect-square place-items-center rounded-md text-sm ${
                  !inMonth
                    ? 'text-transparent'
                    : marked
                      ? 'bg-accentSoft font-medium text-fg'
                      : 'text-fgMuted'
                }`}
              >
                {inMonth ? day : '·'}
                {overload ? <span className="absolute right-1 top-0.5 text-[10px] font-bold text-accent">+</span> : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-fgMuted">
          <span>Filled = logged day</span>
          <span>
            <span className="font-bold text-accent">+</span> = gym PR day
          </span>
        </div>
      </section>

      <section className="grid gap-4">
        {uiMock.historyDays.map((group) => (
          <div key={group.dateLabel} className="grid gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fgMuted">{group.dateLabel}</h2>
            {group.items.map((item) => (
              <article
                key={`${group.dateLabel}-${item.label}-${item.detail}`}
                className={`rounded-lg border border-border px-4 py-3 ${kindStyles[item.kind]}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium capitalize">{item.kind}</p>
                  <p className="text-sm">{item.label}</p>
                </div>
                <p className="mt-1 text-sm opacity-80">{item.detail}</p>
              </article>
            ))}
          </div>
        ))}
      </section>

      <p className="text-center text-sm text-fgMuted">
        Older gym sessions stay available in{' '}
        <Link className="underline decoration-border underline-offset-2 hover:text-fg" to="/history/sessions">
          workout recaps
        </Link>
        .
      </p>
    </div>
  );
}
