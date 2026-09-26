/**
 * Vercel Serverless Function: POST /api/studio-upload
 * 셀러가 자기 사진을 스튜디오 프로젝트에 올린다. 파일 하나에 action 두 개 (함수 개수 절약).
 *
 * 브라우저는 studio_projects·studio_images INSERT 권한이 없고 Storage orig/에도 못 쓴다(의도된 설계, 열지 않는다).
 * 그래서 2단계:
 *   ① prepare — 파일 이름·크기·형식만 받아 검증 → 행 생성(pending) → 경로가 고정된 1회용 업로드 토큰 발급
 *      브라우저는 그 토큰으로 Storage에 직접 올린다 (Vercel 4.5MB 요청 제한을 거치지 않음)
 *      실측(scripts/studio-signed-upload-probe.mjs): 비로그인 anon도 토큰으로 업로드 성공 / 다른 경로 400 /
 *      같은 경로 재업로드 409 / text/plain 415 / .jpg 경로에 PNG·위조 바이트는 버킷이 통과시킴 → ②에서 검사
 *   ② confirm — 서버가 Storage에서 실제 파일을 읽어 매직바이트·크기·가로세로 검사 → done, 실패면 파일 삭제 + failed
 *
 * POST { action:'prepare', projectId?, title?, files:[{ name, size, type }] }  (files 1~10)
 *   → { projectId, created, uploads:[{ imageId, path, token }] }
 * POST { action:'confirm', projectId, imageIds:[] }  (1~6)
 *   → { results: { [imageId]: { status:'done'|'failed', width, height, error? } } }
 * 에러: { code, message, ... } — invalid_input·too_many·image_limit·project_expired·not_upload 400 /
 *       not_found 404 / daily_limit 429 / sign_failed·internal 500
 *
 * ── AI 지우기 결과 조각 (1-6b-3b) ── 편집기가 브라우저에서 계산한 AI 결과 PNG를 저장한다. 같은 2단계 방식.
 * POST { action:'patch_prepare', projectId, imageId, layerId, key, width, height, size }
 *   → { exists:true, path } (같은 경로가 이미 있음 — 업로드 생략, 그래도 patch_confirm은 부른다)
 *   → { path, token }        경로 = {uid}/{projectId}/patches/{imageId}/{layerId}_{key}.png (서버가 만든다)
 * POST { action:'patch_confirm', projectId, imageId, path }
 *   → { ok:true, width, height }  서버가 파일을 읽어 PNG 매직바이트·20MB 이하·가로세로 ≤ 원본 검사, 불합격이면 삭제 + 오류
 * 에러: invalid_input·project_expired·patch_limit(사진당 120개)·patch_invalid·patch_too_large·not_uploaded 400 /
 *       not_found 404 / sign_failed·storage_error·internal 500.  studio_usage는 기록하지 않는다(외부 과금 없음).
 *
 * ── 지운 사진 굽기 (5단계) ── 편집기가 브라우저에서 "원본 + 지우기 결과"를 원본 크기 JPG(품질 95)로 구워 저장한다. 같은 2단계 방식.
 * POST { action:'final_prepare', projectId, imageId, version, width, height, size }
 *   version = 구울 때의 studio_images.edit_version (지금 DB 값과 같아야 함 — 아니면 409 final_stale)
 *   → { exists:true, path } | { path, token }   경로 = {uid}/{projectId}/final/{imageId}_v{version}.jpg (서버가 만든다)
 *   같은 경로 덮어쓰기는 서명 업로드가 막으므로(409) 버전마다 새 파일. 옛 버전 파일은 지우지 않는다(정리는 나중).
 * POST { action:'final_confirm', projectId, imageId, version, path }
 *   서버가 파일을 읽어 JPEG 매직바이트·20MB 이하·가로세로 = 원본 검사, 불합격이면 삭제 + 오류.
 *   합격이면 studio_images.final_rendered_version = version (edit_version이 아직 version일 때만 — 그 사이 지우기가 바뀌었으면 기록 안 함)
 *   → { ok:true, recorded:true|false, width, height }
 * 에러: invalid_input·project_expired·final_invalid·final_too_large·not_uploaded 400 / final_stale 409 / not_found 404 / sign_failed·storage_error·internal 500
 *
 * ★ 바이트 변환·리사이즈·재인코딩 금지 (1688 ingest와 같은 원칙). 가로·세로는 헤더에서만 읽는다.
 * ★ 편집기는 ingest_status='done'만 쓴다. pending이 남아도 문제 삼지 않는다.
 *
 * 환경변수: STUDIO_ENABLED, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STUDIO_UPLOAD_DAILY_PROJECTS(기본 30),
 *          STUDIO_MAX_IMAGES(프로젝트당 최대 장수, 기본 50 — api/_studio.js studioMaxImages)
 */

