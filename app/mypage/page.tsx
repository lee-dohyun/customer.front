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

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32 }}>
      <h2>마이페이지 (JWT 활성 상태에서만 진입 가능)</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {me && (
        <>
          <p>이메일: {me.email}</p>
          <p>권한: {me.role}</p>
          <button onClick={handleLogout}>로그아웃</button>
        </>
      )}
    </div>
  );
}
