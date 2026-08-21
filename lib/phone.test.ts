import { describe, expect, it } from "vitest";
import { PHONE_ERROR_MESSAGES, toE164 } from "@/lib/phone";

describe("toE164", () => {
  it("빈 입력이면 필수 입력 에러를 반환한다", () => {
    expect(toE164("", "82")).toEqual({ error: PHONE_ERROR_MESSAGES.required });
    expect(toE164("   ", "82")).toEqual({ error: PHONE_ERROR_MESSAGES.required });
  });

  it("허용되지 않은 문자가 섞이면 형식 에러를 반환한다", () => {
    expect(toE164("010-1234-5678a", "82")).toEqual({ error: PHONE_ERROR_MESSAGES.invalid });
    expect(toE164("전화번호", "82")).toEqual({ error: PHONE_ERROR_MESSAGES.invalid });
  });

  it("국내 표기(앞자리 0 포함)를 국가번호로 조립한다", () => {
    // 010-1234-5678 -> 82 10 1234 5678
    expect(toE164("010-1234-5678", "82")).toEqual({ value: "+821012345678" });
  });

  it("구분기호(공백/괄호/점) 없이도 같은 결과를 낸다", () => {
    expect(toE164("01012345678", "82")).toEqual({ value: "+821012345678" });
  });

  it("다양한 구분기호 표기를 동일하게 정규화한다", () => {
    expect(toE164("010 1234 5678", "82")).toEqual({ value: "+821012345678" });
    expect(toE164("(010) 1234-5678", "82")).toEqual({ value: "+821012345678" });
    expect(toE164("010.1234.5678", "82")).toEqual({ value: "+821012345678" });
  });

  it("앞자리 0이 없는 국내 표기는 그대로 국가번호에 붙인다", () => {
    // 0이 없으면 replace(/^0/, "")가 아무 일도 하지 않으므로 자릿수만 그대로 이어붙는다.
    expect(toE164("1012345678", "82")).toEqual({ value: "+821012345678" });
  });

  it("이미 +로 시작하는 국제형은 선택된 국가(dialCode)를 무시하고 그대로 사용한다", () => {
    expect(toE164("+821012345678", "1")).toEqual({ value: "+821012345678" });
    expect(toE164("+1 415-555-0132", "82")).toEqual({ value: "+14155550132" });
  });

  it("자릿수가 7자리 미만이면 형식 에러를 반환한다", () => {
    // dialCode(1) + digits(123) = "+1123" -> 4자리라 7자리 미만 기준에 걸린다.
    expect(toE164("123", "1")).toEqual({ error: PHONE_ERROR_MESSAGES.invalid });
  });

  it("자릿수가 15자리를 초과하면 형식 에러를 반환한다", () => {
    expect(toE164("+123456789012345678", "82")).toEqual({ error: PHONE_ERROR_MESSAGES.invalid });
  });

  it("경계값(정확히 7자리, 정확히 15자리)은 통과한다", () => {
    expect(toE164("+1234567", "82")).toEqual({ value: "+1234567" });
    expect(toE164("+123456789012345", "82")).toEqual({ value: "+123456789012345" });
  });

  it("다른 국가번호(dialCode)를 그대로 반영한다", () => {
    expect(toE164("312345678", "81")).toEqual({ value: "+81312345678" });
  });
});
