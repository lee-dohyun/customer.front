/**
 * 주문 상세의 상품별 취소·반품 신청(gateway#320) 규칙. 최종 판정은 order.api 가 한다 — 여기서는 버튼을 보일지,
 * 몇 개까지 고를 수 있게 할지만 정한다(서버 규칙: 출고 전 취소, 배송 완료 후 7일 안 반품, 결제 전은 전체 취소만).
 */
import { serverTime } from "./order";

export type ClaimMode = "CANCEL" | "RETURN" | "UNPAID_CANCEL" | null;

export type ClaimableItem = { orderItemId: number; quantity: number; claimedQuantity: number };

export const RETURN_WINDOW_DAYS = 7;

export const claimReasonLabel: Record<string, string> = {
  CHANGE_OF_MIND: "단순 변심",
  DEFECTIVE: "상품 불량·파손",
  WRONG_ITEM: "다른 상품이 왔어요",
};

export const claimTypeLabel: Record<string, string> = { CANCEL: "취소", RETURN: "반품" };

export const claimStatusLabel: Record<string, string> = {
  REQUESTED: "접수됨(검토 중)",
  COMPLETED: "완료",
  REJECTED: "반려",
};

/** 아직 신청하지 않은 수량. */
export function available(item: ClaimableItem): number {
  return Math.max(0, item.quantity - item.claimedQuantity);
}

/** 지금 이 주문에 어떤 신청을 받을 수 있는가. */
export function claimMode(
  order: { status: string; shipment: { deliveredAt: string | null } | null; items: ClaimableItem[] },
  now: Date,
): ClaimMode {
  if (!order.items.some((i) => available(i) > 0)) return null;
  if (order.status === "CREATED") return "UNPAID_CANCEL";
  if (order.status === "PAID" && !order.shipment) return "CANCEL";
  if (order.status === "DELIVERED" && order.shipment?.deliveredAt) {
    const deadline = serverTime(order.shipment.deliveredAt).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (now.getTime() <= deadline) return "RETURN";
  }
  return null;
}

/** 고른 수량으로 요청 본문을 만든다. 0개 품목은 빼고, 아무것도 없으면 null. */
export function claimRequestBody(
  mode: Exclude<ClaimMode, null>,
  picked: Record<number, number>,
  reasonType: string | null,
  reasonDetail: string,
): { type: "CANCEL" | "RETURN"; reasonType: string | null; reasonDetail: string | null; items: { orderItemId: number; quantity: number }[] } | null {
  const items = Object.entries(picked)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ orderItemId: Number(id), quantity: q }));
  if (items.length === 0) return null;
  const isReturn = mode === "RETURN";
  return {
    type: isReturn ? "RETURN" : "CANCEL",
    reasonType: isReturn ? reasonType : null,
    reasonDetail: reasonDetail.trim() || null,
    items,
  };
}
