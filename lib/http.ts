/**
 * 에러 응답에서 사람이 읽을 문장 하나를 꺼낸다.
 *
 * <p>auth.api의 에러 응답은 모양이 두 가지다. 서비스 예외는 `{error: "..."}`이고, `@Valid`
 * 검증 실패는 ValidationExceptionHandler가 만드는 `{필드명: "..."}` 맵이다. 어느 쪽이든 문구는
 * 요청 로케일(Accept-Language, 나중엔 게이트웨이의 X-Locale)에 맞춰 서버가 번역해서 내려주므로
 * 프론트에서 다시 쓰지 말고 그대로 노출한다.
 */
export async function readErrorMessage(res: Response): Promise<string | null> {
  const body: unknown = await res.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return null;
  }
  const values = body as Record<string, unknown>;
  if (typeof values.error === "string" && values.error) {
    return values.error;
  }
  const firstMessage = Object.values(values).find((v) => typeof v === "string" && v);
  return typeof firstMessage === "string" ? firstMessage : null;
}
