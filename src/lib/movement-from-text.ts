export type MovementKind = 'walk' | 'run' | 'hike' | 'cardio' | 'other';

export type ParsedMovement = {
  kind: MovementKind;
  title: string;
  durationMin: number | null;
  summary: string;
  raw: string;
};

const kindPattern =
  /\b(walk(?:ing|ed)?|run(?:ning)?|ran|jog(?:ging|ged)?|hike(?:d|ing)?|steps|cardio|bike|biking|cycle|cycling|swim(?:ming|med)?)\b/i;

/** Parse movement phrases like “walking 30 min” or “ran 2 miles”. */
export function parseMovementText(rawInput: string): ParsedMovement | null {
  const raw = rawInput.trim();
  if (!raw) {
    return null;
  }

  const kindMatch = raw.match(kindPattern);
  if (!kindMatch) {
    return null;
  }

  const token = kindMatch[1]!.toLowerCase();
  let kind: MovementKind = 'other';
  if (/walk|steps/.test(token)) {
    kind = 'walk';
  } else if (/run|ran|jog/.test(token)) {
    kind = 'run';
  } else if (/hike/.test(token)) {
    kind = 'hike';
  } else if (/cardio|bike|cycle|swim/.test(token)) {
    kind = 'cardio';
  }

  const durationMatch = raw.match(
    /(\d+(?:\.\d+)?)\s*(min|mins|minutes?|hour|hours|hrs?)\b/i,
  );
  let durationMin: number | null = null;
  if (durationMatch) {
    const value = Number(durationMatch[1]);
    const unit = durationMatch[2]!.toLowerCase();
    durationMin = /hour|hr/.test(unit) ? Math.round(value * 60) : Math.round(value);
  }

  const title =
    kind === 'walk'
      ? 'Walk'
      : kind === 'run'
        ? 'Run'
        : kind === 'hike'
          ? 'Hike'
          : kind === 'cardio'
            ? 'Cardio'
            : 'Movement';

  const summary = durationMin
    ? `${durationMin} min`
    : raw.replace(/\s+/g, ' ').slice(0, 80);

  return { kind, title, durationMin, summary, raw };
}
