import Link from 'next/link';

interface AuthorBioProps {
  name: string;
  bio: string;
  avatarUrl?: string;
}

/** Author bio section at the bottom of blog posts */
export function AuthorBio({ name, bio, avatarUrl }: AuthorBioProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex items-start gap-4 rounded-xl p-5 mt-12"
      style={{
        backgroundColor: 'var(--color-light-gray)',
        border: '1px solid var(--color-light-gray)',
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-11 w-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium shrink-0"
          style={{
            fontFamily: 'var(--font-heading)',
            backgroundColor: 'var(--color-gold-light)',
            color: 'var(--color-gold)',
          }}
        >
          {initials}
        </div>
      )}
      <div>
        <p
          className="text-sm font-medium mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
        >
          {name}
        </p>
        <p
          className="text-sm mb-2"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)', lineHeight: 1.6 }}
        >
          {bio}
        </p>
        <Link
          href="/blog"
          className="text-xs font-medium"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          More from {name.split(' ')[0]}
        </Link>
      </div>
    </div>
  );
}
