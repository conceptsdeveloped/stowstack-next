'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { CampaignPlatform, CampaignType } from '@/types/campaign';

export interface CampaignFormState {
  // Step 1: Basics
  name: string;
  facilityId: string;
  platform: CampaignPlatform;
  type: CampaignType;
  dailyBudget: number;
  startDate: string;
  endDate: string;
  // Step 2: Targeting
  targetRadius: number;
  unitTypeFocus: string[];
  // Step 3: Creative
  headlines: string[];
  bodyTexts: string[];
  ctaText: string;
  // Step 4: Landing page
  landingPageId: string;
  // Step 5: Tracking (read-only, computed)
  // Step 6: Review (summary)
}

const INITIAL_STATE: CampaignFormState = {
  name: '',
  facilityId: '',
  platform: 'meta',
  type: 'conversions',
  dailyBudget: 25,
  startDate: '',
  endDate: '',
  targetRadius: 15,
  unitTypeFocus: [],
  headlines: [''],
  bodyTexts: [''],
  ctaText: 'Learn More',
  landingPageId: '',
};

const TOTAL_STEPS = 6;

export interface StepValidation {
  valid: boolean;
  errors: string[];
}

function validateStep(step: number, form: CampaignFormState): StepValidation {
  const errors: string[] = [];

  switch (step) {
    case 1:
      if (!form.name.trim()) errors.push('Campaign name is required');
      if (form.name.length > 80) errors.push('Name must be 80 characters or less');
      if (!form.facilityId) errors.push('Select a facility');
      if (form.dailyBudget < 10) errors.push('Minimum daily budget is $10');
      if (!form.startDate) errors.push('Start date is required');
      if (form.endDate && form.endDate < form.startDate) errors.push('End date must be after start date');
      break;
    case 2:
      if (form.targetRadius < 5 || form.targetRadius > 50) errors.push('Radius must be 5–50 miles');
      break;
    case 3:
      if (form.headlines.filter((h) => h.trim()).length === 0) errors.push('At least one headline is required');
      if (form.bodyTexts.filter((b) => b.trim()).length === 0) errors.push('At least one body text is required');
      break;
    // Steps 4-6 are optional/informational
  }

  return { valid: errors.length === 0, errors };
}

export function useCampaignForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const stepParam = parseInt(searchParams.get('step') || '1');
  const [currentStep, setCurrentStepState] = useState(
    Math.max(1, Math.min(TOTAL_STEPS, stepParam))
  );
  const [form, setForm] = useState<CampaignFormState>(INITIAL_STATE);

  const validation = validateStep(currentStep, form);

  const setStep = useCallback(
    (step: number) => {
      const clamped = Math.max(1, Math.min(TOTAL_STEPS, step));
      setCurrentStepState(clamped);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('step', String(clamped));
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) setStep(currentStep + 1);
  }, [currentStep, setStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) setStep(currentStep - 1);
  }, [currentStep, setStep]);

  const updateForm = useCallback(
    (updates: Partial<CampaignFormState>) => {
      setForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_STATE);
    setStep(1);
  }, [setStep]);

  return {
    form,
    updateForm,
    resetForm,
    currentStep,
    totalSteps: TOTAL_STEPS,
    setStep,
    nextStep,
    prevStep,
    validation,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === TOTAL_STEPS,
  };
}
