import type { Metadata } from "next";
import { Header, Footer, type HeaderCategory } from "@posselect/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "PosSelect",
  description: "검증된 상품만 엄선하는 PosSelect",
};

async function getCategories(): Promise<HeaderCategory[]> {
  try {
    const res = await fetch("https://product.posselect.com/api/categories", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: { id: number; name: string }[] = await res.json();
    return data.map((c) => ({
      id: c.id,
      name: c.name,
      href: `https://product.posselect.com/?category=${c.id}`,
    }));
  } catch {
    return [];
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();
  return (
    <html lang="ko">
      <body>
        <Header categories={categories} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
