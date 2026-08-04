"use client";

import { useEffect, useState } from "react";
import { BlueprintCorners, Tag } from "@posselect/ui";

type Me = { email: string; role: string };

type OrderSummary = {
  id: number;
  status: string;
  totalPrice: number;
  itemCount: number;
  createdAt: string;
};

const orderStatusLabel: Record<string, string> = {
  CREATED: "결제 대기",
  PAID: "결제 완료",
};

const orderStatusVariant: Record<string, "warning" | "success" | "neutral"> = {
  CREATED: "warning",
  PAID: "success",
};

export default function MyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("unauthorized");
        }
        return res.json();
      })
      .then((data: Me) => setMe(data))
      .catch(() => setError("사용자 정보를 불러오지 못했습니다."));

    fetch("/api/orders/mine", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("posselect_remember_me");
    window.location.href = "/login";
  };

  const handleWithdraw = async () => {
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }
    const res = await fetch("/api/auth/me", { method: "DELETE", credentials: "include" });
    if (res.ok) {
      window.location.href = "/login";
    } else {
      setError("탈퇴 처리에 실패했습니다.");
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 32 }}>
      <h2>마이페이지 (JWT 활성 상태에서만 진입 가능)</h2>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      {me && (
        <>
          <div className="card blueprint elev-sm" style={{ marginBottom: 24 }}>
            <BlueprintCorners />
            <p style={{ margin: 0 }}>이메일: {me.email}</p>
            <p style={{ margin: 0 }}>권한: {me.role}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={handleLogout} className="btn btn-secondary blueprint">
                <BlueprintCorners />
                로그아웃
              </button>
              <button
                onClick={handleWithdraw}
                className="btn btn-ghost"
                style={{ color: "var(--color-danger)" }}
              >
                회원 탈퇴
              </button>
            </div>
          </div>

          <h3 style={{ marginTop: 32 }}>주문내역</h3>
          {orders.length === 0 ? (
            <p className="text-muted">주문 내역이 없습니다.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {orders.map((order) => (
                <li
                  key={order.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-divider)",
                  }}
                >
                  <span>
                    주문 #{order.id} · {new Date(order.createdAt).toLocaleDateString()} · 상품{" "}
                    {order.itemCount}종
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {order.totalPrice.toLocaleString()}원
                    <Tag variant={orderStatusVariant[order.status] ?? "neutral"}>
                      {orderStatusLabel[order.status] ?? order.status}
                    </Tag>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
