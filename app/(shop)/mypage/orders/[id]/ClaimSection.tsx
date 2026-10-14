"use client";

import { useRef, useState } from "react";
import { BlueprintCorners, Tag } from "@posselect/ui";
import {
  available,
  claimMode,
  claimReasonLabel,
  claimRequestBody,
  claimStatusLabel,
  claimTypeLabel,
  RETURN_WINDOW_DAYS,
  type ClaimableItem,
} from "@/lib/claim";
import { serverTime } from "@/lib/order";

export type Claim = {
  id: number;
  type: string;
  status: string;
  reasonType: string;
  reasonDetail: string | null;
  items: { orderItemId: number; productName: string; quantity: number }[];
  refundAmount: number | null;
  returnShippingFee: number | null;
  rejectReason: string | null;
  createdAt: string;
};

type Props = {
  orderId: number;
  status: string;
  shipment: { deliveredAt: string | null } | null;
  items: (ClaimableItem & { productName: string })[];
  claims: Claim[];
  /** 신청 후 주문을 다시 불러온다. */
  onChanged: () => void;
};

const won = (n: number) => `${n.toLocaleString()}원`;

const claimStatusVariant: Record<string, "warning" | "success" | "neutral"> = {
  REQUESTED: "warning",
  COMPLETED: "success",
  REJECTED: "neutral",
};

/**
 * 상품별 취소·반품 신청과 진행 내역(gateway#320). 출고 전이면 바로 취소(환불까지 즉시), 배송 완료 후 7일 안이면
 * 반품 신청(관리자 검토 후 환불)이다. 결제 전 주문은 전체 취소만 받는다.
 */
export function ClaimSection({ orderId, status, shipment, items, claims, onChanged }: Props) {
  const mode = claimMode({ status, shipment, items }, new Date());
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("CHANGE_OF_MIND");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 한 번 연 신청 폼의 재시도(응답 유실·중복 클릭)는 같은 키로 보낸다 — order.api 가 처음 신청을 돌려준다.
  const idempotencyKey = useRef<string | null>(null);

  const start = () => {
    idempotencyKey.current = crypto.randomUUID();
    setPicked(mode === "UNPAID_CANCEL" ? Object.fromEntries(items.map((i) => [i.orderItemId, available(i)])) : {});
    setError("");
    setOpen(true);
  };

  const submit = async () => {
    if (!mode) return;
    const body = claimRequestBody(mode, picked, reason, detail);
    if (!body) {
      setError("신청할 상품과 수량을 골라주세요.");
      return;
    }
    if (mode !== "RETURN" && !window.confirm("선택한 상품을 취소할까요? 결제한 경우 바로 환불됩니다.")) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/claims`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current ?? crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // order.api 는 사람이 읽을 문장을 본문 그대로 보낸다(요청 로케일로 번역됨).
        const text = (await res.text()).trim();
        setError(text && !text.startsWith("{") ? text : "신청하지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setOpen(false);
      onChanged();
    } catch {
      setError("신청을 보내지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "RETURN" ? "반품 신청" : "주문 취소";

  return (
    <section className="card blueprint elev-sm" style={{ marginTop: 16 }}>
      <BlueprintCorners />
      <h4 style={{ marginTop: 0 }}>취소·반품</h4>

      {claims.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {claims.map((c) => (
            <li key={c.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {claimTypeLabel[c.type] ?? c.type}
                <Tag variant={claimStatusVariant[c.status] ?? "neutral"}>
                  {claimStatusLabel[c.status] ?? c.status}
                </Tag>
                <span className="text-muted">{serverTime(c.createdAt).toLocaleDateString()}</span>
              </span>
              <span className="text-muted" style={{ display: "block" }}>
                {c.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}
                {c.type === "RETURN" && ` · ${claimReasonLabel[c.reasonType] ?? c.reasonType}`}
              </span>
              {c.status === "COMPLETED" && c.refundAmount !== null && (
                <span style={{ display: "block" }}>
                  환불 {won(c.refundAmount)}
                  {(c.returnShippingFee ?? 0) > 0 && ` (반품 배송비 ${won(c.returnShippingFee ?? 0)} 차감)`}
                </span>
              )}
              {c.status === "REJECTED" && c.rejectReason && (
                <span style={{ display: "block", color: "var(--color-danger)" }}>반려 사유: {c.rejectReason}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!mode && claims.length === 0 && (
        <p className="text-muted" style={{ margin: 0 }}>
          출고 전에는 취소, 배송 완료 후 {RETURN_WINDOW_DAYS}일 안에는 반품을 신청할 수 있습니다.
        </p>
      )}

      {mode && !open && (
        <button onClick={start} className="btn btn-secondary blueprint">
          <BlueprintCorners />
          {title}
        </button>
      )}

      {mode && open && (
        <div>
          {mode === "UNPAID_CANCEL" ? (
            <p style={{ margin: "0 0 8px" }}>결제 전 주문은 전체만 취소할 수 있습니다.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px" }}>
              {items.filter((i) => available(i) > 0).map((i) => (
                <li key={i.orderItemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <label htmlFor={`claim-qty-${i.orderItemId}`}>{i.productName}</label>
                  <select
                    id={`claim-qty-${i.orderItemId}`}
                    value={picked[i.orderItemId] ?? 0}
                    onChange={(e) => setPicked({ ...picked, [i.orderItemId]: Number(e.target.value) })}
                  >
                    {Array.from({ length: available(i) + 1 }, (_, n) => (
                      <option key={n} value={n}>{n}개</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          {mode === "RETURN" && (
            <>
              <label htmlFor="claim-reason" style={{ display: "block" }}>반품 사유</label>
              <select id="claim-reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ marginBottom: 8 }}>
                {Object.entries(claimReasonLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <p className="text-muted" style={{ margin: "0 0 8px" }}>
                단순 변심이면 반품 배송비가 환불 금액에서 빠지고, 남은 상품이 무료배송 기준에 못 미치면 처음에 면제된 배송비도 빠집니다.
              </p>
              <textarea
                aria-label="상세 사유"
                placeholder="상세 사유(선택)"
                maxLength={500}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                style={{ width: "100%", minHeight: 60 }}
              />
            </>
          )}
          {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={submit} disabled={submitting} className="btn btn-primary blueprint">
              <BlueprintCorners />
              {mode === "RETURN" ? "반품 신청하기" : "취소하기"}
            </button>
            <button onClick={() => setOpen(false)} className="btn btn-ghost">닫기</button>
          </div>
        </div>
      )}
    </section>
  );
}
