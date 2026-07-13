export function MuscleGroupRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg className="h-28 w-28" viewBox="0 0 96 96" role="img" aria-label={`${clamped}% weekly muscle volume`}>
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#E5E5E5" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="#4A3B2A"
        strokeLinecap="round"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="53" fill="#4A3B2A" textAnchor="middle" className="tabular text-xl font-medium">
        {clamped}%
      </text>
    </svg>
  );
}