import crypto from 'crypto'
import {
  studioGuard, sendError, sb, loadOwnedRow, studioMaxImages,
  storageSignUpload, storageDownload, storageRemove, storageList,
} from './_studio.js'
import { readDimensions } from './studio-ingest.js'

const BUCKET = 'studio'
const MAX_FILES_PER_PREPARE = 10
const MAX_IDS_PER_CONFIRM = 6
const MAX_BYTES = 20 * 1024 * 1024        // 버킷 file_size_limit 20971520과 같음
const MAX_SIDE = 16384                     // iOS Safari 캔버스 한계
const MAX_PIXELS = 16777216
const CONFIRM_CONCURRENCY = 3
const DEFAULT_DAILY_PROJECTS = 30
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PATCH_MAX_BYTES = 20 * 1024 * 1024  // 버킷 file_size_limit 20971520과 같음 (브라우저 studioAiPatch.js와 같은 값)
const PATCH_TOO_LARGE_MSG = `결과 조각은 ${PATCH_MAX_BYTES / 1024 / 1024}MB 이하여야 합니다.`
const PATCH_MAX_FILES = 120                // 사진 1장의 patches 폴더 파일 수 상한
const LAYER_ID_RE = /^f_[a-z0-9]{6}$/
const PATCH_KEY_RE = /^[0-9a-f]{16}$/
const PATCH_NAME_RE = /^f_[a-z0-9]{6}_[0-9a-f]{16}\.png$/
const FINAL_MAX_BYTES = 20 * 1024 * 1024  // 버킷 file_size_limit 20971520과 같음 (브라우저 studioBake.js와 같은 값)
const FINAL_TOO_LARGE_MSG = `구운 사진은 ${FINAL_MAX_BYTES / 1024 / 1024}MB 이하여야 합니다.`

// ── 공통 ────────────────────────────────────────────────────────────────────
/** KST 날짜 'YYYY-MM-DD' */
function kstDate(d = new Date()) {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function dailyProjectCap() {
  const raw = process.env.STUDIO_UPLOAD_DAILY_PROJECTS
  if (raw === undefined || raw === '') return DEFAULT_DAILY_PROJECTS
  const n = Number(raw)
  if (Number.isInteger(n) && n >= 0) return n
  console.warn(`[studio-upload] STUDIO_UPLOAD_DAILY_PROJECTS 값이 정수가 아님 — 기본값 ${DEFAULT_DAILY_PROJECTS} 사용`)
  return DEFAULT_DAILY_PROJECTS
}

/** 파일 이름 정리: 경로 구분자·제어문자 제거, 200자. 경로에는 절대 쓰지 않는다(표시용 upload_name) */
function cleanName(name) {
  const s = String(name ?? '').replace(/[\\/\u0000-\u001f\u007f]/g, '').trim().slice(0, 200)
  return s || null
}

/** 매직바이트로 실제 형식 판정 */
function sniffMime(b) {
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png'
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

async function runPool(items, n, worker) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++
      out[idx] = await worker(items[idx])
    }
  }))
  return out
}

