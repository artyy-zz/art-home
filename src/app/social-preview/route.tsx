import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const siteName = "Mobileria Art Home";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#fbf8f4",
          color: "#1f1a16",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "54px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#1f1a16",
            borderRadius: "36px",
            color: "#fff7eb",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            overflow: "hidden",
            padding: "58px",
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              background: "#96724f",
              height: "12px",
              left: "58px",
              opacity: 0.82,
              position: "absolute",
              right: "58px",
              top: "0",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div
              style={{
                color: "#d5b690",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "6px",
                textTransform: "uppercase",
              }}
            >
              Art Home KS
            </div>
            <div
              style={{
                fontSize: 80,
                fontWeight: 700,
                lineHeight: 0.95,
                maxWidth: "850px",
              }}
            >
              Custom furniture and kitchens in Kosovo
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{siteName}</div>
              <div style={{ color: "#d8c8b6", fontSize: 26 }}>
                mobilje me porosi | furniture Kosovo
              </div>
            </div>
            <div
              style={{
                alignItems: "center",
                border: "2px solid rgba(255,255,255,0.18)",
                borderRadius: "999px",
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                height: "88px",
                justifyContent: "center",
                width: "88px",
              }}
            >
              AH
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
