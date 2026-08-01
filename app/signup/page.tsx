"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") || "/mypage";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !name) {
      setError("이름, 이메일, 비밀번호를 모두 입력하세요.");
      return;
    }
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (res.status === 201) {
        setDone(true);
      } else if (res.status === 409) {
        setError("이미 가입된 이메일입니다.");
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
      }
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
    }
  };

  if (done) {
    const loginUrl = `/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
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
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: 16 }}>이메일을 확인해주세요</h2>
        <p style={{ color: "#555", marginBottom: 16 }}>
          {email}로 인증 메일을 보냈습니다. 메일의 링크를 클릭하면 가입이 완료됩니다.
        </p>
        <a href={loginUrl} style={{ color: "#0070f3" }}>
          로그인하러 가기
        </a>
      </div>
    );
  }

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
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          회원가입
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
