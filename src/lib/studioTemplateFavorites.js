/**
 * 템플릿 내 보관함 (하트) — 계정에 남는다 (표 studio_template_favorites, RLS: 본인 행). 브라우저 저장소는 쓰지 않는다.
 * SQL: docs/sql/2026-09-29-studio-template-favorites.sql (해성이 실행). 실행 전에는 표가 없다 → ready = false:
 *   하트는 보이지만 눌리지 않고, [내 보관함]은 비어 있다. 원인은 console.error 한 줄.
 * ★ .eq('user_id', uid)를 생략하지 않는다 (studioProjects.js와 같은 이유)
 * ★ 상태는 이 모듈 하나(갤러리·편집기 패널이 같이 본다). 로그아웃(euchs-auth-changed)이면 비우고, 로그인이면 다시 읽는다.
 */
import { reactive } from 'vue'
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'

const RETRY = '잠시 후 다시 시도해 주세요.'
const TABLE = 'studio_template_favorites'

/** 표가 아직 없음 (SQL 실행 전) — PostgREST: 42P01 표 없음 · PGRST205 스키마 캐시에 없음 */
export function isFavoritesSchemaMissing(error) {
  return ['42P01', 'PGRST205'].includes(String(error?.code || ''))
}

// ready: null = 아직 모름 · true = 쓸 수 있음 · false = SQL 실행 전
export const favorites = reactive({ ready: null, keys: new Set(), busy: new Set(), uid: null })

let loading = null
let listening = false

function reset() {
  favorites.ready = null
  favorites.keys = new Set()
  favorites.busy = new Set()
  favorites.uid = null
  loading = null
}

function listen() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('euchs-auth-changed', e => {
    reset()
    if (e.detail?.user) loadFavorites()
  })
}

/** 내 보관함 읽기 (이 계정에서 한 번 — 다시 부르면 같은 약속). 로그인 전이면 비운 채로 */
export function loadFavorites() {
  listen()
  const uid = currentUser.value?.id
  if (!uid) { reset(); return Promise.resolve() }
  if (loading && favorites.uid === uid) return loading
  favorites.uid = uid
  loading = (async () => {
    const { data, error } = await supabase.from(TABLE).select('template_key').eq('user_id', uid)
    if (favorites.uid !== uid) return // 읽는 사이 계정이 바뀜
    if (error) {
      if (isFavoritesSchemaMissing(error)) {
        console.error('[studioTemplateFavorites] studio_template_favorites를 쓸 수 없음 — docs/sql/2026-09-29-studio-template-favorites.sql 실행 필요:', error.code, error.message)
        favorites.ready = false
        return
      }
      console.error('[studioTemplateFavorites] 내 보관함 조회 실패:', error.code, error.message)
      loading = null // 다음에 다시 읽는다
      favorites.ready = null
      return
    }
    favorites.keys = new Set((data || []).map(r => r.template_key))
    favorites.ready = true
  })()
  return loading
}

/**
 * 하트 켜기/끄기. 화면에 먼저 반영하고, 저장이 실패하면 되돌린 뒤 throw (부르는 쪽이 알린다).
 * ready가 아니면 아무것도 하지 않는다 (버튼이 꺼져 있다).
 */
export async function toggleFavorite(key) {
  const uid = currentUser.value?.id
  if (!uid || favorites.ready !== true || favorites.busy.has(key)) return
  const on = !favorites.keys.has(key)
  const next = new Set(favorites.keys)
  if (on) next.add(key); else next.delete(key)
  favorites.keys = next
  favorites.busy = new Set([...favorites.busy, key])
  try {
    const q = on
      ? supabase.from(TABLE).insert({ user_id: uid, template_key: key })
      : supabase.from(TABLE).delete().eq('user_id', uid).eq('template_key', key)
    const { error } = await q
    if (error && !(on && error.code === '23505')) { // 이미 담겨 있음 = 원하는 상태
      console.error('[studioTemplateFavorites] 내 보관함 저장 실패:', key, on, error.code, error.message)
      if (favorites.uid === uid) {
        const back = new Set(favorites.keys)
        if (on) back.delete(key); else back.add(key)
        favorites.keys = back
      }
      throw new Error(RETRY)
    }
  } finally {
    const b = new Set(favorites.busy)
    b.delete(key)
    favorites.busy = b
  }
}
