# Archived Food Logging

Food, meal, macro, and calorie tracking is intentionally out of the active Aloo UI for this pass.

Archived code in this folder preserves the previous meal logging implementation for a later rebuild:

- `Log.tsx` — old Eat/meal capture UI.
- `MealConfirm.tsx` — old natural-language meal confirmation UI.
- `meal-from-text.ts` and `meal-from-text.test.ts.archived` — old local meal estimate parser.
- `cardio-calories.ts` and `cardio-calories.test.ts.archived` — old local calorie estimator removed from active movement bundles.
- `Onboarding.tsx` — old onboarding copy that centered food-first setup.
- `AskBar.tsx` and `uiMock.ts` — old mock coaching surfaces with food/protein demo copy.

The active app now removes Eat navigation/routes and keeps the universal command bar focused on walks, lifts, and weigh-ins.
