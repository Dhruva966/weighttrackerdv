export type CommandIntent = 'workout' | 'walk' | 'weight' | 'unknown';

export type ParsedCommand = {
  intent: CommandIntent;
  summary: string;
  raw: string;
};

/** Lightweight local router for universal command bar (UI preview). */
export function parseUniversalCommand(rawInput: string): ParsedCommand {
  const raw = rawInput.trim();
  const q = raw.toLowerCase();

  if (!raw) {
    return { intent: 'unknown', summary: 'Say or type a walk, lift, or weigh-in.', raw };
  }

  if (/\b(weigh|weighed|weight|lb|lbs|kg)\b/.test(q) && /\d/.test(q)) {
    return { intent: 'weight', summary: `Weigh-in noted: “${raw}”`, raw };
  }

  if (
    /\b(walk|walked|walking|incline\s*walk|run|ran|running|jog|jogged|jogging|steps|hike|hiked|hiking|cardio|bike|biking|stairmaster|stair\s*master|stair\s*climber|stepmill)\b/.test(
      q,
    )
  ) {
    return { intent: 'walk', summary: `Movement noted: “${raw}”`, raw };
  }

  if (
    /\b(set|sets|rep|reps|curl|bench|squat|press|deadlift|lift|workout|gym|bicep|tricep)\b/.test(q) ||
    /\d+\s*[x×]\s*\d+/.test(q)
  ) {
    return { intent: 'workout', summary: `Lift / session noted: “${raw}”`, raw };
  }

  return {
    intent: 'unknown',
    summary: `Heard you — add a hint like “walked…”, “lifted…”, or “weighed…” so we know where it belongs.`,
    raw,
  };
}