// ── prepare ─────────────────────────────────────────────────────────────────
async function prepare(ctx, body, res) {
  const { cfg } = ctx

  // 입력 검증
  const files = body.files
  if (!Array.isArray(files) || files.length === 0) {
    return sendError(res, 400, 'invalid_input', 'files 배열이 필요합니다.')
  }
  if (files.length > MAX_FILES_PER_PREPARE) {
    return sendError(res, 400, 'too_many', `한 번에 최대 ${MAX_FILES_PER_PREPARE}장까지 올릴 수 있습니다.`)
  }
  for (const f of files) {
    const size = Number(f?.size)
    if (!EXT_BY_MIME[f?.type]) return sendError(res, 400, 'invalid_type', 'JPG·PNG·WebP만 올릴 수 있습니다.')
    if (!Number.isInteger(size) || size < 1 || size > MAX_BYTES) {
      return sendError(res, 400, 'invalid_size', '파일 크기는 1바이트~20MB여야 합니다.')
    }
  }

  // 프로젝트 — 기존(소유권·삭제·만료) 또는 새로 만들기
  let project
  let created = false
  if (body.projectId !== undefined && body.projectId !== null && body.projectId !== '') {
    project = await loadOwnedRow(ctx, 'studio_projects', String(body.projectId), 'id,expires_at')
    if (!project) return sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.')
    if (new Date(project.expires_at).getTime() <= Date.now()) {
      return sendError(res, 400, 'project_expired', '보관 기간이 끝난 프로젝트입니다.')
    }
  } else {
    // 하루 생성 상한 — 오늘(KST) 만든 upload 프로젝트 수 (삭제한 것도 센다: 만들고 지우기 반복 방지)
    const cap = dailyProjectCap()
    const dayStart = encodeURIComponent(`${kstDate()}T00:00:00+09:00`)
    const today = await sb(cfg,
      `studio_projects?select=id&user_id=eq.${ctx.userId}&source_type=eq.upload&created_at=gte.${dayStart}`)
    if ((Array.isArray(today) ? today.length : 0) >= cap) {
      return sendError(res, 429, 'daily_limit', `사진 프로젝트는 하루 ${cap}개까지 만들 수 있습니다.`)
    }
    const rawTitle = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : ''
    const rows = await sb(cfg, 'studio_projects?select=id,expires_at', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        user_id: ctx.userId,
        source_type: 'upload',
        offer_id: null,
        source_url: null,
        desc_source: 'none',
        status: 'ingesting',
        title: rawTitle || `내 사진 ${kstDate()}`,
      },
    })
    project = rows?.[0]
    if (!project?.id) throw new Error('studio_projects insert 결과에 id 없음')
    created = true
  }

  // 장수 상한: done + (upload이면서 pending) + 이번 파일 수 ≤ studioMaxImages()  (1688의 미선택 pending desc는 세지 않는다)
  const maxImages = studioMaxImages()
  const existing = await sb(cfg, `studio_images?select=kind,ingest_status,sort_order&project_id=eq.${project.id}`)
  const list = Array.isArray(existing) ? existing : []
  const used = list.filter(r => r.ingest_status === 'done' || (r.kind === 'upload' && r.ingest_status === 'pending')).length
  const remaining = Math.max(0, maxImages - used)
  if (files.length > remaining) {
    return res.status(400).json({
      code: 'image_limit',
      message: `이 프로젝트에 ${remaining}장 더 올릴 수 있습니다.`,
      remaining,
      max: maxImages,
      projectId: project.id,
    })
  }
  let nextOrder = list.reduce((m, r) => Math.max(m, Number(r.sort_order)), -1) + 1

  // 행 생성 (pending) — 경로는 서버가 만든 imageId로만 정한다
  const planned = files.map(f => {
    const imageId = crypto.randomUUID()
    return {
      imageId,
      path: `${ctx.userId}/${project.id}/orig/${imageId}.${EXT_BY_MIME[f.type]}`,
      row: {
        id: imageId,
        project_id: project.id,
        user_id: ctx.userId,
        kind: 'upload',
        sort_order: nextOrder++,
        source_url: null,
        source_key: `upload:${imageId}`,
        upload_name: cleanName(f.name),
        mime: f.type,
        ingest_status: 'pending',
      },
    }
  })
  try {
    await sb(cfg, 'studio_images', { method: 'POST', body: planned.map(p => p.row), prefer: 'return=minimal' })
  } catch (e) {
    console.error(`[studio-upload] 이미지 행 생성 실패 project=${project.id}:`, e.message)
    if (created) {
      // 방금 만든 빈 프로젝트는 되돌린다
      try {
        await sb(cfg, `studio_projects?id=eq.${project.id}`, { method: 'DELETE', prefer: 'return=minimal' })
      } catch (de) {
        console.error(`[studio-upload] 빈 프로젝트 되돌리기 실패 ${project.id}:`, de.message)
      }
    }
    throw e
  }

  // 1회용 업로드 토큰 발급 — 하나라도 실패하면 이번 행 전부 failed + 오류 응답(숨기지 않는다)
  let tokens
  try {
    tokens = await Promise.all(planned.map(p => storageSignUpload(cfg, BUCKET, p.path)))
  } catch (e) {
    console.error(`[studio-upload] 업로드 URL 발급 실패 project=${project.id}:`, e.message)
    try {
      await sb(cfg, `studio_images?id=in.(${planned.map(p => p.imageId).join(',')})`, {
        method: 'PATCH', body: { ingest_status: 'failed', ingest_error: 'sign_failed' }, prefer: 'return=minimal',
      })
    } catch (pe) {
      console.error('[studio-upload] sign_failed 기록 실패:', pe.message)
    }
    return res.status(500).json({ code: 'sign_failed', message: '업로드 준비에 실패했습니다.', projectId: project.id, created })
  }

  console.log(`[studio-upload] prepare project=${project.id} created=${created} files=${files.length}`)
  return res.status(200).json({
    projectId: project.id,
    created,
    uploads: planned.map((p, i) => ({ imageId: p.imageId, path: p.path, token: tokens[i] })),
  })
}

