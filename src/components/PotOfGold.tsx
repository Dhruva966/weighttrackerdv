import { motion } from 'framer-motion';

type Props = {
  days: number;
  className?: string;
};

/** Pot of gold that fills as consistency days grow (1–21). */
export function PotOfGold({ days, className = '' }: Props) {
  const stage = Math.max(1, Math.min(21, days));
  const fill = 0.18 + (stage / 21) * 0.82;
  const coinCount = Math.min(7, 2 + Math.floor(stage / 3));
  const glow = 0.15 + fill * 0.45;

  return (
    <div className={`relative grid place-items-center ${className}`} aria-hidden>
      <svg viewBox="0 0 140 160" className="h-36 w-32 overflow-visible">
        <defs>
          <linearGradient id="potBody" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5A4632" />
            <stop offset="100%" stopColor="#3A2C1F" />
          </linearGradient>
          <linearGradient id="goldFill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F3D98A" />
            <stop offset="55%" stopColor="#C9A24A" />
            <stop offset="100%" stopColor="#A8842E" />
          </linearGradient>
          <radialGradient id="goldGlow" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={`rgba(212, 175, 80, ${glow})`} />
            <stop offset="100%" stopColor="rgba(212, 175, 80, 0)" />
          </radialGradient>
        </defs>

        <ellipse cx="70" cy="52" rx="48" ry="28" fill="url(#goldGlow)" />

        <ellipse cx="70" cy="118" rx="34" ry="8" fill="#2A2118" opacity="0.25" />

        <path
          d="M38 72 C38 72, 32 118, 46 132 C54 140, 86 140, 94 132 C108 118, 102 72, 102 72 Z"
          fill="url(#potBody)"
        />
        <ellipse cx="70" cy="72" rx="36" ry="12" fill="#4A3A28" />
        <ellipse cx="70" cy="70" rx="30" ry="9" fill="#2F2418" />

        <motion.clipPath id="goldClip">
          <motion.rect
            x="40"
            width="60"
            initial={false}
            animate={{ y: 70 - fill * 38, height: fill * 38 + 8 }}
            transition={{ type: 'spring', stiffness: 80, damping: 16 }}
          />
        </motion.clipPath>

        <g clipPath="url(#goldClip)">
          <ellipse cx="70" cy="68" rx="28" ry="9" fill="url(#goldFill)" />
          {Array.from({ length: coinCount }, (_, index) => {
            const angle = (index / coinCount) * Math.PI * 2;
            const cx = 70 + Math.cos(angle) * (10 + (index % 3) * 4);
            const cy = 58 - Math.sin(angle * 0.8) * (6 + index) - fill * 10;
            return (
              <motion.ellipse
                key={index}
                cx={cx}
                cy={cy}
                rx="7"
                ry="3.5"
                fill="url(#goldFill)"
                stroke="#8F6F28"
                strokeWidth="0.6"
                initial={false}
                animate={{ cy, opacity: 0.85 + (index % 3) * 0.05 }}
                transition={{ type: 'spring', stiffness: 90, damping: 14, delay: index * 0.03 }}
              />
            );
          })}
        </g>

        <ellipse cx="70" cy="62" rx="22" ry="5" fill="#F7E7B0" opacity={0.25 + fill * 0.35} />
      </svg>
      <p className="mt-1 text-center text-xs tracking-wide text-fgMuted">
        {stage} day{stage === 1 ? '' : 's'} compounding
      </p>
    </div>
  );
}
