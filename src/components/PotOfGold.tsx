import { useId } from 'react';
import { motion } from 'framer-motion';
import { GOLD_CAP, goldVisualStage } from '../lib/gold';

type Props = {
  days: number;
  className?: string;
};

/** Pot of gold that fills as consistency days grow (0–21). */
export function PotOfGold({ days, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const stage = goldVisualStage(days);
  const fill = stage === 0 ? 0.06 : 0.12 + (stage / GOLD_CAP) * 0.88;
  const coinCount = stage === 0 ? 0 : Math.min(12, 1 + Math.floor(stage / 2));
  const glow = stage === 0 ? 0.08 : 0.2 + fill * 0.55;
  const scale = 0.88 + (stage / GOLD_CAP) * 0.18;
  const heapRise = fill * 22;

  const potBody = `potBody-${uid}`;
  const goldFill = `goldFill-${uid}`;
  const goldGlow = `goldGlow-${uid}`;
  const goldClip = `goldClip-${uid}`;

  const caption =
    stage === 0
      ? 'Start compounding — walk, lift, or weigh in'
      : `${stage} day${stage === 1 ? '' : 's'} compounding`;

  return (
    <div className={`relative grid place-items-center ${className}`} aria-hidden>
      <motion.div
        className="origin-bottom"
        initial={false}
        animate={{ scale }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <svg viewBox="0 0 140 160" className="h-36 w-32 overflow-visible">
          <defs>
            <linearGradient id={potBody} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5A4632" />
              <stop offset="100%" stopColor="#3A2C1F" />
            </linearGradient>
            <linearGradient id={goldFill} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#F3D98A" />
              <stop offset="55%" stopColor="#C9A24A" />
              <stop offset="100%" stopColor="#A8842E" />
            </linearGradient>
            <radialGradient id={goldGlow} cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor={`rgba(212, 175, 80, ${glow})`} />
              <stop offset="100%" stopColor="rgba(212, 175, 80, 0)" />
            </radialGradient>
            <clipPath id={goldClip}>
              <motion.rect
                x="40"
                width="60"
                initial={false}
                animate={{ y: 70 - fill * 42, height: fill * 42 + 10 }}
                transition={{ type: 'spring', stiffness: 80, damping: 16 }}
              />
            </clipPath>
          </defs>

          <ellipse cx="70" cy={48 - stage * 0.35} rx={42 + stage * 0.4} ry={24 + stage * 0.25} fill={`url(#${goldGlow})`} />

          <ellipse cx="70" cy="118" rx="34" ry="8" fill="#2A2118" opacity="0.25" />

          <path
            d="M38 72 C38 72, 32 118, 46 132 C54 140, 86 140, 94 132 C108 118, 102 72, 102 72 Z"
            fill={`url(#${potBody})`}
          />
          <ellipse cx="70" cy="72" rx="36" ry="12" fill="#4A3A28" />
          <ellipse cx="70" cy="70" rx="30" ry="9" fill="#2F2418" />

          <g clipPath={`url(#${goldClip})`}>
            <ellipse cx="70" cy="68" rx="28" ry="9" fill={`url(#${goldFill})`} opacity={stage === 0 ? 0.35 : 1} />
            {Array.from({ length: coinCount }, (_, index) => {
              const angle = (index / Math.max(coinCount, 1)) * Math.PI * 2;
              const ring = 8 + (index % 4) * 3.5;
              const cx = 70 + Math.cos(angle) * ring;
              const cy = 62 - Math.sin(angle * 0.85) * (4 + index * 0.55) - heapRise * 0.55;
              return (
                <motion.ellipse
                  key={index}
                  cx={cx}
                  cy={cy}
                  rx={6.5 + (index % 3) * 0.4}
                  ry={3.2 + (index % 2) * 0.3}
                  fill={`url(#${goldFill})`}
                  stroke="#8F6F28"
                  strokeWidth="0.6"
                  initial={false}
                  animate={{ cy, opacity: 0.8 + (index % 3) * 0.07 }}
                  transition={{ type: 'spring', stiffness: 90, damping: 14, delay: index * 0.02 }}
                />
              );
            })}
          </g>

          <ellipse
            cx="70"
            cy={64 - heapRise * 0.15}
            rx={18 + fill * 8}
            ry={4 + fill * 2}
            fill="#F7E7B0"
            opacity={0.15 + fill * 0.45}
          />

          {stage >= 14 ? (
            <circle cx="52" cy={48 - heapRise * 0.2} r="1.6" fill="#FFF6D6" opacity="0.9" />
          ) : null}
          {stage >= 18 ? (
            <circle cx="88" cy={44 - heapRise * 0.25} r="1.3" fill="#FFF6D6" opacity="0.85" />
          ) : null}
        </svg>
      </motion.div>
      <p className="mt-1 max-w-[11rem] text-center text-xs leading-snug tracking-wide text-fgMuted">
        {caption}
      </p>
    </div>
  );
}
