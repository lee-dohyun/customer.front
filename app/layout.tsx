import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PosSelect",
  description: "검증된 상품만 엄선하는 PosSelect",
  icons: {
    icon: "https://image.posselect.com/cdn/favicons/favicon-transparent-red-256.png",
  },
  openGraph: {
    title: "PosSelect",
    description: "검증된 상품만 엄선하는 PosSelect",
    url: "https://customer.posselect.com",
    siteName: "PosSelect",
    images: [
      {
        url: "https://image.posselect.com/cdn/logos/posselect-logo-hires-no-r.webp",
        width: 1200,
        height: 630,
        alt: "PosSelect 대표 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PosSelect",
    description: "검증된 상품만 엄선하는 PosSelect",
    images: ["https://image.posselect.com/cdn/logos/posselect-logo-hires-no-r.webp"],
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
