# 회원가입 이메일 인증 (2026-08-01)

## 배경 / 요구사항

기존 회원가입(`POST /api/auth/signup`)은 서버 측 검증이 전혀 없었다 — `SignupRequest`에
Bean Validation 애너테이션이 없고 `spring-boot-starter-validation` 의존성 자체가 auth.api에
빠져 있어서, 프론트를 거치지 않고 API를 직접 호출하면 이메일이 빈 값이거나 형식이 틀려도
그대로 Keycloak에 유저가 생성됐다.

요구사항은 두 가지였다:
1. 회원가입 시 이메일을 서버 단에서도 필수/형식 검증할 것
2. 실제 이메일 인증(확인 메일 발송 → 링크 클릭 → 계정 활성화)까지 구현할 것

## 아키텍처 결정: Keycloak 내장 "Verify Email"을 쓰지 않은 이유

Keycloak은 `Verify Email` required action을 표준으로 제공하지만, 이 시스템의 로그인은
**Direct Access Grant(ROPC)** 방식이다 — 커스텀 로그인 폼(`customer.front`)을 그대로 쓰기 위해
Keycloak 기본 로그인 화면으로 리다이렉트하지 않는 선택을 이미 해뒀기 때문. 문제는 **ROPC는
required action을 처리할 수 없는 flow**라는 점이다. Keycloak의 내장 이메일 인증을 켜면:

- required action이 걸린 계정으로 password grant를 시도할 때 Keycloak이 `invalid_grant` 계열
  에러만 던지고, "이메일 인증이 안 됐다"는 걸 구분해서 알려주지 않는다
- required action 완료(이메일 링크 클릭 후 처리)는 원래 브라우저 기반 Keycloak 로그인 flow를
  전제로 설계되어 있어서, ROPC 전제의 이 시스템과 잘 안 맞는다

그래서 **Keycloak의 이메일 인증 기능 자체는 켜지 않고**, `emailVerified`라는 Keycloak 유저의
표준 boolean 필드 하나만 Admin API로 직접 제어하는 자체 구현으로 우회했다. 인증 토큰도
Keycloak 커스텀 유저 attribute에 저장해서 auth.api가 완전히 stateless(자체 DB 없음)를
유지하도록 했다 — 기존에 authdb를 완전히 걷어낸 방향과 일치.

## 이메일 발송: order.api 패턴 재사용

이메일 발송 인프라를 새로 구축하지 않고 `order.api`(주문 결제 완료 알림, `OrderNotificationService`)가
이미 쓰고 있던 방식을 그대로 재사용했다:

- Spring Boot `spring-boot-starter-mail` (`JavaMailSender`)
- Gmail SMTP relay (`smtp.gmail.com:587`, STARTTLS, 앱 비밀번호 인증)
- 이 홈서버는 아웃바운드 25번 포트가 대부분 막혀 있고 residential IP는 스팸 평판이 나빠서
  자체 SMTP 서버를 직접 운영하지 않는다 — Gmail 계정을 relay로 빌려쓰는 방식
- K8s Secret `order-mail-secret`(`customer` 네임스페이스)을 order.api와 auth.api가 **공유**한다.
  (매니페스트: `~/msa/customer/mail-secret.yaml`, 예전엔 이 Secret이 order-api.yaml에서
  참조만 되고 어디에도 정의돼 있지 않은 상태였어서 이번에 처음으로 tracked 파일로 만듦)

메일 발송 실패는 예외를 던지지 않고 로그만 남긴다(`EmailVerificationService`) — 계정 생성 자체는
이미 끝난 뒤라 여기서 500을 던지면 정상 가입자에게 에러를 돌려주는 꼴이 된다. 발송 실패해도
"인증 메일 다시 받기"로 복구 가능.

## 전체 흐름

```
1. POST /api/auth/signup { email, password, name }
   - auth.api: Bean Validation으로 email(@NotBlank @Email)/password/name 필수 체크, 400
   - Keycloak Admin API로 유저 생성, emailVerified=false
   - UUID 토큰 발급 + Keycloak 유저 attributes(emailVerificationToken, emailVerificationExpiresAt)에 저장
   - EmailVerificationService가 인증 링크(`{FRONTEND_BASE_URL}/verify?email=...&token=...`)가 담긴 메일 발송
   - 201 Created (본문 없음, customer.front는 "이메일을 확인해주세요" 화면으로 전환)

2. 사용자가 메일의 링크 클릭 → customer.front `/verify?email=...&token=...`
   - 페이지 로드 시 자동으로 POST /api/auth/verify-email { email, token }
   - auth.api: Keycloak에서 해당 유저의 attributes를 조회해서 토큰 일치 + 24시간 이내인지 확인
   - 통과 시 emailVerified=true로 PUT, attributes 클리어. 200
   - 실패(토큰 불일치/만료/유저 없음) 시 400 → 프론트에서 "인증 메일 다시 받기" 버튼 표시

3. POST /api/auth/login { email, password }
   - Keycloak Direct Access Grant는 emailVerified 여부와 무관하게 비밀번호만 맞으면 토큰을 내준다
     (ROPC는 required action을 안 보므로) — 그래서 auth.api가 토큰 발급 *이후* 별도로
     Keycloak Admin API를 한 번 더 호출해서 emailVerified를 확인한다
   - false면 쿠키를 세팅하지 않고 403 { "error": "EMAIL_NOT_VERIFIED" }
   - true면 기존과 동일하게 ACCESS_TOKEN 쿠키 설정, 200

4. POST /api/auth/resend-verification { email }
   - issueVerificationToken()을 재호출해서 새 토큰 발급 + 메일 재발송
   - 존재하지 않는 이메일이어도 항상 200 (이메일 존재 여부를 응답으로 유추 못 하게)
```

