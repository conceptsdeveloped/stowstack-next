export interface DripStep {
  delayDays?: number;
  delayHours?: number;
  templateId: string;
  label: string;
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
