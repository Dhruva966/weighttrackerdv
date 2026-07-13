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
  onboardingComplete: boolean;
  preferredName: string;
  focus: Focus;
  intentions: Intention[];
  mealDraft: MealDraftPreview;
  previewNotice: string | null;
  setUnit: (unit: 'lb' | 'kg') => void;
  setRestSeconds: (seconds: number) => void;
  completeOnboarding: (input?: { preferredName?: string; focus?: Focus }) => void;
  resetOnboarding: () => void;
  toggleIntention: (id: string) => void;
  setMealDraft: (draft: Partial<MealDraftPreview> & { source: string; raw: string }) => void;
  clearMealDraft: () => void;
  showPreviewNotice: (message: string) => void;
  clearPreviewNotice: () => void;
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
      onboardingComplete: false,
      preferredName: 'Aloo',
      focus: 'both',
      intentions: defaultIntentions,
      mealDraft: { ...uiMock.mealDraft },
      previewNotice: null,
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
    }),
    {
      name: 'weight-tracker-ui',
      partialize: (state) => ({
        unit: state.unit,
        restSeconds: state.restSeconds,
        onboardingComplete: state.onboardingComplete,
        preferredName: state.preferredName,
        focus: state.focus,
        intentions: state.intentions,
      }),
    },
  ),
);
