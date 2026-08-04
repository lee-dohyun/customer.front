"use client";

import { useEffect } from "react";

const REMEMBER_ME_KEY = "posselect_remember_me";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10분

/**
 * "로그인 상태 유지"로 로그인한 경우, ACCESS_TOKEN이 만료되기 전에 주기적으로
 * /api/auth/refresh를 호출해 REFRESH_TOKEN(httpOnly 쿠키, 직접 읽을 수 없음)으로 갱신한다.
 * localStorage 플래그가 없으면(체크 안 하고 로그인/비로그인) 아무 것도 하지 않는다.
 * 갱신 실패(401 — REFRESH_TOKEN 만료/폐기)하면 플래그를 지우고 더 이상 시도하지 않는다.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    if (localStorage.getItem(REMEMBER_ME_KEY) !== "1") {
      return;
    }

    const refresh = async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (!res.ok) {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch {
        // 네트워크 오류 등 — 다음 주기에 다시 시도
      }
    };

    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
