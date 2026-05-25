import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Manrope } from "next/font/google";
import ScrollProgress from "@/components/scroll-progress";
import GrainOverlay from "@/components/grain-overlay";
import Analytics from "@/components/analytics";
import TweaksPanel from "@/components/mono/tweaks-panel";
import "./globals.css";

// Single typeface: Manrope variable font (weights 200–800). Replaces the
// prior JetBrains Mono + Inter + Archivo stack. Hierarchy comes from
// size/weight/case/tracking — not from switching families.
// Three legacy CSS variables (--font-jetbrains, --font-inter, --font-archivo)
// remain in globals.css aliased to --font-manrope so the 125+ inline
// MONO.mono / MONO.serif refs in components resolve to Manrope unchanged.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const siteDescription =
  "StorageAds runs the Meta and Google ads, builds the landing pages with your storEDGE rental flow embedded, and shows you which campaigns filled units. Built by an operator. Tested on our own facilities first.";

export const metadata: Metadata = {
  title: {
    default: "StorageAds — Fill units. Prove which ads did it.",
    template: "%s | StorageAds",
  },
  description: siteDescription,
  metadataBase: new URL("https://storageads.com"),
  openGraph: {
    title: "StorageAds — Fill units. Prove which ads did it.",
    description: siteDescription,
    url: "https://storageads.com",
    siteName: "StorageAds",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StorageAds — Fill units. Prove which ads did it.",
    description: siteDescription,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://storageads.com/#organization",
      name: "StorageAds",
      url: "https://storageads.com",
      description: siteDescription,
      email: "blake@storageads.com",
      telephone: "+12699298541",
      logo: {
        "@type": "ImageObject",
        url: "https://storageads.com/og-image.png",
      },
      areaServed: { "@type": "Country", name: "US" },
      founder: {
        "@type": "Person",
        name: "Blake Burkett",
        jobTitle: "Founder",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "StorageAds",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://storageads.com",
      description: "Marketing system for self-storage operators. Meta and Google ads, custom landing pages with embedded storEDGE rental flow, and per-move-in tracking from click to lease.",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "499",
        highPrice: "2499",
        offerCount: "4",
      },
      provider: { "@id": "https://storageads.com/#organization" },
    },
    {
      "@type": "WebSite",
      "@id": "https://storageads.com/#website",
      url: "https://storageads.com",
      name: "StorageAds",
      publisher: { "@id": "https://storageads.com/#organization" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#141413",
          colorBackground: "#faf9f5",
          colorInputBackground: "#ffffff",
          colorText: "#141413",
        },
      }}
    >
      <html
        lang="en"
        data-palette="paper"
        className={`${manrope.variable} antialiased`}
      >
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://cal.com" />
          <link rel="dns-prefetch" href="https://maps.googleapis.com" />
          <link rel="dns-prefetch" href="https://places.googleapis.com" />
          <link rel="manifest" href="/manifest.json" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className="urbit-landing">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-dark)] focus:text-[var(--color-light)] focus:rounded-lg"
          >
            Skip to content
          </a>
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
          <ScrollProgress />
          <GrainOverlay />
          {children}
          <TweaksPanel />
        </body>
      </html>
    </ClerkProvider>
  );
}
