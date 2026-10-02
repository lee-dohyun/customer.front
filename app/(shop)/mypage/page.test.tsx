import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import MyPage from "./page";
import { replaceLocation } from "@/lib/navigation";

vi.mock("@/lib/navigation", () => ({ replaceLocation: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** 마이페이지가 부르는 API 흉내. `onboarding` 만 테스트마다 바꾼다. */
function mockApis(onboarding: () => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/auth/onboarding") return onboarding();
      if (url === "/api/auth/me") return json({ email: "social@example.com", role: "USER" });
      if (url === "/api/orders/mine") return json([]);
      if (url.startsWith("/api/wishlists")) return json({ content: [], last: true });
      return new Response(null, { status: 404 });
    }),
  );
}

beforeEach(() => {
  vi.mocked(replaceLocation).mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("마이페이지의 가입 마무리 확인 (auth.api#42)", () => {
  it("약관 동의·휴대폰 인증을 안 마친 회원은 가입 마무리로 보낸다", async () => {
    mockApis(() => json({ required: true }));
    render(<MyPage />);
    await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/onboarding"));
  });

  it("마친 회원은 그대로 마이페이지를 본다", async () => {
    mockApis(() => json({ required: false }));
    render(<MyPage />);
    expect(await screen.findByText("이메일: social@example.com")).toBeInTheDocument();
    expect(replaceLocation).not.toHaveBeenCalled();
  });

  it("확인에 실패해도(auth.api 가 이 경로를 모르는 404 포함) 마이페이지를 막지 않는다", async () => {
    mockApis(() => new Response(null, { status: 404 }));
    render(<MyPage />);
    expect(await screen.findByText("이메일: social@example.com")).toBeInTheDocument();
    expect(replaceLocation).not.toHaveBeenCalled();
  });
});
