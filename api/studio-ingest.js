/**
 * Vercel Serverless Function: POST /api/studio-ingest
 * 1688(alicdn) 이미지를 받아 Supabase Storage(studio 버킷)로 "받은 바이트 그대로" 복사한다.
 *
 * 왜 옮기나: alicdn은 브라우저 직접 로드가 403(Referer 검사)이라 편집기 캔버스에서 못 쓴다.
 *   우리 Storage에 있어야 crossOrigin='anonymous' + toDataURL()이 된다. 원본 URL은 언제 사라질지 모른다.
 *
 * 입력: { projectId: uuid, imageIds: uuid[] }  ← 한 요청 최대 6개 (클라이언트가 6장씩 순차 호출)
 * 출력: { results: { [imageId]: { status:'done', width, height } | { status:'failed', error } } }
 * 에러: { code, message } — too_many 400 / too_many_images 400 / invalid_input 400 / not_found 404
 *
 * ★ 바이트 변환 금지: 리사이즈·재인코딩·압축 없음. 가로·세로는 파일 헤더에서만 읽는다(디코딩 안 함).
 * ★ 멱등: ingest_status='done' + original_path가 있으면 다시 받지 않는다.
 * ★ 한 장이 실패해도 나머지는 계속한다. 실패는 ingest_status='failed' + ingest_error.
 * ★ 사용량: studio_usage kind='ingest_image' — 성공한 장만 status='ok'. 한도 예약(RPC)은 하지 않는다(외부 과금 없음).
 */

import crypto from 'crypto'
import { studioGuard, sendError, sb, loadOwnedRow, studioMaxImages } from './_studio.js'

const MAX_IDS_PER_REQUEST = 6
const CONCURRENCY = 3
const DOWNLOAD_TIMEOUT_MS = 8000
const RETRY_DELAY_MS = 500
const MAX_BYTES = 20 * 1024 * 1024   // studio 버킷 file_size_limit(20971520)과 같음

const BUCKET = 'studio'
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const DOWNLOAD_HEADERS = {
  'Referer': 'https://detail.1688.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── 다운로드 ────────────────────────────────────────────────────────────────
/**
 * 1회 시도. 본문은 20MB를 넘는 순간 끊는다.
 * @returns {Promise<{ ok:true, buf:Buffer, mime:string } | { ok:false, error:string, retryable:boolean }>}
 */
async function downloadOnce(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
  try {
    const r = await fetch(url, { headers: DOWNLOAD_HEADERS, signal: controller.signal, redirect: 'follow' })
    if (!r.ok) {
      // 5xx만 재시도. 403·404 등 4xx는 다시 해도 같다
      return { ok: false, error: `http_${r.status}`, retryable: r.status >= 500 }
    }
    const mime = String(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!EXT_BY_MIME[mime]) {
      controller.abort()
      return { ok: false, error: `bad_content_type:${mime || 'none'}`, retryable: false }
    }
    const declared = Number(r.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      controller.abort()
      return { ok: false, error: 'too_large', retryable: false }
    }
    const chunks = []
    let total = 0
    for await (const chunk of r.body) {
      total += chunk.length
      if (total > MAX_BYTES) {
        controller.abort()
        return { ok: false, error: 'too_large', retryable: false }
      }
      chunks.push(chunk)
    }
    if (total === 0) return { ok: false, error: 'empty', retryable: false }
    return { ok: true, buf: Buffer.concat(chunks.map(c => Buffer.from(c)), total), mime }
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, error: 'timeout', retryable: true }
    return { ok: false, error: 'network', retryable: true, detail: e.message }
  } finally {
    clearTimeout(timer)
  }
}

/** 5xx·타임아웃·네트워크 오류만 0.5초 뒤 1회 재시도 */
async function download(url) {
  const first = await downloadOnce(url)
  if (first.ok || !first.retryable) return first
  console.warn(`[studio-ingest] 다운로드 ${first.error} — ${RETRY_DELAY_MS}ms 뒤 1회 재시도: ${url}`, first.detail || '')
  await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
  return downloadOnce(url)
}

// ── 가로·세로 (헤더만 읽는다, 디코딩 없음) ──────────────────────────────────
// JPEG SOF 마커: C0~CF 중 DHT(C4)·JPG(C8)·DAC(CC) 제외
const JPEG_SOF = new Set([0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF])

function jpegSize(b) {
  if (b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) return null
  let i = 2
  while (i < b.length) {
    if (b[i] !== 0xFF) return null
    while (i < b.length && b[i] === 0xFF) i++          // 채움 바이트
    if (i >= b.length) return null
    const marker = b[i]
    i++
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) continue // 길이 없는 마커
    if (marker === 0xD9 || marker === 0xDA) return null  // EOI / SOS 전에 SOF가 없었다
    if (i + 1 >= b.length) return null
    const len = b.readUInt16BE(i)
    if (JPEG_SOF.has(marker)) {
      if (i + 6 >= b.length) return null
      return { height: b.readUInt16BE(i + 3), width: b.readUInt16BE(i + 5) }
    }
    i += len
  }
  return null
}

