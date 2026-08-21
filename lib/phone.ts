/** 전화번호 입력에 허용할 문자 — 숫자와 통상적인 구분기호뿐. "명백한 오타"만 걸러내는 용도다. */
const PHONE_INPUT_PATTERN = /^[+\d\s().-]+$/;

export type PhoneNormalization = { value: string; error?: undefined } | { value?: undefined; error: string };

/** `toE164`가 실패했을 때 반환하는 문구. 호출부(예: 회원가입 폼)가 화면에 맞는 문구로 매핑한다. */
export const PHONE_ERROR_MESSAGES = {
  required: "휴대폰 번호를 입력하세요.",
  invalid: "휴대폰 번호를 다시 확인해주세요.",
} as const;

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
export function toE164(input: string, dialCode: string): PhoneNormalization {
  const raw = input.trim();
  if (!raw) {
    return { error: PHONE_ERROR_MESSAGES.required };
  }
  if (!PHONE_INPUT_PATTERN.test(raw)) {
    return { error: PHONE_ERROR_MESSAGES.invalid };
  }

  const digits = raw.replace(/\D/g, "");
  // `+`로 시작하면 이미 국가번호가 붙어 있는 국제형 — 선택된 국가는 무시한다(백엔드와 같은 규칙).
  // 아니면 국내 표기로 보고 앞자리 국번 0을 떼어낸다. 이 목록의 국가들은 국제형에서 휴대폰
  // 앞 0을 쓰지 않으므로(0이 없는 국가에선 아무 일도 일어나지 않는다) 안전하다.
  const e164 = raw.startsWith("+") ? `+${digits}` : `+${dialCode}${digits.replace(/^0/, "")}`;

  const digitCount = e164.length - 1;
  if (digitCount < 7 || digitCount > 15) {
    return { error: PHONE_ERROR_MESSAGES.invalid };
  }
  return { value: e164 };
}
