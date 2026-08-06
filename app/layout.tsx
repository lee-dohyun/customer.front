import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PosSelect",
  description: "검증된 상품만 엄선하는 PosSelect",
  icons: {
    icon: "https://image.posselect.com/cdn/favicons/favicon-transparent-red-256.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
