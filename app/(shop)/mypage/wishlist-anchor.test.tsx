import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import MyPage from "./page";

vi.mock("@/lib/navigation", () => ({ replaceLocation: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** 주문내역 응답만 테스트가 원하는 시점에 풀어 준다 — "위쪽 내용이 늦게 그려지는" 상황을 만든다. */
function mockApisWithLateOrders() {
  let releaseOrders: () => void = () => {};
  const ordersGate = new Promise<void>((resolve) => {
    releaseOrders = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/auth/me") return json({ email: "user@example.com", role: "USER" });
      if (url === "/api/auth/onboarding") return json({ required: false });
      if (url === "/api/orders/mine") {
        await ordersGate;
        return json([{ id: 1, status: "PAID", totalPrice: 1000, itemCount: 1, createdAt: "2026-10-01T00:00:00Z" }]);
      }
      if (url.startsWith("/api/wishlists")) return json({ content: [{ id: 5, productId: 7, productName: "찜한 상품" }], last: true });
      return new Response(null, { status: 404 });
    }),
  );
  return releaseOrders;
}

let scrolledWithOrdersRendered: boolean[] = [];

beforeEach(() => {
  scrolledWithOrdersRendered = [];
  // jsdom 에는 scrollIntoView 가 없다. 부른 시점에 주문내역이 이미 그려져 있었는지를 기록한다.
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolledWithOrdersRendered.push(this.id === "wishlist" && screen.queryByText(/주문 #1/) !== null);
  });
  window.location.hash = "#wishlist";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

describe("마이페이지 #wishlist 앵커 (product.api#10)", () => {
  it("찜 목록 위의 내용이 다 그려진 뒤에 한 번만 찜 목록으로 옮긴다", async () => {
    const releaseOrders = mockApisWithLateOrders();
    render(<MyPage />);
    expect(await screen.findByText("이메일: user@example.com")).toBeInTheDocument();
    expect(await screen.findByText("찜한 상품")).toBeInTheDocument();

    // 주문내역이 아직 안 왔다 — 지금 옮기면 주문내역이 그려지면서 찜 목록이 아래로 밀린다.
    expect(scrolledWithOrdersRendered).toEqual([]);

    releaseOrders();
    await waitFor(() => expect(scrolledWithOrdersRendered).toEqual([true]));
  });

  it("해시 없이 들어오면 옮기지 않는다", async () => {
    window.location.hash = "";
    const releaseOrders = mockApisWithLateOrders();
    render(<MyPage />);
    releaseOrders();
    expect(await screen.findByText(/주문 #1/)).toBeInTheDocument();
    expect(scrolledWithOrdersRendered).toEqual([]);
  });
});
