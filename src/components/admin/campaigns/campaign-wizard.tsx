'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Check,
  Loader2,
  Target,
  Megaphone,
  FileText,
  Link2,
  BarChart3,
  Eye,
} from 'lucide-react';
import { useCampaignForm } from '@/hooks/use-campaign-form';
import { useFacility } from '@/lib/facility-context';
import { adminFetch } from '@/hooks/use-admin-fetch';
import { DatePicker } from '@/components/date/date-picker';
import type { CampaignFormState } from '@/hooks/use-campaign-form';
import type { CampaignPlatform, CampaignType } from '@/types/campaign';

const STEPS = [
  { label: 'Basics', icon: Target },
  { label: 'Targeting', icon: Megaphone },
  { label: 'Creative', icon: FileText },
  { label: 'Landing Page', icon: Link2 },
  { label: 'Tracking', icon: BarChart3 },
  { label: 'Review', icon: Eye },
];

const UNIT_TYPES = [
  'Climate 10x10',
  'Climate 5x10',
  'Standard 10x10',
  'Standard 5x10',
  'Standard 10x15',
  'Standard 10x20',
  'Vehicle / RV',
  'Outdoor',
];

const CTA_OPTIONS = ['Learn More', 'Book Now', 'Get Offer', 'Sign Up', 'Reserve Now'];

/* ─── Step Components ─── */

