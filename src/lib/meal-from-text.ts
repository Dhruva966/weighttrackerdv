export type MealItemEstimate = {
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type MacroTotals = Pick<MealItemEstimate, 'calories' | 'proteinG' | 'carbsG' | 'fatG'>;

const FOOD_PER_SERVING: Record<string, MacroTotals> = {
  fish: { calories: 150, proteinG: 25, carbsG: 0, fatG: 5 },
  mutton: { calories: 250, proteinG: 25, carbsG: 0, fatG: 17 },
  lamb: { calories: 250, proteinG: 25, carbsG: 0, fatG: 17 },
  chicken: { calories: 165, proteinG: 31, carbsG: 0, fatG: 4 },
  beef: { calories: 220, proteinG: 24, carbsG: 0, fatG: 14 },
  egg: { calories: 70, proteinG: 6, carbsG: 0, fatG: 5 },
  eggs: { calories: 70, proteinG: 6, carbsG: 0, fatG: 5 },
  chapati: { calories: 120, proteinG: 3, carbsG: 20, fatG: 4 },
  roti: { calories: 120, proteinG: 3, carbsG: 20, fatG: 4 },
  naan: { calories: 260, proteinG: 9, carbsG: 45, fatG: 5 },
  rice: { calories: 200, proteinG: 4, carbsG: 45, fatG: 0 },
  bread: { calories: 80, proteinG: 3, carbsG: 15, fatG: 1 },
  sandwich: { calories: 350, proteinG: 18, carbsG: 35, fatG: 14 },
  salad: { calories: 180, proteinG: 6, carbsG: 12, fatG: 12 },
  pasta: { calories: 220, proteinG: 8, carbsG: 42, fatG: 2 },
  yogurt: { calories: 100, proteinG: 10, carbsG: 8, fatG: 3 },
  dal: { calories: 180, proteinG: 10, carbsG: 28, fatG: 4 },
  lentil: { calories: 180, proteinG: 10, carbsG: 28, fatG: 4 },
  lentils: { calories: 180, proteinG: 10, carbsG: 28, fatG: 4 },
  paneer: { calories: 260, proteinG: 18, carbsG: 4, fatG: 20 },
  tofu: { calories: 140, proteinG: 14, carbsG: 4, fatG: 8 },
  potato: { calories: 160, proteinG: 4, carbsG: 36, fatG: 0 },
  fruit: { calories: 80, proteinG: 1, carbsG: 20, fatG: 0 },
  smoothie: { calories: 250, proteinG: 8, carbsG: 45, fatG: 4 },
  coffee: { calories: 5, proteinG: 0, carbsG: 1, fatG: 0 },
};

const PROTEIN_HINTS = /\b(fish|mutton|lamb|chicken|beef|egg|meat|steak|salmon|tuna|shrimp|paneer|tofu|protein)\b/i;
const CARB_HINTS = /\b(chapati|roti|naan|rice|bread|pasta|oat|cereal|potato|fruit|smoothie|carb)\b/i;

function roundMacro(value: number): number {
  return Math.round(value);
}

function macrosFromCaloriesSplit(
  calories: number,
  proteinRatio: number,
  carbsRatio: number,
  fatRatio: number,
): MacroTotals {
  const proteinG = roundMacro((calories * proteinRatio) / 4);
  const carbsG = roundMacro((calories * carbsRatio) / 4);
  const fatG = roundMacro((calories * fatRatio) / 9);
  return { calories, proteinG, carbsG, fatG };
}

function defaultMacroSplit(raw: string): { proteinRatio: number; carbsRatio: number; fatRatio: number } {
  const hasProtein = PROTEIN_HINTS.test(raw);
  const hasCarbs = CARB_HINTS.test(raw);
  if (hasProtein && hasCarbs) {
    return { proteinRatio: 0.35, carbsRatio: 0.35, fatRatio: 0.3 };
  }
  if (hasProtein) {
    return { proteinRatio: 0.4, carbsRatio: 0.25, fatRatio: 0.35 };
  }
  if (hasCarbs) {
    return { proteinRatio: 0.2, carbsRatio: 0.5, fatRatio: 0.3 };
  }
  return { proteinRatio: 0.25, carbsRatio: 0.45, fatRatio: 0.3 };
}

function scaleMacros(macros: MacroTotals, targetCalories: number): MacroTotals {
  if (targetCalories <= 0 || macros.calories <= 0) {
    return { ...macros, calories: targetCalories };
  }
  const ratio = targetCalories / macros.calories;
  return {
    calories: targetCalories,
    proteinG: roundMacro(macros.proteinG * ratio),
    carbsG: roundMacro(macros.carbsG * ratio),
    fatG: roundMacro(macros.fatG * ratio),
  };
}

function parseExplicitMacros(raw: string): Partial<MacroTotals> {
  const caloriesMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories|cals?)\b/i);
  const proteinMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?protein\b/i);
  const carbsMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?carb(?:s|ohydrates)?\b/i);
  const fatMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?fat\b/i);

  return {
    calories: caloriesMatch ? roundMacro(Number(caloriesMatch[1])) : undefined,
    proteinG: proteinMatch ? roundMacro(Number(proteinMatch[1])) : undefined,
    carbsG: carbsMatch ? roundMacro(Number(carbsMatch[1])) : undefined,
    fatG: fatMatch ? roundMacro(Number(fatMatch[1])) : undefined,
  };
}

