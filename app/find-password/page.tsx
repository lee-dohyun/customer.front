"use client";

import { useState } from "react";
import { Logo } from "@posselect/ui";

export default function FindPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("이메일을 입력하세요.");
      return;
    }
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>메일을 확인해주세요</h2>
            <p style={{ color: "var(--color-neutral-700)", fontSize: 14, marginBottom: 24 }}>
              {email}로 비밀번호 재설정 메일을 보냈습니다(가입된 이메일인 경우). 메일의 링크는 1시간 동안 유효합니다.
            </p>
            <a href="/login" className="btn btn-primary btn-block">
              로그인으로 돌아가기
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="가입 시 등록한 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-block" style={{ marginBottom: 16 }}>
              재설정 메일 받기
            </button>
          </form>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
          <a href="/login" style={{ color: "inherit" }}>
            로그인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
