import { create } from 'zustand';

type PrEvent = {
  id: string;
  exerciseName: string;
  weightLb: number;
  reps: number;
};

type PrState = {
  lastPr?: PrEvent;
  firePr: (event: PrEvent) => void;
  clearPr: () => void;
};

export const usePrStore = create<PrState>((set) => ({
  firePr: (event) => set({ lastPr: event }),
  clearPr: () => set({ lastPr: undefined }),
}));
