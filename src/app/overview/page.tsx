import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview · StorageAds",
  robots: { index: false, follow: false },
};

export default function OverviewPage() {
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
        src="/overview.png"
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
