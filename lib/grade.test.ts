import { describe, expect, it } from "vitest";
import { benefitText, nextGradeText, type MyGrade } from "@/lib/grade";

const silver: MyGrade = {
  code: "SILVER",
  name: "실버",
  discountRate: 2.0,
  windowMonths: 6,
  nextGrade: { code: "GOLD", name: "골드", discountRate: 5.0, minSpendAmount: 1000000.0 },
  amountToNextGrade: 550000.0,
};

describe("benefitText", () => {
  it("할인율이 있으면 퍼센트로 보여 준다", () => {
    expect(benefitText(silver)).toBe("2% 할인");
    expect(benefitText({ ...silver, discountRate: 2.5 })).toBe("2.5% 할인");
  });

  it("할인율이 0이면 혜택이 없다고 말한다", () => {
    expect(benefitText({ ...silver, discountRate: 0 })).toBe("등급 할인 혜택이 없습니다.");
  });
});

describe("nextGradeText", () => {
  it("남은 금액을 천 단위 구분해 보여 준다", () => {
    expect(nextGradeText(silver)).toBe(
      "골드 등급까지 550,000원 남았습니다. (최근 6개월 구매확정 금액 기준)",
    );
  });

  it("이미 기준을 채웠으면 다음 산정 때 반영된다고 알린다", () => {
    expect(nextGradeText({ ...silver, amountToNextGrade: 0 })).toBe(
      "골드 등급 기준을 채웠습니다. 다음 등급 산정(월 1회) 때 반영됩니다.",
    );
  });

  it("최고 등급이면 다음 등급이 없다고 알린다", () => {
    expect(nextGradeText({ ...silver, nextGrade: null, amountToNextGrade: null })).toBe(
      "현재 최고 등급입니다.",
    );
  });

  it("남은 금액을 못 받았으면 숫자를 지어내지 않는다", () => {
    expect(nextGradeText({ ...silver, amountToNextGrade: null })).toBe(
      "다음 등급은 골드입니다. 남은 금액을 불러오지 못했습니다.",
    );
  });
});