// ── confirm ─────────────────────────────────────────────────────────────────
/** 한 장 확인. 결과 { status, width, height, error?, bytes? } — 사용량 기록 여부는 counted로 */
async function confirmOne(ctx, project, img) {
  const { cfg } = ctx
  // 멱등 — 이미 확인된 이미지는 다시 검증하지 않는다
  if (img.ingest_status === 'done' && img.original_path) {
    return { status: 'done', width: img.width, height: img.height, counted: false }
  }

  const ext = EXT_BY_MIME[img.mime]
  if (!ext) {
    // prepare가 허용 형식만 넣으므로 오면 안 되는 경우
    console.error(`[studio-upload] ${img.id} 행의 mime이 허용 형식이 아님: ${img.mime}`)
    return fail(ctx, img, 'invalid_row', null, false)
  }
  const path = `${ctx.userId}/${project.id}/orig/${img.id}.${ext}`

  let dl
  try {
    dl = await storageDownload(cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] ${img.id} Storage 읽기 실패:`, e.message)
    return fail(ctx, img, 'storage_error', null, false)
  }
  if (!dl.found) return fail(ctx, img, 'not_uploaded', null, false)

  const buf = dl.buf
  if (buf.length > MAX_BYTES) return fail(ctx, img, 'too_large', path, true)

  const actual = sniffMime(buf)
  if (!actual || actual !== img.mime) {
    console.warn(`[studio-upload] ${img.id} 형식 불일치 선언=${img.mime} 실제=${actual || '알 수 없음'}`)
    return fail(ctx, img, 'type_mismatch', path, true)
  }

  const dims = readDimensions(buf, actual)
  if (!dims || !dims.width || !dims.height) return fail(ctx, img, 'unreadable', path, true)
  if (dims.width > MAX_SIDE || dims.height > MAX_SIDE || dims.width * dims.height > MAX_PIXELS) {
    return fail(ctx, img, 'too_large_pixels', path, true, dims)
  }

  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  await sb(cfg, `studio_images?id=eq.${img.id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: {
      ingest_status: 'done', ingest_error: null,
      width: dims.width, height: dims.height, bytes: buf.length, mime: actual, sha256, original_path: path,
    },
  })
  return { status: 'done', width: dims.width, height: dims.height, bytes: buf.length, counted: true }
}

