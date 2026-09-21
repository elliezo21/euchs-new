/**
 * EUCHS 내상품리스트(찜) 데이터 계층 — saved_products / categories 단일 진입점
 *
 * ── RLS 전제 (Supabase, 변경 금지) ────────────────────────────────
 *   saved_products: 본인 SELECT / INSERT / DELETE 만 허용. UPDATE 정책 없음.
 *     → 카테고리/이름/메모 변경은 반드시 RPC update_saved_product 로만 수행.
 *        (직접 .update() 하면 에러 없이 0건 반영되는 조용한 실패가 발생함)
 *   categories: 누구나 SELECT. 이 파일에서는 level=1(대분류)만 사용.
 *
 * ── 실패 처리 원칙 ────────────────────────────────────────────────
 *   모든 함수는 error를 확인하고, insert/delete/rpc는 반환 행을 받아
 *   실제 반영 건수를 검증한 뒤 실패 시 Error를 throw 한다.
 *   호출부는 catch 하여 사용자에게 원인 메시지를 노출할 것.
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'

/**
 * 관리자 세션(euchs_admin_token 경로) 안내 문구 — 화면에 그대로 노출된다.
 */
export const ADMIN_SESSION_MESSAGE =
  '관리자 계정으로는 찜 기능을 사용할 수 없습니다. 일반 회원 계정으로 로그인해 주세요.'

/** requireSupabaseSession()이 던지는 에러의 code (호출부에서 일반 실패와 구분용) */
export const NO_SUPABASE_SESSION = 'NO_SUPABASE_SESSION'

/**
 * 실제 Supabase Auth 세션(JWT) 보유 여부.
 *
 * ※ 2026-09-21 정정: 예전 주석은 "adminSignIn은 Supabase 세션을 만들지 않는다"고
 *   적고 있었으나 사실과 다르다. adminSignIn은 첫 동작이
 *   supabase.auth.signInWithPassword(auth.js)이고, 이게 실패하면 관리자 로그인
 *   자체가 throw로 막힌다. 즉 관리자도 자기 계정의 Supabase 세션을 가진다.
 *   (따라서 관리자 화면에서는 관리자 uid 기준으로 본인 데이터가 조회된다 — 정상)
 *
 * 이 가드는 "세션이 진짜 없는 경우"(세션 만료, 스토리지 차단, JWT 소실 등)의
 * 방어로 여전히 유효하다. auth.uid()=null이면 saved_products RLS
 * (auth.uid() = user_id)가 42501로 거부하므로 DB를 치기 전에 걸러낸다.
 * euchs_admin_token을 직접 보지 않고 getSession()으로 판별한다.
 *
 * @returns {Promise<boolean>}
 */
export async function hasSupabaseSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return Boolean(session)
  } catch (e) {
    console.error('[savedProducts] getSession 실패:', e?.message || e)
    return false
  }
}

/**
 * 쓰기(저장·수정·삭제) 전 세션 가드.
 * 세션이 없으면 DB를 호출하지 않고 code=NO_SUPABASE_SESSION 에러를 던진다.
 */
async function requireSupabaseSession() {
  let session = null
  try {
    const res = await supabase.auth.getSession()
    session = res?.data?.session || null
  } catch (e) {
    console.error('[savedProducts] getSession 실패:', e?.message || e)
    const err = new Error(`세션 확인에 실패했습니다: ${e?.message || e}`)
    err.code = 'SESSION_CHECK_FAILED'
    throw err
  }
  if (!session) {
    console.warn('[savedProducts] Supabase Auth 세션 없음 — 쓰기 중단 (관리자 토큰 경로 또는 세션 만료)')
    const err = new Error(ADMIN_SESSION_MESSAGE)
    err.code = NO_SUPABASE_SESSION
    throw err
  }
}

// ─── 대분류(level=1) 메모리 캐시 ──────────────────────────────────
let majorCategoriesCache = null
let majorCategoriesPromise = null

/**
 * 대분류 10개를 sort_order 순으로 반환. 세션 내 1회만 조회 후 캐시.
 * @returns {Promise<Array<{id: string, name_ko: string, sort_order: number}>>}
 */
export async function fetchMajorCategories() {
  if (majorCategoriesCache) return majorCategoriesCache
  if (majorCategoriesPromise) return majorCategoriesPromise

  majorCategoriesPromise = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name_ko, sort_order')
      .eq('level', 1)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      majorCategoriesPromise = null
      console.error('[savedProducts] 대분류 카테고리 조회 실패:', error.message)
      throw new Error(`카테고리 목록 조회 실패: ${error.message}`)
    }
    majorCategoriesCache = Array.isArray(data) ? data : []
    return majorCategoriesCache
  })()

  return majorCategoriesPromise
}

/**
 * 대분류 이름(name_ko) → id 변환. 매칭 실패 시 null.
 * @param {string} nameKo
 * @returns {Promise<string|null>}
 */
export async function resolveMajorCategoryId(nameKo) {
  if (!nameKo) return null
  const list = await fetchMajorCategories()
  const hit = list.find((c) => c.name_ko === nameKo)
  return hit ? hit.id : null
}

// ─── 내부 헬퍼 ────────────────────────────────────────────────────
function requireUserId() {
  const userId = currentUser.value?.id
  if (!userId) throw new Error('로그인이 필요합니다.')
  return userId
}

/**
 * (user_id, item_id)로 이미 찜한 행을 조회. 없으면 null.
 * @param {string} itemId - 1688 offerId
 */
