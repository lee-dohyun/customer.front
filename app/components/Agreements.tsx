"use client";

import { useState } from "react";
import { Dialog } from "@posselect/ui";

/** 약관 동의 블록의 사용자 노출 문구(#103 이 붙으면 ko 메시지 카탈로그가 된다). */
const MESSAGES = {
  agreeAll: "전체 동의",
  agreeTerms: "(필수) 이용약관 동의",
  agreePrivacy: "(필수) 개인정보 수집 및 이용 동의",
  agreeMarketing: "(선택) 마케팅 정보 수신 동의",
  agreementView: "보기",
} as const;

type AgreementType = "terms" | "privacy";
type AgreementDocument = { title: string; articles: { title: string; body: string }[] };

/**
 * 약관 동의(필수 2 + 선택 1 + 전체 동의)와 약관 본문 보기의 상태.
 *
 * <p>회원가입(/signup)과 소셜 로그인 가입 마무리(/onboarding, auth.api#42)가 같이 쓴다.
 * 약관 본문은 하드코딩하지 않고 `/api/agreements`(auth.api 중계)에서 받아 온다.
 *
 * @author leedohyun
 * @since 2026-10-02
 * @see {@link https://github.com/lee-dohyun/auth.api/issues/42}
 */
export function useAgreements() {
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [openAgreement, setOpenAgreement] = useState<AgreementType | null>(null);
  const [agreementData, setAgreementData] = useState<AgreementDocument | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const toggleAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  };

  const toggleTerms = (checked: boolean) => {
    setAgreeTerms(checked);
    setAgreeAll(checked && agreePrivacy && agreeMarketing);
  };

  const togglePrivacy = (checked: boolean) => {
    setAgreePrivacy(checked);
    setAgreeAll(checked && agreeTerms && agreeMarketing);
  };

  const toggleMarketing = (checked: boolean) => {
    setAgreeMarketing(checked);
    setAgreeAll(agreeTerms && agreePrivacy && checked);
  };

  const open = async (type: AgreementType) => {
    setOpenAgreement(type);
    setAgreementData(null);
    setAgreementLoading(true);
    try {
      const res = await fetch(`/api/agreements?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setAgreementData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAgreementLoading(false);
    }
  };

  const close = () => setOpenAgreement(null);

  return {
    agreeAll,
    agreeTerms,
    agreePrivacy,
    agreeMarketing,
    /** 필수 약관 두 개에 모두 동의했는가. */
    requiredAgreed: agreeTerms && agreePrivacy,
    toggleAll,
    toggleTerms,
    togglePrivacy,
    toggleMarketing,
    openAgreement,
    agreementData,
    agreementLoading,
    open,
    close,
  };
}

export type Agreements = ReturnType<typeof useAgreements>;

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: "12.5px",
  color: "var(--color-neutral-700)",
  paddingLeft: 24,
} as const;

const viewButtonStyle = {
  marginLeft: "auto",
  background: "none",
  border: "none",
  padding: 0,
  color: "inherit",
  textDecoration: "underline",
  cursor: "pointer",
  font: "inherit",
} as const;

/** 동의 체크박스 묶음. 폼 안에 넣는다. 본문 모달은 {@link AgreementDialog} 를 폼 밖에 따로 둔다. */
export function AgreementChecks({ agreements }: Readonly<{ agreements: Agreements }>) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--color-divider)",
        borderBottom: "1px solid var(--color-divider)",
        padding: "14px 0",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13.5px", fontWeight: 600 }}>
        <input type="checkbox" checked={agreements.agreeAll} onChange={(e) => agreements.toggleAll(e.target.checked)} />
        {MESSAGES.agreeAll}
      </label>
      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={agreements.agreeTerms}
          onChange={(e) => agreements.toggleTerms(e.target.checked)}
        />
        {MESSAGES.agreeTerms}
        <button type="button" onClick={() => agreements.open("terms")} style={viewButtonStyle}>
          {MESSAGES.agreementView}
        </button>
      </label>
      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={agreements.agreePrivacy}
          onChange={(e) => agreements.togglePrivacy(e.target.checked)}
        />
        {MESSAGES.agreePrivacy}
        <button type="button" onClick={() => agreements.open("privacy")} style={viewButtonStyle}>
          {MESSAGES.agreementView}
        </button>
      </label>
      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={agreements.agreeMarketing}
          onChange={(e) => agreements.toggleMarketing(e.target.checked)}
        />
        {MESSAGES.agreeMarketing}
      </label>
    </div>
  );
}

function AgreementBody({ agreements }: Readonly<{ agreements: Agreements }>) {
  if (agreements.agreementLoading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--color-neutral-700)" }}>
        약관 데이터를 불러오는 중입니다...
      </div>
    );
  }
  if (!agreements.agreementData) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--color-danger)" }}>
        약관을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
      </div>
    );
  }
  return agreements.agreementData.articles.map((article) => (
    <section key={article.title}>
      <h3 style={{ marginBottom: 6, fontSize: 14 }}>{article.title}</h3>
      <p style={{ whiteSpace: "pre-line" }}>{article.body}</p>
    </section>
  ));
}

/** 「보기」로 여는 약관 본문 모달. 열려 있지 않으면 아무것도 그리지 않는다. */
export function AgreementDialog({ agreements }: Readonly<{ agreements: Agreements }>) {
  if (!agreements.openAgreement) {
    return null;
  }
  return (
    <Dialog
      title={agreements.agreementData ? agreements.agreementData.title : "약관 확인"}
      onClose={agreements.close}
      maxWidth={640}
      actions={
        <button type="button" onClick={agreements.close} className="btn btn-secondary">
          닫기
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <AgreementBody agreements={agreements} />
      </div>
    </Dialog>
  );
}
