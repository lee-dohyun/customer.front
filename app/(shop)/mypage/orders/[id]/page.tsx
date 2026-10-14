"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlueprintCorners, Tag } from "@posselect/ui";
import { ClaimSection, type Claim } from "./ClaimSection";
import {
  orderStatusLabel,
  orderStatusVariant,
  serverTime,
  shipmentStatusLabel,
  trackingSearchUrl,
} from "@/lib/order";

type OrderItem = {
  orderItemId: number;
  claimedQuantity: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  sellerName: string | null;
};

type Shipment = {
  carrier: string;
  trackingNumber: string;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
};

/** order.api `OrderResponse` 중 이 화면이 쓰는 필드. */
type OrderDetail = {
  id: number;
  status: string;
  ordererName: string;
  recipientName: string | null;
  recipientPhone: string | null;
  zipCode: string | null;
  address1: string | null;
  address2: string | null;
  shippingAddress: string;
  subtotalPrice: number;
  discountAmount: number;
  shippingFee: number;
  totalPrice: number;
  gradeCode: string | null;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
  shipment: Shipment | null;
  claims: Claim[];
};

const won = (n: number) => `${n.toLocaleString()}원`;

/** 구조화된 배송지가 있으면 그것을, 없으면(예전 주문) 한 줄 주소를 보여 준다. */
function addressText(order: OrderDetail): string {
  if (!order.address1) return order.shippingAddress;
  const zip = order.zipCode ? `(${order.zipCode}) ` : "";
  return [zip + order.address1, order.address2].filter(Boolean).join(" ");
}
const dateTime = (s: string | null) => (s ? serverTime(s).toLocaleString() : "-");

// 게이트웨이가 로그인한 고객의 신원을 실어 보내고, 남의 주문이면 order.api 가 404 를 준다.
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetch(`/api/orders/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 404) throw new Error("주문을 찾을 수 없습니다.");
        if (!res.ok) throw new Error("주문 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return res.json();
      })
      .then(setOrder)
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 주문 번호가 바뀔 때만 다시 부른다
  }, [id]);

  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: 32 }}>
      <a href="/mypage" className="text-muted">
        ← 마이페이지
      </a>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      {order && (
        <>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            주문 #{order.id}
            <Tag variant={orderStatusVariant[order.status] ?? "neutral"}>
              {orderStatusLabel[order.status] ?? order.status}
            </Tag>
          </h2>
          <p className="text-muted" style={{ marginTop: 0 }}>
            주문일시 {dateTime(order.createdAt)}
          </p>

          <section className="card blueprint elev-sm" style={{ marginBottom: 16 }}>
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>주문 상품</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {order.items.map((item, i) => (
                <li
                  key={`${item.productId}-${i}`}
                  style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}
                >
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{won(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card blueprint elev-sm" style={{ marginBottom: 16 }}>
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>결제 금액</h4>
            <p style={{ margin: 0 }}>상품 합계: {won(order.subtotalPrice)}</p>
            {order.discountAmount > 0 && (
              <p style={{ margin: 0 }}>회원 등급 할인: -{won(order.discountAmount)}</p>
            )}
            <p style={{ margin: 0 }}>배송비: {order.shippingFee > 0 ? `+${won(order.shippingFee)}` : "무료"}</p>
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>결제 금액: {won(order.totalPrice)}</p>
            <p className="text-muted" style={{ margin: 0 }}>
              결제일시 {dateTime(order.paidAt)}
            </p>
          </section>

          <section className="card blueprint elev-sm" style={{ marginBottom: 16 }}>
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>배송지</h4>
            <p style={{ margin: 0 }}>
              {order.recipientName ?? order.ordererName}
              {order.recipientPhone && ` · ${order.recipientPhone}`}
            </p>
            <p style={{ margin: 0 }}>{addressText(order)}</p>
          </section>

          <section className="card blueprint elev-sm">
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>배송 정보</h4>
            {order.shipment ? (
              <>
                <p style={{ margin: 0 }}>
                  {shipmentStatusLabel[order.shipment.status] ?? order.shipment.status} · {order.shipment.carrier}{" "}
                  {order.shipment.trackingNumber}
                </p>
                <p className="text-muted" style={{ margin: 0 }}>
                  출고 {dateTime(order.shipment.shippedAt)}
                  {order.shipment.deliveredAt && ` · 배송 완료 ${dateTime(order.shipment.deliveredAt)}`}
                </p>
                <a
                  href={trackingSearchUrl(order.shipment.carrier, order.shipment.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary blueprint"
                  style={{ marginTop: 8 }}
                >
                  <BlueprintCorners />
                  배송 조회
                </a>
              </>
            ) : (
              <p className="text-muted" style={{ margin: 0 }}>
                아직 출고 전입니다. 운송장이 등록되면 여기에 표시됩니다.
              </p>
            )}
          </section>

          <ClaimSection
            orderId={order.id}
            status={order.status}
            shipment={order.shipment}
            items={order.items}
            claims={order.claims ?? []}
            onChanged={load}
          />
        </>
      )}
    </div>
  );
}
