import type { Metadata } from "next";
import { DiagnosticForm } from "./diagnostic-form";

export const metadata: Metadata = {
  title: "Free Facility Diagnostic — StorageAds",
  description:
    "A free diagnostic of your self-storage facility, scored across 8 categories: occupancy, marketing, digital presence, and revenue management. Free and confidential.",
  openGraph: {
    title: "Free Facility Diagnostic — StorageAds",
    description:
      "A free diagnostic of your self-storage facility, scored across 8 categories. Free and confidential.",
    type: "website",
  },
};

export default function DiagnosticPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)]">
      <DiagnosticForm />
    </div>
  );
}
