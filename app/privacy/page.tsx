import { Metadata } from "next";
import { AGREEMENT_CONTENT } from "../components/agreements";

/**
 * 개인정보 처리방침 페이지 컴포넌트
 *
 * @description 회원가입 및 서비스 이용 시 개인정보 수집/이용 등에 관한 방침을 단독 페이지로 제공하기 위해 작성됨.
 * 사용자가 약관의 상세 내용을 모바일/데스크탑 환경에서 읽기 쉽게 구성함.
 */
export const metadata: Metadata = {
  title: "개인정보 처리방침 | PosSelect",
  description: "PosSelect 쇼핑몰 서비스 개인정보 처리방침을 확인하세요.",
};

export default function PrivacyPage() {
  const content = AGREEMENT_CONTENT.privacy;

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
