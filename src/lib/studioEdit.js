/**
 * 스튜디오 편집 내용(studio_images.edit) 읽기·쓰기 + 자동 저장
 *
 * ★ edit v2 모양 (원본 픽셀 좌표)
 *   { v: 2, layers: [ { id: 'f_k3j9x2', type: 'fill', x, y, w, h, method: 'coons'|'solid'|'ai', pad: 0~12, ai? } ] }
 *   레이어 순서 = 배열 순서 (뒤가 위). 모르는 type(cover·text 등 다음 단계)은 건드리지 않고 그대로 보존한다.
 * ★ Coons·단색은 결과 픽셀을 저장하지 않고 매번 원본에서 계산. AI(method 'ai')만 결과가 기기마다 조금씩 달라
 *   결과 조각 PNG를 Storage에 저장한다(2026-09-25 결정). 계산이 끝난 AI 레이어에는 ai 필드가 붙는다:
 *     ai: { key: 16자리 16진수, model: 'lama_fp32@1faef530', engine: 'webgpu'|'wasm', patch: { path, x, y, w, h } }
 *     key = sha256(그 레이어의 계산 key(studioFillPlan) + '|' + model) 앞 16자 — 지금 key와 같으면 저장된 PNG를 쓴다.
 *   방금 그린(계산 전) AI 레이어에는 ai가 없다. 옛 PNG는 지우지 않는다(되돌리기에서 다시 쓴다, 정리는 30일 삭제).
 *   'coons'(자연스럽게)는 새로 만들지 않지만(1-6b-3b에서 카드 제거) 저장된 레이어는 그대로 그린다.
 * ★ 붓 레이어(shape:'brush', brush:{ strokes }) — 모양은 studioBrush.js 주석. shape가 없으면 네모.
 * ★ 덮기 레이어(type 'cover', 12-2) — { id: 'c_…', type: 'cover', x, y, w, h, sx, sy, feather }, 모양은 studioCover.js 주석.
 *   지우기와 같은 배열에 쌓인 순서대로 적용한다 (pixelLayersOf — 화면·완성 JPG·작은 사진·내보내기 공통). type이 없는 레이어는 예전처럼 보존만.
 * ★ 실행 전 영역(네모·붓)은 edit에 넣지 않는다(편집기 화면에만 있는 초안 1개). [AI로 지우기]/[단색]을 누른 순간 레이어로 추가.
 * ★ 저장은 낙관적 잠금: edit_version이 내가 읽은 값일 때만 +1 하며 쓴다. 반영 0건 = 다른 창이 먼저 고침(충돌).
 *   브라우저(authenticated)는 edit·edit_version 등 컬럼 단위 UPDATE만 가능하다 (INSERT·DELETE 없음, RLS 본인 행).
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'
import { isValidBrushLayer } from '@/lib/studioBrush'
import { isValidCoverLayer } from '@/lib/studioCover'

export const EDIT_VERSION = 2
export const MAX_LAYERS = 60
export const PAD_MIN = 0
export const PAD_MAX = 12
export const PAD_DEFAULT = 4
export const FILL_METHODS = ['coons', 'solid', 'ai'] // C(거울 복제)는 1-5 실측에서 제외. 'coons'는 기존 레이어 표시용
export const AI_ENGINES = ['webgpu', 'wasm']
export const SAVE_DELAY_MS = 1200

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** @param {string} prefix 'f_' 지우기 · 'c_' 덮기 */
export function newFillId(prefix = 'f_') {
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  let s = prefix
  for (const n of buf) s += ID_CHARS[n % ID_CHARS.length]
  return s
}

/** 편집기에서 다룰 수 있는 지우기 레이어인지 (모양이 어긋나면 그리지 않고 보존만) */
export function isValidFillLayer(l) {
  return !!l && l.type === 'fill' && typeof l.id === 'string'
    && [l.x, l.y, l.w, l.h, l.pad].every(Number.isInteger)
    && l.w > 0 && l.h > 0 && FILL_METHODS.includes(l.method)
    && (l.method !== 'ai' || l.ai === undefined || isValidAiResult(l.ai))
    && (l.shape === undefined || isValidBrushLayer(l)) // shape 없음 = 네모(기존), 'brush' = 붓
}

/** AI 레이어의 ai 필드 모양 (계산 결과 조각 정보) */
export function isValidAiResult(a) {
  const p = a?.patch
  return !!a && typeof a === 'object' && /^[0-9a-f]{16}$/.test(a.key) && typeof a.model === 'string' && a.model !== ''
    && AI_ENGINES.includes(a.engine)
    && !!p && typeof p.path === 'string' && p.path !== '' && [p.x, p.y, p.w, p.h].every(Number.isInteger) && p.w > 0 && p.h > 0
}

