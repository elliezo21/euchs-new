/**
 * Vercel Serverless Function: POST /api/studio-product
 * 1688 주소(또는 offerId) → 상품 조회 → 스튜디오 프로젝트 1행 + 이미지 N행 생성
 *
 * 입력: { url: "https://detail.1688.com/offer/923697381015.html", forceRefresh?: boolean }
 *   또는 { offerId: "923697381015" }
 * 출력: { projectId, offerId, titleZh, descSource, images:[{id,sortOrder,sourceUrl}], gallery:[...], cached }
 * 에러: { code, message } — invalid_url 400 / not_found 404 / onebound_error 502 /
 *       daily_limit·global_limit 429 / no_entitlement 403 / internal 500
 *
 * 처리 순서:
 *   ① studio_product_snapshots 캐시 (유효 + forceRefresh 아님 → OneBound 호출·한도 차감 없음)
 *   ② studio_try_reserve_onebound() 한도 예약 — 캐시 미스일 때만. 건너뛰면 본 사이트 조회가 멈춘다
 *   ③ OneBound 1688global/item_get 직접 1회 호출
 *      ★ callItemDetail()을 쓰지 않는다: CROSSBORDER_KO_ENABLED가 켜져 있으면 1회 조회당
 *        OneBound를 최대 3회 더 부른다(실측). 스튜디오는 한국어 번역 데이터가 필요 없다.
 *      예약 행은 finally에서 반드시 ok/failed로 확정한다 — reserved로 남는 경로가 없어야 한다.
 *   ④ 상세 이미지: desc_img(정본) → 비었을 때만 desc HTML <img>(display:none 제외)
 *      alicdn.com만 통과, 쿼리스트링 뗀 URL이 source_key(중복 판정). 갤러리로 몰래 대체하지 않는다.
 *   ⑤ 스냅샷에는 OneBound 원본 응답만 저장. 정상 24시간 / 오류 30분 / 타임아웃·네트워크 오류는 저장 안 함
 */

import { studioGuard, sendError, sb } from './_studio.js'
import { isRealProduct } from './bulk-item-detail.js'

// api/1688-item-detail.js fetchDetail()과 같은 게이트웨이·파라미터·헤더·타임아웃
const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
const ONEBOUND_TIMEOUT_MS = 7000
const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache'
}

const OK_TTL_MS = 24 * 60 * 60 * 1000   // 24시간
const ERROR_TTL_MS = 30 * 60 * 1000     // 30분

const OFFER_ID_RE = /^\d{9,16}$/
// 앞뒤가 숫자가 아닌 9~16자리 — 17자리 이상 숫자열의 앞부분을 잘라 엉뚱한 ID로 조회하지 않게 한다
const OFFER_ID_IN_URL_RE = /(?<!\d)(\d{9,16})(?!\d)/

// ── 입력 ────────────────────────────────────────────────────────────────────
function parseOfferId(body) {
  if (body.offerId !== undefined && body.offerId !== null && body.offerId !== '') {
    const s = String(body.offerId).trim()
    return OFFER_ID_RE.test(s) ? s : null
  }
  if (typeof body.url === 'string') {
    const m = body.url.match(OFFER_ID_IN_URL_RE)
    return m && OFFER_ID_RE.test(m[1]) ? m[1] : null
  }
  return null
}

// ── 이미지 추출 ─────────────────────────────────────────────────────────────
/** alicdn.com 이미지만 통과. { url: 원본(쿼리 포함), key: 쿼리·해시 뗀 https URL } 또는 null */
function normalizeAlicdn(u) {
  if (typeof u !== 'string') return null
  let s = u.trim().replace(/&amp;/g, '&')
  if (!s) return null
  if (s.startsWith('//')) s = 'https:' + s
  let parsed
  try {
    parsed = new URL(s)
  } catch {
    return null // URL 형식이 아님 — 호출부가 버린 개수를 로그로 남긴다
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  if (host !== 'alicdn.com' && !host.endsWith('.alicdn.com')) return null
  return { url: s, key: `https://${host}${parsed.pathname}` }
}

/** 필터 + source_key 기준 중복 제거 (순서 유지). seen에 이미 있는 key는 건너뛴다 */
function filterUrls(candidates, seen, label, offerId) {
  const out = []
  let dropped = 0
  for (const c of candidates) {
    const n = normalizeAlicdn(c)
    if (!n) { dropped++; continue }
    if (seen.has(n.key)) continue
    seen.add(n.key)
    out.push(n.url)
  }
  if (dropped > 0) console.log(`[studio-product] ${offerId} ${label}: alicdn 외/형식 오류 ${dropped}건 제외`)
  return out
}

/** desc HTML의 <img src> — style에 display:none이 있는 태그는 제외 */
function parseDescHtml(html) {
  if (typeof html !== 'string' || !html) return []
  const out = []
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const style = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag)
    if (style && /display\s*:\s*none/i.test(style[1] ?? style[2] ?? '')) continue
    const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
    if (src) out.push(src[1] ?? src[2] ?? src[3])
  }
  return out
}