function parseFoodServings(raw: string): Array<{ food: string; servings: number }> {
  const lower = raw.toLowerCase();
  const results: Array<{ food: string; servings: number }> = [];

  const eachMatch = lower.match(
    /([a-z][a-z\s-]*?)\s+and\s+([a-z][a-z\s-]*?)\s+(\d+(?:\.\d+)?)\s+servings?\s+each\b/,
  );
  if (eachMatch) {
    const servings = Number(eachMatch[3]);
    results.push({ food: eachMatch[1]!.trim(), servings });
    results.push({ food: eachMatch[2]!.trim(), servings });
  }

  const qtyFirstPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:x|×)\s*([a-z][a-z\s-]*)/g,
    /(\d+(?:\.\d+)?)\s+servings?\s+(?:of\s+)?([a-z][a-z\s-]*)/g,
  ];

  for (const pattern of qtyFirstPatterns) {
    for (const match of lower.matchAll(pattern)) {
      const qty = Number(match[1]);
      const food = (match[2] ?? '').trim();
      if (Number.isFinite(qty) && qty > 0 && food) {
        results.push({ food, servings: qty });
      }
    }
  }

  for (const match of lower.matchAll(/([a-z][a-z\s-]*?)\s+(\d+(?:\.\d+)?)\s+servings?\b/g)) {
    const food = (match[1] ?? '').trim();
    const qty = Number(match[2]);
    if (Number.isFinite(qty) && qty > 0 && food) {
      results.push({ food, servings: qty });
    }
  }

  for (const food of Object.keys(FOOD_PER_SERVING)) {
    if (new RegExp(`\\b${food}\\b`, 'i').test(lower) && !results.some((entry) => entry.food.includes(food))) {
      results.push({ food, servings: 1 });
    }
  }

  return results;
}

function lookupFood(food: string): MacroTotals | null {
  const normalized = food.trim().toLowerCase();
  if (FOOD_PER_SERVING[normalized]) {
    return FOOD_PER_SERVING[normalized];
  }
  const match = Object.keys(FOOD_PER_SERVING).find((key) => normalized.includes(key));
  return match ? FOOD_PER_SERVING[match]! : null;
}

function estimateFromFoods(raw: string): MacroTotals | null {
  const servings = parseFoodServings(raw);
  if (servings.length === 0) {
    return null;
  }

  return servings.reduce<MacroTotals>(
    (acc, entry) => {
      const perServing = lookupFood(entry.food);
      if (!perServing) {
        return acc;
      }
      return {
        calories: acc.calories + perServing.calories * entry.servings,
        proteinG: acc.proteinG + perServing.proteinG * entry.servings,
        carbsG: acc.carbsG + perServing.carbsG * entry.servings,
        fatG: acc.fatG + perServing.fatG * entry.servings,
      };
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

function fillMissingMacros(raw: string, explicit: Partial<MacroTotals>): MacroTotals {
  const calories = explicit.calories ?? 0;
  const hasAllMacros =
    explicit.proteinG !== undefined && explicit.carbsG !== undefined && explicit.fatG !== undefined;

  if (hasAllMacros) {
    return {
      calories,
      proteinG: explicit.proteinG ?? 0,
      carbsG: explicit.carbsG ?? 0,
      fatG: explicit.fatG ?? 0,
    };
  }

  let inferred = estimateFromFoods(raw);
  if (inferred && inferred.calories > 0) {
    if (calories > 0) {
      inferred = scaleMacros(inferred, calories);
    }
  } else if (calories > 0) {
    const split = defaultMacroSplit(raw);
    inferred = macrosFromCaloriesSplit(
      calories,
      split.proteinRatio,
      split.carbsRatio,
      split.fatRatio,
    );
  } else {
    inferred = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  }

  return {
    calories: calories || inferred.calories,
    proteinG: explicit.proteinG ?? inferred.proteinG,
    carbsG: explicit.carbsG ?? inferred.carbsG,
    fatG: explicit.fatG ?? inferred.fatG,
  };
}

function cleanMealName(raw: string): string {
  const cleaned = raw
    .replace(/\b(i\s+)?(ate|had|eat|logged)\b/gi, '')
    .replace(/\babout\b/gi, '')
    .replace(/\bprobably\b/gi, '')
    .replace(/\baround\b/gi, '')
    .replace(/\btotal\b/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:kcal|calories|cals?)\b/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?(?:protein|carb(?:s|ohydrates)?|fat)\b/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:x|×|servings?)\b/gi, '')
    .replace(/\beach\b/gi, '')
    .replace(/[,.]+$/g, '')
    .trim();

  if (!cleaned) {
    return 'Logged meal';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).slice(0, 64);
}

export function sumMealItems(items: MealItemEstimate[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** Lightweight NL → meal item estimate (no external DB). */
export function estimateMealFromText(rawInput: string): MealItemEstimate[] {
  const raw = rawInput.trim();
  if (!raw) {
    return [];
  }

  const explicit = parseExplicitMacros(raw);
  const macros = fillMissingMacros(raw, explicit);

  return [
    {
      name: cleanMealName(raw),
      portion: 'As logged',
      calories: macros.calories,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
    },
  ];
}

export function extractWeightLb(rawInput: string): number | null {
  const match = rawInput.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?\b/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 50 || value > 500) {
    return null;
  }
  return Math.round(value * 10) / 10;
}
