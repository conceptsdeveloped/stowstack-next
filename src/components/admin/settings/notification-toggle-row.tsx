'use client';

interface NotificationToggleRowProps {
  label: string;
  description: string;
  emailEnabled: boolean;
  onEmailChange: (v: boolean) => void;
  /** If undefined, no in-app toggle is shown */
  inAppEnabled?: boolean;
  onInAppChange?: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{
        backgroundColor: checked ? 'var(--color-gold)' : 'var(--color-light-gray)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

export function NotificationToggleRow({
  label,
  description,
  emailEnabled,
  onEmailChange,
  inAppEnabled,
  onInAppChange,
  disabled,
}: NotificationToggleRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{
        borderBottom: '1px solid var(--color-light-gray)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-medium"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontSize: '13px' }}
        >
          {label}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)', fontSize: '12px' }}
        >
          {description}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
          >
            Email
          </span>
          <ToggleSwitch
            checked={emailEnabled}
            onChange={onEmailChange}
            disabled={disabled}
            label={`${label} email`}
          />
        </div>

        {inAppEnabled !== undefined && onInAppChange && (
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[10px] font-medium uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
            >
              In-app
            </span>
            <ToggleSwitch
              checked={inAppEnabled}
              onChange={onInAppChange}
              disabled={disabled}
              label={`${label} in-app`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
