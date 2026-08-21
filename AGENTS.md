# customer.front AI 개발 지침

> **캐논 참조**: 공통 개발 원칙(DB/트랜잭션/보안/배포 규칙 등)은 `~/msa/AGENTS.md`를 따른다.
> 이 문서에는 **이 저장소에서만 통하는 사실과 함정**만 적는다.

## 이 저장소는 무엇인가

`customer.posselect.com`을 서비스하는 Next.js(App Router) **회원/계정** 프론트엔드다.
로그인·회원가입·아이디/비밀번호 찾기·이메일 인증·마이페이지·배송지 관리가 여기 있다.
게이트웨이 라우트 `customer-front`가 `customer-front.customer.svc.cluster.local:3000`으로 프록시하고,
K3s에는 `customer` 네임스페이스의 `deployment/customer-front`로 떠 있다.

데이터는 대부분 브라우저에서 동일 출처(`/api/auth/**`, `/api/orders/**`)로 호출하고, 게이트웨이가
auth-api/order-api로 프록시한다. 자체 route handler는 `app/api/agreements/route.ts` 하나뿐이다
(약관 본문을 auth-api에서 받아 중계, 서버사이드 호출이라 netpol `allow-auth-api`에 `app: customer-front`가
등록돼 있다).

## 실제 함정 (전부 이 저장소 코드/게이트웨이 설정에서 확인된 것)

### 1. 이 호스트는 게이트웨이의 유일한 `protected-hosts`다 — 새 페이지는 기본적으로 "안 보인다"

`gateway`의 `application.yml`에서 `gateway.security.protected-hosts` 기본값이
`customer.posselect.com`이다. `ACCESS_TOKEN` 쿠키가 없는 요청은 `JwtAuthenticationFilter`가
**에러도 401도 없이 로그인 페이지로 302 리다이렉트**한다. 즉 로그인 전에 보여야 할 페이지를
`app/` 아래에 만드는 것만으로는 부족하다.

- **페이지 경로와 그 페이지가 부르는 API 경로는 서로 다른 화이트리스트 항목이다.**
  2026-08-02 `/verify`(이메일 인증 랜딩) 사고가 정확히 이것이었다 — API(`/api/auth/verify-email`)만
  등록돼 있고 페이지 경로 `/verify`가 빠져서, 메일 링크를 누른 모든 비로그인 사용자가 홈으로
  튕겼다. gateway 커밋 `0565a01`에서 `PUBLIC_EXACT_PATHS`에 `/verify`를 추가해 해결.
- 현재 공개 처리된 것: `PUBLIC_EXACT_PATHS`에 `/verify`, `/api/agreements`, `/api/auth/*` 다수 /
  `PUBLIC_PATH_PREFIXES`에 `/login`, `/signup`, `/find-id`, `/find-password`, `/reset-password`,
  `/terms`, `/privacy`, `/_next/`, `/favicon.ico`, `/icon.svg`.
- 새 pre-login 페이지를 추가할 때는 `.claude/agents/gateway-route-guard.md` 서브에이전트를 쓸 것.

### 2. 이 호스트는 쓰기 요청이 게이트웨이에서 차단된다

