import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealItemEstimate } from '../lib/meal-from-text';

export type Intention = { id: string; name: string; done: boolean };

export type MealDraftPreview = {
  source: string;
  raw: string;
  items: MealItemEstimate[];
};

type Focus = 'meals' | 'weight' | 'both';

type UiState = {
  unit: 'lb' | 'kg';
  restSeconds: number;
  /** Stashed: always treat as complete until onboarding returns. */
  onboardingComplete: boolean;
  preferredName: string;
  focus: Focus;
  intentions: Intention[];
  mealDraft: MealDraftPreview;
  previewNotice: string | null;
  /** Days of consistency — drives pot-of-gold growth. */
  goldDays: number;
  setUnit: (unit: 'lb' | 'kg') => void;
  setRestSeconds: (seconds: number) => void;
  completeOnboarding: (input?: { preferredName?: string; focus?: Focus }) => void;
  resetOnboarding: () => void;
  toggleIntention: (id: string) => void;
  addIntention: (name: string) => Intention | null;
  removeIntention: (id: string) => void;
  setMealDraft: (draft: Partial<MealDraftPreview> & { source: string; raw: string }) => void;
  clearMealDraft: () => void;
  showPreviewNotice: (message: string) => void;
  clearPreviewNotice: () => void;
  tendGold: () => void;
};

const defaultIntentions: Intention[] = [
  { id: 'g1', name: 'Morning weigh-in', done: false },
  { id: 'g2', name: 'Train today (gym or walk)', done: false },
  { id: 'g3', name: 'Better than yesterday', done: false },
];

const emptyDraft: MealDraftPreview = {
  source: 'Universal command',
  raw: '',
  items: [],
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unit: 'lb',
      restSeconds: 90,
      onboardingComplete: true,
      preferredName: 'Dhruva',
      focus: 'both',
      intentions: defaultIntentions,
      mealDraft: emptyDraft,
      previewNotice: null,
      goldDays: 1,
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
      setMealDraft: (draft) =>
        set((state) => ({
          mealDraft: {
            source: draft.source,
            raw: draft.raw,
            items: draft.items ?? state.mealDraft.items,
          },
        })),
      clearMealDraft: () => set({ mealDraft: emptyDraft }),
      showPreviewNotice: (message) => set({ previewNotice: message }),
      clearPreviewNotice: () => set({ previewNotice: null }),
      tendGold: () => set((state) => ({ goldDays: Math.min(21, state.goldDays + 1) })),
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
