"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BlueprintCorners } from "@posselect/ui";

type Status = "verifying" | "success" | "error";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  // 링크에 email/token 이 없으면 요청 없이 곧바로 실패다. 이걸 effect 안에서 setState 로 만들지 않고
  // 파생 값으로 둔다(react-hooks/set-state-in-effect, gateway#286).
  const missingParams = !email || !token;
  const [result, setResult] = useState<Status>("verifying");
  const status: Status = missingParams ? "error" : result;
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (missingParams) return;
    let stale = false;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then((res) => {
        if (!stale) setResult(res.ok ? "success" : "error");
      })
      .catch(() => {
        if (!stale) setResult("error");
      });
    return () => {
      stale = true;
    };
  }, [email, token, missingParams]);

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
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32 }}>
      <div className="card blueprint elev-sm" style={{ textAlign: "center" }}>
        <BlueprintCorners />
        {status === "verifying" && <p>이메일을 인증하는 중입니다...</p>}

        {status === "success" && (
          <>
            <h2 style={{ marginBottom: 8 }}>이메일 인증이 완료되었습니다</h2>
            <a href="/login" className="btn btn-ghost">
              로그인하러 가기
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <h2 style={{ marginBottom: 8 }}>인증 링크가 유효하지 않습니다</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              링크가 만료되었거나 이미 사용되었을 수 있습니다.
            </p>
            {resent ? (
              <p style={{ color: "var(--color-accent)" }}>
                인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending || !email}
                className="btn btn-primary blueprint"
              >
                <BlueprintCorners />
                {resending ? "발송 중..." : "인증 메일 다시 받기"}
              </button>
            )}
          </>
        )}
      </div>
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
