import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import OrderDetailPage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "42" }) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const base = {
  id: 42,
  status: "SHIPPED",
  ordererName: "홍길동",
  recipientName: "홍길동",
  recipientPhone: "010-1234-5678",
  zipCode: "04524",
  address1: "서울시 중구 세종대로 110",
  address2: "1층",
  shippingAddress: "서울시 중구 세종대로 110 1층",
  subtotalPrice: 33200,
  discountAmount: 664,
  shippingFee: 3000,
  totalPrice: 35536,
  gradeCode: "SILVER",
  items: [{ orderItemId: 7, claimedQuantity: 0, productId: 9030, productName: "퓨어原 단백질 트리트먼트", price: 16600, quantity: 2, sellerName: "포스셀렉트" }],
  createdAt: "2026-10-14T01:00:00",
  paidAt: "2026-10-14T01:01:00",
  shipment: {
    carrier: "CJ대한통운",
    trackingNumber: "123456789012",
    status: "SHIPPED",
    shippedAt: "2026-10-15T01:00:00",
    deliveredAt: null,
  },
  claims: [],
};

function mockOrder(response: Response) {
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("주문 상세 (gateway#321)", () => {
  it("상품·금액(할인·배송비 포함)·배송지·운송장을 보여 준다", async () => {
    mockOrder(json(base));
    render(<OrderDetailPage />);

    expect(await screen.findByText("퓨어原 단백질 트리트먼트 × 2")).toBeInTheDocument();
    expect(screen.getByText("상품 합계: 33,200원")).toBeInTheDocument();
    expect(screen.getByText("회원 등급 할인: -664원")).toBeInTheDocument();
    expect(screen.getByText("배송비: +3,000원")).toBeInTheDocument();
    expect(screen.getByText("결제 금액: 35,536원")).toBeInTheDocument();
    expect(screen.getByText(/배송 중 · CJ대한통운 123456789012/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "배송 조회" })).toHaveAttribute(
      "href",
      expect.stringContaining("search.naver.com"),
    );
  });

  it("운송장 등록 전이면 출고 전 안내를 보여 준다", async () => {
    mockOrder(json({ ...base, status: "PAID", shipment: null, shippingFee: 0, discountAmount: 0 }));
    render(<OrderDetailPage />);

    expect(await screen.findByText("아직 출고 전입니다. 운송장이 등록되면 여기에 표시됩니다.")).toBeInTheDocument();
    expect(screen.getByText("배송비: 무료")).toBeInTheDocument();
    expect(screen.queryByText(/회원 등급 할인/)).not.toBeInTheDocument();
  });

  it("남의 주문(404)이면 찾을 수 없다고 안내한다", async () => {
    mockOrder(new Response(null, { status: 404 }));
    render(<OrderDetailPage />);

    expect(await screen.findByText("주문을 찾을 수 없습니다.")).toBeInTheDocument();
  });

  it("출고 전(결제 완료·운송장 없음)이면 상품을 골라 취소하고, 같은 폼의 재시도는 같은 멱등 키로 보낸다 (gateway#320)", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let created = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === "POST") {
        created = true;
        return json({ id: 1 }, 201);
      }
      return json({
        ...base, status: "PAID", shipment: null,
        items: [{ ...base.items[0], claimedQuantity: created ? 1 : 0 }],
        claims: created ? [{ id: 1, type: "CANCEL", status: "COMPLETED", reasonType: "CHANGE_OF_MIND", reasonDetail: null,
          items: [{ orderItemId: 7, productName: "퓨어原 단백질 트리트먼트", quantity: 1 }], refundAmount: 16268,
          returnShippingFee: 0, rejectReason: null, createdAt: "2026-10-14T01:00:00" }] : [],
      });
    }));
    vi.stubGlobal("confirm", () => true);
    render(<OrderDetailPage />);

    (await screen.findByRole("button", { name: "주문 취소" })).click();
    const select = await screen.findByLabelText("퓨어原 단백질 트리트먼트");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(select, { target: { value: "1" } });
    screen.getByRole("button", { name: "취소하기" }).click();

    expect(await screen.findByText("환불 16,268원")).toBeInTheDocument();
    const post = calls.find((c) => c.init?.method === "POST");
    expect(post?.url).toBe("/api/orders/42/claims");
    expect(JSON.parse(String(post?.init?.body))).toEqual({
      type: "CANCEL", reasonType: null, reasonDetail: null, items: [{ orderItemId: 7, quantity: 1 }],
    });
    expect((post?.init?.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();
  });

  it("배송 중이면 신청 버튼 없이 안내만 보인다", async () => {
    mockOrder(json(base));
    render(<OrderDetailPage />);

    expect(await screen.findByText(/출고 전에는 취소, 배송 완료 후 7일 안에는 반품·교환/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "주문 취소" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "반품 신청" })).not.toBeInTheDocument();
  });

  it("반려된 신청은 사유를 보여 준다", async () => {
    mockOrder(json({ ...base, status: "DELIVERED", shipment: { ...base.shipment, status: "DELIVERED", deliveredAt: "2020-01-01T00:00:00" },
      claims: [{ id: 3, type: "RETURN", status: "REJECTED", reasonType: "CHANGE_OF_MIND", reasonDetail: null,
        items: [{ orderItemId: 7, productName: "퓨어原 단백질 트리트먼트", quantity: 1 }], refundAmount: null,
        returnShippingFee: null, rejectReason: "사용 흔적이 있습니다", createdAt: "2026-10-14T01:00:00" }] }));
    render(<OrderDetailPage />);

    expect(await screen.findByText("반려 사유: 사용 흔적이 있습니다")).toBeInTheDocument();
  });

  it("배송 완료 7일 안이면 교환 옵션을 골라 교환을 신청한다 (gateway#320)", async () => {
    const posts: unknown[] = [];
    const delivered = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("Z", "");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/exchange-options")) {
        return json([{ orderItemId: 7, productName: "퓨어原 단백질 트리트먼트", options: [{ variantId: 202, label: "블랙 / L", stockQuantity: 3 }] }]);
      }
      if (init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        return json({ id: 9 }, 201);
      }
      return json({ ...base, status: "DELIVERED", shipment: { ...base.shipment, status: "DELIVERED", deliveredAt: delivered } });
    }));
    render(<OrderDetailPage />);

    (await screen.findByRole("button", { name: "교환 신청" })).click();
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(await screen.findByLabelText("퓨어原 단백질 트리트먼트"), { target: { value: "1" } });
    await screen.findByRole("option", { name: "블랙 / L" });
    fireEvent.change(screen.getByLabelText("퓨어原 단백질 트리트먼트 교환 옵션"), { target: { value: "202" } });
    expect(screen.queryByRole("option", { name: "단순 변심" })).not.toBeInTheDocument();
    screen.getByRole("button", { name: "교환 신청하기" }).click();

    await vi.waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      type: "EXCHANGE", reasonType: "DEFECTIVE", reasonDetail: null,
      items: [{ orderItemId: 7, quantity: 1, exchangeVariantId: 202 }],
    });
  });
});
