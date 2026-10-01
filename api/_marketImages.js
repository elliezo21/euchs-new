/**
 * 판매용 이미지 공개 창고 (2026-10-01) — 판매처 상세 HTML에 넣을 "영구 주소"
 *
 * 왜: 11번가는 대표 이미지만 자기 서버로 복사하고, 상세 HTML(htmlDetail) 안 이미지는 우리가 준 주소를 그대로 불러 쓴다.
 *     우리 이미지 주소(GET /api/marketplace?t= — 30분 토큰)는 만료되면 상세페이지 이미지가 전부 깨진다.
 * 어떻게: 비공개 studio 버킷의 내 상품 파일을 공개 버킷 market-images로 복사하고 공개 주소를 돌려준다.
 *   - market-images = public, 10MB, image/jpeg·png·webp만 (Supabase에서 만들어 둠). storage.objects 정책 0개
 *     → 클라이언트(anon·authenticated)는 올리기·목록 불가, 서버 service_role만 쓴다. 정책을 추가하지 않는다
 *   - 경로 = {무작위 32자}/{key}.{원본 확장자} — 보내기 1회당 폴더 1개. 회원·작업·상품명 등 추측 가능한 값은 경로에 넣지 않는다
 *   - 복사 = storage-js copy(from, to, { destinationBucket }) (설치된 @supabase/storage-js 2.112.3 dist가 POST /object/copy 본문에
 *     destinationBucket을 넣는다 — 내려받지 않고 Storage 안에서 복사). contentType·cacheControl은 원본 그대로 따라간다
 *   - 공개 주소 = storage-js getPublicUrl (SUPABASE_URL 환경변수 — 주소를 코드에 적지 않는다)
 *   - 하나라도 실패하면 이번에 복사한 것을 지우고 MarketImagesError (임시 주소로 바꿔 넣지 않는다)
 * 저장소를 바꿀 때(예: Cloudflare R2)는 이 파일만 고친다. 판매처 코드는 publishMarketImages만 부른다.
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const MARKET_IMAGES_BUCKET = 'market-images'
const COPY_CONCURRENCY = 4
const KEY_RE = /^[0-9a-z]{1,16}$/
const EXT_RE = /\.(jpe?g|png|webp)$/i

export class MarketImagesError extends Error {
  /** @param {string} message 화면에도 보여 줄 원인 (몇 번 이미지·무슨 오류) @param {{ key?:string, leftover?:string[], cause?:unknown }} o */
  constructor(message, { key = null, leftover = [], cause } = {}) {
    super(message)
    this.key = key
    this.leftover = leftover // 지우지 못하고 남은 공개 경로 (정리용)
    this.cause = cause
  }
}

function storageOf(cfg) {
  if (!cfg?.supabaseUrl || !cfg?.serviceRoleKey) throw new MarketImagesError('저장소 설정(SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY)이 없습니다.')
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).storage
}

/**
 * 판매용 이미지 올리기 + 공개 주소
 * @param {{ supabaseUrl:string, serviceRoleKey:string }} cfg
 * @param {{ sourceBucket:string, files:{ key:string, path:string }[] }} p  files = 내 상품 파일(studio_exports.files) — key 순서 그대로
 * @returns {Promise<{ bucket:string, folder:string, paths:string[], urls:Record<string,string> }>} urls = { key: 공개 주소 }
 * @throws {MarketImagesError}
 */
export async function publishMarketImages(cfg, { sourceBucket, files }) {
  if (!Array.isArray(files) || !files.length) throw new MarketImagesError('올릴 상세 이미지가 없습니다.')
  const seen = new Set()
  for (const f of files) {
    if (!f || !KEY_RE.test(String(f.key)) || seen.has(f.key)) throw new MarketImagesError(`상세 이미지 번호가 올바르지 않습니다: ${String(f?.key).slice(0, 20)}`)
    if (typeof f.path !== 'string' || !EXT_RE.test(f.path)) throw new MarketImagesError(`${f.key}번 이미지 형식이 jpg·png·webp가 아닙니다.`, { key: f.key })
    seen.add(f.key)
  }
  const storage = storageOf(cfg)
  const folder = randomBytes(16).toString('hex')
  const items = files.map(f => ({ key: f.key, from: f.path, to: `${folder}/${f.key}.${EXT_RE.exec(f.path)[1].toLowerCase()}` }))

  const copied = []
  let failure = null
  let next = 0
  const worker = async () => {
    while (!failure && next < items.length) {
      const it = items[next++]
      let error
      try { ({ error } = await storage.from(sourceBucket).copy(it.from, it.to, { destinationBucket: MARKET_IMAGES_BUCKET })) } catch (e) { error = e }
      if (error) { failure ??= { it, error }; return }
      copied.push(it.to)
    }
  }
  await Promise.all(Array.from({ length: Math.min(COPY_CONCURRENCY, items.length) }, worker))

  if (failure) {
    let leftover = []
    if (copied.length) {
      let rmError
      try { ({ error: rmError } = await storage.from(MARKET_IMAGES_BUCKET).remove(copied)) } catch (e) { rmError = e }
      if (rmError) {
        leftover = copied.slice()
        console.error(`[marketImages] 실패 뒤 정리도 못 함 — ${MARKET_IMAGES_BUCKET}에 남은 경로:`, leftover, rmError?.message ?? rmError)
      }
    }
    const why = String(failure.error?.message ?? failure.error).slice(0, 200)
    throw new MarketImagesError(`${failure.it.key}번 이미지 복사 실패: ${why}`, { key: failure.it.key, leftover, cause: failure.error })
  }
  return {
    bucket: MARKET_IMAGES_BUCKET,
    folder,
    paths: items.map(it => it.to),
    urls: Object.fromEntries(items.map(it => [it.key, storage.from(MARKET_IMAGES_BUCKET).getPublicUrl(it.to).data.publicUrl])),
  }
}
