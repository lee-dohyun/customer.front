"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog, Logo } from "@posselect/ui";

/**
 * 이 화면의 사용자 노출 문구를 한곳에 모아둔다. #103(next-intl 로케일 라우팅)이 붙으면 이
 * 객체가 그대로 ko 메시지 카탈로그가 되고 호출부만 `t("...")`로 바뀌므로, 그때 JSX를 다시
 * 훑을 필요가 없다. 서버가 내려주는 문구(검증 실패 등)는 이미 요청 로케일에 맞춰져 있으니
 * 여기 것으로 덮어쓰지 말고 그대로 보여줄 것 — 여기 있는 건 어디까지나 폴백이다.
 */
const MESSAGES = {
  emailLabel: "이메일",
  emailPlaceholder: "you@example.com",
  passwordLabel: "비밀번호",
  passwordPlaceholder: "영문/숫자/특수문자 조합 8자 이상",
  passwordConfirmLabel: "비밀번호 확인",
  nameLabel: "이름",
  namePlaceholder: "홍길동",

  phoneLabel: "휴대폰 번호",
  countryLabel: "국가",
  phonePlaceholder: "휴대폰 번호",
  phoneHint: "해외 번호는 국가를 선택하거나 +국가번호부터 입력하세요.",
  phoneRequired: "휴대폰 번호를 입력하세요.",
  phoneInvalid: "휴대폰 번호를 다시 확인해주세요.",

  otpLabel: "인증번호",
  otpPlaceholder: "6자리 숫자",
  otpRequired: "인증번호를 입력하세요.",
  otpSendFailed: "인증번호 발송에 실패했습니다.",
  otpCooldown: "인증번호 재발송은 60초 후에 가능합니다.",
  otpVerifyFailed: "인증번호 확인에 실패했습니다.",
  otpMismatch: "인증번호가 일치하지 않습니다.",
  otpVerifiedNotice: "휴대폰 인증이 완료되었습니다.",
  sendOtp: "인증요청",
  resendOtp: "재발송",
  sendingOtp: "발송중...",
  otpVerified: "인증완료",
  verifyOtp: "확인",
  verifyingOtp: "확인중...",

  agreeAll: "전체 동의",
  agreeTerms: "(필수) 이용약관 동의",
  agreePrivacy: "(필수) 개인정보 수집 및 이용 동의",
  agreeMarketing: "(선택) 마케팅 정보 수신 동의",
  agreementView: "보기",

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
 * 국가 선택기에 띄울 국가번호 목록.
 *
 * <p>여기 있는 건 번호를 E.164로 조립하기 위한 데이터일 뿐이고, "유효한 번호인가"는 절대
 * 판정하지 않는다 — 그 판정은 auth.api의 libphonenumber(PhoneNumbers)만 한다(#153). 국가별
 * 정규식을 프론트에 다시 들이면 백엔드와 규칙이 어긋나서 이 이슈가 그대로 재발한다.
 *
 * <p>목록에 없는 국가는 번호를 `+`부터 직접 입력하면 되고, 그러면 이 선택값은 무시된다
 * (백엔드도 `+`로 시작하면 국제형으로 그대로 해석하므로 규칙이 일치한다).
 */
const COUNTRY_DIAL_CODES: ReadonlyArray<readonly [region: string, dialCode: string]> = [
  ["KR", "82"],
  ["JP", "81"],
  ["CN", "86"],
  ["US", "1"],
  ["TW", "886"],
  ["HK", "852"],
  ["SG", "65"],
  ["VN", "84"],
  ["TH", "66"],
  ["PH", "63"],
  ["ID", "62"],
  ["MY", "60"],
  ["IN", "91"],
  ["AU", "61"],
  ["GB", "44"],
  ["DE", "49"],
  ["FR", "33"],
  ["CA", "1"],
];

const DEFAULT_REGION = "KR";

/** 앱에 로케일 라우팅(#103)이 아직 없어서, 그전까지 국가명 표기에 쓸 기본 언어. */
const DEFAULT_DISPLAY_LANGUAGE = "ko";

/** 전화번호 입력에 허용할 문자 — 숫자와 통상적인 구분기호뿐. "명백한 오타"만 걸러내는 용도다. */
const PHONE_INPUT_PATTERN = /^[+\d\s().-]+$/;

type PhoneNormalization = { value: string; error?: undefined } | { value?: undefined; error: string };

/**
 * 입력값을 백엔드에 보낼 E.164 문자열(+821012345678)로 맞춘다.
 *
 * <p>send-otp / verify-otp / signup 세 요청이 **완전히 같은 문자열**을 보내야 한다. 백엔드는
 * 번호를 정규화해서 인증 상태를 조회하는데, 세 요청이 로케일에 따라 다르게 해석될 여지를 두면
 * "인증은 됐는데 가입에서 미인증으로 뜨는" 어긋남이 생긴다. 국가번호를 항상 붙여 보내면
 * 백엔드의 로케일 추론 경로 자체를 타지 않으므로 그 여지가 사라진다.
 *
 * <p>여기서 하는 검사는 빈값/허용 문자/자릿수 범위(E.164 최대 15자리)뿐이다. 번호가 실제로
 * 존재하는 형식인지, 휴대폰인지는 판단하지 않고 서버 응답에 맡긴다.
 */
function toE164(input: string, dialCode: string): PhoneNormalization {
  const raw = input.trim();
  if (!raw) {
    return { error: MESSAGES.phoneRequired };
  }
  if (!PHONE_INPUT_PATTERN.test(raw)) {
    return { error: MESSAGES.phoneInvalid };
  }

  const digits = raw.replace(/\D/g, "");
  // `+`로 시작하면 이미 국가번호가 붙어 있는 국제형 — 선택된 국가는 무시한다(백엔드와 같은 규칙).
  // 아니면 국내 표기로 보고 앞자리 국번 0을 떼어낸다. 이 목록의 국가들은 국제형에서 휴대폰
  // 앞 0을 쓰지 않으므로(0이 없는 국가에선 아무 일도 일어나지 않는다) 안전하다.
  const e164 = raw.startsWith("+") ? `+${digits}` : `+${dialCode}${digits.replace(/^0/, "")}`;

  const digitCount = e164.length - 1;
  if (digitCount < 7 || digitCount > 15) {
    return { error: MESSAGES.phoneInvalid };
  }
  return { value: e164 };
}

/**
 * 에러 응답에서 사람이 읽을 문장 하나를 꺼낸다.
 *
 * <p>auth.api의 에러 응답은 모양이 두 가지다. 서비스 예외는 `{error: "..."}`이고, `@Valid`
 * 검증 실패는 ValidationExceptionHandler가 만드는 `{필드명: "..."}` 맵이다. 어느 쪽이든 문구는
 * 요청 로케일(Accept-Language, 나중엔 게이트웨이의 X-Locale)에 맞춰 서버가 번역해서 내려주므로
 * 프론트에서 다시 쓰지 말고 그대로 노출한다.
 */
async function readErrorMessage(res: Response): Promise<string | null> {
  const body: unknown = await res.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return null;
  }
  const values = body as Record<string, unknown>;
  if (typeof values.error === "string" && values.error) {
    return values.error;
  }
  const firstMessage = Object.values(values).find((v) => typeof v === "string" && v);
  return typeof firstMessage === "string" ? firstMessage : null;
}

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
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [displayLanguage, setDisplayLanguage] = useState<string>(DEFAULT_DISPLAY_LANGUAGE);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [openAgreement, setOpenAgreement] = useState<"terms" | "privacy" | null>(null);
  const [agreementData, setAgreementData] = useState<{ title: string; articles: { title: string; body: string }[] } | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const handleOpenAgreement = async (type: "terms" | "privacy") => {
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
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") || "/mypage";

  // 브라우저 언어/지역으로 초깃값을 다듬는다. 서버 렌더와 첫 클라이언트 렌더는 둘 다 위의
  // 상수로 그려야 하이드레이션이 어긋나지 않으므로, navigator는 마운트 후에만 본다.
  // #103이 붙으면 이 값들은 라우트 로케일에서 오게 되고 이 effect는 사라진다.
  useEffect(() => {
    const preferred = navigator.languages?.[0] ?? navigator.language;
    if (!preferred) {
      return;
    }
    setDisplayLanguage(preferred);
    try {
      const detected = new Intl.Locale(preferred).maximize().region;
      if (detected && COUNTRY_DIAL_CODES.some(([code]) => code === detected)) {
        setRegion(detected);
      }
    } catch {
      // 브라우저가 이상한 언어 태그를 주는 경우 — 기본 국가를 그대로 둔다
    }
  }, []);

  const countryOptions = useMemo(() => {
    let regionNames: Intl.DisplayNames | null = null;
    try {
      regionNames = new Intl.DisplayNames([displayLanguage], { type: "region" });
    } catch {
      regionNames = null;
    }
    return COUNTRY_DIAL_CODES.map(([code, dialCode]) => ({
      code,
      dialCode,
      name: regionNames?.of(code) ?? code,
    })).sort((a, b) => a.name.localeCompare(b.name, displayLanguage));
  }, [displayLanguage]);

  const dialCode = COUNTRY_DIAL_CODES.find(([code]) => code === region)?.[1] ?? "";

  // 번호(또는 국가)를 바꾸면 이전 인증은 무효화 — 다른 번호로 다시 인증해야 함
  const resetVerification = () => {
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    resetVerification();
  };

  const handleRegionChange = (value: string) => {
    setRegion(value);
    resetVerification();
  };

  const handleSendOtp = async () => {
    setOtpError("");
    const normalized = toE164(phone, dialCode);
    if (normalized.error) {
      setOtpError(normalized.error);
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalized.value }),
      });
      if (res.ok) {
        setOtpSent(true);
        return;
      }
      // 번호가 유효한지는 백엔드(libphonenumber)가 판정하고, 그 사유도 요청 로케일에 맞춰
      // 문장으로 내려준다 — 프론트에서 형식을 다시 따지지 않고 그대로 보여준다.
      const message = await readErrorMessage(res);
      setOtpError(message ?? (res.status === 429 ? MESSAGES.otpCooldown : MESSAGES.otpSendFailed));
    } catch {
      setOtpError(MESSAGES.otpSendFailed);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    if (!otpCode) {
      setOtpError(MESSAGES.otpRequired);
      return;
    }
    const normalized = toE164(phone, dialCode);
    if (normalized.error) {
      setOtpError(normalized.error);
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalized.value, code: otpCode }),
      });
      if (res.ok) {
        setOtpVerified(true);
        return;
      }
      const message = await readErrorMessage(res);
      setOtpError(message ?? MESSAGES.otpMismatch);
    } catch {
      setOtpError(MESSAGES.otpVerifyFailed);
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
      setError(MESSAGES.requiredFieldsMissing);
      return;
    }
    if (password !== passwordConfirm) {
      setError(MESSAGES.passwordMismatch);
      return;
    }
    if (!otpVerified) {
      setError(MESSAGES.phoneNotVerified);
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError(MESSAGES.agreementsRequired);
      return;
    }
    // 인증 때와 반드시 같은 값이어야 백엔드가 인증 이력을 찾는다. 입력이 그대로이므로
    // 여기서 다시 정규화해도 send-otp/verify-otp 때와 같은 문자열이 나온다.
    const normalized = toE164(phone, dialCode);
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
          marketingOptIn: agreeMarketing,
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
          setOtpVerified(false);
          setOtpSent(false);
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

          {/*
            SMS는 아직 실제 발송사(알리고/네이버클라우드 등) 연동 전이라 auth.api가 mock으로
            처리한다(코드를 서버 로그에만 남기고 검증 로직은 실제로 동작) — payment(mock, 항상
            성공)와 동일한 패턴. 실 발송사 연동 시 auth.api PhoneVerificationService만 교체하면
            되고 이 화면은 변경할 필요 없다.
          */}
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="phone">{MESSAGES.phoneLabel}</label>
            <select
              id="country"
              className="input"
              aria-label={MESSAGES.countryLabel}
              style={{ marginBottom: 8 }}
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              disabled={otpVerified}
            >
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} (+{country.dialCode})
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="phone"
                type="tel"
                className="input"
                placeholder={MESSAGES.phonePlaceholder}
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
                {otpVerified
                  ? MESSAGES.otpVerified
                  : otpSent
                    ? MESSAGES.resendOtp
                    : otpSending
                      ? MESSAGES.sendingOtp
                      : MESSAGES.sendOtp}
              </button>
            </div>
            <p style={{ color: "var(--color-neutral-700)", fontSize: 12, marginTop: 6 }}>{MESSAGES.phoneHint}</p>
          </div>

          {otpSent && !otpVerified && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="otp">{MESSAGES.otpLabel}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder={MESSAGES.otpPlaceholder}
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
                  {otpVerifying ? MESSAGES.verifyingOtp : MESSAGES.verifyOtp}
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
            <div style={{ color: "var(--color-success, #1a7f37)", fontSize: 12.5, marginBottom: 12 }}>
              {MESSAGES.otpVerifiedNotice}
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
              {MESSAGES.agreeAll}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setRequiredAgreement(setAgreeTerms, e.target.checked, agreePrivacy)}
              />
              {MESSAGES.agreeTerms}
              <button
                type="button"
                onClick={() => handleOpenAgreement("terms")}
                style={{ marginLeft: "auto", background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
              >
                {MESSAGES.agreementView}
              </button>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setRequiredAgreement(setAgreePrivacy, e.target.checked, agreeTerms)}
              />
              {MESSAGES.agreePrivacy}
              <button
                type="button"
                onClick={() => handleOpenAgreement("privacy")}
                style={{ marginLeft: "auto", background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
              >
                {MESSAGES.agreementView}
              </button>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(e) => {
                  setAgreeMarketing(e.target.checked);
                  setAgreeAll(agreeTerms && agreePrivacy && e.target.checked);
                }}
              />
              {MESSAGES.agreeMarketing}
            </label>
          </div>

          {error && <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={!otpVerified || isSubmitting}>
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

      {openAgreement && (
        <Dialog
          title={agreementData ? agreementData.title : "약관 확인"}
          onClose={() => setOpenAgreement(null)}
          maxWidth={640}
          actions={
            <button type="button" onClick={() => setOpenAgreement(null)} className="btn btn-secondary">
              닫기
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {agreementLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--color-neutral-700)" }}>
                약관 데이터를 불러오는 중입니다...
              </div>
            ) : agreementData ? (
              agreementData.articles.map((article) => (
                <section key={article.title}>
                  <h3 style={{ marginBottom: 6, fontSize: 14 }}>{article.title}</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{article.body}</p>
                </section>
              ))
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--color-danger)" }}>
                약관을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
              </div>
            )}
          </div>
        </Dialog>
      )}
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
