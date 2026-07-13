import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useUiStore } from '../stores/uiStore';

export function EncouragementLine() {
  const preferredName = useUiStore((state) => state.preferredName);
  const name = preferredName || 'friend';
  const lines = [
    'Better than yesterday — that’s the whole game.',
    'Discipline compounds. Show up once more.',
    'Stay lean, stay sharp, keep building.',
    `Keep stacking wins, ${name}.`,
  ];
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const interval = window.setInterval(() => setIndex((value) => (value + 1) % lines.length), 8000);
    return () => window.clearInterval(interval);
  }, [lines.length, reduceMotion]);

  if (reduceMotion) {
    return <p className="text-editorial text-fgMuted">{lines[0]}</p>;
  }

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
