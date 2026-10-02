"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@posselect/ui";
import { readErrorMessage } from "@/lib/http";
import { AgreementChecks, AgreementDialog, useAgreements } from "../components/Agreements";
import { PhoneVerificationFields, usePhoneVerification } from "../components/PhoneVerification";

/**
 * 이 화면의 사용자 노출 문구를 한곳에 모아둔다. #103(next-intl 로케일 라우팅)이 붙으면 이
 * 객체가 그대로 ko 메시지 카탈로그가 되고 호출부만 `t("...")`로 바뀌므로, 그때 JSX를 다시
 * 훑을 필요가 없다. 서버가 내려주는 문구(검증 실패 등)는 이미 요청 로케일에 맞춰져 있으니
 * 여기 것으로 덮어쓰지 말고 그대로 보여줄 것 — 여기 있는 건 어디까지나 폴백이다.
 *
 * <p>휴대폰 인증·약관 동의 블록의 문구는 그 컴포넌트(app/components)가 갖고 있다.
 */
const MESSAGES = {
  emailLabel: "이메일",
  emailPlaceholder: "you@example.com",
  passwordLabel: "비밀번호",
  passwordPlaceholder: "영문/숫자/특수문자 조합 8자 이상",
  passwordConfirmLabel: "비밀번호 확인",
  nameLabel: "이름",
  namePlaceholder: "홍길동",

  requiredFieldsMissing: "이름, 이메일, 비밀번호를 모두 입력하세요.",
  passwordMismatch: "비밀번호가 일치하지 않습니다.",
  phoneNotVerified: "휴대폰 본인 인증을 완료해주세요.",
  phoneVerificationExpired: "휴대폰 인증이 만료되었습니다. 다시 인증해주세요.",
  agreementsRequired: "필수 약관에 동의해주세요.",
  emailTaken: "이미 가입된 이메일입니다.",
  signupFailed: "회원가입 중 오류가 발생했습니다.",

  submit: "가입하기",
  submitting: "가입 처리 중...",
  doneTitle: "이메일을 확인해주세요",
  doneBody: (email: string) => `${email}로 인증 메일을 보냈습니다. 메일의 링크를 클릭하면 가입이 완료됩니다.`,
  goToLogin: "로그인하러 가기",
  haveAccount: "이미 계정이 있으신가요?",
  login: "로그인",
} as const;

/**
 * 회원가입 폼 컴포넌트
 *
 * 사용자로부터 회원가입 정보를 입력받고, 약관 동의 및 본인 인증을 수행하기 위함.
 * 약관 데이터를 분리된 모듈에서 가져와 렌더링함으로써 하드코딩을 방지하고 유지보수성을 높였음.
 *
 * @author leedohyun
 * @since 2026-08-18
 * @see {@link https://github.com/lee-dohyun/customer.front/issues/1} (GitHub Project #2 - DB 전환 사전 작업)
 *
 * @returns {JSX.Element} 회원가입 폼 렌더링
 */
function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const phoneVerification = usePhoneVerification();
  const agreements = useAgreements();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") || "/mypage";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !name) {
      setError(MESSAGES.requiredFieldsMissing);
      return;
    }
    if (password !== passwordConfirm) {
      setError(MESSAGES.passwordMismatch);
      return;
    }
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          phoneNumber: normalized.value,
          marketingOptIn: agreements.agreeMarketing,
        }),
      });
      if (res.status === 201) {
        setDone(true);
        return;
      }
      if (res.status === 409) {
        setError(MESSAGES.emailTaken);
        return;
      }
      if (res.status === 400) {
        const message = await readErrorMessage(res);
        // 휴대폰 미인증만 기계 코드로 내려온다(그 외 400은 서버가 번역한 검증 실패 문구).
        // 인증 만료일 때만 인증 단계를 되돌리고, 다른 입력 오류로 인증을 날리진 않는다.
        if (message === "PHONE_NOT_VERIFIED") {
          phoneVerification.expire();
          setError(MESSAGES.phoneVerificationExpired);
          return;
        }
        setError(message ?? MESSAGES.signupFailed);
        return;
      }
      setError(MESSAGES.signupFailed);
    } catch {
      setError(MESSAGES.signupFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    const loginUrl = `/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <Logo size={24} />
          </div>
          <h2 style={{ marginBottom: 8 }}>{MESSAGES.doneTitle}</h2>
          <p style={{ color: "var(--color-neutral-700)", fontSize: 14, marginBottom: 24 }}>
            {MESSAGES.doneBody(email)}
          </p>
          <a href={loginUrl} className="btn btn-secondary btn-block">
            {MESSAGES.goToLogin}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: "40px 0" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="email">{MESSAGES.emailLabel}</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder={MESSAGES.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="password">{MESSAGES.passwordLabel}</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder={MESSAGES.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="passwordConfirm">{MESSAGES.passwordConfirmLabel}</label>
            <input
              id="passwordConfirm"
              type="password"
              className="input"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="name">{MESSAGES.nameLabel}</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder={MESSAGES.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <PhoneVerificationFields verification={phoneVerification} />

          <div style={{ marginBottom: 8 }} />

          <AgreementChecks agreements={agreements} />

          {error && <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={!phoneVerification.otpVerified || isSubmitting}>
            {isSubmitting ? MESSAGES.submitting : MESSAGES.submit}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
          {MESSAGES.haveAccount}{" "}
          <a href="/login" style={{ color: "var(--color-text)", fontWeight: 600 }}>
            {MESSAGES.login}
          </a>
        </div>
      </div>

      <AgreementDialog agreements={agreements} />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
