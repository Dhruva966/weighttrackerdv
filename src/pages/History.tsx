import { Link } from 'react-router-dom';
import { uiMock } from '../data/uiMock';

const kindStyles = {
  weight: 'border-accent/15 bg-accentSoft text-fg',
  meal: 'border-border/70 bg-surface/90 text-fg',
  workout: 'border-border/60 bg-mist/50 text-fgMuted',
} as const;

export function History() {
  return (
    <div className="grid animate-rise gap-7">
      <div>
        <h1 className="page-title">Look how far you’ve come</h1>
        <p className="page-lead mt-3">
          Weight, meals, and the rare workout — each day you logged is something to be proud of.
        </p>
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
                className={`relative grid aspect-square place-items-center rounded-xl text-sm ${
                  !inMonth
                    ? 'text-transparent'
                    : marked
                      ? 'bg-accentSoft font-medium text-fg'
                      : 'text-fgMuted'
                }`}
              >
                {inMonth ? day : '·'}
                {overload ? (
                  <span className="absolute right-1 top-0.5 text-[10px] font-medium text-accent/80">+</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-fgMuted">
          <span>Soft fill = a day you honored</span>
          <span>
            <span className="font-medium text-accent">+</span> = a gym PR day — celebrate it
          </span>
        </div>
      </section>

      <section className="grid gap-5">
        {uiMock.historyDays.map((group) => (
          <div key={group.dateLabel} className="grid gap-2">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-fgMuted">
              {group.dateLabel}
            </h2>
            {group.items.map((item) => (
              <article
                key={`${group.dateLabel}-${item.label}-${item.detail}`}
                className={`rounded-2xl border px-4 py-3.5 ${kindStyles[item.kind]}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium capitalize">{item.kind}</p>
                  <p className="text-sm">{item.label}</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed opacity-80">{item.detail}</p>
              </article>
            ))}
          </div>
        ))}
      </section>

      <p className="text-center text-sm leading-relaxed text-fgMuted">
        Gym sessions live quietly in{' '}
        <Link className="text-link" to="/history/sessions">
          workout recaps
        </Link>
        .
      </p>
    </div>
  );
}
