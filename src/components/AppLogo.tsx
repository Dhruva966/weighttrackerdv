type AppLogoProps = {
  /** Show the "Lift" wordmark next to the mark. Default true. */
  showWordmark?: boolean;
  /** Mark size in CSS pixels. Default 28. */
  size?: number;
  className?: string;
};

/** Soft-gold kawaii dumbbell mark + optional Lift wordmark. */
export function AppLogo({ showWordmark = true, size = 28, className = '' }: AppLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <img
        src="/favicon.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 select-none"
        draggable={false}
        aria-hidden
      />
      {showWordmark ? <span>Lift</span> : null}
    </span>
  );
}
