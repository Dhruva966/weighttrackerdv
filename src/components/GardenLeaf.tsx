import { motion } from 'framer-motion';

type Props = {
  days: number;
  className?: string;
};

/** Decorative leaf that grows with tended garden days (1–21). */
export function GardenLeaf({ days, className = '' }: Props) {
  const stage = Math.max(1, Math.min(21, days));
  const scale = 0.55 + (stage / 21) * 0.55;
  const stem = 24 + stage * 1.6;

  return (
    <div className={`relative grid place-items-center ${className}`} aria-hidden>
      <svg viewBox="0 0 120 160" className="h-36 w-28 overflow-visible">
        <defs>
          <linearGradient id="leafFill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#7BAF88" />
            <stop offset="100%" stopColor="#3D6B4F" />
          </linearGradient>
        </defs>
        <motion.line
          x1="60"
          y1="150"
          x2="60"
          y2={150 - stem}
          stroke="#5A7A62"
          strokeWidth="3"
          strokeLinecap="round"
          initial={false}
          animate={{ y2: 150 - stem }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.g
          style={{ originX: '60px', originY: `${150 - stem}px` }}
          initial={false}
          animate={{ scale }}
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
        >
          <path
            d={`M60 ${150 - stem}
                C 88 ${150 - stem - 10}, 102 ${150 - stem - 42}, 84 ${150 - stem - 70}
                C 70 ${150 - stem - 88}, 60 ${150 - stem - 92}, 60 ${150 - stem - 92}
                C 60 ${150 - stem - 92}, 50 ${150 - stem - 88}, 36 ${150 - stem - 70}
                C 18 ${150 - stem - 42}, 32 ${150 - stem - 10}, 60 ${150 - stem}
                Z`}
            fill="url(#leafFill)"
            opacity="0.95"
          />
          <path
            d={`M60 ${150 - stem} C 60 ${150 - stem - 30}, 60 ${150 - stem - 55}, 60 ${150 - stem - 88}`}
            stroke="#2F523D"
            strokeWidth="1.5"
            fill="none"
            opacity="0.55"
          />
        </motion.g>
      </svg>
      <p className="mt-1 text-center text-xs tracking-wide text-fgMuted">{stage} day{stage === 1 ? '' : 's'} tended</p>
    </div>
  );
}
