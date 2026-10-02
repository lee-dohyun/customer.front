"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { toE164, type PhoneNormalization } from "@/lib/phone";
import { readErrorMessage } from "@/lib/http";

/**
 * 휴대폰 본인 인증 블록의 사용자 노출 문구. #103(next-intl 로케일 라우팅)이 붙으면 이 객체가
 * 그대로 ko 메시지 카탈로그가 된다. 서버가 내려주는 문구(검증 실패 등)는 이미 요청 로케일에
 * 맞춰져 있으니 여기 것으로 덮어쓰지 말고 그대로 보여줄 것 — 여기 있는 건 어디까지나 폴백이다.
 */
const MESSAGES = {
  phoneLabel: "휴대폰 번호",
  countryLabel: "국가",
  phonePlaceholder: "휴대폰 번호",
  phoneHint: "해외 번호는 국가를 선택하거나 +국가번호부터 입력하세요.",
  // phoneRequired/phoneInvalid는 lib/phone.ts의 PHONE_ERROR_MESSAGES가 낸다(toE164 반환값).

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

const subscribeNoop = () => () => {};

function readPreferredLanguage(): string | null {
  return navigator.languages?.[0] ?? navigator.language ?? null;
}

// 브라우저가 이상한 언어 태그를 주거나 지원 국가가 아니면 null — 호출부가 기본 국가를 그대로 쓴다.
function detectRegion(preferred: string | null): string | null {
  if (!preferred) return null;
  try {
    const detected = new Intl.Locale(preferred).maximize().region;
    return detected && COUNTRY_DIAL_CODES.some(([code]) => code === detected) ? detected : null;
  } catch {
    return null;
  }
}

/**
 * 휴대폰 본인 인증(국가 선택 → 번호 입력 → 인증번호 발송 → 확인)의 상태와 동작.
 *
 * <p>회원가입(/signup)과 소셜 로그인 가입 마무리(/onboarding, auth.api#42)가 같이 쓴다. 두 화면이
 * 이 절차를 따로 구현하면 번호 정규화 규칙이 어긋나 "인증은 됐는데 제출에서 미인증"이 되는
 * 어긋남이 다시 생긴다 — 화면을 늘릴 때도 이 훅을 쓸 것.
 *
 * <p>SMS는 아직 실제 발송사(알리고/네이버클라우드 등) 연동 전이라 auth.api가 mock으로
 * 처리한다(코드를 서버 로그에만 남기고 검증 로직은 실제로 동작) — payment(mock, 항상
 * 성공)와 동일한 패턴. 실 발송사 연동 시 auth.api PhoneVerificationService만 교체하면
 * 되고 이 훅은 변경할 필요 없다.
 *
 * @author leedohyun
 * @since 2026-10-02
 * @see {@link https://github.com/lee-dohyun/auth.api/issues/42}
 */
export function usePhoneVerification() {
  const [phone, setPhone] = useState("");
  // 사용자가 국가를 직접 고르기 전까지는 브라우저 언어로 감지한 값(없으면 기본값)을 쓴다.
  const [regionChoice, setRegionChoice] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // 브라우저 언어/지역으로 초깃값을 다듬는다. 서버 렌더와 하이드레이션은 getServerSnapshot(null)로
  // 위의 상수를 그리고, 하이드레이션 뒤에 브라우저 값으로 다시 그린다 — 예전엔 마운트 후 effect 에서
  // setState 했다(react-hooks/set-state-in-effect, gateway#286).
  // #103이 붙으면 이 값들은 라우트 로케일에서 오게 되고 이 훅은 사라진다.
  const preferredLanguage = useSyncExternalStore(subscribeNoop, readPreferredLanguage, () => null);
  const displayLanguage = preferredLanguage ?? DEFAULT_DISPLAY_LANGUAGE;
  const region = regionChoice ?? detectRegion(preferredLanguage) ?? DEFAULT_REGION;

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

  const changePhone = (value: string) => {
    setPhone(value);
    resetVerification();
  };

  const changeRegion = (value: string) => {
    setRegionChoice(value);
    resetVerification();
  };

  const sendOtp = async () => {
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

  const verifyOtp = async () => {
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

  /**
   * 제출 요청에 실을 번호. 인증 때와 반드시 같은 값이어야 백엔드가 인증 이력을 찾는다. 입력이
   * 그대로이므로 여기서 다시 정규화해도 send-otp/verify-otp 때와 같은 문자열이 나온다.
   */
  const normalize = (): PhoneNormalization => toE164(phone, dialCode);

  /** 서버가 "인증이 만료됐다"고 답했을 때 인증 단계를 되돌린다(번호 입력은 남긴다). */
  const expire = () => {
    setOtpVerified(false);
    setOtpSent(false);
  };

  return {
    phone,
    region,
    countryOptions,
    otpSent,
    otpCode,
    otpVerified,
    otpError,
    otpSending,
    otpVerifying,
    setOtpCode,
    changePhone,
    changeRegion,
    sendOtp,
    verifyOtp,
    normalize,
    expire,
  };
}

export type PhoneVerification = ReturnType<typeof usePhoneVerification>;

function sendButtonLabel(verification: PhoneVerification): string {
  if (verification.otpVerified) return MESSAGES.otpVerified;
  if (verification.otpSent) return MESSAGES.resendOtp;
  return verification.otpSending ? MESSAGES.sendingOtp : MESSAGES.sendOtp;
}

/** {@link usePhoneVerification} 의 입력 칸들. 폼 안에 그대로 넣는다. */
export function PhoneVerificationFields({ verification }: Readonly<{ verification: PhoneVerification }>) {
  const { phone, region, countryOptions, otpSent, otpCode, otpVerified, otpError, otpSending, otpVerifying } =
    verification;

  return (
    <>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="phone">{MESSAGES.phoneLabel}</label>
        <select
          id="country"
          className="input"
          aria-label={MESSAGES.countryLabel}
          style={{ marginBottom: 8 }}
          value={region}
          onChange={(e) => verification.changeRegion(e.target.value)}
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
            onChange={(e) => verification.changePhone(e.target.value)}
            disabled={otpVerified}
            required
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={verification.sendOtp}
            disabled={otpSending || otpVerified || !phone}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {sendButtonLabel(verification)}
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
              onChange={(e) => verification.setOtpCode(e.target.value)}
              maxLength={6}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={verification.verifyOtp}
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
    </>
  );
}
