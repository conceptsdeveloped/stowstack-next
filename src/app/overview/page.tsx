import type { Metadata } from "next";
import { OVERVIEW_PNG_B64 } from "./image-data";

export const metadata: Metadata = {
  title: "Overview · StorageAds",
  robots: { index: false, follow: false },
};

export default function OverviewPage() {
  const src = `data:image/png;base64,${OVERVIEW_PNG_B64}`;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1c1a16",
        padding: "16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <img
        src={src}
        alt="StorageAds overview card"
        style={{
          width: "100%",
          maxWidth: 620,
          height: "auto",
          display: "block",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}
