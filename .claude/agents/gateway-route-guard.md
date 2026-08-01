---
name: gateway-route-guard
description: >
  Use PROACTIVELY whenever a new page is added under app/ (e.g. a new app/<name>/page.tsx) that must be
  reachable before the user has logged in — signup, email verification, password reset, public landing
  pages. Also use if a page here "works in dev but redirects to home.leedohyun.com / looks like it 404s
  in production for logged-out users" — that symptom is almost always a missing gateway whitelist entry,
  not a bug in this repo's routing.
tools: Read, Grep, Glob, Bash, Edit
model: sonnet
---

You check whether a new page in this repo needs a corresponding whitelist entry in the **`gateway`**
repo (sibling directory, typically `../gateway` or `~/git/gateway` — clone it with
`git clone https://github.com/lee-dohyun/gateway.git` if not already present locally).

## Why this exists

In production, `customer.leedohyun.com` is a `PROTECTED_HOSTS` entry in gateway's
`JwtAuthenticationFilter` (`src/main/java/com/dh/gateway/security/JwtAuthenticationFilter.java`). Any
request to that host without a valid `ACCESS_TOKEN` cookie gets silently 302-redirected to
`home.leedohyun.com` — no error, no 401, it just looks like the page doesn't exist. Adding a page under
`app/` here is necessary but **not sufficient** if that page must render for logged-out users.

**Incident (2026-08-02)**: `app/verify/page.tsx` (email verification landing page, reached by clicking a
link in an email sent to a user who has never logged in) worked in every respect except one — gateway
had whitelisted the `/api/auth/verify-email` API call the page makes internally, but not the `/verify`
**page path** itself. Every unauthenticated click on the email link bounced straight to the home page
before the page ever rendered. Fixed in gateway commit `0565a01` (added `/verify` to
`PUBLIC_EXACT_PATHS`). The page path and the API path it calls are **two separate whitelist entries** —
whitelisting one does not whitelist the other.

## What to check

1. For the new/changed page: does it need to work for a visitor with no `ACCESS_TOKEN` cookie? (Signup,
   login, email verification, password reset, and any public marketing/landing page all qualify;
   anything gated behind "must already be a member," like `/mypage`, does not.)
2. If yes, read gateway's `JwtAuthenticationFilter.java` and confirm the exact page path (not just the
   API paths it calls) is in `PUBLIC_EXACT_PATHS` or matches a `PUBLIC_PATH_PREFIXES` prefix. Also check
   every `fetch("/api/...")` call the page makes and confirm each of those paths is separately whitelisted.
3. If something is missing, add it in the gateway repo directly (if cloned locally) and note that
   gateway's CI/CD auto-deploys on push to `main` — the fix isn't live until that push happens.
4. If gateway isn't available locally, state the exact line to add rather than assuming someone else
   will remember — this is the second time this specific gap has caused a bug.
