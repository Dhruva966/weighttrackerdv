import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uiMock } from '../data/uiMock';

export type Intention = { id: string; name: string; done: boolean };

export type MealDraftPreview = {
  source: string;
  raw: string;
  items: typeof uiMock.mealDraft.items;
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
  /** Days tended — drives garden leaf growth (demo). */
  gardenDays: number;
  setUnit: (unit: 'lb' | 'kg') => void;
  setRestSeconds: (seconds: number) => void;
  completeOnboarding: (input?: { preferredName?: string; focus?: Focus }) => void;
  resetOnboarding: () => void;
  toggleIntention: (id: string) => void;
  setMealDraft: (draft: Partial<MealDraftPreview> & { source: string; raw: string }) => void;
  clearMealDraft: () => void;
  showPreviewNotice: (message: string) => void;
  clearPreviewNotice: () => void;
  tendGarden: () => void;
};

const defaultIntentions: Intention[] = uiMock.goals.map((goal) => ({
  id: goal.id,
  name: goal.name,
  done: goal.done,
}));

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unit: 'lb',
      restSeconds: 90,
      onboardingComplete: true,
      preferredName: 'Aloo',
      focus: 'both',
      intentions: defaultIntentions,
      mealDraft: { ...uiMock.mealDraft },
      previewNotice: null,
      gardenDays: 3,
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
          // Stashed: replay is a no-op for gating, but resets name gently
          onboardingComplete: true,
          preferredName: 'Aloo',
          focus: 'both',
        }),
      toggleIntention: (id) =>
        set((state) => ({
          intentions: state.intentions.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        })),
      setMealDraft: (draft) =>
        set((state) => ({
          mealDraft: {
            source: draft.source,
            raw: draft.raw,
            items: draft.items ?? state.mealDraft.items,
          },
        })),
      clearMealDraft: () => set({ mealDraft: { ...uiMock.mealDraft } }),
      showPreviewNotice: (message) => set({ previewNotice: message }),
      clearPreviewNotice: () => set({ previewNotice: null }),
      tendGarden: () => set((state) => ({ gardenDays: Math.min(21, state.gardenDays + 1) })),
    }),
    {
      name: 'weight-tracker-ui-v2',
      partialize: (state) => ({
        unit: state.unit,
        restSeconds: state.restSeconds,
        onboardingComplete: true,
        preferredName: state.preferredName,
        focus: state.focus,
        intentions: state.intentions,
        gardenDays: state.gardenDays,
      }),
    },
  ),
);
