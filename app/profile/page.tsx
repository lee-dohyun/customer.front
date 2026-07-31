"use client";

import { useEffect, useState } from "react";

type Me = { email: string; name: string };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginTop: 4,
  border: "1.5px solid #bbb",
  borderRadius: 6,
  fontSize: 16,
  background: "#fafbfc",
  color: "#222",
  outline: "none",
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [emailChanged, setEmailChanged] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data: Me) => {
        setMe(data);
        setEmail(data.email);
        setName(data.name ?? "");
      })
      .catch(() => setError("로그인이 필요합니다."));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !name) {
      setError("이메일과 이름은 비워둘 수 없습니다.");
      return;
    }
    const body: { email?: string; name?: string; password?: string } = {};
    if (me && email !== me.email) body.email = email;
    if (me && name !== me.name) body.name = name;
    if (password) body.password = password;

    if (Object.keys(body).length === 0) {
      setMessage("변경된 내용이 없습니다.");
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated: Me = await res.json();
        setMe(updated);
        setPassword("");
        if (body.email) {
          setEmailChanged(true);
        } else {
          setMessage("정보가 수정되었습니다.");
        }
      } else {
        setError("정보 수정에 실패했습니다.");
      }
    } catch {
      setError("정보 수정 중 오류가 발생했습니다.");
    }
  };

  if (error && !me) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 32, textAlign: "center" }}>
        <p style={{ color: "red" }}>{error}</p>
        <a href="/login" style={{ color: "#0070f3" }}>
          로그인하러 가기
        </a>
      </div>
    );
  }

  if (emailChanged) {
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
        <h2 style={{ marginBottom: 16 }}>이메일이 변경되었습니다</h2>
        <p style={{ marginBottom: 16, color: "#555" }}>
          변경 사항을 반영하려면 다시 로그인해주세요.
        </p>
        <a href="/login" style={{ color: "#0070f3" }}>
          다시 로그인하기
        </a>
      </div>
    );
  }

  if (!me) {
    return null;
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
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>나의 정보</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">새 비밀번호 (변경 시에만 입력)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="변경하지 않으려면 비워두세요"
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}
        {message && <div style={{ color: "green", marginBottom: 16 }}>{message}</div>}
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
          저장
        </button>
      </form>
    </div>
  );
}
