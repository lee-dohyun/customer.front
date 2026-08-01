"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResent(false);
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const redirectUri = searchParams.get("redirect_uri") || "/mypage";
        window.location.href = redirectUri;
      } else if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.error === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
          setError("이메일 인증이 완료되지 않았습니다. 가입 시 받은 메일을 확인해주세요.");
        } else {
          setError("로그인할 수 없습니다.");
        }
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } finally {
      setResending(false);
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
        {needsVerification && (
          resent ? (
            <div style={{ color: "#0070f3", marginBottom: 16 }}>
              인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 16,
                background: "#fff",
                color: "#0070f3",
                border: "1.5px solid #0070f3",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {resending ? "발송 중..." : "인증 메일 다시 받기"}
            </button>
          )
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
