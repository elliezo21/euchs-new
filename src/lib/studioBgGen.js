/**
 * AI 배경 (17-4) 화면용 — 장면 프리셋 이름. 영어 프롬프트는 서버에만 있다 (api/_studioBgGen.js BG_GEN_PRESETS).
 * key 목록은 서버와 같아야 한다 (scripts/test-studio-bg-gen.mjs가 대조). 자유 입력은 이번에 없음(검수 후보).
 */
export const BG_GEN_FREE_PER_DAY = 3 // 1인 하루 무료 횟수 (서버 _studioBgGen.BG_GEN_FREE_PER_DAY와 같음 — 남은 수는 늘 서버 값으로 보여 준다)

export const BG_GEN_PRESETS = [
  { key: 'marble', label: '대리석 테이블' },
  { key: 'wood', label: '원목 테이블' },
  { key: 'living', label: '따뜻한 거실' },
  { key: 'outdoor', label: '야외 자연광' },
  { key: 'studio', label: '화이트 스튜디오' },
  { key: 'pastel', label: '파스텔 받침대' },
  { key: 'kitchen', label: '주방 조리대' },
  { key: 'bathroom', label: '욕실 선반' },
]

export function presetLabel(key) {
  return BG_GEN_PRESETS.find(p => p.key === key)?.label || ''
}
