import type { Metadata } from "next";
import AuditToolPage from "./audit-client";

export const metadata: Metadata = {
  title: "Free Storage Audit Tool",
  description:
    "Check your self-storage facility's online presence. Get an instant marketing audit score across Google rating, reviews, photos, and more.",
};

export default function Page() {
  return <AuditToolPage />;
}
