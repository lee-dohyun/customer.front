"use client";

import { useEffect, useState } from "react";
import { Logo } from "@posselect/ui";
import { readErrorMessage } from "@/lib/http";
import { replaceLocation } from "@/lib/navigation";
import { AgreementChecks, AgreementDialog, useAgreements } from "../components/Agreements";
import { PhoneVerificationFields, usePhoneVerification } from "../components/PhoneVerification";

/** 이 화면의 사용자 노출 문구(#103 이 붙으면 ko 메시지 카탈로그가 된다). 서버가 준 문구가 있으면 그것이 우선이다. */
const MESSAGES = {
  title: "가입 마무리",
  intro: "간편 로그인으로 처음 오셨습니다. 약관 동의와 휴대폰 본인 인증을 마치면 가입이 완료됩니다.",
  checking: "가입 정보를 확인하는 중입니다...",
  statusFailed: "가입 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
  goToMypage: "마이페이지로 가기",

  phoneNotVerified: "휴대폰 본인 인증을 완료해주세요.",
  phoneVerificationExpired: "휴대폰 인증이 만료되었습니다. 다시 인증해주세요.",
  agreementsRequired: "필수 약관에 동의해주세요.",
  submitFailed: "가입 마무리 중 오류가 발생했습니다.",

  submit: "가입 완료",
  submitting: "처리 중...",
  logout: "로그아웃",
} as const;

/** checking: 조회 중 / required: 폼을 보여 준다 / failed: 조회 실패 */
type Status = "checking" | "required" | "failed";

/**
 * 소셜 로그인 회원의 가입 마무리 화면 (auth.api#42).
 *
 * <p>일반 가입은 필수 약관 동의와 휴대폰 본인 인증을 거쳐야 회원이 만들어지는데, 소셜 로그인은
 * IdP 인증만으로 회원이 만들어진다. auth.api 의 로그인 콜백이 그런 회원(본인 인증 전화번호가 빈 회원)을
 * 마이페이지 대신 이 화면으로 보내고, 여기서 빠진 두 절차를 받아 `POST /api/auth/onboarding` 으로 넘긴다.
 *
 * <p>이 경로는 로그인 뒤에만 쓰므로 gateway 공개 경로(`PUBLIC_PATH_PREFIXES`)에 등록하지 않는다 —
 * 등록하면 `X-User-Id` 가 주입되지 않아 auth.api 가 누구의 가입인지 알 수 없다.
 *
 * <p>공통 헤더/푸터가 붙는 `(shop)` 그룹 밖에 둔 것은 /signup 과 같은 이유다(가입 절차는 카드형 단독 화면).
 *
 * @author leedohyun
 * @since 2026-10-02
 * @see {@link https://github.com/lee-dohyun/auth.api/issues/42}
 */
export default function OnboardingPage() {
  const [status, setStatus] = useState<Status>("checking");
  const phoneVerification = usePhoneVerification();
  const agreements = useAgreements();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/onboarding", { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          replaceLocation("/login");
          return;
        }
        if (!res.ok) {
          setStatus("failed");
          return;
        }
        const body: { required?: boolean } = await res.json();
        if (cancelled) return;
        // 이미 마친 회원(일반 가입 회원 포함)이 주소를 직접 치고 들어온 경우 — 받을 것이 없다.
        if (body.required === true) {
          setStatus("required");
        } else {
          replaceLocation("/mypage");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("posselect_remember_me");
    replaceLocation("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phoneVerification.otpVerified) {
      setError(MESSAGES.phoneNotVerified);
      return;
    }
    if (!agreements.requiredAgreed) {
      setError(MESSAGES.agreementsRequired);
      return;
    }
    const normalized = phoneVerification.normalize();
    if (normalized.error) {
      setError(normalized.error);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: normalized.value,
          agreeTerms: agreements.agreeTerms,
          agreePrivacy: agreements.agreePrivacy,
          marketingOptIn: agreements.agreeMarketing,
        }),
      });
      if (res.ok) {
        replaceLocation("/mypage");
        return;
      }
      if (res.status === 401) {
        replaceLocation("/login");
        return;
      }
      const message = await readErrorMessage(res);
      // 기계 코드로 오는 것은 둘뿐이고(/signup 과 같은 코드), 나머지(번호 형식 오류·다른 계정이 쓰는 번호)는
      // 서버가 요청 로케일에 맞춰 번역한 문장이라 그대로 보여 준다.
      if (message === "PHONE_NOT_VERIFIED") {
        phoneVerification.expire();
        setError(MESSAGES.phoneVerificationExpired);
        return;
      }
      if (message === "AGREEMENTS_REQUIRED") {
        setError(MESSAGES.agreementsRequired);
        return;
      }
      setError(message ?? MESSAGES.submitFailed);
    } catch {
      setError(MESSAGES.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: "40px 0" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        {status === "checking" && (
          <p style={{ color: "var(--color-neutral-700)", fontSize: 14, textAlign: "center" }}>{MESSAGES.checking}</p>
        )}

        {status === "failed" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 24 }}>{MESSAGES.statusFailed}</p>
            <a href="/mypage" className="btn btn-secondary btn-block">
              {MESSAGES.goToMypage}
            </a>
          </div>
        )}

        {status === "required" && (
          <>
            <h2 style={{ marginBottom: 8, textAlign: "center" }}>{MESSAGES.title}</h2>
            <p style={{ color: "var(--color-neutral-700)", fontSize: 14, marginBottom: 24 }}>{MESSAGES.intro}</p>

            <form onSubmit={handleSubmit}>
              <PhoneVerificationFields verification={phoneVerification} />

              <div style={{ marginBottom: 8 }} />

              <AgreementChecks agreements={agreements} />

              {error && <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <button type="submit" className="btn btn-primary btn-block" disabled={!phoneVerification.otpVerified || isSubmitting}>
                {isSubmitting ? MESSAGES.submitting : MESSAGES.submit}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{ background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
              >
                {MESSAGES.logout}
              </button>
            </div>
          </>
        )}
      </div>

      <AgreementDialog agreements={agreements} />
    </div>
  );
}
