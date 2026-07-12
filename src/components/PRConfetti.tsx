import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { usePrStore } from '../stores/prStore';

export function PRConfetti() {
  const lastPr = usePrStore((state) => state.lastPr);

  useEffect(() => {
    if (!lastPr) {
      return;
    }

    void confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.72 },
      colors: ['#00FF88', '#FFD400', '#FAFAFA'],
    });
  }, [lastPr]);

  return null;
}