function pngSize(b) {
  // 시그니처 8바이트 + IHDR 길이(4) + 'IHDR'(4) + width(4) + height(4)
  if (b.length < 24) return null
  if (b.readUInt32BE(0) !== 0x89504E47 || b.readUInt32BE(4) !== 0x0D0A1A0A) return null
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
}

function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') {
    // 프레임 헤더 3바이트 뒤 시작 코드 9D 01 2A, 이어서 14비트 가로·세로 (LE)
    if (b[23] !== 0x9D || b[24] !== 0x01 || b[25] !== 0x2A) return null
    return { width: b.readUInt16LE(26) & 0x3FFF, height: b.readUInt16LE(28) & 0x3FFF }
  }
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2F) return null
    const b1 = b[21], b2 = b[22], b3 = b[23], b4 = b[24]
    return {
      width: 1 + (((b2 & 0x3F) << 8) | b1),
      height: 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6)),
    }
  }
  if (chunk === 'VP8X') {
    // 캔버스 가로·세로: 24비트 LE, 1을 뺀 값으로 저장됨
    return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) }
  }
  return null
}

/**
 * content-type으로 형식을 정해 헤더만 읽는다. 못 읽으면 null (실패 처리하지 않는다)
 * ※ export: api/studio-upload.js의 셀러 사진 확인이 같은 판독을 쓴다.
 */
export function readDimensions(buf, mime) {
  try {
    if (mime === 'image/jpeg') return jpegSize(buf)
    if (mime === 'image/png') return pngSize(buf)
    if (mime === 'image/webp') return webpSize(buf)
  } catch (e) {
    console.warn('[studio-ingest] 가로·세로 헤더 해석 실패:', e.message)
  }
  return null
}

// ── Storage / DB ────────────────────────────────────────────────────────────
/** service_role로 업로드. x-upsert: 업로드는 됐는데 DB 갱신이 실패한 행을 다시 받을 때 덮어쓴다 */
async function uploadToStorage(cfg, path, buf, mime) {
  const r = await fetch(`${cfg.supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      'apikey': cfg.serviceRoleKey,
      'Authorization': `Bearer ${cfg.serviceRoleKey}`,
      'Content-Type': mime,
      'x-upsert': 'true',
    },
    body: buf,
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`storage ${r.status}: ${text.slice(0, 200)}`)
  }
}

async function markFailed(cfg, imageId, error) {
  try {
    await sb(cfg, `studio_images?id=eq.${imageId}`, {
      method: 'PATCH', body: { ingest_status: 'failed', ingest_error: error }, prefer: 'return=minimal',
    })
  } catch (e) {
    console.error(`[studio-ingest] ${imageId} 실패 기록마저 실패 (${error}):`, e.message)
  }
}

/** 이미지 1장: 받기 → 검증 → 가로·세로 → sha256 → 업로드 → 행 갱신 */
async function ingestOne(ctx, projectId, img) {
  const { cfg } = ctx
  const dl = await download(img.source_url)
  if (!dl.ok) {
    console.warn(`[studio-ingest] ${img.id} 다운로드 실패 ${dl.error}: ${img.source_url}`)
    await markFailed(cfg, img.id, dl.error)
    return { status: 'failed', error: dl.error }
  }

  const { buf, mime } = dl
  const dims = readDimensions(buf, mime)
  if (!dims) console.warn(`[studio-ingest] ${img.id} 가로·세로를 헤더에서 못 읽음 (${mime}) — null로 진행`)
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  const path = `${ctx.userId}/${projectId}/orig/${img.id}.${EXT_BY_MIME[mime]}`

  try {
    await uploadToStorage(cfg, path, buf, mime)
  } catch (e) {
    console.error(`[studio-ingest] ${img.id} 업로드 실패:`, e.message)
    await markFailed(cfg, img.id, 'upload_failed')
    return { status: 'failed', error: 'upload_failed' }
  }

  try {
    await sb(cfg, `studio_images?id=eq.${img.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        original_path: path, sha256, bytes: buf.length, mime,
        width: dims?.width ?? null, height: dims?.height ?? null,
        ingest_status: 'done', ingest_error: null,
      },
    })
  } catch (e) {
    console.error(`[studio-ingest] ${img.id} 행 갱신 실패:`, e.message)
    await markFailed(cfg, img.id, 'db_update_failed')
    return { status: 'failed', error: 'db_update_failed' }
  }

  return { status: 'done', width: dims?.width ?? null, height: dims?.height ?? null, bytes: buf.length }
}