라우트 `customer-front-block-write`가 POST/PUT/PATCH/DELETE를 `SetStatus=403`으로 막는다
(msa #155 대응). `/api/auth/**`, `/api/orders/**`는 앞선 라우트가 먼저 채가므로 정상 동작한다.

- **자체 route handler에 `POST`를 추가하거나 Server Action을 쓰면 프로덕션에서 403**이다.
  `app/api/agreements/route.ts`가 GET 전용인 것도 그래서다. 로컬 dev는 게이트웨이를 안 거쳐서
  멀쩡히 돌아가므로 배포 후에야 드러난다.

### 3. SSR에서 자기 호스트로 되돌아오는 페이지는 `PreserveHostHeader`에 의존한다

`/terms`, `/privacy`는 SSR에서 `headers().get("host")`로 자기 주소를 재구성해
`https://<host>/api/agreements`를 다시 호출한다. 게이트웨이 `customer-front` 라우트에
`PreserveHostHeader` 필터가 없으면 Host가 내부 주소(평문 3000 포트)로 재작성돼 TLS 핸드셰이크가
깨지고 500이 난다(2026-08-20 발견, 게이트웨이 설정에 주석으로 기록됨). 같은 패턴의 페이지를
추가한다면 이 의존을 알고 있어야 한다.

### 4. `.claude/worktrees/`가 실제로 origin까지 올라간 적이 있다

이 저장소는 `.gitignore`에 `.claude/worktrees/`가 없어서 worktree 디렉터리 하나가 gitlink(모드
160000)로 커밋돼 push된 이력이 있다(2026-08-21 확인, 커밋 `89945ca`). `.gitignore`에 규칙을
추가했으니 유지할 것. `git add -A` / `git add .`는 여전히 조심할 것.

### 5. `@posselect/ui`는 git 의존성이라 자동 반영되지 않는다

`"@posselect/ui": "github:lee-dohyun/posselect-ui"` + `next.config.ts`의 `transpilePackages`.
버전이 고정돼 있지 않고, posselect-ui를 고쳐도 **이 저장소를 다시 빌드해야** 반영된다(소비 저장소
5곳 각각).
그리고 **정의되지 않은 CSS 변수는 조용히 죽는다** — posselect-ui `tokens.css`에 없는 변수를
배경색으로 쓰면 에러 없이 배경이 투명해진다(hero 배너 인시던트). 새 CSS 변수를 쓰기 전에 토큰
정의를 먼저 확인할 것.

### 6. CI는 타입/린트를 안 본다. main push = 즉시 프로덕션

`.github/workflows/docker-image.yml`은 Docker 빌드/푸시 성공만을 게이트로 삼고 `lint`/`typecheck`를
돌리지 않는다(Trivy도 `exit-code: "0"` 리포트 전용). 이어지는 `deploy` 잡이 self-hosted 러너에서
`kubectl set image deployment/customer-front -n customer`를 실행한다.

→ push 전에 로컬에서 반드시 실행:

```bash
npm run typecheck   # tsc --noEmit
npm run lint
```

`.claude/hooks/pre-push-verify.sh`가 PreToolUse 훅으로 이걸 강제한다(정당한 사유가 있을 때만
`CLAUDE_SKIP_PUSH_VERIFY=1`).

## 작업 기록

`~/msa/AGENTS.md` §4의 Task Execution Workflow를 따른다. 이 저장소에 한정된 주의:

- **Draft Issue를 만들지 말 것.** 저장소에 연결되지 않은 Draft 카드는 추적이 끊기고, 과거 중복 카드가
  210여 건 쌓인 사고가 있었다. 반드시 `gh issue create -R lee-dohyun/customer.front ...`로 **실제
  저장소 이슈**를 만든 뒤 GitHub Project #2에 연결하고 Status를 `In Progress`로 바꾼 다음 코드를
  건드린다. (`gh`는 풀 경로 `~/.local/bin/gh`.)
- 완료 시 커밋 메시지의 `Closes #N` 또는 `gh issue close`로 반드시 닫는다.
- 상세 절차는 `msa-work-log` 스킬(사용자 레벨, 이 저장소 세션에서도 로드됨)을 따른다.
- 기능별 상세 기록은 `docs/YYYY-MM-DD-주제.md`로 남긴다(예: `docs/2026-08-01-email-verification.md`).

## 커밋

- 주석/문서 스타일은 `docs/COMMENT_STANDARDS.md`를 따른다.
- 문서·설정만 바꾼 커밋은 메시지 끝에 `[skip ci]` — 안 붙이면 불필요한 프로덕션 배포가 돈다.
