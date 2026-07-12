import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const lines = ['Stack the small wins.', 'Beat one number today.', 'Clean reps count.', 'Future you reads this log.'];

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
        className="text-sm font-semibold text-accent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {lines[index]}
      </motion.p>
    </AnimatePresence>
  );
}