/** 실패 처리: 필요하면 파일 삭제 → 행 failed. 삭제 실패는 숨기지 않고 로그 + 사유에 표시 */
async function fail(ctx, img, error, pathToDelete, deleteFile, dims = null) {
  const { cfg } = ctx
  let reason = error
  if (deleteFile && pathToDelete) {
    try {
      await storageRemove(cfg, BUCKET, [pathToDelete])
    } catch (e) {
      console.error(`[studio-upload] ${img.id} 불합격 파일 삭제 실패 (${error}):`, e.message)
      reason = `${error}+delete_failed`
    }
  }
  await sb(cfg, `studio_images?id=eq.${img.id}`, {
    method: 'PATCH', prefer: 'return=minimal', body: { ingest_status: 'failed', ingest_error: reason },
  })
  return { status: 'failed', error, width: dims?.width ?? null, height: dims?.height ?? null, counted: true }
}

async function confirm(ctx, body, res) {
  const { cfg } = ctx
  if (!Array.isArray(body.imageIds) || body.imageIds.length === 0) {
    return sendError(res, 400, 'invalid_input', 'imageIds 배열이 필요합니다.')
  }
  const imageIds = [...new Set(body.imageIds.map(v => String(v || '').trim().toLowerCase()))]
  if (imageIds.length > MAX_IDS_PER_CONFIRM) {
    return sendError(res, 400, 'too_many', `한 번에 최대 ${MAX_IDS_PER_CONFIRM}장까지 확인할 수 있습니다.`)
  }
  if (!imageIds.every(id => UUID_RE.test(id))) {
    return sendError(res, 400, 'invalid_input', 'imageIds 형식이 올바르지 않습니다.')
  }

  const project = await loadOwnedRow(ctx, 'studio_projects', String(body.projectId ?? ''), 'id,source_type')
  if (!project) return sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.')

  const images = await sb(cfg,
    `studio_images?select=id,kind,mime,ingest_status,original_path,width,height` +
    `&id=in.(${imageIds.join(',')})&project_id=eq.${project.id}&user_id=eq.${ctx.userId}`)
  if (!Array.isArray(images) || images.length !== imageIds.length) {
    return sendError(res, 404, 'not_found', '이미지를 찾을 수 없습니다.')
  }
  if (images.some(img => img.kind !== 'upload')) {
    return sendError(res, 400, 'not_upload', '직접 올린 사진만 확인할 수 있습니다.')
  }

  const outcomes = await runPool(images, CONFIRM_CONCURRENCY, async img => {
    try {
      return await confirmOne(ctx, project, img)
    } catch (e) {
      console.error(`[studio-upload] ${img.id} 확인 처리 실패:`, e.message)
      return { status: 'failed', error: 'internal', width: null, height: null, counted: false }
    }
  })

  const results = {}
  const usageRows = []
  images.forEach((img, i) => {
    const o = outcomes[i]
    results[img.id] = o.status === 'done'
      ? { status: 'done', width: o.width, height: o.height }
      : { status: 'failed', width: o.width, height: o.height, error: o.error }
    if (o.counted) {
      usageRows.push({
        user_id: ctx.userId, kind: 'upload_image', status: o.status === 'done' ? 'ok' : 'failed', qty: 1,
        project_id: project.id, image_id: img.id, error_code: o.status === 'done' ? null : o.error,
        meta: o.bytes ? { bytes: o.bytes } : null,
      })
    }
  })

  // 사용량 기록 — 응답 전에 끝낸다. 실패해도 결과는 그대로 돌려준다
  if (usageRows.length > 0) {
    try {
      await sb(cfg, 'studio_usage', { method: 'POST', body: usageRows, prefer: 'return=minimal' })
    } catch (e) {
      console.error(`[studio-upload] 사용량 기록 실패 (${usageRows.length}건):`, e.message)
    }
  }

  // 업로드 프로젝트: 남은 pending upload 행이 0이면 ready. 1688 프로젝트 status는 건드리지 않는다
  if (project.source_type === 'upload') {
    try {
      const pending = await sb(cfg,
        `studio_images?select=id&project_id=eq.${project.id}&kind=eq.upload&ingest_status=eq.pending&limit=1`)
      if (Array.isArray(pending) && pending.length === 0) {
        await sb(cfg, `studio_projects?id=eq.${project.id}&status=neq.ready`, {
          method: 'PATCH', body: { status: 'ready' }, prefer: 'return=minimal',
        })
      }
    } catch (e) {
      console.error(`[studio-upload] 프로젝트 상태 갱신 실패 ${project.id}:`, e.message)
    }
  }

  const doneN = Object.values(results).filter(r => r.status === 'done').length
  console.log(`[studio-upload] confirm project=${project.id} 요청 ${imageIds.length} / done ${doneN}`)
  return res.status(200).json({ results })
}