## 변경 파일

### auth.api
- `build.gradle` — `spring-boot-starter-mail`, `spring-boot-starter-validation` 추가
- `src/main/resources/application.yml` — `spring.mail.*`(MAIL_HOST/PORT/USERNAME/PASSWORD),
  `app.frontend-base-url`(FRONTEND_BASE_URL) 추가
- `dto/AuthDtos.java` — `SignupRequest`에 검증 애너테이션, `VerifyEmailRequest`/
  `ResendVerificationRequest`/`ErrorResponse` 신규
- `security/KeycloakClient.java` — `createUser`는 `emailVerified: false`로 생성만 하도록 축소,
  `issueVerificationToken`/`verifyEmail`/`isEmailVerified` 신규 (attributes 기반 토큰 저장/검증)
- `service/EmailVerificationService.java` — 신규. order.api의 `OrderNotificationService`와
  동일한 Spring Mail 패턴
- `config/ValidationExceptionHandler.java` — 신규. `@Valid` 실패를 필드별 메시지로 400 응답
- `controller/AuthController.java` — signup이 인증 메일 발송까지 수행, `verify-email`/
  `resend-verification` 신규 엔드포인트, `login`이 emailVerified 확인 후 403 분기 추가

### customer.front
- `app/signup/page.tsx` — 가입 완료 화면을 "이메일을 확인해주세요"로 변경
- `app/verify/page.tsx` — 신규. 인증 링크 처리 페이지, 실패 시 재발송 버튼
- `app/login/page.tsx` — 403 `EMAIL_NOT_VERIFIED` 응답 시 안내 문구 + 재발송 버튼

### gateway (겪은 함정)
- `security/JwtAuthenticationFilter.java`의 `PUBLIC_EXACT_PATHS`에 `/api/auth/verify-email`,
  `/api/auth/resend-verification` 추가 필요했음. `customer.leedohyun.com`은 `PROTECTED_HOSTS`라
  로그인 전(쿠키 없음) 상태에서 이 두 엔드포인트를 호출하면 필터가 `home.leedohyun.com`으로
  302 리다이렉트시켜버렸다 — 처음 배포 후 e2e 테스트에서 발견, 반드시 로그인 전에도 호출
  가능해야 하는 새 `/api/auth/**` 엔드포인트를 추가할 땐 이 화이트리스트도 같이 챙길 것.

### 인프라 (~/msa)
- `customer/auth-api.yaml` — `MAIL_USERNAME`/`MAIL_PASSWORD`(order-mail-secret 재사용),
  `FRONTEND_BASE_URL` 환경변수 추가
- `customer/mail-secret.yaml` — 신규. 기존에 라이브에만 존재하고 매니페스트로 추적되지
  않던 `order-mail-secret`을 처음으로 tracked 파일로 만듦 (order.api/auth.api 공유)

## 검증 (2026-08-01, 실제 e2e)

테스트 계정(`claude-test-*@example.com`)으로 실제 배포 환경에서 전체 흐름 검증 완료:

- 이메일 없이/잘못된 형식으로 가입 시도 → 400 확인
- 정상 가입 → 201, Keycloak 유저 `emailVerified: false` + attributes에 토큰 저장 확인
- 인증 전 로그인 → 403 `EMAIL_NOT_VERIFIED` 확인
- 잘못된 토큰으로 인증 → 400
- 올바른 토큰으로 인증 → 200, `emailVerified: true`로 전환 확인
- 인증 후 로그인 → 200 + `ACCESS_TOKEN` 쿠키, JWT의 `email_verified` 클레임도 `true`로 발급됨 확인
- 중복 가입 → 기존과 동일하게 409 (회귀 없음 확인)
- 존재하지 않는 이메일로 재발송 요청 → 200 (정보 노출 안 됨 확인)
- 테스트 계정은 검증 후 Keycloak에서 삭제 완료

메일 발송 자체는 auth-api 로그에 `MailException` 경고가 없는 것으로 Gmail SMTP relay가
정상적으로 메시지를 수락했음을 확인함(테스트 이메일이 `@example.com`이라 실제 수신함 도달은
확인 대상이 아니었음 — 실사용자 가입 시 실제 도달 여부는 별도 확인 필요).

## 향후 고려 사항

- 인증 토큰 TTL은 24시간으로 하드코딩(`KeycloakClient.VERIFICATION_TOKEN_TTL_MILLIS`) —
  필요시 환경변수화
- 재발송 API에 rate limit이 없음 — PoC 규모에서는 문제 없지만 실제 운영 트래픽이 생기면
  스팸성 재발송 남용 방지 필요
- Gmail SMTP relay는 계정당 발송량 제한이 있음(일반 계정 기준 일일 약 500통) — 가입자가
  늘어나면 SES 등 트랜잭션 메일 서비스로 교체 검토
