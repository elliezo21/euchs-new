/**
 * 판매처 연결 가이드 문구 (2026-09-30) — 우리 말로 직접 쓴 짧은 명령형 단계. 다른 업체 문구·캡처를 옮기지 않는다.
 * 순수 데이터 (import 없음 → scripts/test-marketplace.mjs가 그대로 읽는다)
 *
 * ★ 메뉴 이름을 공식 문서로 확인하지 못한 곳은 문장 끝에 MENU_CHECK를 붙인다 (확인되면 그 표시만 뺀다).
 *   MENU_CHECK가 붙은 문장 목록 = menuChecks() — 보고서의 "메뉴 이름 확인 필요" 목록과 같다
 */
export const RELAY_IP = '3.39.196.112' // api/_coupang.js RELAY_IP와 같은 값 (테스트가 대조)
export const MENU_CHECK = '(메뉴 이름 확인 필요)'

/**
 * 11번가 — 고객이 API 키를 직접 넣는다 (쿠팡과 같은 방식)
 * 2026-09-30 사장님이 실제로 연결하며 캡처한 화면 순서 그대로 (docs/guide-assets/11st/11st-1~8.jpg — 단계 i = 사진 i)
 */
export const ELEVENST_GUIDE = [
  '11번가 OPEN API CENTER(openapi.11st.co.kr)에 11번가 셀러 아이디로 로그인하고 [API 관리]를 누르세요.',
  '[서비스 이용 동의]와 [개인정보 수집/이용 동의]에 모두 체크하세요.',
  `접속권한 > IP 직접 입력에서 [사용]을 고르고, 개발서버 IP·개발자 PC·상용서버 IP 3칸 모두 ${RELAY_IP} 를 넣은 뒤 [등록하기]를 누르세요.`,
  '등록이 끝나면 [인증하기]를 누르세요.',
  '휴대폰으로 인증하세요. 카카오톡으로 인증번호가 와요.',
  'API 키가 나오면 [복사하기]를 누르세요.',
  '여기 아래 칸에 11번가 셀러 ID와 API 키를 붙여넣고 [연결 확인]을 누르세요.',
  '"연결됨"이 뜨면 끝이에요.',
]
/** 단계 아래 작은 덧붙임 { 단계 번호(0부터): 문장 } */
export const ELEVENST_STEP_NOTES = {
  2: '셀링툴 업체 선택 칸은 비워 둬도 돼요. IP 직접 입력 방식이라 필요 없어요.',
}

/**
 * 판매처별 사진 가이드 — 사진이 있는 판매처만 연결 창에 [사진으로 보기]가 나온다.
 * 새 판매처: public/guides/<판매처>/ 에 사진(가로 1400 이하)과 thumbs/(가로 240)를 넣고 여기에 줄만 더한다.
 * step = 그 사진이 보여 주는 가이드 단계 번호(0부터) — 단계 옆 [사진] 링크가 이 번호로 사진을 찾는다.
 */
const photoSet = (market, alts) => alts.map((alt, i) => ({
  src: `/guides/${market}/${market}-${i + 1}.jpg`,
  thumb: `/guides/${market}/thumbs/${market}-${i + 1}.jpg`,
  step: i,
  alt,
}))
export const GUIDE_PHOTOS = {
  '11st': photoSet('11st', [
    'OPEN API CENTER에서 API 관리 누르기',
    '두 곳 모두 동의 체크',
    'IP 직접 입력 사용 · IP 3칸 입력 · 등록하기',
    '인증하기 누르기',
    '휴대폰 인증번호 받기',
    'API 키 복사하기',
    '스튜디오에 셀러 ID·API 키 붙여넣기',
    '연결됨 확인',
  ]),
}
/** 판매처 사진 목록 (없으면 빈 배열) */
export function guidePhotos(market) {
  return GUIDE_PHOTOS[market] || []
}
/** 그 단계의 첫 사진 번호 (없으면 -1) */
export function photoIndexForStep(market, step) {
  return guidePhotos(market).findIndex(p => p.step === step)
}

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
 * 카페24 — 우리 앱 "EUCHS 스튜디오" 방식 (2026-09-30): 고객은 쇼핑몰 ID만 넣고 카페24 화면에서 동의한다 (앱 만들기·Client ID 입력 없음)
 * 권한 = api/_cafe24.js SCOPES(상품 읽기·쓰기, 상품분류 읽기). 다른 방법 = 쇼핑몰 관리자에서 앱 열기(App URL + hmac — studioCafe24Launch.js)
 * 돌아오는 주소는 운영 도메인 기준 — api/_cafe24.js CAFE24_REDIRECT_URI와 같은 값 (테스트가 대조)
 */
export const CAFE24_REDIRECT_URI = 'https://www.euchs.co.kr/studio/channels/connect'
export const CAFE24_GUIDE = [
  '[연결하기]를 누르고 카페24 쇼핑몰 ID를 넣으세요.',
  '주소가 myshop.cafe24.com이면 쇼핑몰 ID는 myshop이에요.',
  '카페24 화면이 열리면 쇼핑몰 대표 운영자 계정으로 로그인하세요.',
  '상품 읽기·쓰기, 상품분류 읽기 권한에 동의하세요.',
  '스튜디오로 돌아와 "연결됨"이 보이면 끝이에요.',
]
/** 카페24 다른 연결 방법 (단계 밖 한 줄) */
export const CAFE24_GUIDE_ALT = '다른 방법: 카페24 쇼핑몰 관리자에서 EUCHS 스튜디오 앱을 열면 쇼핑몰 ID 없이 바로 연결돼요.'

/** "메뉴 이름 확인 필요"가 붙은 문장 [{ market, step }] */
export function menuChecks() {
  const out = []
  for (const [market, guide] of [['11st', ELEVENST_GUIDE], ['smartstore', SMARTSTORE_GUIDE], ['cafe24', CAFE24_GUIDE]]) {
    for (const step of guide) if (step.includes(MENU_CHECK)) out.push({ market, step })
  }
  return out
}
