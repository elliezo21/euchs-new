/**
 * 스튜디오 편집 내용(studio_images.edit) 읽기·쓰기 + 자동 저장
 *
 * ★ edit v2 모양 (원본 픽셀 좌표, 결과 픽셀은 저장하지 않는다 — 화면을 열 때마다 원본에서 다시 계산)
 *   { v: 2, layers: [ { id: 'f_k3j9x2', type: 'fill', x, y, w, h, method: 'coons'|'solid', pad: 0~12 } ] }
 *   레이어 순서 = 배열 순서 (뒤가 위). 모르는 type(cover·text 등 다음 단계)은 건드리지 않고 그대로 보존한다.
 * ★ 저장은 낙관적 잠금: edit_version이 내가 읽은 값일 때만 +1 하며 쓴다. 반영 0건 = 다른 창이 먼저 고침(충돌).
 *   브라우저(authenticated)는 edit·edit_version 등 컬럼 단위 UPDATE만 가능하다 (INSERT·DELETE 없음, RLS 본인 행).
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'

export const EDIT_VERSION = 2
export const MAX_LAYERS = 60
export const PAD_MIN = 0
export const PAD_MAX = 12
export const PAD_DEFAULT = 4
export const FILL_METHODS = ['coons', 'solid'] // C(거울 복제)는 1-5 실측에서 제외
export const SAVE_DELAY_MS = 1200

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function newFillId() {
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  let s = 'f_'
  for (const n of buf) s += ID_CHARS[n % ID_CHARS.length]
  return s
}

/** 편집기에서 다룰 수 있는 지우기 레이어인지 (모양이 어긋나면 그리지 않고 보존만) */
export function isValidFillLayer(l) {
  return l && l.type === 'fill' && typeof l.id === 'string'
    && [l.x, l.y, l.w, l.h, l.pad].every(Number.isInteger)
    && l.w > 0 && l.h > 0 && FILL_METHODS.includes(l.method)
}

/** DB의 edit → 레이어 배열 (복사본). v2가 아니거나 모양이 이상하면 사유를 남긴다 */
export function readLayers(edit, imageId) {
  if (!edit || edit.v !== EDIT_VERSION || !Array.isArray(edit.layers)) {
    console.error('[studioEdit] edit 모양이 v2가 아님 — 빈 편집으로 보여주고, 저장 시 v2로 씀:', imageId, edit)
    return []
  }
  for (const l of edit.layers) {
    if (l?.type === 'fill' && !isValidFillLayer(l)) console.error('[studioEdit] 잘못된 지우기 레이어 — 그리지 않고 보존:', imageId, l)
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
 * 자동 저장기 — 사진별로 따로 관리한다 (사진을 바꿔도 이전 사진의 저장이 이어진다).
 *   change(id, edit): 변경 기록 → SAVE_DELAY_MS 동안 추가 변경이 없으면 저장
 *   flush(id?): 즉시 저장 (사진 전환·화면 떠날 때). 모두 저장됐으면 true
 *   status: 'saved' | 'pending' | 'saving' | 'error' | 'conflict' (가장 나쁜 상태)
 * @param {{ onStatus(status, detail), onSaved(id, version, edit), onConflict(id) }} hooks
 */
export function createEditSaver({ onStatus, onSaved, onConflict }) {
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
        const res = await saveImageEdit(id, edit, e.version)
        if (!res.ok) {
          e.pending = e.pending || edit
          e.state = 'conflict'
          onConflict?.(id)
          return
        }
        e.version = res.version
        onSaved?.(id, res.version, edit)
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
