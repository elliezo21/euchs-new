/**
 * 엑셀 대량발주 — 클라이언트 상품 조회 서비스
 *
 * offerId 목록을 서버 창구(/api/bulk-item-detail)에 나눠 보내고,
 * 받은 payload를 "기존 파서"(api1688.js fetch1688ProductById)에 그대로 통과시켜
 * 화면이 쓰는 상품 객체로 만든다.
 *
 * ★ 파서를 두 벌 만들지 않는다. fetch1688ProductById에 prefetchedRaw 인자를 넘기면
 *   네트워크를 타지 않고 우리가 받은 payload만 파싱한다. 그래서 상세모달·장바구니가
 *   쓰는 것과 완전히 같은 구조의 상품 객체가 나온다(skus/specId/priceTiers/freight 등).
 */

import { supabase } from '@/lib/supabase'
import { fetch1688ProductById } from '@/services/api1688'

// 서버가 한 요청에 받는 최대 개수와 맞춘다 (api/bulk-item-detail.js MAX_IDS_PER_REQUEST)
const CHUNK_SIZE = 8

// 동시에 보낼 요청 수. 서버가 요청당 4개씩 OneBound를 부르므로
// 2를 넘기면 OneBound 쪽에 한 번에 8개 이상이 몰린다.
const REQUEST_CONCURRENCY = 2

const ENDPOINT = '/api/bulk-item-detail'

/** 고객에게 보여줄 문구 — 숫자(호출 수·남은 횟수)는 절대 노출하지 않는다 */
export const BULK_ERROR_MESSAGES = {
  not_logged_in: '로그인 후 이용해 주세요.',
  limit: '오늘 조회 가능한 상품 수를 초과했습니다. 내일 다시 시도하거나 담당 매니저에게 문의해 주세요.',
  error: '상품 정보를 불러오지 못했습니다. 주소를 확인해 주세요.',
  network: '상품 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

/** Supabase 세션 토큰 — 없으면 null */
async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (e) {
    console.error('[bulkFetch] 세션 토큰 조회 실패:', e.message)
    return null
  }
}

/**
 * 파싱된 상품이 화면에 올릴 만한 실체가 있는지 판정.
 * 서버(api/bulk-item-detail.js isRealProduct)와 이중 방어.
 *
 * 제목·가격·옵션이 "전부" 없을 때만 걸러낸다. 셋 중 하나라도 있으면 통과시켜,
 * 일부 필드가 비는 정상 상품을 잘못 막지 않는다.
 */
function isUsableProduct(p) {
  const title = String(p?.titleKo || p?.titleZh || p?.title || '').trim()
  const price = Number(p?.price) || 0
  const skuCount = Array.isArray(p?.skus) ? p.skus.length : 0
  return !(title === '' && price <= 0 && skuCount === 0)
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * offerId 목록을 조회해 파싱된 상품 객체 맵으로 돌려준다.
 *
 * @param {string[]} offerIds
 * @param {object}   [options]
 * @param {Function} [options.onProgress] - (done, total) => void
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: 'not_logged_in'|'network',
 *   products: Record<string, object>,                 // status ok + 파싱 성공
 *   failures: Record<string, {status:string, code?:string}>  // error | limit | parse_failed
 * }>}
 */
export async function fetchProductsForBulk(offerIds, options = {}) {
  const { onProgress } = options
  const ids = [...new Set((offerIds || []).map(v => String(v || '').trim()).filter(Boolean))]

  const products = {}
  const failures = {}

  if (ids.length === 0) return { ok: true, products, failures }

  const token = await getAccessToken()
  if (!token) {
    console.error('[bulkFetch] 로그인 세션이 없어 조회를 중단합니다.')
    return { ok: false, reason: 'not_logged_in', products, failures }
  }

  const batches = chunk(ids, CHUNK_SIZE)
  let done = 0

  // 요청 묶음을 REQUEST_CONCURRENCY개씩 순차 처리
  for (let i = 0; i < batches.length; i += REQUEST_CONCURRENCY) {
    const wave = batches.slice(i, i + REQUEST_CONCURRENCY)

    const waveResults = await Promise.all(wave.map(async (batch) => {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ offerIds: batch }),
        })

        if (res.status === 401) {
          return { fatal: 'not_logged_in', batch }
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error(`[bulkFetch] 서버 오류 HTTP ${res.status}:`, err?.message || '')
          return { fatal: 'network', batch }
        }

        const json = await res.json()
        return { results: json?.results || {}, batch }
      } catch (e) {
        console.error('[bulkFetch] 요청 실패:', e.message)
        return { fatal: 'network', batch }
      }
    }))

    for (const wr of waveResults) {
      if (wr.fatal === 'not_logged_in') {
        return { ok: false, reason: 'not_logged_in', products, failures }
      }
      if (wr.fatal === 'network') {
        // 이 묶음만 실패로 처리하고 나머지는 계속 진행한다
        for (const id of wr.batch) failures[id] = { status: 'error', code: 'network' }
        done += wr.batch.length
        if (onProgress) onProgress(done, ids.length)
        continue
      }

      for (const id of wr.batch) {
        const entry = wr.results[id]
        if (!entry) {
          failures[id] = { status: 'error', code: 'no_result' }
          continue
        }
        if (entry.status === 'limit') {
          failures[id] = { status: 'limit' }
          continue
        }
        if (entry.status !== 'ok' || !entry.payload) {
          failures[id] = { status: 'error', code: entry.error_code || 'unknown' }
          continue
        }

        // ── 기존 파서에 그대로 통과 (네트워크 호출 없음) ──
        try {
          const parsed = await fetch1688ProductById(id, entry.payload)
          if (!parsed) {
            console.error(`[bulkFetch] ${id}: 파싱 결과가 비어 있습니다.`)
            failures[id] = { status: 'error', code: 'parse_failed' }
          } else if (!isUsableProduct(parsed)) {
            // 서버 판정(isRealProduct)과 이중 방어 — 옛 캐시나 판정 누락으로
            // 빈 상품이 넘어와도 "제목 없음·가격 0·옵션 0"이면 화면에 올리지 않는다.
            console.error(`[bulkFetch] ${id}: 제목·가격·옵션이 모두 없어 not_found로 처리합니다.`, parsed)
            failures[id] = { status: 'error', code: 'not_found' }
          } else {
            products[id] = parsed
          }
        } catch (e) {
          console.error(`[bulkFetch] ${id} 파싱 실패:`, e.message)
          failures[id] = { status: 'error', code: 'parse_failed' }
        }
      }

      done += wr.batch.length
      if (onProgress) onProgress(done, ids.length)
    }
  }

  return { ok: true, products, failures }
}
