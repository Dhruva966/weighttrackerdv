import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const lines = [
  'Tired is real — one tiny step still counts.',
  'Motivation grows after you start, not before.',
  'Thinking a lot is okay. Execution can be small.',
  'You’re building a kinder rhythm, Aloo.',
];

export function EncouragementLine() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setIndex((value) => (value + 1) % lines.length), 8000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={lines[index]}
        className="text-editorial text-fgMuted"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {lines[index]}
      </motion.p>
    </AnimatePresence>
  );
}
