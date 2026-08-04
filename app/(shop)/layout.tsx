import Script from "next/script";

// 로그인 화면(/login)은 이 그룹 밖에 있어서 공통 헤더/푸터를 안 받는다 — 로그인 페이지는
// 자체 카드형 레이아웃이 디자인이라 사이트 크롬이 필요 없음.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://shell.posselect.com/v1/header.js" strategy="beforeInteractive" />
      <posselect-header home-href="https://home.posselect.com" />
      {children}
      <Script src="https://shell.posselect.com/v1/footer.js" strategy="beforeInteractive" />
      <posselect-footer />
    </>
  );
}
