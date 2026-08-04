"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BlueprintCorners } from "@posselect/ui";

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
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32 }}>
      <div className="card blueprint elev-sm">
        <BlueprintCorners />
        <h2 style={{ textAlign: "center", marginBottom: 8 }}>로그인</h2>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="text-muted" style={{ color: "var(--color-danger)", marginBottom: 16 }}>
              {error}
            </div>
          )}
          {needsVerification && (
            resent ? (
              <div style={{ color: "var(--color-accent)", marginBottom: 16 }}>
                인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-block blueprint"
                onClick={handleResend}
                disabled={resending}
                style={{ marginBottom: 16 }}
              >
                <BlueprintCorners />
                {resending ? "발송 중..." : "인증 메일 다시 받기"}
              </button>
            )
          )}
          <button type="submit" className="btn btn-primary btn-block blueprint">
            <BlueprintCorners />
            로그인
          </button>
        </form>
      </div>
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
