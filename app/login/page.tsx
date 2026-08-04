"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@posselect/ui";

const REMEMBER_ME_KEY = "posselect_remember_me";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
      setError("아이디와 비밀번호를 입력하세요.");
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, "1");
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="email">아이디</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="이메일 또는 아이디"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="password">비밀번호</label>
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

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-neutral-700)", marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            로그인 상태 유지
          </label>

          {error && (
            <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          {needsVerification &&
            (resent ? (
              <div style={{ color: "var(--color-accent)", fontSize: 13, marginBottom: 16 }}>
                인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={handleResend}
                disabled={resending}
                style={{ marginBottom: 16 }}
              >
                {resending ? "발송 중..." : "인증 메일 다시 받기"}
              </button>
            ))}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginBottom: 16 }}>
            로그인
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
          <a href="/find-id" style={{ color: "inherit" }}>
            아이디 찾기
          </a>
          <span>|</span>
          <a href="/find-password" style={{ color: "inherit" }}>
            비밀번호 찾기
          </a>
          <span>|</span>
          <a href="/signup" style={{ color: "var(--color-text)", fontWeight: 600 }}>
            회원가입
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>간편 로그인</div>
          <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        </div>

        {/*
          TODO(간편 로그인 — 카카오/네이버/구글): 현재 로그인은 이메일/비밀번호를 Keycloak
          Direct Access Grant(ROPC)로 바로 검증하는 방식인데, 소셜 로그인은 원리상 그 방식이
          안 된다(비밀번호 자체가 없음) — Authorization Code + Keycloak Identity Provider
          브로커링으로 완전히 다른 플로우가 필요하다:
            1. Keycloak "customer" realm에 Identity Provider 추가
               - Google: Keycloak이 기본 제공하는 Google IdP 템플릿 사용 가능
               - Kakao/Naver: 기본 템플릿 없음 — Kakao/Naver 개발자 콘솔에서 OAuth 앱을
                 새로 등록하고, Keycloak엔 "OpenID Connect v1.0" 커스텀 IdP로 각 사의
                 authorization/token/userinfo endpoint를 직접 입력해서 등록해야 함
            2. auth-api-backend 클라이언트(현재 Direct Access Grant 전용)에 표준 인가 코드
               흐름(redirect-based)도 열어야 함 — 지금 게이트웨이/customer.front는 이 흐름을
               한 번도 처리한 적이 없어서, 콜백 라우팅(gateway PUBLIC_EXACT_PATHS에
               /api/auth/callback류 추가), 상태 저장(state/PKCE) 등을 새로 설계해야 함
            3. 이 버튼들이 실제로 Keycloak의
               /realms/customer/protocol/openid-connect/auth?kc_idp_hint=kakao 같은 URL로
               리다이렉트하도록 onClick 구현
          작업량이 커서 별도 이슈로 분리해서 진행하는 걸 권장 — 지금은 버튼만 노출, disabled.
        */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            aria-label="카카오 로그인"
            disabled
            style={{ width: 48, height: 48, border: "1px solid var(--color-divider)", borderRadius: "50%", background: "#FEE500", color: "#1d1f20", cursor: "not-allowed" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ margin: "0 auto" }}>
              <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-1 3.5-1 3.7 0 0 2.6-1.7 3.6-2.4.9.1 1.8.2 2.7.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z"></path>
            </svg>
          </button>
          <button
            type="button"
            aria-label="네이버 로그인"
            disabled
            style={{ width: 48, height: 48, border: "1px solid var(--color-divider)", borderRadius: "50%", background: "#03C75A", color: "#ffffff", cursor: "not-allowed", fontWeight: 800, fontSize: 15 }}
          >
            N
          </button>
          <button
            type="button"
            aria-label="구글 로그인"
            disabled
            style={{ width: 48, height: 48, border: "1px solid var(--color-divider)", borderRadius: "50%", background: "#ffffff", color: "var(--color-text)", cursor: "not-allowed", fontWeight: 700, fontSize: 15 }}
          >
            G
          </button>
        </div>
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
