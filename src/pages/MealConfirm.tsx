import { Link, useNavigate } from 'react-router-dom';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';

export function MealConfirm() {
  const navigate = useNavigate();
  const draft = useUiStore((state) => state.mealDraft);
  const clearMealDraft = useUiStore((state) => state.clearMealDraft);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const addMeal = useDiaryStore((state) => state.addMeal);
  const totals = draft.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return (
    <div className="grid animate-rise gap-7">
      <div>
        <p className="text-sm text-fgMuted">{draft.source}</p>
        <h1 className="page-title mt-1">Nice work — does this feel right?</h1>
        <p className="mt-3 text-editorial text-fgMuted">“{draft.raw}”</p>
        <p className="mt-2 text-sm leading-relaxed text-fgMuted">
          Estimates come from what you said. Adjust later when item editing ships.
        </p>
      </div>

      <section className="grid gap-2">
        {draft.items.length === 0 ? (
          <p className="text-sm text-fgMuted">No items parsed — save still keeps your words for today.</p>
        ) : (
          draft.items.map((item) => (
            <article key={item.name} className="app-card grid gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-fg">{item.name}</p>
                  <p className="mt-1 text-sm text-fgMuted">{item.portion}</p>
                </div>
                <p className="tabular text-sm text-fgMuted">{item.calories || '—'} kcal</p>
              </div>
              <p className="tabular text-xs text-fgMuted">
                P {item.proteinG}g · C {item.carbsG}g · F {item.fatG}g
              </p>
            </article>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-border/80 bg-mist/40 px-5 py-5">
        <p className="text-sm text-fgMuted">About this meal</p>
        <p className="tabular mt-1 text-3xl font-medium text-fg">{totals.calories} kcal</p>
        <p className="tabular mt-2 text-sm text-fgMuted">
          Protein {totals.proteinG}g · Carbs {totals.carbsG}g · Fat {totals.fatG}g
        </p>
      </section>

      <div className="grid gap-2">
        <button
          className="button-primary"
          type="button"
          onClick={() => {
            const title = draft.items[0]?.name || 'Meal';
            addMeal({
              title,
              summary: draft.items.map((item) => item.name).join(' · ') || draft.raw,
              calories: totals.calories,
              proteinG: totals.proteinG,
              carbsG: totals.carbsG,
              fatG: totals.fatG,
              raw: draft.raw,
            });
            clearMealDraft();
            showPreviewNotice('Meal saved to today’s diary.');
            navigate('/');
          }}
        >
          Save meal
        </button>
        <Link className="button-secondary text-center" to="/eat">
          Back
        </Link>
      </div>
    </div>
  );
}
