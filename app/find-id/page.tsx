"use client";

import { useState } from "react";
import { Logo } from "@posselect/ui";

export default function FindIdPage() {
  const [name, setName] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [error, setError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMaskedEmail("");
    if (!name || !joinDate) {
      setError("이름과 가입일을 입력하세요.");
      return;
    }
    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, joinDate }),
      });
      if (res.ok) {
        const body = await res.json();
        setMaskedEmail(body.maskedEmail);
      } else {
        setError("일치하는 계정을 찾을 수 없습니다.");
      }
    } catch {
      setError("아이디 찾기 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        {maskedEmail ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>아이디를 찾았습니다</h2>
            <p style={{ color: "var(--color-neutral-700)", fontSize: 14, marginBottom: 24 }}>
              가입하신 이메일은 <strong>{maskedEmail}</strong> 입니다.
            </p>
            <a href="/login" className="btn btn-primary btn-block">
              로그인하러 가기
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="name">이름</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="가입 시 입력한 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="joinDate">가입일</label>
              <input
                id="joinDate"
                type="date"
                className="input"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-block" style={{ marginBottom: 16 }}>
              아이디 찾기
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