// ── AI 결과 조각 ────────────────────────────────────────────────────────────
/** 프로젝트(소유·삭제 안 됨·만료 안 됨) + 이미지(같은 프로젝트·본인·done). 막히면 응답을 보내고 null */
async function loadPatchTarget(ctx, body, res) {
  const imageId = String(body.imageId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(imageId)) { sendError(res, 400, 'invalid_input', 'imageId 형식이 올바르지 않습니다.'); return null }
  const project = await loadOwnedRow(ctx, 'studio_projects', String(body.projectId ?? ''), 'id,expires_at')
  if (!project) { sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.'); return null }
  if (new Date(project.expires_at).getTime() <= Date.now()) {
    sendError(res, 400, 'project_expired', '보관 기간이 끝난 프로젝트입니다.')
    return null
  }
  const rows = await sb(ctx.cfg,
    `studio_images?select=id,width,height,ingest_status&id=eq.${imageId}&project_id=eq.${project.id}&user_id=eq.${ctx.userId}&limit=1`)
  const image = Array.isArray(rows) ? rows[0] : null
  if (!image || image.ingest_status !== 'done') { sendError(res, 404, 'not_found', '이미지를 찾을 수 없습니다.'); return null }
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height)) {
    console.error(`[studio-upload] ${image.id} 원본 크기가 없음 — 조각 크기를 검사할 수 없음`)
    sendError(res, 500, 'internal', '원본 크기를 알 수 없습니다.')
    return null
  }
  return { project, image, folder: `${ctx.userId}/${project.id}/patches/${image.id}` }
}

async function patchPrepare(ctx, body, res) {
  const layerId = String(body.layerId ?? '')
  const key = String(body.key ?? '')
  const width = Number(body.width), height = Number(body.height), size = Number(body.size)
  if (!LAYER_ID_RE.test(layerId) || !PATCH_KEY_RE.test(key)) {
    return sendError(res, 400, 'invalid_input', 'layerId 또는 key 형식이 올바르지 않습니다.')
  }
  if (!Number.isInteger(size) || size < 1 || size > PATCH_MAX_BYTES) {
    return sendError(res, 400, 'patch_too_large', PATCH_TOO_LARGE_MSG)
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    return sendError(res, 400, 'invalid_input', 'width·height 형식이 올바르지 않습니다.')
  }
  const t = await loadPatchTarget(ctx, body, res)
  if (!t) return
  if (width > t.image.width || height > t.image.height) {
    return sendError(res, 400, 'invalid_input', '결과 조각이 원본보다 큽니다.')
  }

  const name = `${layerId}_${key}.png`
  const path = `${t.folder}/${name}`
  let names
  try {
    names = await storageList(ctx.cfg, BUCKET, t.folder)
  } catch (e) {
    console.error(`[studio-upload] patches 목록 조회 실패 ${t.folder}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소를 확인하지 못했습니다.')
  }
  if (names.includes(name)) return res.status(200).json({ exists: true, path })
  if (names.length >= PATCH_MAX_FILES) {
    return sendError(res, 400, 'patch_limit', `사진 한 장의 AI 결과는 ${PATCH_MAX_FILES}개까지 저장할 수 있습니다.`)
  }
  let token
  try {
    token = await storageSignUpload(ctx.cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] 조각 업로드 URL 발급 실패 ${path}:`, e.message)
    return sendError(res, 500, 'sign_failed', '업로드 준비에 실패했습니다.')
  }
  return res.status(200).json({ path, token })
}

