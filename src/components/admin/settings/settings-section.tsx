'use client';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Reusable section wrapper for settings tabs — title + optional description + content */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3
          className="text-base font-medium"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="mt-1 text-sm"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
