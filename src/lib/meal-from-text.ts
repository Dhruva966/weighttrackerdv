export type MealItemEstimate = {
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Lightweight NL → meal item estimate (no external DB). */
export function estimateMealFromText(rawInput: string): MealItemEstimate[] {
  const raw = rawInput.trim();
  if (!raw) {
    return [];
  }

  const caloriesMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories|cals?)\b/i);
  const proteinMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?protein\b/i);
  const carbsMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?carb(?:s|ohydrates)?\b/i);
  const fatMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)?\s*(?:of\s+)?fat\b/i);

  const cleaned = raw
    .replace(/\b(i\s+)?(ate|had|eat|logged)\b/gi, '')
    .replace(/\babout\b/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:kcal|calories|cals?|g?\s*(?:of\s+)?(?:protein|carb(?:s|ohydrates)?|fat))\b/gi, '')
    .replace(/[,.]+$/g, '')
    .trim();

  const name = cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : 'Logged meal';

  return [
    {
      name: name.slice(0, 64),
      portion: 'As logged',
      calories: caloriesMatch ? Math.round(Number(caloriesMatch[1])) : 0,
      proteinG: proteinMatch ? Math.round(Number(proteinMatch[1])) : 0,
      carbsG: carbsMatch ? Math.round(Number(carbsMatch[1])) : 0,
      fatG: fatMatch ? Math.round(Number(fatMatch[1])) : 0,
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
