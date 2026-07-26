import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Intention = { id: string; name: string; done: boolean };

type Focus = 'weight' | 'training' | 'both';

type UiState = {
  unit: 'lb' | 'kg';
  restSeconds: number;
  /** Stashed: always treat as complete until onboarding returns. */
  onboardingComplete: boolean;
  preferredName: string;
  focus: Focus;
  intentions: Intention[];
  previewNotice: string | null;
  /**
   * Compounding consistency days for Pot of Gold (0–21).
   * Recomputed by `syncPotOfGold` from weigh-ins, walks, and gym days.
   */
  goldDays: number;
  setUnit: (unit: 'lb' | 'kg') => void;
  setRestSeconds: (seconds: number) => void;
  completeOnboarding: (input?: { preferredName?: string; focus?: Focus }) => void;
  resetOnboarding: () => void;
  toggleIntention: (id: string) => void;
  addIntention: (name: string) => Intention | null;
  removeIntention: (id: string) => void;
  showPreviewNotice: (message: string) => void;
  clearPreviewNotice: () => void;
  setGoldDays: (days: number) => void;
};

const defaultIntentions: Intention[] = [
  { id: 'g1', name: 'Morning weigh-in', done: false },
  { id: 'g2', name: 'Train today (gym or walk)', done: false },
  { id: 'g3', name: 'Better than yesterday', done: false },
];

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unit: 'lb',
      restSeconds: 90,
      onboardingComplete: true,
      preferredName: 'Dhruva',
      focus: 'both',
      intentions: defaultIntentions,
      previewNotice: null,
      goldDays: 0,
      setUnit: (unit) => set({ unit }),
      setRestSeconds: (restSeconds) => set({ restSeconds }),
      completeOnboarding: (input) =>
        set({
          onboardingComplete: true,
          preferredName: input?.preferredName?.trim() || 'Dhruva',
          focus: input?.focus ?? 'both',
        }),
      resetOnboarding: () =>
        set({
          onboardingComplete: true,
          preferredName: 'Dhruva',
          focus: 'both',
        }),
      toggleIntention: (id) =>
        set((state) => ({
          intentions: state.intentions.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        })),
      addIntention: (name) => {
        const trimmed = name.trim();
        if (!trimmed) {
          return null;
        }
        const intention: Intention = {
          id: `g-${crypto.randomUUID()}`,
          name: trimmed.slice(0, 80),
          done: false,
        };
        set((state) => ({ intentions: [...state.intentions, intention] }));
        return intention;
      },
      removeIntention: (id) =>
        set((state) => ({
          intentions: state.intentions.filter((item) => item.id !== id),
        })),
      showPreviewNotice: (message) => set({ previewNotice: message }),
      clearPreviewNotice: () => set({ previewNotice: null }),
      setGoldDays: (days) =>
        set((state) => {
          const next = Math.max(0, Math.min(21, Math.floor(days)));
          return state.goldDays === next ? state : { goldDays: next };
        }),
    }),
    {
      name: 'aloo-ui-v1',
      partialize: (state) => ({
        unit: state.unit,
        restSeconds: state.restSeconds,
        onboardingComplete: true,
        preferredName: state.preferredName,
        focus: state.focus,
        intentions: state.intentions,
        goldDays: state.goldDays,
      }),
    },
  ),
);