export async function findSavedProduct(itemId) {
  const userId = currentUser.value?.id
  if (!userId || !itemId) return null

  const { data, error } = await supabase
    .from('saved_products')
    .select('id, item_id, category_id, category_source, display_name, memo')
    .eq('user_id', userId)
    .eq('item_id', String(itemId))
    .maybeSingle()

  if (error) {
    console.error('[savedProducts] 찜 상태 조회 실패:', error.message)
    throw new Error(`찜 상태 조회 실패: ${error.message}`)
  }
  return data || null
}

/** 본인 찜 목록 전체 (최신순) */
export async function listSavedProducts() {
  const userId = currentUser.value?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('saved_products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[savedProducts] 목록 조회 실패:', error.message)
    throw new Error(`목록 조회 실패: ${error.message}`)
  }
  return Array.isArray(data) ? data : []
}

/**
 * 찜하기 (INSERT). 반환 행으로 실제 반영을 검증한다.
 * @param {Object} p
 * @param {string} p.itemId
 * @param {string} [p.titleZh]
 * @param {string} [p.imageUrl]
 * @param {number|null} [p.snapshotPrice] - 찜 시점 단가(CNY). 장바구니 priceCny와 동일 기준.
 * @param {Object} [p.itemData] - 카드 표시/모달 재오픈용 최소 정보
 * @param {string|null} [p.categoryId] - 대분류 id (없으면 null)
 */
export async function saveProduct({ itemId, titleZh, imageUrl, snapshotPrice, itemData, categoryId }) {
  const userId = requireUserId()
  if (!itemId) throw new Error('상품 ID를 확인할 수 없습니다.')
  await requireSupabaseSession()

  const row = {
    user_id: userId,
    item_id: String(itemId),
    item_data: itemData || null,
    title_zh: titleZh || null,
    image_url: imageUrl || null,
    snapshot_price: Number.isFinite(Number(snapshotPrice)) && Number(snapshotPrice) > 0 ? Number(snapshotPrice) : null,
    category_id: categoryId || null,
    category_source: categoryId ? 'auto' : 'none',
  }

  const { data, error } = await supabase
    .from('saved_products')
    .insert(row)
    .select('*')

  if (error) {
    console.error('[savedProducts] 찜 저장 실패:', error.code, error.message)
    if (error.code === '23505') throw new Error('이미 내상품리스트에 담긴 상품입니다.')
    throw new Error(`찜 저장 실패: ${error.message}`)
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('찜 저장이 반영되지 않았습니다 (반영 0건).')
  }
  return data[0]
}

/**
 * 찜 해제 (DELETE, item_id 기준). 반환 행으로 실제 반영을 검증한다.
 */
export async function removeSavedProduct(itemId) {
  const userId = requireUserId()
  if (!itemId) throw new Error('상품 ID를 확인할 수 없습니다.')
  await requireSupabaseSession()

  const { data, error } = await supabase
    .from('saved_products')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', String(itemId))
    .select('id')

  if (error) {
    console.error('[savedProducts] 찜 해제 실패:', error.message)
    throw new Error(`찜 해제 실패: ${error.message}`)
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('찜 해제가 반영되지 않았습니다 (반영 0건).')
  }
  return data.length
}

/**
 * 찜 삭제 (DELETE, 행 id 기준 — 단건/일괄 공용).
 * @param {string[]} ids
 */
export async function deleteSavedProducts(ids) {
  const userId = requireUserId()
  const list = (ids || []).filter(Boolean)
  if (list.length === 0) return 0
  await requireSupabaseSession()

  const { data, error } = await supabase
    .from('saved_products')
    .delete()
    .eq('user_id', userId)
    .in('id', list)
    .select('id')

  if (error) {
    console.error('[savedProducts] 삭제 실패:', error.message)
    throw new Error(`삭제 실패: ${error.message}`)
  }
  const deleted = Array.isArray(data) ? data.length : 0
  if (deleted === 0) {
    throw new Error('삭제가 반영되지 않았습니다 (반영 0건).')
  }
  if (deleted < list.length) {
    throw new Error(`${list.length}개 중 ${deleted}개만 삭제되었습니다.`)
  }
  return deleted
}

/**
 * 카테고리 / 이름 / 메모 변경 — RPC update_saved_product 전용.
 * (saved_products에 UPDATE 정책이 없어 직접 update는 조용히 0건이 됨)
 *
 * @param {string} id - saved_products.id
 * @param {Object} patch
 * @param {string|null} [patch.categoryId] - 대분류 id로 변경
 * @param {boolean} [patch.clearCategory] - true면 미분류로 되돌림
 * @param {string} [patch.displayName] - 빈 문자열이면 값 삭제(null)
 * @param {string} [patch.memo] - 빈 문자열이면 값 삭제(null)
 * @returns {Promise<Object>} 수정된 행
 */
export async function updateSavedProduct(id, patch = {}) {
  requireUserId()
  if (!id) throw new Error('대상 항목을 확인할 수 없습니다.')
  await requireSupabaseSession()

  const params = { p_id: id }
  if (patch.clearCategory) {
    params.p_clear_category = true
  } else if (Object.prototype.hasOwnProperty.call(patch, 'categoryId')) {
    params.p_category_id = patch.categoryId
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'displayName')) {
    params.p_display_name = patch.displayName ?? ''
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'memo')) {
    params.p_memo = patch.memo ?? ''
  }

  const { data, error } = await supabase.rpc('update_saved_product', params)

  if (error) {
    console.error('[savedProducts] RPC update_saved_product 실패:', error.message)
    throw new Error(`변경 실패: ${error.message}`)
  }
  const updated = Array.isArray(data) ? data[0] : data
  if (!updated) {
    throw new Error('변경 사항이 반영되지 않았습니다 (반영 0건).')
  }
  return updated
}