async function patchConfirm(ctx, body, res) {
  const t = await loadPatchTarget(ctx, body, res)
  if (!t) return
  const path = String(body.path ?? '')
  const prefix = `${t.folder}/`
  if (!path.startsWith(prefix) || !PATCH_NAME_RE.test(path.slice(prefix.length))) {
    return sendError(res, 400, 'invalid_input', '경로가 올바르지 않습니다.')
  }
  let dl
  try {
    dl = await storageDownload(ctx.cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] 조각 읽기 실패 ${path}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소에서 파일을 확인하지 못했습니다.')
  }
  if (!dl.found) return sendError(res, 400, 'not_uploaded', '업로드된 파일이 없습니다.')

  const buf = dl.buf
  let bad = null
  let dims = null
  if (buf.length > PATCH_MAX_BYTES) bad = ['patch_too_large', PATCH_TOO_LARGE_MSG]
  else if (sniffMime(buf) !== 'image/png') bad = ['patch_invalid', 'PNG 파일이 아닙니다.']
  else {
    dims = readDimensions(buf, 'image/png')
    if (!dims || !dims.width || !dims.height) bad = ['patch_invalid', '이미지 크기를 읽을 수 없습니다.']
    else if (dims.width > t.image.width || dims.height > t.image.height) bad = ['patch_invalid', '결과 조각이 원본보다 큽니다.']
  }
  if (bad) {
    console.warn(`[studio-upload] 조각 불합격 ${path}: ${bad[0]} (${buf.length} bytes)`)
    try {
      await storageRemove(ctx.cfg, BUCKET, [path])
    } catch (e) {
      console.error(`[studio-upload] 불합격 조각 삭제 실패 ${path}:`, e.message)
      return sendError(res, 400, `${bad[0]}+delete_failed`, bad[1])
    }
    return sendError(res, 400, bad[0], bad[1])
  }
  return res.status(200).json({ ok: true, width: dims.width, height: dims.height })
}

// ── 지운 사진 굽기 (5단계) ────────────────────────────────────────────────────
/** 굽기 대상: loadPatchTarget과 같은 소유·만료·done 검사 + 지금 edit_version. 막히면 응답을 보내고 null */
async function loadFinalTarget(ctx, body, res) {
  const version = Number(body.version)
  if (!Number.isInteger(version) || version < 1) { sendError(res, 400, 'invalid_input', 'version 형식이 올바르지 않습니다.'); return null }
  const t = await loadPatchTarget(ctx, body, res)
  if (!t) return null
  const rows = await sb(ctx.cfg, `studio_images?select=edit_version&id=eq.${t.image.id}&user_id=eq.${ctx.userId}&limit=1`)
  const editVersion = Array.isArray(rows) && rows[0] ? rows[0].edit_version : null
  const folder = `${ctx.userId}/${t.project.id}/final`
  return { ...t, version, editVersion, folder, name: `${t.image.id}_v${version}.jpg` }
}

async function finalPrepare(ctx, body, res) {
  const width = Number(body.width), height = Number(body.height), size = Number(body.size)
  if (!Number.isInteger(size) || size < 1 || size > FINAL_MAX_BYTES) return sendError(res, 400, 'final_too_large', FINAL_TOO_LARGE_MSG)
  const t = await loadFinalTarget(ctx, body, res)
  if (!t) return
  if (width !== t.image.width || height !== t.image.height) {
    return sendError(res, 400, 'final_invalid', '구운 사진의 가로·세로가 원본과 다릅니다.')
  }
  if (t.editVersion !== t.version) return sendError(res, 409, 'final_stale', '그 사이 지우기가 바뀌었습니다. 최신 내용으로 다시 구워 주세요.')
  const path = `${t.folder}/${t.name}`
  let names
  try {
    names = await storageList(ctx.cfg, BUCKET, t.folder)
  } catch (e) {
    console.error(`[studio-upload] final 목록 조회 실패 ${t.folder}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소를 확인하지 못했습니다.')
  }
  if (names.includes(t.name)) return res.status(200).json({ exists: true, path })
  let token
  try {
    token = await storageSignUpload(ctx.cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] final 업로드 URL 발급 실패 ${path}:`, e.message)
    return sendError(res, 500, 'sign_failed', '업로드 준비에 실패했습니다.')
  }
  return res.status(200).json({ path, token })
}

