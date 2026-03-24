export interface DripStep {
  delayDays?: number;
  delayHours?: number;
  templateId: string;
  label: string;
  channel?: 'email' | 'sms';
  customMessage?: string;
}

/**
 * Parse funnel timing strings into delay values.
 * "Immediate" → 0 hours
 * "Day 2" → 2 days
 * "Day 14" → 14 days
 * "Hour 1" → 1 hour
 */
export function parseTimingToDelay(timing: string): { delayDays?: number; delayHours?: number } {
  const t = timing.trim().toLowerCase();
  if (t === 'immediate' || t === 'instant' || t === 'now') {
    return { delayHours: 0 };
  }
  const dayMatch = t.match(/day\s*(\d+)/);
  if (dayMatch) return { delayDays: parseInt(dayMatch[1], 10) };
  const hourMatch = t.match(/hour\s*(\d+)/);
  if (hourMatch) return { delayHours: parseInt(hourMatch[1], 10) };
  const weekMatch = t.match(/week\s*(\d+)/);
  if (weekMatch) return { delayDays: parseInt(weekMatch[1], 10) * 7 };
  // Default: try parsing as number of days
  const num = parseInt(t, 10);
  if (!isNaN(num)) return { delayDays: num };
  return { delayDays: 1 };
}

/**
 * Convert funnel config post-conversion steps into drip steps.
 */
export function funnelConfigToDripSteps(
  postConversion: { channel: 'sms' | 'email'; message: string; timing: string }[]
): DripStep[] {
  return postConversion.map((step, i) => {
    const delay = parseTimingToDelay(step.timing);
    return {
      ...delay,
      templateId: step.channel === 'sms' ? 'funnel_sms' : 'funnel_email',
      label: `${step.channel.toUpperCase()} — ${step.timing}`,
      channel: step.channel,
      customMessage: step.message,
    };
  });
}

export interface DripSequence {
  id: string;
  name: string;
  description: string;
  steps: DripStep[];
}

export const SEQUENCES: Record<string, DripSequence> = {
  post_audit: {
    id: "post_audit",
    name: "Post-Audit Follow-up",
    description: "Automated nurture sequence after audit form submission",
    steps: [
      { delayDays: 2, templateId: "follow_up", label: "Warm follow-up" },
      { delayDays: 5, templateId: "value_add", label: "Personalized tip" },
      { delayDays: 10, templateId: "check_in", label: "Check-in" },
      { delayDays: 21, templateId: "last_chance", label: "Final touch" },
    ],
  },
  recovery: {
    id: "recovery",
    name: "Abandoned Form Recovery",
    description:
      "Automated recovery sequence for partial/abandoned landing page leads",
    steps: [
      {
        delayHours: 1,
        templateId: "recovery_1hr",
        label: "Quick recovery (1hr)",
      },
      {
        delayHours: 24,
        templateId: "recovery_24hr",
        label: "Urgency nudge (24hr)",
      },
      {
        delayHours: 72,
        templateId: "recovery_72hr",
        label: "Discount offer (72hr)",
      },
    ],
  },
};
