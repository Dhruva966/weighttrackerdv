/**
 * Scheduler store for managing exercise frequencies and training splits.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayType, ExerciseFrequency, SchedulerConfig } from '../lib/exercise-scheduler';

export type TrainingSplit = 'ppl' | 'upper-lower' | 'bro-split' | 'custom';

export interface SchedulerState {
  // Exercise frequency settings
  frequencies: ExerciseFrequency[];
  
  // Training split preference
  split: TrainingSplit;
  currentDayType: DayType;  // What type of day is today
  
  // Scheduler config
  config: SchedulerConfig;
  
  // Actions
  setFrequency: (exerciseId: string, targetDays: number, priority: 'high' | 'medium' | 'low') => void;
  removeFrequency: (exerciseId: string) => void;
  setSplit: (split: TrainingSplit) => void;
  setCurrentDayType: (dayType: DayType) => void;
  updateConfig: (config: Partial<SchedulerConfig>) => void;
  
  // Bulk operations
  setFrequenciesForMuscleGroup: (
    muscleGroup: string,
    targetDays: number,
    priority: 'high' | 'medium' | 'low',
    exerciseIds: string[],
  ) => void;
}

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set) => ({
      frequencies: [],
      split: 'ppl',
      currentDayType: 'any',
      config: {
        defaultInterval: 7,
        staleThreshold: 14,
        carryoverEnabled: true,
      },

      setFrequency: (exerciseId, targetDays, priority) =>
        set((state) => {
          const existing = state.frequencies.find((f) => f.exerciseId === exerciseId);
          if (existing) {
            return {
              frequencies: state.frequencies.map((f) =>
                f.exerciseId === exerciseId
                  ? { ...f, targetDaysInterval: targetDays, priority }
                  : f,
              ),
            };
          }
          return {
            frequencies: [
              ...state.frequencies,
              { exerciseId, targetDaysInterval: targetDays, priority },
            ],
          };
        }),

      removeFrequency: (exerciseId) =>
        set((state) => ({
          frequencies: state.frequencies.filter((f) => f.exerciseId !== exerciseId),
        })),

      setSplit: (split) => set({ split }),

      setCurrentDayType: (dayType) => set({ currentDayType: dayType }),

      updateConfig: (configUpdate) =>
        set((state) => ({
          config: { ...state.config, ...configUpdate },
        })),

      setFrequenciesForMuscleGroup: (_muscleGroup, targetDays, priority, exerciseIds) =>
        set((state) => {
          const newFrequencies = exerciseIds.map((id) => ({
            exerciseId: id,
            targetDaysInterval: targetDays,
            priority,
          }));
          
          // Remove existing frequencies for these exercises
          const filtered = state.frequencies.filter(
            (f) => !exerciseIds.includes(f.exerciseId),
          );
          
          return {
            frequencies: [...filtered, ...newFrequencies],
          };
        }),
    }),
    {
      name: 'lift-scheduler-v1',
    },
  ),
);
