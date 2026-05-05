import type { Metadata } from "next";

import { BlueprintPreview } from "./blueprint-preview";

export const metadata: Metadata = {
  title: "Theme Preview · Blueprint",
  robots: { index: false, follow: false },
};

export default function BlueprintPreviewPage() {
  return <BlueprintPreview />;
}
