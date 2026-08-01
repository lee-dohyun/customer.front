"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Status = "verifying" | "success" | "error";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<Status>("verifying");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const verify = useCallback(async () => {
    if (!email || !token) {
      setStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }, [email, token]);

  useEffect(() => {
    verify();
  }, [verify]);

  const handleResend = async () => {
    if (!email) return;
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
        textAlign: "center",
      }}
    >
      {status === "verifying" && <p>이메일을 인증하는 중입니다...</p>}

      {status === "success" && (
        <>
          <h2 style={{ marginBottom: 16 }}>이메일 인증이 완료되었습니다</h2>
          <a href="/login" style={{ color: "#0070f3" }}>
            로그인하러 가기
          </a>
        </>
      )}

      {status === "error" && (
        <>
          <h2 style={{ marginBottom: 16 }}>인증 링크가 유효하지 않습니다</h2>
          <p style={{ color: "#555", marginBottom: 16 }}>
            링크가 만료되었거나 이미 사용되었을 수 있습니다.
          </p>
          {resent ? (
            <p style={{ color: "#0070f3" }}>인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending || !email}
              style={{
                padding: "10px 20px",
                background: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {resending ? "발송 중..." : "인증 메일 다시 받기"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
