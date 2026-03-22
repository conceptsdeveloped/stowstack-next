import type { Metadata } from "next";
import { DiagnosticForm } from "./diagnostic-form";

export const metadata: Metadata = {
  title: "Free Facility Diagnostic — StowStack",
  description:
    "Get a comprehensive AI-powered diagnostic of your self-storage facility. Covers occupancy, marketing, digital presence, revenue management, and more. Free and confidential.",
  openGraph: {
    title: "Free Facility Diagnostic — StowStack",
    description:
      "Get a comprehensive AI-powered diagnostic of your self-storage facility. Free and confidential.",
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
