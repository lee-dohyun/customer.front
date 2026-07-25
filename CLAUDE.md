# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`customer.front` is the customer-facing frontend for leedohyun.com, built with Next.js (App Router). It is one service in a small multi-repo system:

- `auth.api` — Spring Boot 3.5/Java 21 service that owns signup/login/logout/me and issues a JWT in an httpOnly `ACCESS_TOKEN` cookie.
- `gateway` — Spring Cloud Gateway that fronts all services by `Host` header (`customer.localhost`, `home.localhost`, `auth.localhost`, ...).
- `infra` — `docker-compose.yml` that wires postgres, auth-api, customer-front, home-front, and gateway together for local runs.

This app does **not** talk to auth.api directly and has no server-side API routes of its own (no `app/api/`). All auth calls are same-origin relative fetches — e.g. `fetch("/api/auth/login", { credentials: "include" })` in `app/login/page.tsx` and `fetch("/api/auth/me", ...)` / `fetch("/api/auth/logout", ...)` in `app/mypage/page.tsx`. In front of the app, the gateway's routing (`gateway/src/main/resources/application-local.yml`) intercepts `Host=customer.localhost` + `Path=/api/auth/**` and proxies those straight to `auth-api:8080`, bypassing this Next.js server entirely; everything else on that host goes to `customer-front:3000`. Because of this, `/api/auth/*` requests only work when the app is running behind the gateway (e.g. via the `infra` docker-compose setup) — hitting `next dev` standalone on `localhost:3000` will 404 on those routes unless something else is proxying them.

The gateway also does the JWT work described in the wider system: its `JwtAuthenticationFilter` validates the `ACCESS_TOKEN` cookie for every request to `customer.localhost` except the public paths `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout` and the prefixes `/login`, `/_next/`, `/favicon.ico`. On success it injects `X-User-Id` / `X-User-Role` headers before forwarding; on failure/missing cookie it 302-redirects to `home.localhost`. This means pages like `/mypage` are effectively gated at the gateway, not by any client-side route guard in this repo — there is no middleware.ts, auth context/provider, or client-side session store here. Each page independently calls `/api/auth/me` (or relies on the login POST response) and manages its own local `useState` for user/error — there is no shared auth state, no global store (no Redux/Zustand/Context), and no fetch wrapper or axios instance; every call site uses raw `fetch` with `credentials: "include"` inline.

## Tech stack

- Next.js 15 (App Router, `--turbopack` for dev), React 19, TypeScript 5, Tailwind CSS 4 (via `@tailwindcss/postcss`).
- Package manager: npm (`package-lock.json` is the only lockfile present; ignore the yarn/pnpm/bun mentions in README.md — those are unmodified `create-next-app` boilerplate).
- No test framework is configured (no Jest/Vitest/Playwright, no test files, no test script in `package.json`, and CI does not run tests).

## Commands

```bash
npm install       # install deps
npm run dev        # dev server on :3000, Turbopack (next dev --turbopack)
npm run build       # production build (next build)
npm run start        # serve the production build (next start)
npm run lint       # next lint (flat config in eslint.config.mjs, extends next/core-web-vitals + next/typescript)
```

There is no test command — no test runner is set up in this repo.

## CI/CD and Docker

`.github/workflows/docker-image.ymldocker-image.yml` (note: that double `.yml` is the actual on-disk filename) runs on every push/PR to `main`: it builds the multi-stage `Dockerfile` and pushes `<< dockerhub user >>/customer.front:latest` to Docker Hub. It does **not** run lint or any tests — CI is build-and-push only.

The `Dockerfile` has four stages: `base` (installs native build deps, copies `package*.json`), `builder` (`npm ci` + `npm run build`), `production` (runs as non-root `nextjs` user, copies `.next`, `node_modules`, `public`; `CMD npm start`), and `dev` (`npm install` + `npm run dev`, used for local compose). `infra/docker-compose.yml` builds this repo with `target: production` and depends on `auth-api` (env: `NODE_ENV: production`, no other env vars configured for this service).

## Directory layout

- `app/` — App Router pages only, no route groups or nested layouts beyond the root: `app/layout.tsx` (root layout, Geist fonts), `app/page.tsx` (default create-next-app landing page, effectively unbuilt/placeholder), `app/login/page.tsx`, `app/mypage/page.tsx`. All pages so far are client components (`"use client"`) with inline styles or Tailwind utility classes mixed together (login page uses inline `style={}` objects, not Tailwind) — no shared UI component library or `components/` directory exists yet.
- `public/` — static assets (default Next.js svgs, favicon).
- No `env` files, no `middleware.ts`, no `app/api/` route handlers, no path aliases in use beyond the default `@/*` in `tsconfig.json`.
