import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  isCompleted: boolean;
  currentStep: number;
  setCompleted: (completed: boolean) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isCompleted: false,
      currentStep: 0,

      setCompleted: (isCompleted) => set({ isCompleted }),
      setStep: (currentStep) => set({ currentStep }),
      reset: () => set({ isCompleted: false, currentStep: 0 }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
