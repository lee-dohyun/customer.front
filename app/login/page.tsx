"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@posselect/ui";

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
      setError("아이디와 비밀번호를 입력하세요.");
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

          {/*
            TODO(로그인 상태 유지): 지금 ACCESS_TOKEN 쿠키는 Keycloak 액세스 토큰 만료시간
            그대로(auth.api AuthController.login의 `.maxAge(token.expiresInSeconds())`, 보통
            짧음)만 유지된다. 이 체크박스를 실제로 동작시키려면:
              1. Keycloak "customer" realm 클라이언트에 refresh token 발급이 켜져 있는지 확인
                 (Direct Access Grant 응답에 refresh_token이 오는지 KeycloakClient.java에서 확인)
              2. 체크 시 refresh_token을 별도 httpOnly 쿠키(예: REFRESH_TOKEN)로 저장하고,
                 auth.api에 /api/auth/refresh 같은 엔드포인트를 추가해 만료 임박 시 ACCESS_TOKEN을
                 갱신하도록 gateway 또는 프론트에서 주기적으로 호출
              3. 체크 안 하면 지금처럼 세션 쿠키(브라우저 종료 시 소멸)로 유지
            지금은 UI만 노출, 로직 없음(disabled).
          */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-neutral-700)", marginBottom: 20 }}>
            <input type="checkbox" disabled />
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
          {/*
            TODO(아이디 찾기): 계정 식별자가 곧 이메일이라 "아이디 찾기"는 사실상
            "가입 시 등록한 이메일 확인"에 가깝다. 이름+연락처 등 부가 식별 정보를 안 받고
            있어서(auth.api 회원가입 필드 확인 필요) 본인 확인 수단이 없다 — 최소한 이름+가입일
            정도로 Keycloak Admin API(GET /admin/realms/customer/users?...) 조회 후 마스킹된
            이메일을 보여주는 새 페이지(/find-id)와 auth.api 엔드포인트 필요.
          */}
          <a href="#" style={{ color: "inherit" }}>
            아이디 찾기
          </a>
          <span>|</span>
          {/*
            TODO(비밀번호 찾기): Keycloak은 내장 "Forgot Password" 이메일 플로우가 있지만
            이 시스템은 ROPC(Direct Access Grant)로 로그인 UI를 자체 구현 중이라 Keycloak
            기본 화면으로 리다이렉트하는 방식은 안 씀. 대신 Keycloak Admin API의
            PUT /admin/realms/customer/users/{id}/execute-actions-email
            (action: UPDATE_PASSWORD)을 auth.api에서 서비스 계정 토큰으로 호출하는 새
            엔드포인트(/api/auth/forgot-password) 추가 필요 — 이메일 인증 재발송
            (EmailVerificationService, 2026-08-01 구현)과 동일한 패턴으로 만들면 됨.
            프론트는 이메일 입력받는 /find-password 페이지 하나 필요.
          */}
          <a href="#" style={{ color: "inherit" }}>
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
