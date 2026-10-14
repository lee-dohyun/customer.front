import { describe, expect, it } from "vitest";
import { myOrdersUrl, periodRange, trackingSearchUrl } from "./order";

describe("periodRange", () => {
  it("전체 기간이면 날짜를 보내지 않는다", () => {
    expect(periodRange(null, new Date(2026, 9, 14))).toEqual({});
  });

  it("오늘을 끝으로 N개월 전 같은 날부터", () => {
    expect(periodRange(3, new Date(2026, 9, 14))).toEqual({ from: "2026-07-14", to: "2026-10-14" });
  });

  it("월말은 그 달의 마지막 날로 맞춘다 — 3/31 의 1개월 전은 2/28 이지 3/3 이 아니다", () => {
    expect(periodRange(1, new Date(2026, 2, 31))).toEqual({ from: "2026-02-28", to: "2026-03-31" });
  });

  it("해를 넘긴다", () => {
    expect(periodRange(12, new Date(2026, 0, 5))).toEqual({ from: "2025-01-05", to: "2026-01-05" });
  });
});

describe("myOrdersUrl", () => {
  it("기간·페이지를 쿼리로 싣는다", () => {
    expect(myOrdersUrl(1, 2, 10, new Date(2026, 9, 14))).toBe(
      "/api/orders/mine?from=2026-09-14&to=2026-10-14&page=2&size=10",
    );
  });

  it("전체 기간이면 페이지만", () => {
    expect(myOrdersUrl(null, 0, 10, new Date(2026, 9, 14))).toBe("/api/orders/mine?page=0&size=10");
  });
});

describe("trackingSearchUrl", () => {
  it("택배사와 운송장 번호로 검색한다", () => {
    expect(trackingSearchUrl("CJ대한통운", "123456789012")).toBe(
      "https://search.naver.com/search.naver?query=CJ%EB%8C%80%ED%95%9C%ED%86%B5%EC%9A%B4%20123456789012",
    );
  });
});
