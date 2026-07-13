import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const lines = [
  'Showing up today already counts.',
  'One honest note is enough.',
  'Home cooking is a quiet win.',
  'You’re building a kinder rhythm.',
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
