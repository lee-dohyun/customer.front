import { Metadata } from "next";
import { AGREEMENT_CONTENT } from "../components/agreements";

/**
 * 이용약관 페이지 컴포넌트
 *
 * @description 회원가입 및 서비스 이용에 필요한 이용약관을 단독 페이지로 제공하기 위해 작성됨.
 * 사용자가 약관의 상세 내용을 모바일/데스크탑 환경에서 읽기 쉽게 구성함.
 */
export const metadata: Metadata = {
  title: "이용약관 | PosSelect",
  description: "PosSelect 쇼핑몰 서비스 이용약관을 확인하세요.",
};

export default function TermsPage() {
  const content = AGREEMENT_CONTENT.terms;

  return (
    <div style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto", fontFamily: "var(--font-sans, sans-serif)", lineHeight: 1.6, color: "var(--color-text, #333)" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "32px", textAlign: "center" }}>
        {content.title}
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {content.articles.map((article) => (
          <section key={article.title} style={{ padding: "20px", background: "var(--color-bg-secondary, #f9f9f9)", borderRadius: "8px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "var(--color-primary, #000)" }}>
              {article.title}
            </h2>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "15px" }}>
              {article.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