/** 동시 n건 풀 — 끝나는 대로 다음 것을 잡는다 */
async function runPool(items, n, worker) {
  const out = new Array(items.length)
  let next = 0
  const lanes = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++
      out[idx] = await worker(items[idx])
    }
  })
  await Promise.all(lanes)
  return out
}

// ── handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ctx = await studioGuard(req, res)
  if (!ctx) return
  const { cfg } = ctx
  const t0 = Date.now()

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const { projectId } = body
  if (!Array.isArray(body.imageIds) || body.imageIds.length === 0) {
    return sendError(res, 400, 'invalid_input', 'imageIds 배열이 필요합니다.')
  }
  const imageIds = [...new Set(body.imageIds.map(v => String(v || '').trim().toLowerCase()))]
  if (imageIds.length > MAX_IDS_PER_REQUEST) {
    return sendError(res, 400, 'too_many', `한 번에 최대 ${MAX_IDS_PER_REQUEST}장까지 처리할 수 있습니다.`)
  }
  if (!imageIds.every(id => UUID_RE.test(id))) {
    return sendError(res, 400, 'invalid_input', 'imageIds 형식이 올바르지 않습니다.')
  }

  // 소유권: 프로젝트(남의 것이면 404) + 이미지 전부 그 프로젝트 소속(하나라도 아니면 404)
  let project
  let images
  let doneInProject
  try {
    project = await loadOwnedRow(ctx, 'studio_projects', projectId, 'id')
    if (!project) return sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.')
    ;[images, doneInProject] = await Promise.all([
      sb(cfg, `studio_images?select=id,kind,source_url,ingest_status,original_path,width,height` +
        `&id=in.(${imageIds.join(',')})&project_id=eq.${project.id}&user_id=eq.${ctx.userId}`),
      sb(cfg, `studio_images?select=id&project_id=eq.${project.id}&ingest_status=eq.done&original_path=not.is.null`),
    ])
  } catch (e) {
    console.error('[studio-ingest] 프로젝트·이미지 조회 실패:', e.message)
    return sendError(res, 500, 'internal', '이미지 조회 중 오류가 발생했습니다.')
  }
  if (!Array.isArray(images) || images.length !== imageIds.length) {
    return sendError(res, 404, 'not_found', '이미지를 찾을 수 없습니다.')
  }
  // 셀러 업로드 행(source_url 없음)은 alicdn에서 받지 않는다 — /api/studio-upload confirm이 처리한다
  if (images.some(img => img.kind === 'upload')) {
    return sendError(res, 400, 'upload_kind', '직접 올린 사진은 이 경로로 처리하지 않습니다.')
  }

  const results = {}
  const toFetch = []
  for (const img of images) {
    // 멱등 — 이미 받은 이미지는 다시 받지 않는다
    if (img.ingest_status === 'done' && img.original_path) {
      results[img.id] = { status: 'done', width: img.width, height: img.height }
    } else {
      toFetch.push(img)
    }
  }

  // 프로젝트 누적 상한(studioMaxImages) = 이미 받은 장수 + 이번에 새로 받을 장수
  const maxImages = studioMaxImages()
  const doneCount = Array.isArray(doneInProject) ? doneInProject.length : 0
  if (doneCount + toFetch.length > maxImages) {
    return sendError(res, 400, 'too_many_images',
      `프로젝트당 최대 ${maxImages}장까지 가져올 수 있습니다. (이미 ${doneCount}장)`)
  }

  const fetched = await runPool(toFetch, CONCURRENCY, img => ingestOne(ctx, project.id, img))
  const usageRows = []
  toFetch.forEach((img, i) => {
    const r = fetched[i]
    results[img.id] = r.status === 'done'
      ? { status: 'done', width: r.width, height: r.height }
      : { status: 'failed', error: r.error }
    if (r.status === 'done') {
      usageRows.push({
        user_id: ctx.userId, kind: 'ingest_image', status: 'ok', qty: 1,
        project_id: project.id, image_id: img.id, meta: { bytes: r.bytes },
      })
    }
  })

  // 사용량 기록 — 응답 전에 끝낸다(Vercel은 응답 후 실행을 멈출 수 있다). 실패해도 결과는 그대로 돌려준다
  if (usageRows.length > 0) {
    try {
      await sb(cfg, 'studio_usage', { method: 'POST', body: usageRows, prefer: 'return=minimal' })
    } catch (e) {
      console.error(`[studio-ingest] 사용량 기록 실패 (${usageRows.length}건):`, e.message)
    }
  }

  const doneN = Object.values(results).filter(r => r.status === 'done').length
  console.log(`[studio-ingest] project=${project.id} 요청 ${imageIds.length} / 새로 받음 ${toFetch.length} / done ${doneN} / ${Date.now() - t0}ms`)
  return res.status(200).json({ results })
}
