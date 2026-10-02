/**
 * 판매처별 카테고리 묶음 (브라우저, RLS: 본인 행) — 표 studio_category_bundles (2026-10-02 여러 상품 한 번에 보내기)
 * SQL: docs/sql/2026-10-02-studio-category-bundles.sql (해성이 실행). 실행 전에는 표가 없다 → ready = false, 화면은 [직접 고르기]만.
 * 묶음 하나 = 판매처 하나의 카테고리 하나. 이름 규칙은 studioBulkSend.checkBundleName
 * ★ .eq('user_id', uid)를 생략하지 않는다 (studioFolders.js와 같은 이유)
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'

function requireUid() {
  const uid = currentUser.value?.id
  if (!uid) throw new Error('로그인이 필요합니다.')
  return uid
}
const RETRY = '잠시 후 다시 시도해 주세요.'
const COLS = 'id, market, name, category_id, category_name, created_at'
const shape = r => ({ id: r.id, market: r.market, name: r.name, categoryId: r.category_id, categoryName: r.category_name || '', createdAt: r.created_at })

/** 표가 아직 없음 (SQL 실행 전) — PostgREST: 42P01 표 없음 · PGRST205 스키마 캐시에 없음 · 42501 권한 없음(GRANT 누락) */
export function isBundleSchemaMissing(error) {
  return ['42P01', 'PGRST205', '42501'].includes(String(error?.code || ''))
}

/** @returns {Promise<{ ready:boolean, bundles:[{ id, market, name, categoryId, categoryName }] }>} */
export async function listCategoryBundles() {
  const uid = requireUid()
  const { data, error } = await supabase.from('studio_category_bundles').select(COLS).eq('user_id', uid).order('market').order('name')
  if (error) {
    if (isBundleSchemaMissing(error)) {
      console.error('[studioCategoryBundles] studio_category_bundles를 쓸 수 없음 — docs/sql/2026-10-02-studio-category-bundles.sql 실행 필요:', error.code, error.message)
      return { ready: false, bundles: [] }
    }
    console.error('[studioCategoryBundles] 묶음 목록 조회 실패:', error.code, error.message)
    throw new Error(RETRY)
  }
  return { ready: true, bundles: (data || []).map(shape) }
}

/** @param {{ market, name, categoryId, categoryName }} b */
export async function createCategoryBundle({ market, name, categoryId, categoryName = '' }) {
  const uid = requireUid()
  const { data, error } = await supabase.from('studio_category_bundles')
    .insert({ user_id: uid, market, name, category_id: String(categoryId), category_name: String(categoryName || '').slice(0, 300) || null })
    .select(COLS)
  if (error) {
    console.error('[studioCategoryBundles] 묶음 저장 실패:', error.code, error.message)
    throw new Error(error.code === '23505' ? '같은 이름의 묶음이 있습니다.' : RETRY)
  }
  if (!data || !data[0]) {
    console.error('[studioCategoryBundles] 묶음 저장: 응답에 행이 없음')
    throw new Error(RETRY)
  }
  return shape(data[0])
}

export async function deleteCategoryBundle(id) {
  const uid = requireUid()
  const { data, error } = await supabase.from('studio_category_bundles').delete().eq('id', id).eq('user_id', uid).select('id')
  if (error) {
    console.error('[studioCategoryBundles] 묶음 삭제 실패:', error.code, error.message)
    throw new Error(RETRY)
  }
  if (!data || !data.length) {
    console.error('[studioCategoryBundles] 묶음 삭제: 지운 행이 없음 (이미 지워졌거나 남의 행)', id)
    throw new Error('묶음을 찾을 수 없습니다. 목록을 새로고침하세요.')
  }
}
