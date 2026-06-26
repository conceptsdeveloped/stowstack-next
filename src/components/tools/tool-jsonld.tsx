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
