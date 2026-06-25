import type { Metadata } from "next";
import IdeasGate from "./ideas-gate";

// Internal-only: the full StorageAds feature inventory + idea backlog,
// gated by the admin key. Kept out of search indexes.
export const metadata: Metadata = {
  title: "Features & Ideas",
  robots: { index: false, follow: false },
};

export default function IdeasPage() {
  return <IdeasGate />;
}
