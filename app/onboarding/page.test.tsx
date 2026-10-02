import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import OnboardingPage from "./page";
import { replaceLocation } from "@/lib/navigation";

vi.mock("@/lib/navigation", () => ({ replaceLocation: vi.fn() }));

type Call = { method: string; url: string; body: unknown };

/**
 * auth.api 흉내. `status` 는 GET /api/auth/onboarding 의 응답, `complete` 는 POST 의 응답이다.
 * OTP 발송/확인은 항상 성공시킨다 — 그 규칙은 백엔드 몫이고 이 화면이 검사할 일이 아니다.
 */
function mockAuthApi(options: { status: Response | (() => Response); complete?: () => Response }) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url === "/api/auth/onboarding" && method === "GET") {
        return typeof options.status === "function" ? options.status() : options.status;
      }
      if (url === "/api/auth/onboarding" && method === "POST") {
        return options.complete ? options.complete() : new Response(null, { status: 200 });
      }
      return new Response(null, { status: 200 });
    }),
  );
  return calls;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function verifyPhone() {
  fireEvent.change(screen.getByLabelText("휴대폰 번호"), { target: { value: "+82 10-1234-5678" } });
  fireEvent.click(screen.getByRole("button", { name: "인증요청" }));
  fireEvent.change(await screen.findByLabelText("인증번호"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "확인" }));
  await screen.findByText("휴대폰 인증이 완료되었습니다.");
}

beforeEach(() => {
  vi.mocked(replaceLocation).mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("가입 마무리(/onboarding)", () => {
  it("이미 마친 회원은 폼을 보여 주지 않고 마이페이지로 보낸다", async () => {
    mockAuthApi({ status: json({ required: false }) });
    render(<OnboardingPage />);
    await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/mypage"));
    expect(screen.queryByLabelText("휴대폰 번호")).not.toBeInTheDocument();
  });

  it("로그인이 풀려 있으면 로그인 화면으로 보낸다", async () => {
    mockAuthApi({ status: new Response(null, { status: 401 }) });
    render(<OnboardingPage />);
    await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/login"));
  });

  it("상태 조회가 실패하면 안내 문구를 보여 주고 어디로도 보내지 않는다", async () => {
    mockAuthApi({ status: new Response(null, { status: 404 }) });
    render(<OnboardingPage />);
    expect(await screen.findByText("가입 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.")).toBeInTheDocument();
    expect(replaceLocation).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("휴대폰 번호")).not.toBeInTheDocument();
  });

  it("휴대폰 인증 전에는 완료 버튼이 눌리지 않는다", async () => {
    mockAuthApi({ status: json({ required: true }) });
    render(<OnboardingPage />);
    expect(await screen.findByRole("button", { name: "가입 완료" })).toBeDisabled();
  });

  it("필수 약관에 동의하지 않으면 요청을 보내지 않는다", async () => {
    const calls = mockAuthApi({ status: json({ required: true }) });
    render(<OnboardingPage />);
    await screen.findByLabelText("휴대폰 번호");
    await verifyPhone();
    fireEvent.click(screen.getByRole("button", { name: "가입 완료" }));
    expect(await screen.findByText("필수 약관에 동의해주세요.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.url === "/api/auth/onboarding")).toBe(false);
  });

  it("인증한 번호와 동의 여부를 보내고, 성공하면 마이페이지로 간다", async () => {
    const calls = mockAuthApi({ status: json({ required: true }) });
    render(<OnboardingPage />);
    await screen.findByLabelText("휴대폰 번호");
    await verifyPhone();
    fireEvent.click(screen.getByLabelText("(필수) 이용약관 동의"));
    fireEvent.click(screen.getByLabelText("(필수) 개인정보 수집 및 이용 동의"));
    fireEvent.click(screen.getByRole("button", { name: "가입 완료" }));

    await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/mypage"));
    // send-otp / verify-otp / onboarding 세 요청의 번호가 완전히 같아야 백엔드가 인증 이력을 찾는다.
    expect(calls.filter((c) => c.method === "POST").map((c) => [c.url, c.body])).toEqual([
      ["/api/auth/phone/send-otp", { phoneNumber: "+821012345678" }],
      ["/api/auth/phone/verify-otp", { phoneNumber: "+821012345678", code: "123456" }],
      [
        "/api/auth/onboarding",
        { phoneNumber: "+821012345678", agreeTerms: true, agreePrivacy: true, marketingOptIn: false },
      ],
    ]);
  });

  it("전체 동의를 누르면 마케팅 수신 동의도 함께 보낸다", async () => {
    const calls = mockAuthApi({ status: json({ required: true }) });
    render(<OnboardingPage />);
    await screen.findByLabelText("휴대폰 번호");
    await verifyPhone();
    fireEvent.click(screen.getByLabelText("전체 동의"));
    fireEvent.click(screen.getByRole("button", { name: "가입 완료" }));

    await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/mypage"));
    expect(calls.at(-1)?.body).toMatchObject({ marketingOptIn: true });
  });

  it("인증이 만료됐다는 응답이면 인증 단계를 되돌린다", async () => {
    mockAuthApi({ status: json({ required: true }), complete: () => json({ error: "PHONE_NOT_VERIFIED" }, 400) });
    render(<OnboardingPage />);
    await screen.findByLabelText("휴대폰 번호");
    await verifyPhone();
    fireEvent.click(screen.getByLabelText("전체 동의"));
    fireEvent.click(screen.getByRole("button", { name: "가입 완료" }));

    expect(await screen.findByText("휴대폰 인증이 만료되었습니다. 다시 인증해주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인증요청" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "가입 완료" })).toBeDisabled();
    expect(replaceLocation).not.toHaveBeenCalled();
  });

  it("다른 계정이 쓰는 번호면 서버가 준 문구를 그대로 보여 준다", async () => {
    mockAuthApi({
      status: json({ required: true }),
      complete: () => json({ error: "이미 다른 계정에서 사용 중인 휴대폰 번호입니다." }, 409),
    });
    render(<OnboardingPage />);
    await screen.findByLabelText("휴대폰 번호");
    await verifyPhone();
    fireEvent.click(screen.getByLabelText("전체 동의"));
    fireEvent.click(screen.getByRole("button", { name: "가입 완료" }));

    expect(await screen.findByText("이미 다른 계정에서 사용 중인 휴대폰 번호입니다.")).toBeInTheDocument();
    expect(replaceLocation).not.toHaveBeenCalled();
  });
});
