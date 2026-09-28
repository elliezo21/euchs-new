/**
 * 판매처 연동 — 화면 규칙 (순수 함수, import 없음 → scripts/test-marketplace.mjs가 그대로 부른다)
 */

// 우리 쪽 준비 문제 — 고객에게는 "지금은 연결할 수 없어요…" 한 줄만, 빨간 경고로 띄우지 않는다 (원인은 서버 로그)
export const NOT_READY_CODES = ['marketplace_sql_missing', 'enc_not_ready', 'relay_not_configured', 'relay_unreachable', 'relay_denied']
export const isNotReady = code => NOT_READY_CODES.includes(code)

// 고객이 Wing에서 직접 고칠 수 있는 오류 — 문구 옆에 [연결 방법 보기]를 붙인다
export const GUIDE_CODES = ['ip_not_allowed', 'bad_key', 'bad_vendor', 'key_expired']
export const needsGuide = code => GUIDE_CODES.includes(code)

// 설정 화면 탭 (순서 = 화면 순서). route = 자식 라우트 이름, legacy = 예전 라우트 이름(redirect로 남김)
export const SETTINGS_TABS = [
  { key: 'marketplace', label: '판매처 연결', route: 'studio-settings-marketplace', legacy: 'studio-marketplace' },
  { key: 'shipping', label: '배송·반품 템플릿', route: 'studio-settings-shipping' },
  { key: 'assets', label: '저장값', route: 'studio-settings-assets', legacy: 'studio-assets' },
  { key: 'glossary', label: '용어집', route: 'studio-settings-glossary', legacy: 'studio-glossary' },
]

/** 완성작 id → 그 완성작의 가장 최근 전송 (완성작 카드 배지용) */
export function latestSendByExport(sends) {
  const map = {}
  for (const s of Array.isArray(sends) ? sends : []) {
    if (!s?.exportId) continue
    const cur = map[s.exportId]
    if (!cur || new Date(s.createdAt).getTime() > new Date(cur.createdAt).getTime()) map[s.exportId] = s
  }
  return map
}
