"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@posselect/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !token) {
      setError("링크가 유효하지 않습니다. 비밀번호 찾기를 다시 시도해주세요.");
      return;
    }
    if (!password) {
      setError("새 비밀번호를 입력하세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        setError("링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 시도해주세요.");
      }
    } catch {
      setError("비밀번호 재설정 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>비밀번호가 변경되었습니다</h2>
            <a href="/login" className="btn btn-primary btn-block">
              로그인하러 가기
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="password">새 비밀번호</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="passwordConfirm">새 비밀번호 확인</label>
              <input
                id="passwordConfirm"
                type="password"
                className="input"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-block" style={{ marginBottom: 16 }}>
              비밀번호 변경
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
