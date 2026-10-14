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
  items: [{ productId: 9030, productName: "퓨어原 단백질 트리트먼트", price: 16600, quantity: 2, sellerName: "포스셀렉트" }],
  createdAt: "2026-10-14T01:00:00",
  paidAt: "2026-10-14T01:01:00",
  shipment: {
    carrier: "CJ대한통운",
    trackingNumber: "123456789012",
    status: "SHIPPED",
    shippedAt: "2026-10-15T01:00:00",
    deliveredAt: null,
  },
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
});
