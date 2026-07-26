# Archive Food UI

## Decision
Pause active food, meal, macro, and calorie logging UI. Keep the implementation in `archive/food/` for a later rebuild.

## Context
Dhruva asked to remove eating UI from the dashboard before using the app at the gym. The current priority is body weight, movement/cardio, gym sessions, and lift progress.

## Consequences
- Bottom nav is now **Today · Move · Grow · You**.
- `/eat` and meal-confirm screens are no longer routed in the active app.
- Universal command routing handles walks, lifts, and weigh-ins only.
- `diaryStore` persists body weight and movement logs only.
- Future food work should start from `archive/food/` instead of reusing active dashboard code.