async function finalConfirm(ctx, body, res) {
  const t = await loadFinalTarget(ctx, body, res)
  if (!t) return
  const path = String(body.path ?? '')
  if (path !== `${t.folder}/${t.name}`) return sendError(res, 400, 'invalid_input', '경로가 올바르지 않습니다.')
  let dl
  try {
    dl = await storageDownload(ctx.cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] final 읽기 실패 ${path}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소에서 파일을 확인하지 못했습니다.')
  }
  if (!dl.found) return sendError(res, 400, 'not_uploaded', '업로드된 파일이 없습니다.')

  const buf = dl.buf
  let bad = null
  let dims = null
  if (buf.length > FINAL_MAX_BYTES) bad = ['final_too_large', FINAL_TOO_LARGE_MSG]
  else if (sniffMime(buf) !== 'image/jpeg') bad = ['final_invalid', 'JPEG 파일이 아닙니다.']
  else {
    dims = readDimensions(buf, 'image/jpeg')
    if (!dims || !dims.width || !dims.height) bad = ['final_invalid', '이미지 크기를 읽을 수 없습니다.']
    else if (dims.width !== t.image.width || dims.height !== t.image.height) bad = ['final_invalid', '구운 사진의 가로·세로가 원본과 다릅니다.']
  }
  if (bad) {
    console.warn(`[studio-upload] final 불합격 ${path}: ${bad[0]} (${buf.length} bytes)`)
    try {
      await storageRemove(ctx.cfg, BUCKET, [path])
    } catch (e) {
      console.error(`[studio-upload] 불합격 final 삭제 실패 ${path}:`, e.message)
      return sendError(res, 400, `${bad[0]}+delete_failed`, bad[1])
    }
    return sendError(res, 400, bad[0], bad[1])
  }
  // 최신 기록: 지우기가 아직 이 버전일 때만 (그 사이 바뀌었으면 옛 굽기가 최신 표시를 덮지 않게 기록하지 않는다)
  const updated = await sb(ctx.cfg,
    `studio_images?id=eq.${t.image.id}&user_id=eq.${ctx.userId}&edit_version=eq.${t.version}`,
    { method: 'PATCH', body: { final_rendered_version: t.version }, prefer: 'return=representation' })
  const recorded = Array.isArray(updated) && updated.length > 0
  if (!recorded) console.info(`[studio-upload] final ${path} 확인됨 — 그 사이 지우기가 바뀌어 최신으로 기록하지 않음`)
  return res.status(200).json({ ok: true, recorded, width: dims.width, height: dims.height })
}

// ── handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ctx = await studioGuard(req, res)
  if (!ctx) return

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  try {
    if (body.action === 'prepare') return await prepare(ctx, body, res)
    if (body.action === 'confirm') return await confirm(ctx, body, res)
    if (body.action === 'patch_prepare') return await patchPrepare(ctx, body, res)
    if (body.action === 'patch_confirm') return await patchConfirm(ctx, body, res)
    if (body.action === 'final_prepare') return await finalPrepare(ctx, body, res)
    if (body.action === 'final_confirm') return await finalConfirm(ctx, body, res)
    return sendError(res, 400, 'invalid_input', "action은 'prepare'·'confirm'·'patch_prepare'·'patch_confirm'·'final_prepare'·'final_confirm' 중 하나여야 합니다.")
  } catch (e) {
    console.error(`[studio-upload] ${body.action} 처리 실패:`, e.message)
    return sendError(res, 500, 'internal', '업로드 처리 중 오류가 발생했습니다.')
  }
}
