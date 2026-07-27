"use client";

import { useEffect, useState } from "react";

type Me = { email: string; role: string };

export default function MyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

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
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32 }}>
      <h2>마이페이지 (JWT 활성 상태에서만 진입 가능)</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {me && (
        <>
          <p>이메일: {me.email}</p>
          <p>권한: {me.role}</p>
          <button onClick={handleLogout}>로그아웃</button>
          <button
            onClick={handleWithdraw}
            style={{ marginLeft: 8, color: "#c00", background: "none", border: "1px solid #c00", borderRadius: 4, padding: "6px 10px" }}
          >
            회원 탈퇴
          </button>
        </>
      )}
    </div>
  );
}
