/**
 * 보내기 창 판매처 섹션의 [공통 정보 사용] (2026-10-02 ②-1) — 스마트스토어·11번가·지그재그 섹션이 같이 쓴다 (쿠팡은 옵션 표가 달라 섹션 안에서)
 * 규칙은 순수 함수 src/lib/studioSendCommon.js (commonPatch·stashGroup) — 여기서는 섹션의 f·opts에 잇기만 한다
 *
 *   use[key] = true(처음)  → 공통 값을 섹션 칸에 넣고 칸을 가린다
 *   use[key] = false        → 그 칸이 열린다. 처음 끌 때는 지금(공통) 값에서 시작, 전에 꺼 두고 넣은 값이 있으면 그 값을 되살린다
 *   다시 켜면              → 지금 칸 값을 stash에 넣어 두고(지우지 않음) 공통 값으로 돌아간다
 * 예전 "이 판매처만 다르게"(own)는 체크가 "다르게"라 빈 체크 = 공통이었고, 끄면 그 칸에 넣었던 값이 공통 값으로 덮여 사라졌다(다시 켜도 공통 값만 보였다)
 */
import { reactive, watch } from 'vue'
import { COMMON_GROUPS, COMMON_FIELDS, initialUse, commonPatch, stashGroup } from './studioSendCommon.js'
import { cloneOptionEditor } from './studioOptionEditor.js'

/**
 * @param {'smartstore'|'11st'|'zigzag'} market
 * @param {{ props:{ common }, f:import('vue').Ref, opts:import('vue').Ref, done:import('vue').Ref }} o
 */
export function useSendCommon(market, { props, f, opts, done }) {
  const use = reactive(initialUse(COMMON_GROUPS))
  const stash = {} // key → stashGroup 결과 (다시 끄면 되살린다)
  // 칸을 보일지 — 공통 정보가 없으면(다시 보내기 등) 예전처럼 모두 보인다. 대표 이미지(image)는 공통 정보에서만 고른다
  const showOwn = key => !props.common || (key !== 'image' && use[key] === false)
  function sync() {
    if (!props.common || done.value) return
    const p = commonPatch(market, props.common, use)
    Object.assign(f.value, p.form)
    if (p.opts) opts.value = p.opts
  }
  function setUse(key, on) {
    if (done.value || !(key in use) || use[key] === on) return
    if (on) stash[key] = stashGroup(market, key, f.value, opts.value)
    use[key] = on
    if (!on && stash[key]) {
      Object.assign(f.value, stash[key].form)
      if (stash[key].opts) opts.value = cloneOptionEditor(stash[key].opts)
    }
    sync()
  }
  watch(() => props.common, sync, { deep: true, immediate: true })
  /** 입력값 기억(studioSendDraft) — 꺼 둔 묶음만 { key: false } */
  const useOut = () => Object.fromEntries(Object.entries(use).filter(([, v]) => v === false))
  /** 기억한 입력값 되살리기 — 꺼 두었던 묶음만 다시 끄고 그 판매처 값으로 (나머지는 공통 정보가 채운다) */
  function applyUseDraft(d) {
    const fields = COMMON_FIELDS[market]
    for (const key of Object.keys(d?.use || {})) {
      if (!(key in use) || d.use[key] !== false) continue
      setUse(key, false)
      if (d.form && fields[key] in d.form) f.value[fields[key]] = d.form[fields[key]]
      if (key === 'stock' && d.opts && Array.isArray(d.opts.groups)) opts.value = cloneOptionEditor(d.opts)
    }
  }
  return { use, groups: COMMON_GROUPS, showOwn, setUse, sync, useOut, applyUseDraft }
}
