# customer.front

posselect.com 쇼핑몰의 **회원/계정 프론트엔드**. Next.js 15(App Router) + React 19 + Tailwind 4.
프로덕션에서는 `customer.posselect.com`으로 서비스된다.

로그인, 회원가입, 아이디/비밀번호 찾기, 이메일 인증, 마이페이지, 배송지 관리를 담당한다.

## 페이지

| 경로 | 로그인 필요 | 내용 |
| --- | --- | --- |
| `/login`, `/signup` | X | 로그인 / 회원가입(약관 동의 모달 포함) |
| `/find-id`, `/find-password`, `/reset-password` | X | 아이디/비밀번호 찾기, 재설정 |
| `/verify` | X | 이메일 인증 랜딩(메일 링크로 진입) |
| `/terms`, `/privacy` | X | 이용약관 / 개인정보처리방침(SSR로 본문 조회) |
| `/` (`app/(shop)`) | O | 회원 홈 |
| `/mypage`, `/mypage/addresses` | O | 마이페이지, 배송지 목록 |
| `/profile` | O | 회원정보 수정 |

`app/components/SessionKeepAlive.tsx`가 `(shop)` 레이아웃에서 세션을 갱신한다.

## 데이터를 어떻게 가져오는가

대부분 브라우저에서 **동일 출처**로 호출하고, 게이트웨이가 백엔드로 프록시한다.

| 브라우저가 부르는 경로 | 게이트웨이 라우트 | 백엔드 |
| --- | --- | --- |
| `/api/auth/**` | `auth-api` | auth.api |
| `/api/orders/**` | `order-api-customer` | order.api (`X-Channel: 1` 주입) |

자체 route handler는 `app/api/agreements/route.ts` 하나뿐이다 — 약관 본문을 클러스터 내부 auth-api에서
받아 중계한다(서버사이드 호출이라 `~/msa/customer/networkpolicy.yaml`의 `allow-auth-api`에
`app: customer-front`가 등록돼 있다).

## 게이트웨이 경유 구조 — 이 저장소의 핵심 제약

```
브라우저 → Traefik(Ingress) → spring-cloud-gateway → customer-front.customer.svc.cluster.local:3000
```

`customer.posselect.com`은 게이트웨이의 **유일한 `protected-hosts`**다. `ACCESS_TOKEN` 쿠키가 없는
요청은 `JwtAuthenticationFilter`가 에러 없이 로그인 페이지로 302 리다이렉트한다.

- 로그인 전에 보여야 할 페이지는 `app/` 아래에 만드는 것만으로 부족하고, 게이트웨이의
  `PUBLIC_EXACT_PATHS` / `PUBLIC_PATH_PREFIXES`에도 등록돼야 한다.
- **페이지 경로와 그 페이지가 부르는 API 경로는 별개 항목이다.** 2026-08-02 `/verify` 사고가 이것이었다.
- 라우트 `customer-front-block-write`가 `/api/auth/**`, `/api/orders/**` 외의 POST/PUT/PATCH/DELETE를
  403으로 차단한다(msa #155 대응) → 이 저장소에 POST route handler나 Server Action을 추가할 수 없다.

자세한 함정은 `AGENTS.md`, 새 페이지 추가 시에는 `.claude/agents/gateway-route-guard.md` 서브에이전트 참고.

## UI 공통 자산

- `@posselect/ui` — 디자인 시스템(git 의존성, `transpilePackages`). 고쳐도 이 저장소를 재빌드해야 반영된다.
- 헤더/푸터는 `posselect-shell`(`shell.posselect.com/v1/*.js`)이 웹 컴포넌트로 제공한다.

## 로컬 개발

```bash
npm install
npm run dev        # http://localhost:3000

npm run typecheck  # tsc --noEmit — push 전 필수
npm run lint
```

로컬에서는 게이트웨이를 거치지 않으므로 인증 리다이렉트·쓰기 차단·화이트리스트 동작이 재현되지 않는다.
로컬에서 잘 된다고 프로덕션에서 된다는 뜻이 아니다.

## 배포 (K3s, CD 자동)

`.github/workflows/docker-image.yml`

1. main push / PR → Docker 이미지 빌드 후 `leedohyun1985/customer.front:{latest,<sha>}`로 push
2. Trivy 취약점 스캔 (`exit-code: "0"` — **리포트 전용, 빌드를 막지 않는다**)
3. main push일 때만 self-hosted 러너(`k3s-home`)에서
   `kubectl set image deployment/customer-front -n customer` → rollout 대기

**main에 push하면 곧바로 프로덕션에 반영된다.** CI는 lint/typecheck를 돌리지 않으므로 검증은 로컬 책임이다.
문서/설정만 바꾼 커밋에는 메시지 끝에 `[skip ci]`를 붙일 것.

## 문서

- `docs/2026-08-01-email-verification.md` — 이메일 인증 도입 경위
- `docs/COMMENT_STANDARDS.md` — 주석 표준

## 관련 저장소

`gateway`(단일 진입점/인증) · `auth.api`(회원/약관) · `order.api`(주문) · `posselect-ui` ·
`posselect-shell` · 매니페스트는 `~/msa`.
