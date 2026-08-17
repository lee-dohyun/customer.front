import { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | PosSelect",
  description: "PosSelect 쇼핑몰 서비스 개인정보 처리방침을 확인하세요.",
};

export const dynamic = "force-dynamic";

type AgreementArticle = { title: string; body: string };
type AgreementData = { title: string; articles: AgreementArticle[] };

async function getPrivacy(): Promise<AgreementData> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const res = await fetch(`${protocol}://${host}/api/agreements?type=privacy`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch privacy policy");
  return res.json();
}

/**
 * 개인정보 처리방침 페이지 컴포넌트
 *
 * 약관 내용을 모달 창 밖에서도 독립적인 URL을 통해 접근할 수 있도록 제공하기 위함.
 * 사용자가 약관의 상세 내용을 모바일/데스크탑 환경에서 읽기 쉽게 구성하여 사용자 경험(UX)을 향상시킴.
 *
 * @author leedohyun
 * @since 2026-08-18
 * @see {@link https://github.com/lee-dohyun/customer.front/issues/1} (GitHub Project #2 - DB 전환 사전 작업)
 * 
 * @returns {JSX.Element} 개인정보 처리방침 페이지 렌더링
 */
export default async function PrivacyPage() {
  const content = await getPrivacy();

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