/**
 * @returns {{ descSource: 'desc_img'|'desc_html'|'none', descUrls: string[], galleryUrls: string[] }}
 */
function extractImages(item, offerId) {
  const seen = new Set()
  const descImg = Array.isArray(item.desc_img) ? item.desc_img : []
  let descSource
  let descUrls
  if (descImg.length > 0) {
    descSource = 'desc_img'
    descUrls = filterUrls(descImg, seen, 'desc_img', offerId)
  } else {
    descSource = 'desc_html'
    descUrls = filterUrls(parseDescHtml(item.desc), seen, 'desc_html', offerId)
  }
  if (descUrls.length === 0) descSource = 'none'

  // 갤러리(item_imgs: [{ url }]) — 상세와 source_key가 같은 것은 빼고 따로 저장
  // (studio_images는 (project_id, source_key) unique라 종류가 달라도 같은 key는 한 번만 들어간다)
  const itemImgs = Array.isArray(item.item_imgs) ? item.item_imgs : []
  const galleryUrls = filterUrls(itemImgs.map(x => x?.url), seen, 'item_imgs', offerId)

  return { descSource, descUrls, galleryUrls }
}

function sourceKeyOf(url) {
  return normalizeAlicdn(url).key
}

// ── OneBound ────────────────────────────────────────────────────────────────
/**
 * 1688global/item_get 1회 호출.
 * @returns {Promise<{ kind:'ok'|'not_found'|'error'|'transient', raw?:object, errorCode:string|null }>}
 *   transient = 타임아웃·네트워크·JSON 아님 → 스냅샷 저장 안 함
 */
async function fetchItemGet(cfg, offerId) {
  // 공식 문서: 필수 파라미터 key·secret·num_iid (api/1688-item-detail.js와 동일, result_type=json 포함)
  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/item_get/?key=${cfg.oneboundKey}&secret=${cfg.oneboundSecret}&num_iid=${offerId}&result_type=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ONEBOUND_TIMEOUT_MS)
  let r
  try {
    r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
  } catch (e) {
    clearTimeout(timer)
    const code = e.name === 'AbortError' ? 'timeout' : 'network'
    console.warn(`[studio-product] ${offerId} OneBound ${code}:`, e.message)
    return { kind: 'transient', errorCode: code }
  }
  let raw
  try {
    raw = await r.json()
  } catch (e) {
    clearTimeout(timer)
    const code = e.name === 'AbortError' ? 'timeout' : 'bad_json'
    console.warn(`[studio-product] ${offerId} OneBound 응답 본문 ${code} (HTTP ${r.status}):`, e.message)
    return { kind: 'transient', errorCode: code }
  }
  clearTimeout(timer)

  const obCode = String(raw?.error_code ?? '').trim()
  const obError = String(raw?.error ?? '').trim()
  console.log(`[studio-product] ${offerId} OneBound error_code=${obCode} error=${obError} hasItem=${!!raw?.item}`)

  const item = raw?.item
  if (item && typeof item === 'object' && isRealProduct(item, offerId)) {
    return { kind: 'ok', raw, errorCode: null }
  }
  // 없는 상품은 error="item-not-found"와 함께 {_ddf, format_check} 스텁 item이 온다 (2026-09-22 실측)
  const okCode = obCode === '' || obCode === '0' || obCode === '0000'
  if (obError.toLowerCase().includes('item-not-found') || (item && okCode)) {
    return { kind: 'not_found', raw, errorCode: 'not_found' }
  }
  return { kind: 'error', raw, errorCode: `onebound:${obCode || obError || 'unknown'}` }
}

