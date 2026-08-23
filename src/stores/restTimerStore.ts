/**
 * Rest timer store for tracking rest periods between sets.
 */
import { create } from 'zustand';

export interface RestTimerState {
  // Timer state
  isActive: boolean;
  startTime: number | null; // timestamp when timer started
  duration: number; // seconds (default: 150 = 2:30)
  
  // Settings
  autoStart: boolean; // Auto-start after logging a set
  defaultDuration: number; // Default rest duration in seconds
  
  // Notification preferences
  vibrate: boolean;
  notifyAt30s: boolean;
  
  // Actions
  start: (duration?: number) => void;
  stop: () => void;
  reset: () => void;
  setDuration: (seconds: number) => void;
  setAutoStart: (enabled: boolean) => void;
  
  // Computed
  getTimeRemaining: () => number;
  isComplete: () => boolean;
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  isActive: false,
  startTime: null,
  duration: 150, // 2:30 default
  autoStart: true,
  defaultDuration: 150,
  vibrate: true,
  notifyAt30s: true,

  start: (customDuration) => {
    const duration = customDuration ?? get().defaultDuration;
    set({
      isActive: true,
      startTime: Date.now(),
      duration,
    });
  },

  stop: () => {
    set({
      isActive: false,
      startTime: null,
    });
  },

  reset: () => {
    set({
      isActive: false,
      startTime: null,
      duration: get().defaultDuration,
    });
  },

  setDuration: (seconds) => {
    set({ defaultDuration: seconds, duration: seconds });
  },

  setAutoStart: (enabled) => {
    set({ autoStart: enabled });
  },

  getTimeRemaining: () => {
    const state = get();
    if (!state.isActive || !state.startTime) return 0;
    
    const elapsed = (Date.now() - state.startTime) / 1000;
    const remaining = Math.max(0, state.duration - elapsed);
    return Math.floor(remaining);
  },

  isComplete: () => {
    return get().getTimeRemaining() === 0 && get().isActive;
  },
}));
