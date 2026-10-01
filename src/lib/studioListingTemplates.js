/**
 * 판매처 등록 템플릿(설정값 묶음) — 브라우저, RLS: 본인 행 (2026-10-01)
 * 표 public.marketplace_listing_templates — SQL docs/sql/2026-10-01-marketplace-listing-templates.sql (해성이 실행).
 * 실행 전에는 표가 없다 → ready = false, 화면은 템플릿 칸·관리 화면을 그리지 않는다(원인은 console.error).
 * 값 모양·검사는 마켓 공용 파일(api/_listingTemplates.js) — 저장 전에 거기서 정리한다.
 * ★ .eq('user_id', uid)를 생략하지 않는다 (studioFolders.js와 같은 이유)
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'
import { validateListingTemplate, normalizeTemplateData } from '../../api/_listingTemplates.js'

const TABLE = 'marketplace_listing_templates'
const COLS = 'id, kind, name, is_default, data, created_at, updated_at'
const RETRY = '잠시 후 다시 시도해 주세요.'

function requireUid() {
  const uid = currentUser.value?.id
  if (!uid) throw new Error('로그인이 필요합니다.')
  return uid
}
/** 표가 아직 없음 (SQL 실행 전) — 42P01 표 없음 · PGRST205 스키마 캐시에 없음 · 42501 권한 없음(GRANT 누락) */
export function isListingSchemaMissing(error) {
  return ['42P01', 'PGRST205', '42501'].includes(String(error?.code || ''))
}
const shape = row => ({ ...row, data: normalizeTemplateData(row.kind, row.data) })
const fail = (what, error) => {
  console.error(`[studioListingTemplates] ${what} 실패:`, error?.code, error?.message)
  return new Error(error?.code === '23505' ? '같은 이름의 템플릿이 있습니다.' : RETRY)
}

/** @returns {Promise<{ ready:boolean, templates:[{ id, kind, name, is_default, data }] }>} */
export async function listListingTemplates() {
  const uid = requireUid()
  const { data, error } = await supabase.from(TABLE).select(COLS).eq('user_id', uid)
    .order('is_default', { ascending: false }).order('created_at', { ascending: true })
  if (error) {
    if (isListingSchemaMissing(error)) {
      console.error(`[studioListingTemplates] ${TABLE}를 쓸 수 없음 — docs/sql/2026-10-01-marketplace-listing-templates.sql 실행·GRANT 확인 필요:`, error.code, error.message)
      return { ready: false, templates: [] }
    }
    throw fail('목록 조회', error)
  }
  return { ready: true, templates: (data || []).map(shape) }
}

/** 기본 지정 — 같은 종류의 다른 기본을 먼저 끈다(사용자·종류마다 기본 1개 — 부분 유일 인덱스) */
async function clearDefault(uid, kind, exceptId = null) {
  let q = supabase.from(TABLE).update({ is_default: false }).eq('user_id', uid).eq('kind', kind).eq('is_default', true)
  if (exceptId) q = q.neq('id', exceptId)
  const { error } = await q
  if (error) throw fail('기본 해제', error)
}

/** 새 템플릿 — { kind, name, data, is_default? } */
export async function createListingTemplate({ kind, name, data, is_default = false }) {
  const uid = requireUid()
  const v = validateListingTemplate(kind, name, data)
  if (!v.ok) throw new Error(v.message)
  if (is_default) await clearDefault(uid, kind)
  const { data: rows, error } = await supabase.from(TABLE).insert({ user_id: uid, kind, name: v.value.name, data: v.value.data, is_default: !!is_default }).select(COLS)
  if (error) throw fail('만들기', error)
  if (!rows?.[0]) { console.error('[studioListingTemplates] 만들기: 응답에 행이 없음'); throw new Error(RETRY) }
  return shape(rows[0])
}

/** 이름·값 고치기 */
export async function updateListingTemplate(id, { kind, name, data }) {
  const uid = requireUid()
  const v = validateListingTemplate(kind, name, data)
  if (!v.ok) throw new Error(v.message)
  const { data: rows, error } = await supabase.from(TABLE).update({ name: v.value.name, data: v.value.data }).eq('id', id).eq('user_id', uid).select(COLS)
  if (error) throw fail('저장', error)
  if (!rows?.length) { console.error('[studioListingTemplates] 저장: 바뀐 행 없음:', id); throw new Error('템플릿을 찾을 수 없습니다. 목록을 새로고침하세요.') }
  return shape(rows[0])
}

/** 기본으로 지정 (on = false면 기본 해제) */
export async function setDefaultListingTemplate(id, kind, on = true) {
  const uid = requireUid()
  if (on) await clearDefault(uid, kind, id)
  const { data: rows, error } = await supabase.from(TABLE).update({ is_default: !!on }).eq('id', id).eq('user_id', uid).select('id')
  if (error) throw fail('기본 지정', error)
  if (!rows?.length) { console.error('[studioListingTemplates] 기본 지정: 바뀐 행 없음:', id); throw new Error('템플릿을 찾을 수 없습니다. 목록을 새로고침하세요.') }
}

export async function deleteListingTemplate(id) {
  const uid = requireUid()
  const { data: rows, error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', uid).select('id')
  if (error) throw fail('삭제', error)
  if (!rows?.length) { console.error('[studioListingTemplates] 삭제: 지워진 행 없음:', id); throw new Error('템플릿을 찾을 수 없습니다. 목록을 새로고침하세요.') }
}
