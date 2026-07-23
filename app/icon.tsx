import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** 麋鹿洞察 favicon：角金底 + 简化角剪影 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d4a574",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#1a140c",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          鹿
        </div>
      </div>
    ),
    { ...size }
  );
}
