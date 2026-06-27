/**
 * schema.org WebApplication structured data for a tool page. Rendered in the
 * server page component so it lands in the initial HTML for crawlers. These
 * calculators are free, no-login utilities built to rank organically, so we
 * mark them up accordingly (offers: price 0).
 */
export default function ToolJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Organization",
      name: "StorageAds",
      url: "https://storageads.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user input flows into it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * BreadcrumbList structured data. Gives search engines the Home › Tools › <Tool>
 * trail so results can render a breadcrumb instead of a bare URL. Rendered in
 * the server page so it lands in the initial HTML.
 */
/** Standard Home › Tools › <name> trail for a tool page at `url`. */
export function toolBreadcrumb(
  name: string,
  url: string,
): { name: string; url: string }[] {
  return [
    { name: "Home", url: "https://storageads.com" },
    { name: "Tools", url: "https://storageads.com/tools" },
    { name, url },
  ];
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * FAQPage structured data for a tool page. Rendered in the server page from the
 * same FAQ data the client renders visibly (see @/lib/tools/faqs), so the
 * schema and the on-page answers can't drift. Eligible for FAQ rich results.
 */
export function FaqJsonLd({
  faqs,
}: {
  faqs: { q: string; a: string }[];
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
