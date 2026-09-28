/**
 * 베타 기간 표시 — 문구는 여기 한 곳. 랜딩(StudioLandingView)·대시보드 사이드바(StudioLayout)가 같이 쓴다.
 * 날짜를 넣지 않는다. 베타가 끝나면 STUDIO_BETA를 false로 — 배지·윗줄·안내 한 줄이 함께 사라진다.
 */
export const STUDIO_BETA = true
export const BETA_BADGE = 'BETA'                 // 로고 옆 작은 배지
export const BETA_WORD = '베타'                  // 랜딩 첫 화면 윗줄 가운데 낱말
export const BETA_NOTE = '베타 기간에는 무료로 쓸 수 있어요. 요금이 생기면 시작 전에 미리 알려 드려요.'
/** 랜딩 첫 화면 윗줄 — 마지막 조각(free)은 화면이 강조색으로 그린다 */
export const heroEyebrow = () => ({ lead: ['EUCHS 상세페이지 작업실', ...(STUDIO_BETA ? [BETA_WORD] : [])].join(' · '), free: '구매 고객 무료' })
