/**
 * AI 지우기 실패 처리 — 순수 함수 (DOM·Supabase 없음, node 테스트: scripts/test-studio-ai-failure.mjs)
 *
 * ★ 실패 종류(aiFailKind): 'engine' AI(워커·모델)를 불러오지 못함 · 'unsupported' 이 브라우저에서 못 씀
 *   · 'timeout' 계산 시간 초과 · 'compute' 그 밖의 계산 실패
 *   화면 문구는 쉬운 말 + 할 일만(AI_FAIL_TEXT). 개발자용 원문(워커 오류·예외)은 부르는 쪽이 console.error로 남긴다.
 * ★ [AI로 지우기]를 눌렀을 때 엔진이 오류 상태면(engineDown) 레이어·이력을 만들지 않는다 (useEraseSession.executeFill).
 * ★ 계산이 실패하면 방금 적용한 AI를 되돌려 선택 영역으로 돌려놓는다 (useEraseSession.handleAiFailure — studioHistory.discardCurrent).
 * ★ 결과 없이 저장된 AI 레이어(method 'ai'인데 ai 없음 — needsAiResult)는 사진을 열고 엔진이 준비되면 자동으로 계산한다 (StudioCanvas).
 *   결과가 오면 그 레이어가 같은 모양인 이력 단계마다 채운다(fillAiInEdit) — 되돌려도 결과 없는 상태로 돌아가 다시 계산하지 않게.
 */

export const AI_FAIL_TEXT = {
  engine: 'AI를 불러오지 못했어요. [다시 시도]를 눌러 주세요.',
  timeout: 'AI가 채우는 데 너무 오래 걸렸어요. [다시 시도]를 눌러 주세요.',
  compute: 'AI로 지우지 못했어요. [다시 시도]를 눌러 주세요.',
  unsupported: '이 브라우저에서는 AI로 지울 수 없어요. [단색]이나 [주변으로 덮기]를 써 주세요.',
}

/** 엔진을 지금 쓸 수 없는 상태 (다시 준비하기 전에는 계산이 안 됨) */
export function engineDown(status) {
  return status === 'error' || status === 'unsupported'
}

/**
 * @param {{ engineStatus?: string, code?: string }} a  engineStatus = 실패를 알았을 때 엔진 상태, code = 오류 code ('timeout' — aiEngine)
 * @returns {'engine'|'unsupported'|'timeout'|'compute'}
 */
export function aiFailKind({ engineStatus, code } = {}) {
  if (engineStatus === 'unsupported') return 'unsupported'
  if (code === 'timeout') return 'timeout'
  if (engineStatus === 'error') return 'engine'
  return 'compute'
}

/** [다시 시도]를 보일지 — 브라우저가 못 쓰는 경우는 다시 해도 같다 */
export function canRetryAi(kind) {
  return kind !== 'unsupported'
}

/** 적용해 둔 AI 영역이 실패했을 때 캔버스 위 문구 (n = 실패한 영역 수) */
export function aiLayerFailText(kind, n) {
  const many = n > 1 ? ` (${n}곳)` : ''
  if (kind === 'unsupported') return `이 브라우저에서는 AI로 지울 수 없어요${many}. [빼기]로 정리하고 [단색]이나 [주변으로 덮기]를 써 주세요.`
  if (kind === 'engine') return `AI를 불러오지 못해 지우지 못한 곳이 있어요${many}. [다시 시도]를 눌러 주세요.`
  if (kind === 'timeout') return `AI가 너무 오래 걸려 지우지 못한 곳이 있어요${many}. [다시 시도]를 눌러 주세요.`
  return `AI로 지우지 못한 곳이 있어요${many}. [다시 시도]를 눌러 주세요.`
}

/** 결과(ai) 없이 있는 AI 지우기 레이어 — 자동으로 계산할 대상 */
export function needsAiResult(l) {
  return !!l && l.type === 'fill' && l.method === 'ai' && !l.ai
}

/**
 * edit 한 벌에서 그 레이어가 결과 없이 같은 모양(계산 key가 planKey)이면 ai를 채운 새 edit, 아니면 같은 edit.
 * @param {(layers: object[], id: string) => string|undefined} planKeyOf 그 edit의 layers에서 레이어의 계산 key (studioFillPlan)
 */
export function fillAiInEdit(edit, { layerId, planKey, ai }, planKeyOf) {
  const layers = edit?.layers
  if (!Array.isArray(layers)) return edit
  const i = layers.findIndex(l => l.id === layerId)
  if (i < 0 || !needsAiResult(layers[i]) || planKeyOf(layers, layerId) !== planKey) return edit
  return { ...edit, layers: layers.map((l, j) => (j === i ? { ...l, ai } : l)) }
}