function Step1Basics({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (u: Partial<CampaignFormState>) => void;
}) {
  const { facilities, currentId } = useFacility();

  return (
    <div className="space-y-5">
      {/* Campaign name */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Campaign Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          maxLength={80}
          placeholder="e.g. Climate 10x10 — Spring 2026"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
          style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
          autoFocus
        />
        <span className="text-xs mt-1 block" style={{ color: form.name.length > 70 ? 'var(--color-red)' : 'var(--color-mid-gray)' }}>
          {form.name.length}/80
        </span>
      </div>

      {/* Facility */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Facility
        </label>
        <select
          value={form.facilityId || (currentId !== 'all' ? currentId : '')}
          onChange={(e) => update({ facilityId: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
          style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
        >
          <option value="">Select facility...</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name} — {f.location}</option>
          ))}
        </select>
      </div>

      {/* Platform */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Platform
        </label>
        <div className="flex gap-2">
          {(['meta', 'google', 'tiktok'] as CampaignPlatform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => update({ platform: p })}
              className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-center capitalize"
              style={{
                fontFamily: 'var(--font-heading)',
                borderColor: form.platform === p ? 'var(--color-gold)' : 'var(--color-light-gray)',
                backgroundColor: form.platform === p ? 'var(--color-gold-light)' : 'var(--color-light)',
                color: form.platform === p ? 'var(--color-gold)' : 'var(--color-body-text)',
              }}
            >
              {p === 'meta' ? 'Meta' : p === 'google' ? 'Google' : 'TikTok'}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Type */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Campaign Type
        </label>
        <select
          value={form.type}
          onChange={(e) => update({ type: e.target.value as CampaignType })}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
          style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
        >
          <option value="conversions">Conversions (move-ins)</option>
          <option value="traffic">Traffic (clicks)</option>
          <option value="awareness">Awareness (impressions)</option>
        </select>
      </div>

      {/* Daily Budget */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Daily Budget
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-mid-gray)' }}>$</span>
          <input
            type="number"
            value={form.dailyBudget}
            onChange={(e) => update({ dailyBudget: Math.max(10, parseInt(e.target.value) || 10) })}
            min={10}
            step={5}
            className="w-full rounded-lg border pl-7 pr-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
            style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-heading)' }}
          />
        </div>
        <span className="text-xs mt-1 block" style={{ color: 'var(--color-mid-gray)' }}>
          Est. ${(form.dailyBudget * 30).toLocaleString()}/month
        </span>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
            Start Date
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
            style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
            End Date (optional)
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            min={form.startDate || new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
            style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
          />
        </div>
      </div>
    </div>
  );
}

function Step2Targeting({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (u: Partial<CampaignFormState>) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Radius */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Target Radius: {form.targetRadius} miles
        </label>
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={form.targetRadius}
          onChange={(e) => update({ targetRadius: parseInt(e.target.value) })}
          className="w-full accent-[var(--color-gold)]"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-mid-gray)' }}>
          <span>5 mi</span>
          <span>50 mi</span>
        </div>
      </div>

      {/* Unit Type Focus */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Unit Type Focus
        </label>
        <div className="grid grid-cols-2 gap-2">
          {UNIT_TYPES.map((unit) => {
            const selected = form.unitTypeFocus.includes(unit);
            return (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  update({
                    unitTypeFocus: selected
                      ? form.unitTypeFocus.filter((u) => u !== unit)
                      : [...form.unitTypeFocus, unit],
                  });
                }}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  borderColor: selected ? 'var(--color-gold)' : 'var(--color-light-gray)',
                  backgroundColor: selected ? 'var(--color-gold-light)' : 'var(--color-light)',
                  color: selected ? 'var(--color-gold)' : 'var(--color-body-text)',
                }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                  style={{
                    borderColor: selected ? 'var(--color-gold)' : 'var(--color-light-gray)',
                    backgroundColor: selected ? 'var(--color-gold)' : 'transparent',
                  }}
                >
                  {selected && <Check className="h-3 w-3 text-white" />}
                </span>
                {unit}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step3Creative({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (u: Partial<CampaignFormState>) => void;
}) {
  const maxHeadlineLen = form.platform === 'google' ? 30 : 40;
  const maxBodyLen = form.platform === 'google' ? 90 : 125;

  return (
    <div className="space-y-5">
      {/* Headlines */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Headlines ({form.platform === 'google' ? 'max 30 chars' : 'max 40 chars'})
        </label>
        {form.headlines.map((h, i) => (
          <div key={i} className="mb-2">
            <div className="relative">
              <input
                type="text"
                value={h}
                onChange={(e) => {
                  const updated = [...form.headlines];
                  updated[i] = e.target.value;
                  update({ headlines: updated });
                }}
                maxLength={maxHeadlineLen}
                placeholder={`Headline ${i + 1}`}
                className="w-full rounded-lg border px-3 py-2 pr-12 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
                style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
                style={{ color: h.length >= maxHeadlineLen ? 'var(--color-red)' : 'var(--color-mid-gray)' }}
              >
                {h.length}/{maxHeadlineLen}
              </span>
            </div>
          </div>
        ))}
        {form.headlines.length < 5 && (
          <button
            type="button"
            onClick={() => update({ headlines: [...form.headlines, ''] })}
            className="text-xs font-medium"
            style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-heading)' }}
          >
            + Add headline
          </button>
        )}
      </div>

      {/* Body texts */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Body Text ({form.platform === 'google' ? 'max 90 chars' : 'max 125 chars'})
        </label>
        {form.bodyTexts.map((b, i) => (
          <div key={i} className="mb-2">
            <div className="relative">
              <textarea
                value={b}
                onChange={(e) => {
                  const updated = [...form.bodyTexts];
                  updated[i] = e.target.value;
                  update({ bodyTexts: updated });
                }}
                maxLength={maxBodyLen}
                placeholder={`Body text ${i + 1}`}
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)] resize-none"
                style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
              />
              <span
                className="absolute right-3 bottom-2 text-[10px]"
                style={{ color: b.length >= maxBodyLen ? 'var(--color-red)' : 'var(--color-mid-gray)' }}
              >
                {b.length}/{maxBodyLen}
              </span>
            </div>
          </div>
        ))}
        {form.bodyTexts.length < 3 && (
          <button
            type="button"
            onClick={() => update({ bodyTexts: [...form.bodyTexts, ''] })}
            className="text-xs font-medium"
            style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-heading)' }}
          >
            + Add body text
          </button>
        )}
      </div>

      {/* CTA */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
          Call to Action
        </label>
        <div className="flex flex-wrap gap-2">
          {CTA_OPTIONS.map((cta) => (
            <button
              key={cta}
              type="button"
              onClick={() => update({ ctaText: cta })}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                borderColor: form.ctaText === cta ? 'var(--color-gold)' : 'var(--color-light-gray)',
                backgroundColor: form.ctaText === cta ? 'var(--color-gold-light)' : 'var(--color-light)',
                color: form.ctaText === cta ? 'var(--color-gold)' : 'var(--color-body-text)',
              }}
            >
              {cta}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step4LandingPage({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (u: Partial<CampaignFormState>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
        Every campaign needs a dedicated landing page with an embedded storEDGE reservation flow.
        Select an existing page or create a new one.
      </p>

      <div
        className="rounded-xl border p-6 text-center"
        style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)' }}
      >
        <Link2 className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--color-mid-gray)' }} />
        <p className="text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
          Landing pages for this facility
        </p>
        <p className="text-xs mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
          Create landing pages in the Facility Manager → Landing Pages tab, then link them here.
        </p>
        <input
          type="text"
          value={form.landingPageId}
          onChange={(e) => update({ landingPageId: e.target.value })}
          placeholder="Landing page ID (optional)"
          className="w-full max-w-xs mx-auto rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
          style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
        />
      </div>
    </div>
  );
}

function Step5Tracking({ form }: { form: CampaignFormState }) {
  const utmSource = form.platform === 'meta' ? 'facebook' : form.platform;
  const utmMedium = form.type === 'awareness' ? 'display' : 'cpc';
  const utmCampaign = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
        These tracking parameters will be automatically appended to your landing page URL
        for full-funnel attribution from ad click to move-in.
      </p>

      <div className="rounded-lg border p-4 space-y-2" style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--color-light-gray)' }}>
        <div className="flex justify-between text-sm">
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)', fontSize: '12px' }}>utm_source</span>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontWeight: 500 }}>{utmSource}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)', fontSize: '12px' }}>utm_medium</span>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontWeight: 500 }}>{utmMedium}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)', fontSize: '12px' }}>utm_campaign</span>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontWeight: 500 }}>{utmCampaign || '—'}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--color-light-gray)' }}>
          <span className="text-sm" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
            {form.platform === 'meta' ? 'Meta Pixel' : 'Google Conversion Tracking'}
          </span>
          <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--color-light-gray)', color: 'var(--color-mid-gray)' }}>
            Check in Settings → Integrations
          </span>
        </div>
        {form.platform === 'meta' && (
          <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--color-light-gray)' }}>
            <span className="text-sm" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
              Conversions API (CAPI)
            </span>
            <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--color-light-gray)', color: 'var(--color-mid-gray)' }}>
              Check in Settings → Integrations
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Step6Review({
  form,
  onEditStep,
}: {
  form: CampaignFormState;
  onEditStep: (step: number) => void;
}) {
  const { facilities } = useFacility();
  const facility = facilities.find((f) => f.id === form.facilityId);

  const sections = [
    {
      title: 'Basics',
      step: 1,
      items: [
        { label: 'Name', value: form.name || '—' },
        { label: 'Facility', value: facility?.name || form.facilityId || '—' },
        { label: 'Platform', value: form.platform.charAt(0).toUpperCase() + form.platform.slice(1) },
        { label: 'Type', value: form.type.charAt(0).toUpperCase() + form.type.slice(1) },
        { label: 'Daily Budget', value: `$${form.dailyBudget}` },
        { label: 'Est. Monthly', value: `$${(form.dailyBudget * 30).toLocaleString()}` },
      ],
    },
    {
      title: 'Targeting',
      step: 2,
      items: [
        { label: 'Radius', value: `${form.targetRadius} miles` },
        { label: 'Unit Types', value: form.unitTypeFocus.join(', ') || 'All' },
      ],
    },
    {
      title: 'Creative',
      step: 3,
      items: [
        { label: 'Headlines', value: form.headlines.filter(Boolean).join(' | ') || '—' },
        { label: 'Body Text', value: form.bodyTexts.filter(Boolean)[0]?.substring(0, 60) + '...' || '—' },
        { label: 'CTA', value: form.ctaText },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--color-light-gray)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}>
              {section.title}
            </h4>
            <button
              type="button"
              onClick={() => onEditStep(section.step)}
              className="text-xs font-medium"
              style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-heading)' }}
            >
              Edit
            </button>
          </div>
          <div className="space-y-1.5">
            {section.items.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)', fontSize: '13px' }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontWeight: 500, fontSize: '13px', maxWidth: '60%', textAlign: 'right' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Wizard ─── */

export function CampaignWizard() {
  const router = useRouter();
  const {
    form,
    updateForm,
    currentStep,
    totalSteps,
    setStep,
    nextStep,
    prevStep,
    validation,
    isFirstStep,
    isLastStep,
  } = useCampaignForm();

  const [saving, setSaving] = useState(false);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await adminFetch('/api/facility-creatives', {
        method: 'POST',
        body: JSON.stringify({
          facilityId: form.facilityId,
          platform: form.platform,
          format: 'feed',
          angle: form.type,
          content: {
            name: form.name,
            headlines: form.headlines.filter(Boolean),
            bodyTexts: form.bodyTexts.filter(Boolean),
            ctaText: form.ctaText,
            dailyBudget: form.dailyBudget,
            startDate: form.startDate,
            endDate: form.endDate,
            targetRadius: form.targetRadius,
            unitTypeFocus: form.unitTypeFocus,
            landingPageId: form.landingPageId,
          },
          status: 'draft',
        }),
      });
      router.push('/admin/campaigns');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    setSaving(true);
    try {
      await adminFetch('/api/facility-creatives', {
        method: 'POST',
        body: JSON.stringify({
          facilityId: form.facilityId,
          platform: form.platform,
          format: 'feed',
          angle: form.type,
          content: {
            name: form.name,
            headlines: form.headlines.filter(Boolean),
            bodyTexts: form.bodyTexts.filter(Boolean),
            ctaText: form.ctaText,
            dailyBudget: form.dailyBudget,
            startDate: form.startDate,
            endDate: form.endDate,
            targetRadius: form.targetRadius,
            unitTypeFocus: form.unitTypeFocus,
            landingPageId: form.landingPageId,
          },
          status: 'ready',
        }),
      });
      router.push('/admin/campaigns');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to launch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          const Icon = step.icon;

          return (
            <button
              key={step.label}
              type="button"
              onClick={() => setStep(stepNum)}
              className="flex items-center gap-1.5 shrink-0"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  backgroundColor: isActive
                    ? 'var(--color-gold)'
                    : isComplete
                      ? 'var(--color-gold-light)'
                      : 'var(--color-light-gray)',
                  color: isActive
                    ? '#fff'
                    : isComplete
                      ? 'var(--color-gold)'
                      : 'var(--color-mid-gray)',
                }}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNum}
              </span>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: isActive ? 'var(--color-dark)' : 'var(--color-mid-gray)',
                }}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 mx-1 shrink-0" style={{ color: 'var(--color-light-gray)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="mb-8">
        {currentStep === 1 && <Step1Basics form={form} update={updateForm} />}
        {currentStep === 2 && <Step2Targeting form={form} update={updateForm} />}
        {currentStep === 3 && <Step3Creative form={form} update={updateForm} />}
        {currentStep === 4 && <Step4LandingPage form={form} update={updateForm} />}
        {currentStep === 5 && <Step5Tracking form={form} />}
        {currentStep === 6 && <Step6Review form={form} onEditStep={setStep} />}
      </div>

      {/* Validation errors */}
      {!validation.valid && validation.errors.length > 0 && (
        <div
          className="rounded-lg p-3 mb-4 text-sm"
          style={{ backgroundColor: 'rgba(176, 74, 58, 0.08)', color: 'var(--color-red)', fontFamily: 'var(--font-body)' }}
        >
          {validation.errors.map((err) => (
            <div key={err}>{err}</div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={isFirstStep}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-30"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {isLastStep && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-body-text)',
                borderColor: 'var(--color-light-gray)',
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as draft'}
            </button>
          )}

          {isLastStep ? (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#fff',
                backgroundColor: 'var(--color-gold)',
              }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Launch Campaign
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#fff',
                backgroundColor: 'var(--color-gold)',
              }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
