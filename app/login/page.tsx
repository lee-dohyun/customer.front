"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }
    try {
      const res = await fetch("https://auth.leedohyun.com/api/jwt/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.text();
      if (res.ok && data && data !== "Invalid email or password") {
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem("jwt", data);
        // 메인 페이지로 이동
        window.location.href = "/";
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "80px auto",
        padding: 32,
        border: "1px solid #eee",
        borderRadius: 8,
        background: "#fff",
        color: "#000",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>로그인</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              marginTop: 4,
              border: "1.5px solid #bbb",
              borderRadius: 6,
              fontSize: 16,
              background: "#fafbfc",
              color: "#222",
              outline: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "border 0.2s",
            }}
            required
            onFocus={(e) => (e.target.style.border = "1.5px solid #0070f3")}
            onBlur={(e) => (e.target.style.border = "1.5px solid #bbb")}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              marginTop: 4,
              border: "1.5px solid #bbb",
              borderRadius: 6,
              fontSize: 16,
              background: "#fafbfc",
              color: "#222",
              outline: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "border 0.2s",
            }}
            required
            onFocus={(e) => (e.target.style.border = "1.5px solid #0070f3")}
            onBlur={(e) => (e.target.style.border = "1.5px solid #bbb")}
          />
        </div>
        {error && (
          <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
        )}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
        >
          로그인
        </button>
      </form>
    </div>
  );
}
