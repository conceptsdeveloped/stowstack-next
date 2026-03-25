import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Poppins, Lora, Inter } from "next/font/google";
import ScrollProgress from "@/components/scroll-progress";
import GrainOverlay from "@/components/grain-overlay";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteDescription =
  "Stop losing units to bad marketing. StorageAds builds the entire system — ads, landing pages, attribution, and conversion — so independent storage operators fill vacancies and prove every dollar.";

export const metadata: Metadata = {
  title: {
    default: "StorageAds | Full-Funnel Demand Engine for Self-Storage",
    template: "%s | StorageAds",
  },
  description: siteDescription,
  metadataBase: new URL("https://storageads.com"),
  openGraph: {
    title: "StorageAds | Full-Funnel Demand Engine for Self-Storage",
    description: siteDescription,
    url: "https://storageads.com",
    siteName: "StorageAds",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StorageAds | Full-Funnel Demand Engine for Self-Storage",
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
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "StorageAds",
  url: "https://storageads.com",
  description: siteDescription,
  areaServed: "US",
  serviceType: "Self-Storage Digital Marketing",
  telephone: "+12699298541",
  email: "blake@storageads.com",
  sameAs: [],
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
          colorPrimary: "#B58B3F",
          colorBackground: "#faf9f5",
          colorInputBackground: "#ffffff",
          colorText: "#141413",
        },
      }}
    >
      <html lang="en" className={`${poppins.variable} ${lora.variable} ${inter.variable} antialiased`}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://cal.com" />
          <link rel="dns-prefetch" href="https://maps.googleapis.com" />
          <link rel="dns-prefetch" href="https://places.googleapis.com" />
          <link rel="manifest" href="/manifest.json" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-gold)] focus:text-[var(--color-light)] focus:rounded-lg"
          >
            Skip to content
          </a>
          <ScrollProgress />
          <GrainOverlay />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
