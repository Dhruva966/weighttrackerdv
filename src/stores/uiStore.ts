import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = {
  unit: 'lb' | 'kg';
  restSeconds: number;
  onboardingComplete: boolean;
  preferredName: string;
  focus: 'meals' | 'weight' | 'both';
  setUnit: (unit: 'lb' | 'kg') => void;
  setRestSeconds: (seconds: number) => void;
  completeOnboarding: (input?: { preferredName?: string; focus?: 'meals' | 'weight' | 'both' }) => void;
  resetOnboarding: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unit: 'lb',
      restSeconds: 90,
      onboardingComplete: false,
      preferredName: 'Aloo',
      focus: 'both',
      setUnit: (unit) => set({ unit }),
      setRestSeconds: (restSeconds) => set({ restSeconds }),
      completeOnboarding: (input) =>
        set({
          onboardingComplete: true,
          preferredName: input?.preferredName?.trim() || 'Aloo',
          focus: input?.focus ?? 'both',
        }),
      resetOnboarding: () =>
        set({
          onboardingComplete: false,
          preferredName: 'Aloo',
          focus: 'both',
        }),
    }),
    { name: 'weight-tracker-ui' },
  ),
);
