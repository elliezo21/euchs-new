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
  `애플리케이션 ID와 애플리케이션 시크릿을 복사하세요. ${MENU_CHECK}`,
  '아래 칸에 두 값을 붙여넣으세요.',
  '[연결 확인]을 누르면 연결이 끝나요.',
]

/** 연결 신청 — 판매처별 첫 단계만 다르고 나머지는 같다 */
const REQUEST_FIRST = {
  zigzag: [`지그재그 판매자 센터(파트너센터)에 로그인하세요. ${MENU_CHECK}`, '내 정보 화면에서 판매자 ID(스토어 ID)를 확인하세요.'],
  ably: [`에이블리 판매자 센터(파트너스)에 로그인하세요. ${MENU_CHECK}`, '내 정보 화면에서 판매자 ID를 확인하세요.'],
}
const REQUEST_REST = [
  '아래 칸에 판매자 ID와 담당자 연락처를 넣으세요.',
  '[신청하기]를 누르세요.',
  '연결이 끝나면 알려 드려요. 알림을 받은 뒤 바로 상품을 보낼 수 있어요.',
]
/**
 * @param {string} key 판매처 key @param {string} name 판매처 이름
 * @returns {string[]} 단계 (5~8개)
 */
export function requestGuide(key, name) {
  const first = REQUEST_FIRST[key] || [`${name} 판매자 센터에 로그인하세요.`, '판매자 ID를 확인하세요.']
  return [...first, ...REQUEST_REST]
}

/** "메뉴 이름 확인 필요"가 붙은 문장 [{ market, step }] */
export function menuChecks(keys = ['zigzag', 'ably']) {
  const out = ELEVENST_GUIDE.filter(s => s.includes(MENU_CHECK)).map(step => ({ market: '11st', step }))
  for (const step of SMARTSTORE_GUIDE) if (step.includes(MENU_CHECK)) out.push({ market: 'smartstore', step })
  for (const k of keys) for (const step of requestGuide(k, k)) if (step.includes(MENU_CHECK)) out.push({ market: k, step })
  return out
}
