/**
 * 현재 화면을 다른 주소로 바꾼다(뒤로 가기로 되돌아오지 않는다).
 *
 * <p>"조건이 안 맞아서 다른 화면으로 보내는" 이동에 쓴다 — `location.href` 로 보내면 이력이 남아
 * 뒤로 가기를 눌렀을 때 같은 조건 검사에 걸려 다시 튕기는 고리가 생긴다.
 *
 * <p>함수로 감싼 이유는 테스트다. jsdom 의 `window.location` 은 재정의할 수 없어서 "어디로 보냈는가"를
 * 검증하려면 가로챌 수 있는 모듈 경계가 필요하다.
 */
export function replaceLocation(url: string): void {
  window.location.replace(url);
}

/**
 * 로그인 뒤 돌아갈 주소에, 로그인 화면이 물려받은 해시(`#wishlist` 등)를 다시 붙인다.
 *
 * <p>해시는 서버로 전송되지 않는다. 그래서 게이트웨이가 만든 `redirect_uri` 에는 해시가 빠져 있고,
 * 브라우저만 리다이렉트를 건너 해시를 들고 온다(`/login?redirect_uri=...%2Fmypage#wishlist`).
 * 안 붙이면 비로그인으로 「찜」 아이콘을 누른 사람은 로그인 후 마이페이지 맨 위에 떨어진다(product.api#10).
 */
export function withHash(url: string, hash: string): string {
  if (hash.length <= 1 || url.includes("#")) return url;
  return url + hash;
}
