/**
 * 판매처 연결 가이드 문구 (2026-09-30) — 우리 말로 직접 쓴 짧은 명령형 단계. 다른 업체 문구·캡처를 옮기지 않는다.
 * 순수 데이터 (import 없음 → scripts/test-marketplace.mjs가 그대로 읽는다)
 *
 * ★ 메뉴 이름을 공식 문서로 확인하지 못한 곳은 문장 끝에 MENU_CHECK를 붙인다 (확인되면 그 표시만 뺀다).
 *   MENU_CHECK가 붙은 문장 목록 = menuChecks() — 보고서의 "메뉴 이름 확인 필요" 목록과 같다
 */
export const RELAY_IP = '3.39.196.112' // api/_coupang.js RELAY_IP와 같은 값 (테스트가 대조)
export const MENU_CHECK = '(메뉴 이름 확인 필요)'

/** 11번가 — 고객이 API 키를 직접 넣는다 (쿠팡과 같은 방식) */
export const ELEVENST_GUIDE = [
  '11번가 셀러오피스에 로그인하세요.',
  `셀러오피스에서 오픈API 센터로 들어가세요. ${MENU_CHECK}`,
  `API 키 발급을 눌러 키를 받으세요. ${MENU_CHECK}`,
  `서버 IP 등록 칸에 ${RELAY_IP}를 넣고 저장하세요. ${MENU_CHECK}`,
  '발급된 API 키를 복사하세요.',
  '아래 칸에 11번가 셀러 ID와 API 키를 붙여넣으세요.',
  '[연결 확인]을 누르면 연결이 끝나요.',
]

/**
 * 스마트스토어 — 고객이 네이버 커머스API센터에서 "내 스토어 애플리케이션"을 직접 만들고 ID·시크릿을 넣는다 (2026-09-30 S3-2)
 * 확인한 메뉴: "커머스API센터 > 내 스토어 애플리케이션", 애플리케이션 [수정]에서 IP 추가·IPv4 최대 3개 (공식 저장소 답변 #2291)
 */
export const SMARTSTORE_GUIDE = [
  '네이버 커머스API센터에 스마트스토어 판매자 계정으로 로그인하세요.',
  '내 스토어 애플리케이션 메뉴로 들어가세요.',
  `새 애플리케이션을 등록하세요. ${MENU_CHECK}`,
  `API 호출 IP 칸에 ${RELAY_IP}를 넣고 저장하세요. 이미 만든 애플리케이션이면 [수정]에서 IP를 더하세요. ${MENU_CHECK}`,
  `애플리케이션을 등록할 때 API 그룹을 전부 선택하세요. 하나라도 빠지면 상품을 보낼 수 없어요. ${MENU_CHECK}`, // S3-3 — IP 입력 다음
  `애플리케이션 ID와 애플리케이션 시크릿을 복사하세요. ${MENU_CHECK}`,
  '아래 칸에 두 값을 붙여넣으세요.',
  '[연결 확인]을 누르면 연결이 끝나요.',
]

/**
 * 카페24 — 고객이 카페24 개발자센터에서 자기 앱을 만들고, 돌아오는 주소·권한을 넣은 뒤 Client ID·Secret과 쇼핑몰 ID를 넣는다 (2026-09-30 S3-3)
 * 확인한 것: 공식 문서의 동의·토큰 규칙(api/_cafe24.js 주석), 자기 쇼핑몰용 앱은 심사 없이 동의까지 된다(개인 블로그·제디 "직접 입력 방식" 안내)
 * 돌아오는 주소는 운영 도메인 기준 — api/_cafe24.js CAFE24_REDIRECT_URI와 같은 값 (테스트가 대조)
 */
export const CAFE24_REDIRECT_URI = 'https://www.euchs.co.kr/studio/channels/connect'
export const CAFE24_GUIDE = [
  '카페24 개발자센터(developers.cafe24.com)에 쇼핑몰 운영자 계정으로 로그인하세요.',
  `처음이면 약관에 동의하고, 파트너 정보의 전문 분야를 쇼핑몰 운영으로 고르세요. ${MENU_CHECK}`,
  `Apps의 앱 관리에서 새 앱을 만드세요. ${MENU_CHECK}`,
  `App URL 칸에는 https://www.euchs.co.kr 를, Redirect URI 칸에는 ${CAFE24_REDIRECT_URI} 를 그대로 넣으세요.`,
  `권한에서 상품 읽기·쓰기와 상품분류 읽기를 고르고 저장하세요. ${MENU_CHECK}`,
  `인증 정보에서 Client ID와 Client Secret을 복사하세요. ${MENU_CHECK}`,
  '아래 칸에 쇼핑몰 ID와 두 값을 넣고 [연결하기]를 누르세요.',
  `카페24 동의 화면에서 동의하면 이 화면으로 돌아와 연결이 끝나요. ${MENU_CHECK}`,
]

/** "메뉴 이름 확인 필요"가 붙은 문장 [{ market, step }] */
export function menuChecks() {
  const out = []
  for (const [market, guide] of [['11st', ELEVENST_GUIDE], ['smartstore', SMARTSTORE_GUIDE], ['cafe24', CAFE24_GUIDE]]) {
    for (const step of guide) if (step.includes(MENU_CHECK)) out.push({ market, step })
  }
  return out
}
