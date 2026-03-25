'use client';

interface KeyPillProps {
  keys: string[];
}

/** Renders keyboard shortcut keys as styled pills. e.g. [G] [D] */
export function KeyPill({ keys }: KeyPillProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <kbd
          key={`${key}-${i}`}
          className="inline-flex items-center justify-center rounded text-center"
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 500,
            color: 'var(--color-mid-gray)',
            backgroundColor: 'var(--color-light-gray)',
            border: '1px solid var(--color-light-gray)',
            borderRadius: '4px',
            padding: '1px 6px',
            minWidth: '20px',
            lineHeight: '16px',
          }}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
