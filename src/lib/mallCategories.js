/**
 * 몰 메가메뉴 소분류 → 1688 검색용 중국어 키워드(keyword_zh) 매핑
 *
 * ── 배경 ──────────────────────────────────────────────────────────
 *   MallView의 소분류를 누르면 예전에는 "여성 티셔츠" 같은 한글을 만들어
 *   파파고에 넘겼다. 파파고 결과가 호출마다 흔들려 같은 카테고리에서도
 *   남성 상품이 섞여 나왔다.
 *   categories 테이블 level 3 에는 검증된 중국어 키워드가 131개 전부
 *   들어 있으므로(女士T恤 / 男士T恤 처럼 성별이 분리됨), 이걸 그대로 쓰면
 *   번역 단계를 건너뛰고 결과가 고정된다.
 *
 * ── cid_1688 을 쓰지 않는 이유 (2026-09-22 실측) ──────────────────
 *   OneBound 1688global/item_search 는 cat 파라미터를 응답 call_args 에
 *   echo 하지만 검색 결과에 반영하지 않는다.
 *   q=女士T恤 + cat=1035237(전동공구) 호출이 cat=1031919(티셔츠) 호출과
 *   상위 8건이 순서까지 동일한 여성 티셔츠를 반환했다.
 *   → 컬럼은 남겨두되 검색에는 사용하지 않는다.
 *
 * ── RLS 전제 ──────────────────────────────────────────────────────
 *   categories: categories_read_all(USING true) — 비로그인도 SELECT 가능.
 */
import { supabase } from '@/lib/supabase'

/** 키 정규화: "그룹명|소분류명". 공백 차이로 매칭이 깨지지 않도록 trim만 적용. */
export function subCategoryKey(groupTitle, subName) {
  return `${String(groupTitle || '').trim()}|${String(subName || '').trim()}`
}

// ─── 세션 내 1회 조회 후 캐시 (실패 시 promise를 비워 재시도 허용) ───
let keywordMapCache = null
let keywordMapPromise = null

/**
 * "그룹명|소분류명" → keyword_zh 맵을 반환한다.
 *
 * level 1/2/3 을 한 번에 받아 클라이언트에서 부모를 이어 붙인다.
 * (parent_id 자기참조를 PostgREST embed로 푸는 대신 전체 164행을 받아
 *  로컬에서 조립 — 행 수가 작고 FK 관계 이름에 의존하지 않는다.)
 *
 * @returns {Promise<Map<string, string>>} 조회 실패 시 빈 Map
 */
export async function fetchSubCategoryKeywordMap() {
  if (keywordMapCache) return keywordMapCache
  if (keywordMapPromise) return keywordMapPromise

  keywordMapPromise = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, parent_id, level, name_ko, keyword_zh')
      .eq('is_active', true)

    if (error) {
      keywordMapPromise = null
      // 맵이 비면 호출부가 기존 한글→파파고 경로로 검색한다(검색 자체는 계속 동작).
      console.error('[mallCategories] 소분류 키워드 조회 실패:', error.message)
      return new Map()
    }

    const rows = Array.isArray(data) ? data : []
    const nameById = new Map(rows.map((r) => [r.id, r.name_ko]))

    const map = new Map()
    for (const row of rows) {
      if (row.level !== 3) continue
      const keywordZh = String(row.keyword_zh || '').trim()
      if (!keywordZh) {
        console.warn(`[mallCategories] keyword_zh 없음: ${row.name_ko} — 한글 키워드로 검색됩니다.`)
        continue
      }
      const groupTitle = nameById.get(row.parent_id)
      if (!groupTitle) {
        console.warn(`[mallCategories] 상위 중분류를 찾지 못함: ${row.name_ko}`)
        continue
      }
      map.set(subCategoryKey(groupTitle, row.name_ko), keywordZh)
    }

    keywordMapCache = map
    return map
  })()

  return keywordMapPromise
}
