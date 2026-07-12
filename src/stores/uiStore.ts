import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = {
  unit: 'lb' | 'kg';
  restSeconds: number;
  setUnit: (unit: 'lb' | 'kg') => void;
  setRestSeconds: (seconds: number) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unit: 'lb',
      restSeconds: 90,
      setUnit: (unit) => set({ unit }),
      setRestSeconds: (restSeconds) => set({ restSeconds }),
    }),
    { name: 'weight-tracker-ui' },
  ),
);
