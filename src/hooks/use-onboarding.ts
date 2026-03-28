'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_CHECKLIST } from '@/types/onboarding';
import type { OnboardingState, OnboardingStep, OnboardingChecklistItem } from '@/types/onboarding';

const STORAGE_KEY = 'storageads_onboarding';

const DEFAULT_STATE: OnboardingState = {
  isComplete: false,
  currentStep: 'welcome',
  completedSteps: [],
  facilityConfirmed: false,
  storedgeConnected: false,
  metaConnected: false,
  googleConnected: false,
  firstCampaignLaunched: false,
  firstReservation: false,
  firstMoveIn: false,
};

/**
 * Hook for managing onboarding state.
 * Persists to localStorage for now — server-side tracking via /api/onboarding-checklist when available.
 */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // use defaults
    }
    return DEFAULT_STATE;
  });
  const [loaded, setLoaded] = useState(() => typeof window !== 'undefined');

  // Persist to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loaded]);

  const completeStep = useCallback(
    (step: OnboardingStep) => {
      setState((prev) => {
        const newCompleted = prev.completedSteps.includes(step)
          ? prev.completedSteps
          : [...prev.completedSteps, step];

        const updates: Partial<OnboardingState> = { completedSteps: newCompleted };

        if (step === 'facility') updates.facilityConfirmed = true;
        if (step === 'storedge') updates.storedgeConnected = true;
        if (step === 'ad_accounts') {
          updates.metaConnected = true;
          updates.googleConnected = true;
        }
        if (step === 'complete') updates.isComplete = true;

        return { ...prev, ...updates };
      });
    },
    []
  );

  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComplete: true,
      skippedAt: new Date().toISOString(),
    }));
  }, []);

  const checklist: OnboardingChecklistItem[] = useMemo(() => {
    return DEFAULT_CHECKLIST.map((item) => {
      let isComplete = item.isComplete;
      if (item.id === 'facility_confirmed') isComplete = state.facilityConfirmed;
      if (item.id === 'storedge_connected') isComplete = state.storedgeConnected;
      if (item.id === 'ad_accounts_connected') isComplete = state.metaConnected || state.googleConnected;
      if (item.id === 'first_campaign') isComplete = state.firstCampaignLaunched;
      if (item.id === 'first_reservation') isComplete = state.firstReservation;
      if (item.id === 'first_move_in') isComplete = state.firstMoveIn;
      return { ...item, isComplete };
    });
  }, [state]);

  const completedCount = checklist.filter((i) => i.isComplete).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return {
    state,
    loaded,
    isOnboarding: !state.isComplete,
    currentStep: state.currentStep,
    completeStep,
    skipOnboarding,
    checklist,
    progress,
    completedCount,
    totalCount: checklist.length,
  };
}
