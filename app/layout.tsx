import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "PosSelect",
  description: "검증된 상품만 엄선하는 PosSelect",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Script src="https://shell.posselect.com/v1/header.js" strategy="beforeInteractive" />
        <posselect-header home-href="https://home.posselect.com" />
        {children}
        <Script src="https://shell.posselect.com/v1/footer.js" strategy="beforeInteractive" />
        <posselect-footer />
      </body>
    </html>
  );
}
