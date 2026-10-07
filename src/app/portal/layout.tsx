import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { PortalShell } from "@/components/portal/portal-shell";

export const metadata: Metadata = {
  title: "Client Portal | StorageAds",
  description:
    "Access your StorageAds dashboard: attribution, campaign performance, and facility analytics.",
};

// Instrument Calm faces (library entry 008): Manrope 800/600 for the brand,
// IBM Plex Mono for labels and facility-stamp initials.
//
// The root layout never loads Manrope, so `--font-manrope` was undefined and
// the site's "Manrope" fell back to the system font. The portal loads it here
// and re-points the site's face tokens at it inside the portal only.
const manrope = Manrope({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

const face = 'var(--font-manrope), "Manrope", system-ui, sans-serif';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${manrope.variable} ${plexMono.variable} contents`}
      style={
        {
          "--mono": face,
          "--serif": face,
          "--ic-font-brand": face,
          "--ic-font-mono": 'var(--font-plex-mono), "IBM Plex Mono", ui-monospace, monospace',
          fontFamily: face,
        } as React.CSSProperties
      }
    >
      <PortalShell>{children}</PortalShell>
    </div>
  );
}
