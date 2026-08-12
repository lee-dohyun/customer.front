"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@posselect/ui";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") || "/mypage";

  const phonePattern = /^01[0-9]-?\d{3,4}-?\d{4}$/;

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // 번호를 바꾸면 이전 인증은 무효화 — 다른 번호로 다시 인증해야 함
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
    }
  };

  const handleSendOtp = async () => {
    setOtpError("");
    if (!phonePattern.test(phone)) {
      setOtpError("올바른 휴대폰 번호 형식이 아닙니다.");
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      if (res.ok) {
        setOtpSent(true);
      } else if (res.status === 429) {
        setOtpError("인증번호 재발송은 60초 후에 가능합니다.");
      } else {
        setOtpError("인증번호 발송에 실패했습니다.");
      }
    } catch {
      setOtpError("인증번호 발송에 실패했습니다.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    if (!otpCode) {
      setOtpError("인증번호를 입력하세요.");
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, code: otpCode }),
      });
      if (res.ok) {
        setOtpVerified(true);
      } else {
        const body = await res.json().catch(() => null);
        setOtpError(body?.error || "인증번호가 일치하지 않습니다.");
      }
    } catch {
      setOtpError("인증번호 확인에 실패했습니다.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const toggleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  };

  const setRequiredAgreement = (setter: (v: boolean) => void, checked: boolean, other: boolean) => {
    setter(checked);
    setAgreeAll(checked && other && agreeMarketing);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !name) {
      setError("이름, 이메일, 비밀번호를 모두 입력하세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!otpVerified) {
      setError("휴대폰 본인 인증을 완료해주세요.");
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phoneNumber: phone }),
      });
      if (res.status === 201) {
        setDone(true);
      } else if (res.status === 409) {
        setError("이미 가입된 이메일입니다.");
      } else if (res.status === 400) {
        setOtpVerified(false);
        setOtpSent(false);
        setError("휴대폰 인증이 만료되었습니다. 다시 인증해주세요.");
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
      }
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
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
          <h2 style={{ marginBottom: 8 }}>이메일을 확인해주세요</h2>
          <p style={{ color: "var(--color-neutral-700)", fontSize: 14, marginBottom: 24 }}>
            {email}로 인증 메일을 보냈습니다. 메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <a href={loginUrl} className="btn btn-secondary btn-block">
            로그인하러 가기
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
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="영문/숫자/특수문자 조합 8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
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
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/*
            SMS는 아직 실제 발송사(알리고/네이버클라우드 등) 연동 전이라 auth.api가 mock으로
            처리한다(코드를 서버 로그에만 남기고 검증 로직은 실제로 동작) — payment(mock, 항상
            성공)와 동일한 패턴. 실 발송사 연동 시 auth.api PhoneVerificationService만 교체하면
            되고 이 화면은 변경할 필요 없다.
          */}
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="phone">휴대폰 번호</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="phone"
                type="tel"
                className="input"
                placeholder="010-0000-0000"
                style={{ flex: 1 }}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={otpVerified}
                required
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSendOtp}
                disabled={otpSending || otpVerified || !phone}
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                {otpVerified ? "인증완료" : otpSent ? "재발송" : otpSending ? "발송중..." : "인증요청"}
              </button>
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="otp">인증번호</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder="6자리 숫자"
                  style={{ flex: 1 }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || !otpCode}
                  style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  {otpVerifying ? "확인중..." : "확인"}
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
            <div style={{ color: "var(--color-success, #1a7f37)", fontSize: 12.5, marginBottom: 12 }}>
              휴대폰 인증이 완료되었습니다.
            </div>
          )}
          {otpError && <div style={{ color: "var(--color-danger)", fontSize: 12.5, marginBottom: 12 }}>{otpError}</div>}

          <div style={{ marginBottom: 8 }} />

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
              <input type="checkbox" checked={agreeAll} onChange={(e) => toggleAgreeAll(e.target.checked)} />
              전체 동의
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setRequiredAgreement(setAgreeTerms, e.target.checked, agreePrivacy)}
              />
              (필수) 이용약관 동의
              {/* TODO: 실제 약관 페이지 없음 — home.front에 /terms 만들 것 (Footer 링크와 동일) */}
              <a href="https://home.posselect.com/terms" style={{ marginLeft: "auto", color: "inherit", textDecoration: "underline" }}>
                보기
              </a>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setRequiredAgreement(setAgreePrivacy, e.target.checked, agreeTerms)}
              />
              (필수) 개인정보 수집 및 이용 동의
              {/* TODO: 실제 개인정보처리방침 페이지 없음 — home.front에 /privacy 만들 것 */}
              <a href="https://home.posselect.com/privacy" style={{ marginLeft: "auto", color: "inherit", textDecoration: "underline" }}>
                보기
              </a>
            </label>
            {/* TODO: 마케팅 수신 동의는 UI만 있고 백엔드에 저장 안 됨 — auth.api SignupRequest에 필드 추가 필요 */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(e) => {
                  setAgreeMarketing(e.target.checked);
                  setAgreeAll(agreeTerms && agreePrivacy && e.target.checked);
                }}
              />
              (선택) 마케팅 정보 수신 동의
            </label>
          </div>

          {error && <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={!otpVerified}>
            가입하기
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
          이미 계정이 있으신가요?{" "}
          <a href="/login" style={{ color: "var(--color-text)", fontWeight: 600 }}>
            로그인
          </a>
        </div>
      </div>
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
