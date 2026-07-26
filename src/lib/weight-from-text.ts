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