// ── DB ──────────────────────────────────────────────────────────────────────
async function readSnapshot(cfg, offerId) {
  const now = encodeURIComponent(new Date().toISOString())
  const rows = await sb(cfg,
    `studio_product_snapshots?select=status,desc_source,desc_urls,gallery_urls,error_code,title_zh:raw->item->>title` +
    `&offer_id=eq.${offerId}&expires_at=gt.${now}&limit=1`)
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function writeSnapshot(cfg, row) {
  try {
    await sb(cfg, 'studio_product_snapshots?on_conflict=offer_id', {
      method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal',
    })
  } catch (e) {
    // 스냅샷 저장 실패는 결과 반환을 막지 않는다 (다음 요청이 캐시 미스로 다시 조회할 뿐)
    console.error(`[studio-product] ${row.offer_id} 스냅샷 저장 실패:`, e.message)
  }
}

async function finalizeUsage(cfg, reservationId, usage, offerId) {
  try {
    await sb(cfg, `studio_usage?id=eq.${reservationId}&status=eq.reserved`, {
      method: 'PATCH',
      body: {
        status: usage.status,
        error_code: usage.error_code,
        project_id: usage.project_id,
        meta: { offer_id: offerId, force_refresh: usage.force_refresh },
      },
      prefer: 'return=minimal',
    })
  } catch (e) {
    // 확정 실패해도 한도 계산(studio_try_reserve_onebound)은 status와 무관하게 행 수를 세므로 한도는 새지 않는다
    console.error(`[studio-product] 사용량 확정 실패 id=${reservationId} (reserved로 남음):`, e.message)
  }
}

/**
 * 프로젝트 1행 + 이미지 N행. 이미지 insert가 실패하면 프로젝트를 지우고 throw.
 * 상세 0장이면 status='awaiting_choice' (화면이 "상세 이미지 없음"을 보여주고 셀러가 고른다)
 */
async function createProject(ctx, { offerId, titleZh, descSource, descUrls, galleryUrls }) {
  const { cfg } = ctx
  const created = await sb(cfg, 'studio_projects?select=id', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: ctx.userId,
      offer_id: offerId,
      source_url: `https://detail.1688.com/offer/${offerId}.html`,
      title_zh: titleZh || null,
      desc_source: descSource,
      status: descSource === 'none' ? 'awaiting_choice' : 'ingesting',
    },
  })
  const projectId = created?.[0]?.id
  if (!projectId) throw new Error('studio_projects insert 결과에 id 없음')

  const rows = [
    ...descUrls.map((u, i) => ({ kind: 'desc', sort_order: i, source_url: u })),
    ...galleryUrls.map((u, i) => ({ kind: 'gallery', sort_order: i, source_url: u })),
  ].map(r => ({
    ...r, project_id: projectId, user_id: ctx.userId, source_key: sourceKeyOf(r.source_url), ingest_status: 'pending',
  }))

  let inserted = []
  if (rows.length > 0) {
    try {
      inserted = await sb(cfg, 'studio_images?select=id,kind,sort_order,source_url', {
        method: 'POST', body: rows, prefer: 'return=representation',
      })
    } catch (e) {
      console.error(`[studio-product] 이미지 저장 실패 — 프로젝트 ${projectId}를 되돌립니다:`, e.message)
      try {
        await sb(cfg, `studio_projects?id=eq.${projectId}`, { method: 'DELETE', prefer: 'return=minimal' })
      } catch (de) {
        console.error(`[studio-product] 프로젝트 되돌리기 실패 ${projectId}:`, de.message)
      }
      throw e
    }
  }

  const shape = r => ({ id: r.id, sortOrder: r.sort_order, sourceUrl: r.source_url })
  const byOrder = (a, b) => a.sort_order - b.sort_order
  return {
    projectId,
    images: inserted.filter(r => r.kind === 'desc').sort(byOrder).map(shape),
    gallery: inserted.filter(r => r.kind === 'gallery').sort(byOrder).map(shape),
  }
}

function fetchErrorReply(errorCode, cached) {
  if (errorCode === 'not_found') {
    return { status: 404, body: { code: 'not_found', message: '1688에서 상품을 찾을 수 없습니다.', cached } }
  }
  return { status: 502, body: { code: 'onebound_error', message: '상품 조회 서버 오류입니다. 잠시 후 다시 시도해 주세요.', cached } }
}

// ── handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ctx = await studioGuard(req, res)
  if (!ctx) return
  const { cfg } = ctx

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const offerId = parseOfferId(body)
  if (!offerId) return sendError(res, 400, 'invalid_url', '1688 상품 주소 또는 상품번호를 확인해 주세요.')
  const forceRefresh = body.forceRefresh === true

  // ① 스냅샷 캐시
  if (!forceRefresh) {
    let snap = null
    try {
      snap = await readSnapshot(cfg, offerId)
    } catch (e) {
      console.error(`[studio-product] ${offerId} 스냅샷 조회 실패:`, e.message)
      return sendError(res, 500, 'internal', '캐시 조회 중 오류가 발생했습니다.')
    }
    if (snap) {
      if (snap.status !== 'ok') {
        const reply = fetchErrorReply(snap.error_code, true)
        return res.status(reply.status).json(reply.body)
      }
      try {
        const p = await createProject(ctx, {
          offerId, titleZh: snap.title_zh, descSource: snap.desc_source,
          descUrls: snap.desc_urls || [], galleryUrls: snap.gallery_urls || [],
        })
        return res.status(200).json({
          projectId: p.projectId, offerId, titleZh: snap.title_zh || null, descSource: snap.desc_source,
          images: p.images, gallery: p.gallery, cached: true,
        })
      } catch (e) {
        console.error(`[studio-product] ${offerId} 프로젝트 생성 실패(캐시):`, e.message)
        return sendError(res, 500, 'internal', '프로젝트 생성 중 오류가 발생했습니다.')
      }
    }
  }

  if (!cfg.oneboundKey || !cfg.oneboundSecret) {
    console.error('[studio-product] ONEBOUND_KEY / ONEBOUND_SECRET 환경변수 누락')
    return sendError(res, 500, 'server_misconfigured', '서버 설정 오류')
  }

  // ② 한도 예약 (캐시 미스일 때만)
  let reservation
  try {
    const rows = await sb(cfg, 'rpc/studio_try_reserve_onebound', {
      method: 'POST',
      body: { p_user: ctx.userId, p_global_cap: cfg.oneboundDailyCap, p_skip_user_cap: ctx.skipUserCap },
    })
    reservation = Array.isArray(rows) ? rows[0] : null
  } catch (e) {
    console.error(`[studio-product] ${offerId} 한도 예약 실패:`, e.message)
    return sendError(res, 500, 'internal', '사용량 확인 중 오류가 발생했습니다.')
  }
  if (!reservation || reservation.reason !== 'ok' || !reservation.reservation_id) {
    const reason = reservation?.reason
    if (reason === 'global_limit') return sendError(res, 429, 'global_limit', '오늘 스튜디오 상품 조회 한도가 모두 찼습니다.')
    if (reason === 'daily_limit') return sendError(res, 429, 'daily_limit', '오늘 상품 조회 한도를 모두 사용했습니다.')
    if (reason === 'no_entitlement') return sendError(res, 403, 'no_entitlement', '스튜디오 이용 권한이 없습니다.')
    console.error(`[studio-product] ${offerId} 예약 결과를 해석할 수 없음:`, JSON.stringify(reservation))
    return sendError(res, 500, 'internal', '사용량 확인 중 오류가 발생했습니다.')
  }

  // ③~⑤ — 예약 행은 finally에서 반드시 확정. 응답은 확정이 끝난 뒤에 보낸다
  //   (Vercel은 응답을 보낸 뒤 실행을 멈출 수 있어, 응답 후 확정하면 reserved로 남을 수 있다)
  const usage = { status: 'failed', error_code: 'internal', project_id: null, force_refresh: forceRefresh }
  let reply
  try {
    const result = await fetchItemGet(cfg, offerId)
    const now = Date.now()

    if (result.kind === 'transient') {
      usage.error_code = result.errorCode
      reply = fetchErrorReply('onebound_error', false)
    } else if (result.kind !== 'ok') {
      usage.error_code = result.errorCode
      await writeSnapshot(cfg, {
        offer_id: offerId, status: 'error', raw: result.raw, desc_source: null,
        desc_urls: [], gallery_urls: [], error_code: result.errorCode,
        fetched_at: new Date(now).toISOString(), expires_at: new Date(now + ERROR_TTL_MS).toISOString(),
      })
      reply = fetchErrorReply(result.errorCode, false)
    } else {
      // OneBound 호출은 성공 — 이후 프로젝트 생성이 실패해도 호출 기록은 ok (스냅샷이 남아 재시도는 캐시 적중)
      usage.status = 'ok'
      usage.error_code = null
      const item = result.raw.item
      const { descSource, descUrls, galleryUrls } = extractImages(item, offerId)
      const titleZh = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : null
      await writeSnapshot(cfg, {
        offer_id: offerId, status: 'ok', raw: result.raw, desc_source: descSource,
        desc_urls: descUrls, gallery_urls: galleryUrls, error_code: null,
        fetched_at: new Date(now).toISOString(), expires_at: new Date(now + OK_TTL_MS).toISOString(),
      })
      const p = await createProject(ctx, { offerId, titleZh, descSource, descUrls, galleryUrls })
      usage.project_id = p.projectId
      console.log(`[studio-product] ${offerId} 완료 project=${p.projectId} desc=${descSource}:${p.images.length} gallery=${p.gallery.length}`)
      reply = {
        status: 200,
        body: {
          projectId: p.projectId, offerId, titleZh, descSource,
          images: p.images, gallery: p.gallery, cached: false,
        },
      }
    }
  } catch (e) {
    console.error(`[studio-product] ${offerId} 처리 실패:`, e.message)
    if (usage.status !== 'ok') usage.error_code = 'internal'
    reply = { status: 500, body: { code: 'internal', message: '상품 처리 중 오류가 발생했습니다.' } }
  } finally {
    await finalizeUsage(cfg, reservation.reservation_id, usage, offerId)
  }

  return res.status(reply.status).json(reply.body)
}
