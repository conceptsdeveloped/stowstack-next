'use client';

import { DATE_PRESETS } from '@/lib/date-presets';
import type { DatePresetKey } from '@/types/dates';

interface DatePresetsProps {
  activePreset: DatePresetKey;
  onSelect: (key: DatePresetKey) => void;
}

export function DatePresets({ activePreset, onSelect }: DatePresetsProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[160px]">
      {DATE_PRESETS.map((preset) => {
        const isActive = preset.key === activePreset;
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onSelect(preset.key)}
            className="text-left px-3 py-2 rounded-md text-sm transition-colors"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
              color: isActive ? 'var(--color-gold)' : 'var(--color-body-text)',
              backgroundColor: isActive ? 'var(--color-gold-light)' : 'transparent',
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  'var(--color-light-gray)';
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
