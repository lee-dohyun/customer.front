import { describe, expect, it } from "vitest";
import { withHash } from "./navigation";

describe("withHash", () => {
  it("돌아갈 주소에 해시를 붙인다", () => {
    expect(withHash("https://customer.posselect.com/mypage", "#wishlist")).toBe("https://customer.posselect.com/mypage#wishlist");
    expect(withHash("/mypage", "#wishlist")).toBe("/mypage#wishlist");
  });
  it("해시가 없으면 그대로 둔다", () => {
    expect(withHash("/mypage", "")).toBe("/mypage");
    expect(withHash("/mypage", "#")).toBe("/mypage");
  });
  it("돌아갈 주소에 이미 해시가 있으면 덮어쓰지 않는다", () => {
    expect(withHash("/mypage#orders", "#wishlist")).toBe("/mypage#orders");
  });
});
