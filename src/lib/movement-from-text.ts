export type MovementKind =
  | 'walk'
  | 'incline_walk'
  | 'hike'
  | 'run'
  | 'stairmaster'
  | 'bike'
  | 'cardio'
  | 'other';

export type ParsedMovement = {
  kind: MovementKind;
  title: string;
  durationMin: number | null;
  summary: string;
  raw: string;
};

const kindPattern =
  /\b(incline\s*walk(?:ing)?|treadmill\s*incline|stair\s*master|stairmaster|stair\s*climber|stepmill|walk(?:ing|ed)?|run(?:ning)?|ran|jog(?:ging|ged)?|hike(?:d|ing)?|steps|cardio|bike|biking|cycle|cycling|swim(?:ming|med)?)\b/i;

const titles: Record<MovementKind, string> = {
  walk: 'Walk',
  incline_walk: 'Incline walk',
  hike: 'Hike',
  run: 'Run',
  stairmaster: 'Stairmaster',
  bike: 'Bike',
  cardio: 'Cardio',
  other: 'Movement',
};

function classifyKind(token: string): MovementKind {
  const normalized = token.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/incline\s*walk|treadmill\s*incline/.test(normalized)) {
    return 'incline_walk';
  }
  if (/stair\s*master|stairmaster|stair\s*climber|stepmill/.test(normalized)) {
    return 'stairmaster';
  }
  if (/walk|steps/.test(normalized)) {
    return 'walk';
  }
  if (/run|ran|jog/.test(normalized)) {
    return 'run';
  }
  if (/hike/.test(normalized)) {
    return 'hike';
  }
  if (/bike|cycle|swim/.test(normalized)) {
    return 'bike';
  }
  if (/cardio/.test(normalized)) {
    return 'cardio';
  }
  return 'other';
}

/** Parse movement phrases like “walking 30 min” or “stairmaster level 10 for 10 min”. */
export function parseMovementText(rawInput: string): ParsedMovement | null {
  const raw = rawInput.trim();
  if (!raw) {
    return null;
  }

  const kindMatch = raw.match(kindPattern);
  if (!kindMatch) {
    return null;
  }

  const kind = classifyKind(kindMatch[1]!);

  const durationMatch = raw.match(
    /(\d+(?:\.\d+)?)\s*(min|mins|minutes?|hour|hours|hrs?)\b/i,
  );
  let durationMin: number | null = null;
  if (durationMatch) {
    const value = Number(durationMatch[1]);
    const unit = durationMatch[2]!.toLowerCase();
    durationMin = /hour|hr/.test(unit) ? Math.round(value * 60) : Math.round(value);
  }

  const levelMatch = raw.match(/\blevel\s*(\d+(?:\.\d+)?)\b/i);
  const level = levelMatch ? levelMatch[1] : null;

  const title = titles[kind];
  const parts: string[] = [];
  if (level) {
    parts.push(`level ${level}`);
  }
  if (durationMin != null) {
    parts.push(`${durationMin} min`);
  }
  const summary =
    parts.length > 0 ? parts.join(' · ') : raw.replace(/\s+/g, ' ').slice(0, 80);

  return { kind, title, durationMin, summary, raw };
}