/** DB의 edit → 레이어 배열 (복사본). v2가 아니거나 모양이 이상하면 사유를 남긴다 */
export function readLayers(edit, imageId) {
  if (!edit || edit.v !== EDIT_VERSION || !Array.isArray(edit.layers)) {
    console.error('[studioEdit] edit 모양이 v2가 아님 — 빈 편집으로 보여주고, 저장 시 v2로 씀:', imageId, edit)
    return []
  }
  for (const l of edit.layers) {
    if (l?.type === 'fill' && !isValidFillLayer(l)) console.error('[studioEdit] 잘못된 지우기 레이어 — 그리지 않고 보존:', imageId, l)
    if (l?.type === 'cover' && !isValidCoverLayer(l)) console.error('[studioEdit] 잘못된 덮기 레이어 — 그리지 않고 보존:', imageId, l)
  }
  return edit.layers.map(l => ({ ...l }))
}

/** 레이어 배열 → 저장할 edit. 원래 edit의 다른 키도 보존한다 */
export function buildEdit(prevEdit, layers) {
  const base = prevEdit && typeof prevEdit === 'object' && !Array.isArray(prevEdit) ? prevEdit : {}
  return { ...base, v: EDIT_VERSION, layers: layers.map(l => ({ ...l })) }
}

export function fillLayersOf(layers) {
  return layers.filter(isValidFillLayer)
}

/** 사진 픽셀을 바꾸는 레이어 — 지우기 + 덮기(12-2), 배열 순서 그대로. 계산(fillPlan)·합성(composeErased)은 이 목록을 쓴다 */
export function isValidPixelLayer(l) {
  return isValidFillLayer(l) || isValidCoverLayer(l)
}
export function pixelLayersOf(layers) {
  return layers.filter(isValidPixelLayer)
}

/**
 * 목록 표시용 개수 — done: 결과가 있는 지우기(AI는 저장된 결과 조각 ai.patch가 있어야, 단색·coons는 매번 원본에서 계산하므로 항상),
 * redo: 결과 조각 없이 남은 AI 레이어(실행했지만 결과를 저장하지 못함 → 다시 열면 [다시 지우기] 상태),
 * cover: 덮기 수(12-2 — 매번 사진에서 계산하므로 항상 결과가 있다).
 * ai.patch가 있어도 영역을 옮겨 계산 key가 바뀐 결과는 여기서 가리지 않는다 (key 확인은 비동기 sha256 — 편집 화면이 가린다)
 */
export function fillCounts(layers) {
  let done = 0, redo = 0, cover = 0
  for (const l of layers || []) {
    if (isValidCoverLayer(l)) { cover++; continue }
    if (!isValidFillLayer(l)) continue
    if (l.method === 'ai' && !l.ai?.patch) redo++
    else done++
  }
  return { done, redo, cover }
}

function requireUid() {
  const uid = currentUser.value?.id
  if (!uid) throw new Error('로그인이 필요해요.')
  return uid
}

/**
 * 낙관적 잠금 저장
 * @returns {{ ok: true, version: number } | { ok: false, conflict: true }}
 */
export async function saveImageEdit(imageId, nextEdit, curVersion) {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_images')
    .update({ edit: nextEdit, edit_version: curVersion + 1 })
    .eq('id', imageId)
    .eq('user_id', uid)
    .eq('edit_version', curVersion)
    .select('id, edit_version')
  if (error) {
    console.error('[studioEdit] 저장 실패:', imageId, error.message)
    throw new Error(`저장하지 못했어요: ${error.message}`)
  }
  if (!data || data.length === 0) return { ok: false, conflict: true }
  return { ok: true, version: data[0].edit_version }
}

/** 서버의 최신 edit (충돌 후 불러오기) */
export async function fetchImageEdit(imageId) {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_images')
    .select('id, edit, edit_version, updated_at')
    .eq('id', imageId)
    .eq('user_id', uid)
    .maybeSingle()
  if (error) {
    console.error('[studioEdit] 최신 내용 조회 실패:', imageId, error.message)
    throw new Error(`최신 내용을 불러오지 못했어요: ${error.message}`)
  }
  if (!data) throw new Error('사진을 찾을 수 없어요 (삭제됐거나 다른 계정).')
  return data
}

