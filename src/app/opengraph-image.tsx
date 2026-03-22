import { ImageResponse } from "next/og";

export const alt = "StowStack — Full-Funnel Demand Engine for Self-Storage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          position: "relative",
        }}
      >
        {/* Blue accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)",
          }}
        />

        {/* Main text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-2px",
            }}
          >
            StowStack
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#9CA3AF",
              letterSpacing: "-0.5px",
            }}
          >
            Full-Funnel Demand Engine for Self-Storage
          </div>
        </div>

        {/* Blue accent element at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            width: "80px",
            height: "4px",
            borderRadius: "2px",
            backgroundColor: "#3B82F6",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
