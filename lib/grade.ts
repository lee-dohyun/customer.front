/**
 * 마이페이지 등급 카드의 문구 (gateway#81).
 *
 * 응답 타입은 auth.api `GET /api/auth/me/grade` 계약 그대로다. 문구를 컴포넌트 밖에 둔 이유는
 * 경계(최고 등급 / 기준 달성 / 금액 미수신)를 단위 테스트로 고정하기 위해서다 — 설명서
 * (docs/user-guide/membership-grade.md)가 이 문구를 원문으로 인용한다. 문구를 고치면 설명서도 고칠 것.
 */
export type MyGrade = {
  code: string;
  name: string;
  /** 퍼센트 값(5.0 = 5%) */
  discountRate: number;
  /** 등급 산정 기간(개월) */
  windowMonths: number;
  /** 최고 등급이면 null */
  nextGrade: { code: string; name: string; discountRate: number; minSpendAmount: number } | null;
  /** 다음 등급이 없거나 서버가 구매확정 금액을 집계하지 못하면 null — 프론트에서 추정하지 않는다 */
  amountToNextGrade: number | null;
};

export function benefitText(grade: MyGrade): string {
  return grade.discountRate > 0 ? `${grade.discountRate}% 할인` : "등급 할인 혜택이 없습니다.";
}

export function nextGradeText(grade: MyGrade): string {
  if (!grade.nextGrade) {
    return "현재 최고 등급입니다.";
  }
  const next = grade.nextGrade.name;
  if (grade.amountToNextGrade === null) {
    return `다음 등급은 ${next}입니다. 남은 금액을 불러오지 못했습니다.`;
  }
  if (grade.amountToNextGrade <= 0) {
    return `${next} 등급 기준을 채웠습니다. 다음 등급 산정(월 1회) 때 반영됩니다.`;
  }
  return `${next} 등급까지 ${grade.amountToNextGrade.toLocaleString("ko-KR")}원 남았습니다. (최근 ${grade.windowMonths}개월 구매확정 금액 기준)`;
}