/**
 * 자동 저장기 — 대상(id)별로 따로 관리한다 (사진을 바꿔도 이전 사진의 저장이 이어진다).
 *   change(id, value): 변경 기록 → SAVE_DELAY_MS 동안 추가 변경이 없으면 저장
 *   flush(id?): 즉시 저장 (사진 전환·화면 떠날 때). 모두 저장됐으면 true
 *   status: 'saved' | 'pending' | 'saving' | 'error' | 'conflict' (가장 나쁜 상태)
 * ★ 범용: save(id, value, version)를 주입받는다 (기본 = 사진 edit 저장 saveImageEdit, 페이지 문서는 saveProjectPage).
 *   save는 낙관적 잠금으로 { ok: true, version, edit? } 또는 { ok: false, conflict: true }를 돌려주고, 실패는 throw.
 *   edit = 실제로 저장한 값 (저장 직전에 값을 고쳤을 때 — 사진 edit의 erase_v, studioFinal.stampEraseVersion)
 * @param {{ save?, onStatus(status, detail), onSaved(id, version, value), onConflict(id) }} hooks
 */
export function createEditSaver({ save = saveImageEdit, onStatus, onSaved, onConflict }) {
  const entries = new Map() // id → { version, pending, timer, inflight, state, error }
  let disposed = false

  const RANK = { saved: 0, pending: 1, saving: 2, error: 3, conflict: 4 }
  function emit() {
    let worst = 'saved', detail = null
    for (const [id, e] of entries) {
      if (RANK[e.state] > RANK[worst]) { worst = e.state; detail = { id, error: e.error } }
    }
    onStatus?.(worst, detail)
  }

  function track(id, version) {
    const e = entries.get(id)
    if (e) return
    entries.set(id, { version, pending: null, timer: null, inflight: null, state: 'saved', error: '' })
  }

  /** 서버 값으로 교체한 뒤 (충돌 불러오기) 새 기준 버전으로 다시 시작 */
  function reset(id, version) {
    const e = entries.get(id)
    if (e) clearTimeout(e.timer)
    entries.set(id, { version, pending: null, timer: null, inflight: null, state: 'saved', error: '' })
    emit()
  }

  function change(id, edit) {
    const e = entries.get(id)
    if (!e) throw new Error(`[studioEdit] 추적하지 않는 사진: ${id}`)
    e.pending = edit
    if (e.state === 'conflict') { emit(); return } // 충돌 해결 전에는 쓰지 않는다
    if (!e.inflight) e.state = 'pending'
    clearTimeout(e.timer)
    e.timer = setTimeout(() => { run(id) }, SAVE_DELAY_MS)
    emit()
  }

  async function run(id) {
    const e = entries.get(id)
    if (!e || disposed) return
    clearTimeout(e.timer)
    e.timer = null
    if (e.inflight) { await e.inflight; return run(id) } // 앞 저장이 끝난 뒤 새 버전으로
    if (!e.pending || e.state === 'conflict') return
    const edit = e.pending
    e.pending = null
    e.state = 'saving'
    e.error = ''
    emit()
    e.inflight = (async () => {
      try {
        const res = await save(id, edit, e.version)
        if (!res.ok) {
          e.pending = e.pending || edit
          e.state = 'conflict'
          onConflict?.(id)
          return
        }
        e.version = res.version
        onSaved?.(id, res.version, res.edit ?? edit) // save가 저장 직전에 고친 값(res.edit)이 있으면 그것이 서버 값
        e.state = e.pending ? 'pending' : 'saved'
        if (e.pending) e.timer = setTimeout(() => { run(id) }, SAVE_DELAY_MS)
      } catch (err) {
        // 실패는 삼키지 않는다: 상태를 error로 두고 상단 바에 "저장 실패 — 다시 시도"
        console.error('[studioEdit] 자동 저장 실패:', id, err)
        e.pending = e.pending || edit
        e.state = 'error'
        e.error = err.message || String(err)
      } finally {
        e.inflight = null
        emit()
      }
    })()
    await e.inflight
  }

  async function flush(id) {
    const ids = id ? [id] : [...entries.keys()]
    for (const k of ids) {
      const e = entries.get(k)
      if (!e) continue
      if (e.state === 'error') e.state = 'pending'
      if (e.pending || e.inflight) await run(k)
    }
    return ids.every(k => { const e = entries.get(k); return !e || e.state === 'saved' })
  }

  /** 실패한 것 다시 시도 */
  function retry() { return flush() }

  function hasUnsaved() {
    for (const e of entries.values()) if (e.state !== 'saved' || e.pending || e.inflight) return true
    return false
  }

  function versionOf(id) { return entries.get(id)?.version }
  function stateOf(id) { return entries.get(id)?.state || 'saved' }

  function dispose() {
    disposed = true
    for (const e of entries.values()) clearTimeout(e.timer)
    entries.clear()
  }

  return { track, reset, change, flush, retry, hasUnsaved, versionOf, stateOf, dispose }
}
