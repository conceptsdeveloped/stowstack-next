import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { JetBrains_Mono, Libre_Franklin, Lato } from "next/font/google";
import ScrollProgress from "@/components/scroll-progress";
import GrainOverlay from "@/components/grain-overlay";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const franklin = Libre_Franklin({
  variable: "--font-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const siteDescription =
  "Stop losing units to bad marketing. StowStack builds the entire system — ads, landing pages, attribution, and conversion — so independent storage operators fill vacancies and prove every dollar.";

export const metadata: Metadata = {
  title: {
    default: "StowStack | Full-Funnel Demand Engine for Self-Storage",
    template: "%s | StowStack",
  },
  description: siteDescription,
  metadataBase: new URL("https://stowstack.co"),
  openGraph: {
    title: "StowStack | Full-Funnel Demand Engine for Self-Storage",
    description: siteDescription,
    url: "https://stowstack.co",
    siteName: "StowStack",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StowStack | Full-Funnel Demand Engine for Self-Storage",
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
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "StowStack",
  url: "https://stowstack.co",
  description: siteDescription,
  areaServed: "US",
  serviceType: "Self-Storage Digital Marketing",
  telephone: "+12699298541",
  email: "blake@stowstack.co",
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
          colorPrimary: "#3B82F6",
        },
      }}
    >
      <html lang="en" className={`${mono.variable} ${franklin.variable} ${lato.variable} antialiased`}>
        <head>
          <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://api.fontshare.com" />
          <link rel="dns-prefetch" href="https://cdn.fontshare.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://cal.com" />
          <link rel="dns-prefetch" href="https://maps.googleapis.com" />
          <link rel="dns-prefetch" href="https://places.googleapis.com" />
          <link
            href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
            rel="stylesheet"
          />
          <link rel="manifest" href="/manifest.json" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {/* Prevent flash of wrong theme */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("stowstack-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`,
            }}
          />
        </head>
        <body>
          <ThemeProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-500 focus:text-white focus:rounded"
            >
              Skip to content
            </a>
            <ScrollProgress />
            <GrainOverlay />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
