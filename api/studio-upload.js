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
 *   version = 구울 때의 studio_images.edit_version (그 뒤 지우기가 안 바뀌었어야 함 — 아니면 409 final_stale.
 *   필터·조정만 바뀐 저장은 edit_version만 올리고 edit.erase_v는 그대로라 괜찮다 — 6-3, eraseVersionOf)
 *   → { exists:true, path } | { path, token }   경로 = {uid}/{projectId}/final/{imageId}_v{version}.jpg (서버가 만든다)
 *   같은 경로 덮어쓰기는 서명 업로드가 막으므로(409) 버전마다 새 파일. 옛 버전 파일은 지우지 않는다(정리는 나중).
 * POST { action:'final_confirm', projectId, imageId, version, path }
 *   서버가 파일을 읽어 JPEG 매직바이트·20MB 이하·가로세로 = 원본 검사, 불합격이면 삭제 + 오류.
 *   합격이면 studio_images.final_rendered_version = version (그 사이 지우기가 바뀌었거나 더 새 버전 기록이 있으면 기록 안 함)
 *   → { ok:true, recorded:true|false, width, height }
 * 에러: invalid_input·project_expired·final_invalid·final_too_large·not_uploaded 400 / final_stale 409 / not_found 404 / sign_failed·storage_error·internal 500
 *
 * ── 작업 복사본 (16단계) ── 브라우저는 studio_projects·studio_images INSERT와 orig/·patches/ 쓰기 권한이 없어 서버가 한다.
 * POST { action:'project_copy', projectId }
 *   → { projectId, title, images, files, missing }  (missing = 원본에도 없어 못 복사한 조각·완성 사진 수)
 *   새 작업 행(이름 + " (복사본)", 보관 기간 = 원본과 같음, page의 사진 id를 새 id로, page_version 0) + 사진 행 전부(새 id, 경로·edit 안 경로를 새 경로로)
 *   + Storage 파일(원본·AI 결과 조각·지금 쓰는 완성 JPG)을 새 작업 폴더로 복사 (_studioCopy.js buildCopyPlan). 파일을 두 작업이 같이 쓰지 않는다.
 *   새 작업은 다 될 때까지 deleted_at을 찍어 두어 목록에 안 보이고, 마지막에 비운다. 중간에 실패하면 복사한 파일·행을 지우고 오류(원본은 읽기만 한다).
 * 에러: invalid_input 400 / not_found 404 / project_expired 400 / copy_bad_path·copy_failed 500
 *
 * ── 배경 지우기 (17-1) ── 외부 API(fal, api/_studioBgProvider.js)로 원본의 마스크(알파)를 만들어 저장한다. 돈은 여기서만 나간다.
 * POST { action:'bg_status' } → { ready, reason: null|'not_eligible'|'no_key'|'no_table', model? }  (한도 숫자는 알려 주지 않는다)
 * POST { action:'bg_remove', projectId, imageId }
 *   로그인 → 본인 사진 확인(loadPatchTarget) → 자격(관리자 또는 결제한 주문 고객, _studioBg.js) → 키 → 긴 변 ≤ 4096 → 사용 기록(처리 중·하루 한도)
 *   → 같은 원본·모델 마스크가 있으면 그대로 돌려줌(reused, 외부 호출 없음) → pending 기록 → 원본 서명 주소(5분) → fal
 *   → 결과 PNG의 알파만 → 원본 크기 8비트 회색 PNG → {uid}/{projectId}/bg/{imageId}/mask_{key16}.png → 기록 ok(비용 추정)
 *   → { path, key, model, width, height, reused }.  edit.bg 저장은 화면이 기존 edit_version 잠금 저장으로 한다.
 * 에러: bg_not_eligible 403 / bg_not_ready 503(키·테이블 없음) / bg_busy 409 / bg_daily_limit 429 / bg_too_large 400 /
 *       bg_failed 502·bg_timeout 504(기록 지움) / not_found 404 / storage_error 500
 *
 * ── 배경 경계 다듬기 (17-3) ── 편집기가 브라우저에서 붓으로 고친 마스크(PNG)를 저장한다. 외부 AI·사용 기록(studio_ai_usage) 없음 — 돈이 들지 않는다.
 *   지우기 조각과 같은 2단계. AI 마스크(mask_*.png)는 건드리지 않고 같은 bg 폴더에 새 이름으로 둔다.
 * POST { action:'bg_refine_prepare', projectId, imageId, key, width, height, size }
 *   key = 마스크 내용 해시 16자(브라우저 studioBgRefine.refineKey), width·height = 원본 크기와 같아야 함
 *   → { exists:true, path } | { path, token }   경로 = {uid}/{projectId}/bg/{imageId}/refined_{key}.png (서버가 만든다)
 * POST { action:'bg_refine_confirm', projectId, imageId, path }
 *   서버가 파일을 읽어 PNG 매직바이트·20MB 이하·가로세로 = 원본 검사, 불합격이면 삭제 + 오류 → { ok:true, width, height }
 * 에러: invalid_input 400 / bg_refine_too_large·bg_refine_invalid·not_uploaded 400 / bg_refine_limit 400(사진당 60개) /
 *       not_found 404 / sign_failed·storage_error 500
 *
 * ── AI 배경 (17-4) ── 외부 API(fal Bria Background Replace, _studioBgProvider.generateBackground)로 새 배경 장면을 만든다. 돈이 나간다($0.04/장).
 *   자격 = 배경 지우기와 같음. 1인 하루 3회(관리자·스태프 제외) + 전체 하루 STUDIO_BG_GEN_DAILY_LIMIT(관리자 포함) — _studioBgGen.js
 *   결과 이미지는 받은 바이트 그대로 {uid}/{projectId}/bg/{imageId}/ai_{sha256 16자}.{png|jpg|webp}. 제품은 화면이 우리 원본 + 마스크로 위에 덮는다.
 * POST { action:'bg_gen_status' } → { ready, reason: null|'not_eligible'|'no_key'|'no_table', staff, left, perDay, globalLeft }
 * POST { action:'bg_generate', projectId, imageId, preset }
 *   → { path, key, w, h, preset, model, left }   (left = 이번 것까지 뺀 오늘 남은 무료 횟수, 관리자는 null)
 * 에러: invalid_input 400 / bg_not_eligible 403 / bg_not_ready 503 / bg_gen_sql_missing 503(kind 체크 SQL 전) / bg_gen_need_mask 400 /
 *       bg_too_large 400 / bg_busy 409 / bg_gen_user_limit·bg_gen_global_limit 429 / bg_gen_failed 502·bg_gen_timeout 504(기록 지움, 횟수 안 셈)
 *
 * ── 원클릭 글자 초안용 상품 사실 (원클릭 1단계) ── 외부 호출 없음(OneBound·파파고·fal 모두 안 부른다) — 돈이 들지 않는다.
 * POST { action:'product_facts', projectId }
 *   본인 작업의 offer_id → studio_product_snapshots.raw.item(가져올 때 저장한 원본, 만료돼도 행이 있으면 씀)에서 제목·속성·옵션(_studioFacts.js)
 *   → 번역 캐시(translation_cache, 1688 공식 다국어 데이터가 채운 것)에 있는 한국어만 붙인다 (lookupCachedTranslations — 캐시 조회만)
 *   → { facts: { title, attrs, options } | null, reason: null|'no_offer'|'no_snapshot', texts, translated }
 * 에러: not_found 404
 *
 * ── 내 상품 보관 (2026-09-28) ── [내보내기]로 받은 이미지를 한 벌 더 둔다 (_studioExports.js). 같은 2단계 방식. 돈이 들지 않는다.
 * POST { action:'export_begin', projectId, title, format, scale, mode, count } → { exportId, stamp }  (studio_exports 행, 폴더 = {uid}/{projectId}/exports/{stamp})
 * POST { action:'export_file_prepare', exportId, key, size } → { exists:true, path } | { path, token }   key = 01·02…·all·thumb(목록 미리보기 JPG)
 * POST { action:'export_file_confirm', exportId, key, path, name } → { ok:true, saved }  서버가 형식·크기를 읽어 확인 후 files(또는 thumb_path)에 기록
 * POST { action:'exports_list' } → { ready, items }   /   POST { action:'export_download', exportId } → { files:[{ name, url, bytes }] } (서명 주소 10분)
 * 에러: invalid_input·export_too_large·export_invalid·not_uploaded 400 / not_found 404 / export_sql_missing 503(표 없음) / sign_failed·storage_error 500
 *
 * ── 사용 자격 (2026-09-28) ── POST { action:'access' } → { ok:true, staff, mode }. 관문(api/_studio.js studioGuard)이 all 모드에서
 *   관리자·스태프 또는 결제 확인 이후 주문 1건 이상인지 본다 — 아니면 403 not_customer (모든 스튜디오 API 같음)
 *
 * ★ 바이트 변환·리사이즈·재인코딩 금지 (1688 ingest와 같은 원칙). 가로·세로는 헤더에서만 읽는다. (배경 마스크는 서버가 새로 만드는 파일이라 예외)
 * ★ 편집기는 ingest_status='done'만 쓴다. pending이 남아도 문제 삼지 않는다.
 *
 * 환경변수: STUDIO_ENABLED, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STUDIO_UPLOAD_DAILY_PROJECTS(기본 30),
 *          STUDIO_MAX_IMAGES(프로젝트당 최대 장수, 기본 50 — api/_studio.js studioMaxImages)
 */

import crypto from 'crypto'
import {
  studioGuard, sendError, sb, loadOwnedRow, studioMaxImages,
  storageSignUpload, storageDownload, storageRemove, storageList, storageCopy, storageSignDownload, storageUpload,
} from './_studio.js'
import { readDimensions } from './studio-ingest.js'
import { buildCopyPlan } from './_studioCopy.js'
import {
  isBgEligible, isBgStaff, usageTableReady, usageCheck, isUsageUnavailable, bgDailyLimit, bgMaskKey, bgFolder, buildMaskPng,
  BG_MAX_SIDE, BG_SIGN_SECONDS, BG_MASK_MAX_BYTES, BG_REFINED_NAME_RE, BG_REFINED_MAX_FILES,
} from './_studioBg.js'
import { bgProviderConfig, removeBackground, BgProviderError, bgGenProviderConfig, generateBackground } from './_studioBgProvider.js'
import {
  BG_GEN_KIND, BG_GEN_FREE_PER_DAY, BG_GEN_MAX_BYTES, BG_GEN_PRESETS, BG_AI_EXT, bgGenDailyLimit, bgAiKey, isKindCheckError,
  genUsageToday, withinLimit, genBusy,
} from './_studioBgGen.js'
import { extractFacts, factTexts, withKo } from './_studioFacts.js'
import {
  EXPORT_MAX_BYTES, EXPORT_FORMATS, EXPORT_MODES, EXPORT_SCALES, EXPORT_MAX_FILES, EXPORTS_LIST_MAX, EXPORT_SIGN_SECONDS, KEY_RE,
  exportStamp, exportFolder, cleanExportName, upsertExportFile, exportsTableReady,
  EXPORT_SOURCES, SAVE_CLEANUP_HOLD_MS, isSourceColumnMissing, savePatchFrom,
} from './_studioExports.js'
import { lookupCachedTranslations } from './_translationCache.js'
import { CACHE_SOURCE_LANG, CACHE_TARGET_LANG } from './_crossborderKo.js'

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
/**
 * 지우기(layers)가 마지막으로 바뀐 버전 — src/lib/studioFinal.js eraseVersionOf와 같은 규칙 (바꾸면 둘 다).
 * edit.erase_v가 없거나 이상하면 editVersion (예전 규칙: 구운 버전 = 지금 edit_version일 때만 유효)
 */
function eraseVersionOf(edit, editVersion) {
  const v = edit && typeof edit === 'object' ? edit.erase_v : undefined
  if (!Number.isInteger(editVersion)) return null
  return Number.isInteger(v) && v >= 0 && v <= editVersion ? v : editVersion
}

/** 그 버전으로 구운 사진이 지금 지우기와 같은지 — 그 뒤 필터·조정만 바뀐 저장(edit_version만 오름)은 괜찮다 */
function finalStillFresh(t) {
  return Number.isInteger(t.editVersion) && t.editVersion >= t.version && t.eraseVersion <= t.version
}

/** 굽기 대상: loadPatchTarget과 같은 소유·만료·done 검사 + 지금 edit_version·지우기 버전. 막히면 응답을 보내고 null */
async function loadFinalTarget(ctx, body, res) {
  const version = Number(body.version)
  if (!Number.isInteger(version) || version < 1) { sendError(res, 400, 'invalid_input', 'version 형식이 올바르지 않습니다.'); return null }
  const t = await loadPatchTarget(ctx, body, res)
  if (!t) return null
  const rows = await sb(ctx.cfg, `studio_images?select=edit_version,edit&id=eq.${t.image.id}&user_id=eq.${ctx.userId}&limit=1`)
  const editVersion = Array.isArray(rows) && rows[0] ? rows[0].edit_version : null
  const eraseVersion = Array.isArray(rows) && rows[0] ? eraseVersionOf(rows[0].edit, editVersion) : null
  const folder = `${ctx.userId}/${t.project.id}/final`
  return { ...t, version, editVersion, eraseVersion, folder, name: `${t.image.id}_v${version}.jpg` }
}

async function finalPrepare(ctx, body, res) {
  const width = Number(body.width), height = Number(body.height), size = Number(body.size)
  if (!Number.isInteger(size) || size < 1 || size > FINAL_MAX_BYTES) return sendError(res, 400, 'final_too_large', FINAL_TOO_LARGE_MSG)
  const t = await loadFinalTarget(ctx, body, res)
  if (!t) return
  if (width !== t.image.width || height !== t.image.height) {
    return sendError(res, 400, 'final_invalid', '구운 사진의 가로·세로가 원본과 다릅니다.')
  }
  if (!finalStillFresh(t)) return sendError(res, 409, 'final_stale', '그 사이 지우기가 바뀌었습니다. 최신 내용으로 다시 구워 주세요.')
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
  // 최신 기록: 그 뒤 지우기가 안 바뀌었을 때만 (필터·조정만 바뀐 건 괜찮다). 조건 확인 뒤 바뀌지 않게 읽은 edit_version에 걸고,
  // 더 새 버전으로 구운 기록을 옛 버전이 덮지 않게 final_rendered_version이 비었거나 더 작을 때만
  let recorded = false
  if (finalStillFresh(t)) {
    const updated = await sb(ctx.cfg,
      `studio_images?id=eq.${t.image.id}&user_id=eq.${ctx.userId}&edit_version=eq.${t.editVersion}`
        + `&or=(final_rendered_version.is.null,final_rendered_version.lt.${t.version})`,
      { method: 'PATCH', body: { final_rendered_version: t.version }, prefer: 'return=representation' })
    recorded = Array.isArray(updated) && updated.length > 0
  }
  if (!recorded) console.info(`[studio-upload] final ${path} 확인됨 — 그 사이 지우기가 바뀌어 최신으로 기록하지 않음`)
  return res.status(200).json({ ok: true, recorded, width: dims.width, height: dims.height })
}

// ── project_copy (16단계 작업 복사본) ───────────────────────────────────────
const COPY_CONCURRENCY = 4
const COPY_PROJECT_SELECT = 'id,source_type,offer_id,source_url,title_zh,title,desc_source,status,expires_at,extended_count,page'

async function projectCopy(ctx, body, res) {
  const { cfg } = ctx
  const project = await loadOwnedRow(ctx, 'studio_projects', String(body.projectId ?? ''), COPY_PROJECT_SELECT)
  if (!project) return sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.')
  if (new Date(project.expires_at).getTime() <= Date.now()) {
    return sendError(res, 400, 'project_expired', '보관 기간이 끝난 프로젝트입니다.')
  }
  const images = await sb(cfg, `studio_images?select=*&project_id=eq.${project.id}&user_id=eq.${ctx.userId}&order=sort_order.asc`)
  const newProjectId = crypto.randomUUID()
  let plan
  try {
    plan = buildCopyPlan({
      uid: ctx.userId, project, images: Array.isArray(images) ? images : [], newProjectId,
      newImageId: () => crypto.randomUUID(), hiddenAt: new Date().toISOString(),
    })
  } catch (e) {
    // 경로가 규칙과 다름 — 모르는 파일을 두 작업이 같이 가리키게 두지 않으려고 복사하지 않는다 (원본은 그대로)
    console.error(`[studio-upload] 복사 계획 실패 project=${project.id}:`, e.message)
    return sendError(res, 500, 'copy_bad_path', '사진 경로가 예상과 달라 복사하지 않았습니다.')
  }
  if (plan.unknownImageIds.length) {
    console.warn(`[studio-upload] 복사: 페이지에 이 작업에 없는 사진 id ${plan.unknownImageIds.length}개 — 그대로 둠`, plan.unknownImageIds)
  }

  const copied = []          // 복사한 파일 (실패하면 지운다)
  const missingFinal = []    // 완성 JPG가 없어 복사본의 final_rendered_version을 비울 사진
  let missing = 0
  let projectInserted = false
  try {
    await sb(cfg, 'studio_projects', { method: 'POST', body: plan.projectRow, prefer: 'return=minimal' })
    projectInserted = true
    if (plan.imageRows.length) await sb(cfg, 'studio_images', { method: 'POST', body: plan.imageRows, prefer: 'return=minimal' })
    // 하나라도 실패하면 새 파일 복사를 멈추고, 이미 시작한 복사가 모두 끝난 뒤에 정리한다 (정리 뒤에 파일이 새로 생기지 않게)
    let firstErr = null
    let next = 0
    await Promise.all(Array.from({ length: Math.min(COPY_CONCURRENCY, plan.files.length) }, async () => {
      while (!firstErr && next < plan.files.length) {
        const f = plan.files[next++]
        try {
          const r = await storageCopy(cfg, BUCKET, f.from, f.to)
          if (r.found) { copied.push(f.to); continue }
          if (f.required) throw new Error(`원본 사진 파일이 없음: ${f.from}`)
          missing++
          console.warn(`[studio-upload] 복사: 원본 작업에도 없는 파일 — 건너뜀 (${f.kind}):`, f.from)
          if (f.kind === 'final') missingFinal.push(f.imageId)
        } catch (err) {
          firstErr = firstErr || err
        }
      }
    }))
    if (firstErr) throw firstErr
    if (missingFinal.length) {
      await sb(cfg, `studio_images?id=in.(${missingFinal.join(',')})`, {
        method: 'PATCH', body: { final_rendered_version: null }, prefer: 'return=minimal',
      })
    }
    // 다 됐다 — 목록에 보이게
    await sb(cfg, `studio_projects?id=eq.${newProjectId}&user_id=eq.${ctx.userId}`, {
      method: 'PATCH', body: { deleted_at: null }, prefer: 'return=minimal',
    })
  } catch (e) {
    console.error(`[studio-upload] 복사 실패 ${project.id} → ${newProjectId}:`, e.message)
    // 반쯤 만든 복사본 정리 — 복사한 파일 → 새 작업 행(사진 행은 on delete cascade). 원본은 건드리지 않았다
    try { await storageRemove(cfg, BUCKET, copied) } catch (re) {
      console.error(`[studio-upload] 복사 실패 뒤 파일 정리 실패 (${copied.length}개, 새 작업 ${newProjectId}):`, re.message)
    }
    if (projectInserted) {
      try {
        await sb(cfg, `studio_projects?id=eq.${newProjectId}&user_id=eq.${ctx.userId}`, { method: 'DELETE', prefer: 'return=minimal' })
      } catch (de) {
        // 행이 남아도 deleted_at이 찍혀 있어 목록·편집기에 보이지 않는다
        console.error(`[studio-upload] 복사 실패 뒤 새 작업 행 정리 실패 ${newProjectId} (deleted_at 표시 상태로 남음):`, de.message)
      }
    }
    return sendError(res, 500, 'copy_failed', '복사본을 만들지 못했습니다. 원래 작업은 그대로입니다.')
  }
  return res.status(200).json({
    projectId: newProjectId, title: plan.projectRow.title, images: plan.imageRows.length, files: copied.length, missing,
  })
}

// ── 배경 지우기 (17-1) ──────────────────────────────────────────────────────
/** 화면이 [배경합성] 패널을 열 때 — 쓸 수 있는지만 알려 준다 (한도 숫자는 알려 주지 않는다) */
async function bgStatus(ctx, body, res) {
  if (!(await isBgEligible(ctx))) return res.status(200).json({ ready: false, reason: 'not_eligible' })
  const p = bgProviderConfig()
  if (!p.ready) return res.status(200).json({ ready: false, reason: 'no_key' })
  if (!(await usageTableReady(ctx))) return res.status(200).json({ ready: false, reason: 'no_table' })
  return res.status(200).json({ ready: true, reason: null, model: p.modelKey })
}

async function bgRemove(ctx, body, res) {
  const { cfg } = ctx
  const t = await loadPatchTarget(ctx, body, res) // 본인·안 지운·안 끝난 작업의 done 사진만 (남의 사진이면 404 — 서명 주소를 만들지 않는다)
  if (!t) return
  if (!(await isBgEligible(ctx))) return sendError(res, 403, 'bg_not_eligible', '이유씨로 주문한 고객에게 열리는 기능이에요.')
  const p = bgProviderConfig()
  if (!p.ready) return sendError(res, 503, 'bg_not_ready', '잠시 후 다시 시도해 주세요.')
  const rows = await sb(cfg, `studio_images?select=original_path&id=eq.${t.image.id}&user_id=eq.${ctx.userId}&limit=1`)
  const originalPath = Array.isArray(rows) && rows[0] ? rows[0].original_path : null
  if (typeof originalPath !== 'string' || !originalPath.startsWith(`${ctx.userId}/${t.project.id}/orig/`)) {
    console.error(`[studio-upload] bg: 원본 경로가 규칙과 다름 ${t.image.id}:`, originalPath)
    return sendError(res, 404, 'not_found', '원본 사진을 찾을 수 없습니다.')
  }
  const W = t.image.width, H = t.image.height
  if (Math.max(W, H) > BG_MAX_SIDE) {
    return sendError(res, 400, 'bg_too_large', `긴 변이 ${BG_MAX_SIDE}px 이하인 사진만 배경을 지울 수 있어요.`)
  }

  const key = bgMaskKey(originalPath, p.model.endpoint)
  const folder = bgFolder(ctx.userId, t.project.id, t.image.id)
  const name = `mask_${key}.png`
  const path = `${folder}/${name}`
  const out = { path, key, model: p.modelKey, width: W, height: H }

  // 사용 기록 확인 — 테이블이 없으면 "준비 중"
  const limit = bgDailyLimit()
  try {
    const u = await usageCheck(ctx, t.image.id, limit)
    if (u.busy) return sendError(res, 409, 'bg_busy', '이 사진의 배경을 지우는 중이에요.')
    // 같은 원본·같은 모델 마스크가 이미 있으면 다시 부르지 않는다 (돈이 나가지 않음 — 한도보다 먼저)
    let names
    try {
      names = await storageList(cfg, BUCKET, folder)
    } catch (e) {
      console.error(`[studio-upload] bg 목록 조회 실패 ${folder}:`, e.message)
      return sendError(res, 500, 'storage_error', '저장소를 확인하지 못했습니다.')
    }
    if (names.includes(name)) return res.status(200).json({ ...out, reused: true })
    if (u.overLimit) return sendError(res, 429, 'bg_daily_limit', '오늘은 더 할 수 없어요. 내일 다시 시도해 주세요.')
  } catch (e) {
    if (isUsageUnavailable(e)) {
      console.error('[studio-upload] bg: studio_ai_usage를 쓸 수 없음 — 준비 중:', e.message)
      return sendError(res, 503, 'bg_not_ready', '잠시 후 다시 시도해 주세요.')
    }
    throw e
  }

  // 처리 중 표시 (pending) — 실패하면 지운다(기록을 남기지 않는다)
  let usageId
  try {
    const ins = await sb(cfg, 'studio_ai_usage?select=id', {
      method: 'POST', prefer: 'return=representation',
      body: { user_id: ctx.userId, kind: 'bg_remove', status: 'pending', project_id: t.project.id, image_id: t.image.id, provider: p.model.provider, model: p.model.endpoint },
    })
    usageId = ins?.[0]?.id
    if (usageId === undefined || usageId === null) throw new Error('studio_ai_usage insert 결과에 id 없음')
  } catch (e) {
    if (isUsageUnavailable(e)) return sendError(res, 503, 'bg_not_ready', '잠시 후 다시 시도해 주세요.')
    throw e
  }
  const dropUsage = async why => {
    try {
      await sb(cfg, `studio_ai_usage?id=eq.${usageId}&user_id=eq.${ctx.userId}&status=eq.pending`, { method: 'DELETE', prefer: 'return=minimal' })
    } catch (e) {
      // 남아도 2분 뒤에는 처리 중으로 보지 않는다 (하루 수에는 들어감)
      console.error(`[studio-upload] bg 실패 뒤 pending 기록 지우기 실패 (${why}) id=${usageId}:`, e.message)
    }
  }

  let result
  try {
    const imageUrl = await storageSignDownload(cfg, BUCKET, originalPath, BG_SIGN_SECONDS)
    result = await removeBackground({ falKey: p.falKey, modelKey: p.modelKey, imageUrl })
  } catch (e) {
    await dropUsage('fal')
    const code = e instanceof BgProviderError ? e.code : 'bg_failed'
    console.error(`[studio-upload] bg 외부 처리 실패 ${t.image.id} (${p.modelKey}, ${code}):`, e.message)
    return code === 'bg_timeout'
      ? sendError(res, 504, 'bg_timeout', '배경 지우기가 오래 걸려 멈췄어요. 잠시 후 다시 눌러 주세요.')
      : sendError(res, 502, 'bg_failed', '배경을 지우지 못했어요. 잠시 후 다시 눌러 주세요.')
  }

  let mask
  try {
    mask = buildMaskPng(result.buf, W, H)
    if (mask.png.length > BG_MASK_MAX_BYTES) throw new Error(`마스크 ${mask.png.length} bytes`)
    await storageUpload(cfg, BUCKET, path, mask.png, 'image/png')
  } catch (e) {
    await dropUsage('mask')
    console.error(`[studio-upload] bg 마스크 만들기·저장 실패 ${t.image.id}:`, e.message)
    return sendError(res, 502, 'bg_failed', '배경을 지우지 못했어요. 잠시 후 다시 눌러 주세요.')
  }

  try {
    await sb(cfg, `studio_ai_usage?id=eq.${usageId}&user_id=eq.${ctx.userId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: { status: 'ok', cost_usd: result.costUsd, meta: { ms: result.ms, via: result.via, mask_from: mask.from, resized: mask.resized, src: [mask.srcW, mask.srcH], w: W, h: H } },
    })
  } catch (e) {
    // 결과는 이미 저장됨 — pending으로 남는다(하루 수에는 들어감). 숨기지 않고 남긴다
    console.error(`[studio-upload] bg 사용 기록 완료 표시 실패 id=${usageId}:`, e.message)
  }
  console.log(`[studio-upload] bg_remove ${t.image.id} ${p.modelKey} ${result.ms}ms via=${result.via} mask=${mask.from}${mask.resized ? ' (크기 맞춤)' : ''}`)
  return res.status(200).json({ ...out, reused: false })
}

// ── 배경 경계 다듬기 (17-3) — 브라우저가 만든 다듬은 마스크 저장 (외부 AI 없음) ────────────────
const BG_REFINE_TOO_LARGE_MSG = `다듬은 결과는 ${BG_MASK_MAX_BYTES / 1024 / 1024}MB 이하여야 합니다.`

async function bgRefinePrepare(ctx, body, res) {
  const key = String(body.key ?? '')
  const width = Number(body.width), height = Number(body.height), size = Number(body.size)
  if (!PATCH_KEY_RE.test(key)) return sendError(res, 400, 'invalid_input', 'key 형식이 올바르지 않습니다.')
  if (!Number.isInteger(size) || size < 1 || size > BG_MASK_MAX_BYTES) return sendError(res, 400, 'bg_refine_too_large', BG_REFINE_TOO_LARGE_MSG)
  const t = await loadPatchTarget(ctx, body, res) // 본인·안 지운·안 끝난 작업의 done 사진만
  if (!t) return
  if (width !== t.image.width || height !== t.image.height) {
    return sendError(res, 400, 'invalid_input', '다듬은 결과의 가로·세로가 원본과 다릅니다.')
  }
  const folder = bgFolder(ctx.userId, t.project.id, t.image.id)
  const name = `refined_${key}.png`
  const path = `${folder}/${name}`
  let names
  try {
    names = await storageList(ctx.cfg, BUCKET, folder)
  } catch (e) {
    console.error(`[studio-upload] bg 목록 조회 실패 ${folder}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소를 확인하지 못했습니다.')
  }
  if (names.includes(name)) return res.status(200).json({ exists: true, path })
  if (names.filter(n => BG_REFINED_NAME_RE.test(n)).length >= BG_REFINED_MAX_FILES) {
    return sendError(res, 400, 'bg_refine_limit', `사진 한 장의 다듬기 결과는 ${BG_REFINED_MAX_FILES}개까지 저장할 수 있습니다.`)
  }
  let token
  try {
    token = await storageSignUpload(ctx.cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] 다듬기 업로드 URL 발급 실패 ${path}:`, e.message)
    return sendError(res, 500, 'sign_failed', '업로드 준비에 실패했습니다.')
  }
  return res.status(200).json({ path, token })
}

async function bgRefineConfirm(ctx, body, res) {
  const t = await loadPatchTarget(ctx, body, res)
  if (!t) return
  const path = String(body.path ?? '')
  const prefix = `${bgFolder(ctx.userId, t.project.id, t.image.id)}/`
  // 다듬은 마스크 이름만 받는다 — AI 마스크(mask_)·다른 폴더는 여기서 확인하지 않는다
  if (!path.startsWith(prefix) || !BG_REFINED_NAME_RE.test(path.slice(prefix.length))) {
    return sendError(res, 400, 'invalid_input', '경로가 올바르지 않습니다.')
  }
  let dl
  try {
    dl = await storageDownload(ctx.cfg, BUCKET, path)
  } catch (e) {
    console.error(`[studio-upload] 다듬기 파일 읽기 실패 ${path}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소에서 파일을 확인하지 못했습니다.')
  }
  if (!dl.found) return sendError(res, 400, 'not_uploaded', '업로드된 파일이 없습니다.')
  const buf = dl.buf
  let bad = null
  let dims = null
  if (buf.length > BG_MASK_MAX_BYTES) bad = ['bg_refine_too_large', BG_REFINE_TOO_LARGE_MSG]
  else if (sniffMime(buf) !== 'image/png') bad = ['bg_refine_invalid', 'PNG 파일이 아닙니다.']
  else {
    dims = readDimensions(buf, 'image/png')
    if (!dims || !dims.width || !dims.height) bad = ['bg_refine_invalid', '이미지 크기를 읽을 수 없습니다.']
    else if (dims.width !== t.image.width || dims.height !== t.image.height) bad = ['bg_refine_invalid', '다듬은 결과의 가로·세로가 원본과 다릅니다.']
  }
  if (bad) {
    console.warn(`[studio-upload] 다듬기 파일 불합격 ${path}: ${bad[0]} (${buf.length} bytes)`)
    try {
      await storageRemove(ctx.cfg, BUCKET, [path])
    } catch (e) {
      console.error(`[studio-upload] 불합격 다듬기 파일 삭제 실패 ${path}:`, e.message)
      return sendError(res, 400, `${bad[0]}+delete_failed`, bad[1])
    }
    return sendError(res, 400, bad[0], bad[1])
  }
  return res.status(200).json({ ok: true, width: dims.width, height: dims.height })
}

// ── AI 배경 (17-4) ──────────────────────────────────────────────────────────
/** [배경합성] 패널이 열릴 때·만든 뒤 — 쓸 수 있는지 + 오늘 남은 무료 횟수 (서버 값 기준) */
async function bgGenStatus(ctx, body, res) {
  if (!(await isBgEligible(ctx))) return res.status(200).json({ ready: false, reason: 'not_eligible' })
  const p = bgGenProviderConfig()
  if (!p.ready) return res.status(200).json({ ready: false, reason: 'no_key' })
  const staff = await isBgStaff(ctx)
  const limit = bgGenDailyLimit()
  let used
  try {
    used = await genUsageToday(ctx, limit)
  } catch (e) {
    if (isUsageUnavailable(e)) {
      console.error('[studio-upload] bg_gen: studio_ai_usage를 쓸 수 없음 — 준비 중:', e.message)
      return res.status(200).json({ ready: false, reason: 'no_table' })
    }
    throw e
  }
  return res.status(200).json({
    ready: true, reason: null, staff, perDay: BG_GEN_FREE_PER_DAY,
    left: staff ? null : Math.max(0, BG_GEN_FREE_PER_DAY - used.mine),
    globalLeft: Math.max(0, limit - used.all), model: p.modelKey,
  })
}

async function bgGenerate(ctx, body, res) {
  const { cfg } = ctx
  const preset = String(body.preset ?? '')
  if (!Object.hasOwn(BG_GEN_PRESETS, preset)) return sendError(res, 400, 'invalid_input', '장면을 다시 골라 주세요.')
  const t = await loadPatchTarget(ctx, body, res) // 본인·안 지운·안 끝난 작업의 done 사진만 (남의 사진이면 404 — 서명 주소를 만들지 않는다)
  if (!t) return
  if (!(await isBgEligible(ctx))) return sendError(res, 403, 'bg_not_eligible', '이유씨로 주문한 고객에게 열리는 기능이에요.')
  const p = bgGenProviderConfig()
  if (!p.ready) return sendError(res, 503, 'bg_not_ready', '잠시 후 다시 시도해 주세요.')
  const rows = await sb(cfg, `studio_images?select=original_path,edit&id=eq.${t.image.id}&user_id=eq.${ctx.userId}&limit=1`)
  const row = Array.isArray(rows) ? rows[0] : null
  const originalPath = row?.original_path
  if (typeof originalPath !== 'string' || !originalPath.startsWith(`${ctx.userId}/${t.project.id}/orig/`)) {
    console.error(`[studio-upload] bg_gen: 원본 경로가 규칙과 다름 ${t.image.id}:`, originalPath)
    return sendError(res, 404, 'not_found', '원본 사진을 찾을 수 없습니다.')
  }
  const folder = bgFolder(ctx.userId, t.project.id, t.image.id)
  // 제품은 우리 마스크로 덮으므로 배경을 지운(저장된) 사진만 — 화면이 잠그지만 서버도 막는다 (돈이 나가는 곳)
  const maskPath = row?.edit?.bg?.mask?.path
  if (typeof maskPath !== 'string' || !maskPath.startsWith(`${folder}/mask_`)) {
    return sendError(res, 400, 'bg_gen_need_mask', '먼저 [배경 지우기]를 해 주세요.')
  }
  const W = t.image.width, H = t.image.height
  if (Math.max(W, H) > BG_MAX_SIDE) return sendError(res, 400, 'bg_too_large', `긴 변이 ${BG_MAX_SIDE}px 이하인 사진만 AI 배경을 만들 수 있어요.`)

  const staff = await isBgStaff(ctx)
  const limit = bgGenDailyLimit()
  try {
    if (await genBusy(ctx, t.image.id)) return sendError(res, 409, 'bg_busy', '이 사진의 AI 배경을 만드는 중이에요.')
  } catch (e) {
    if (isUsageUnavailable(e)) return sendError(res, 503, 'bg_not_ready', '잠시 후 다시 시도해 주세요.')
    throw e
  }

  // 처리 중 표시 (pending) → 한도 안에 드는지 (동시 요청도 id 순서로 앞 N개만) → 아니면 지우고 막는다
  let usageId
  try {
    const ins = await sb(cfg, 'studio_ai_usage?select=id', {
      method: 'POST', prefer: 'return=representation',
      body: { user_id: ctx.userId, kind: BG_GEN_KIND, status: 'pending', project_id: t.project.id, image_id: t.image.id, provider: p.model.provider, model: p.model.endpoint },
    })
    usageId = ins?.[0]?.id
    if (usageId === undefined || usageId === null) throw new Error('studio_ai_usage insert 결과에 id 없음')
  } catch (e) {
    if (isKindCheckError(e)) {
      console.error('[studio-upload] bg_gen: studio_ai_usage kind 체크에 bg_generate가 없음 — 17-4 보고서 9장 SQL을 먼저 실행해야 함:', e.message)
      return sendError(res, 503, 'bg_gen_sql_missing', '잠시 후 다시 시도해 주세요.')
    }
    if (isUsageUnavailable(e)) return sendError(res, 503, 'bg_not_ready', '잠시 후 다시 시도해 주세요.')
    throw e
  }
  const dropUsage = async why => {
    try {
      await sb(cfg, `studio_ai_usage?id=eq.${usageId}&user_id=eq.${ctx.userId}&status=eq.pending`, { method: 'DELETE', prefer: 'return=minimal' })
    } catch (e) {
      // 남아도 2분 뒤에는 세지 않는다 (_studioBgGen countedFilter)
      console.error(`[studio-upload] bg_gen 실패 뒤 pending 기록 지우기 실패 (${why}) id=${usageId}:`, e.message)
    }
  }
  try {
    if (!staff && !(await withinLimit(ctx, usageId, 'user', BG_GEN_FREE_PER_DAY))) {
      await dropUsage('user_limit')
      return sendError(res, 429, 'bg_gen_user_limit', '오늘 무료 3회를 모두 썼어요. 내일 다시 쓸 수 있어요.')
    }
    if (!(await withinLimit(ctx, usageId, 'all', limit))) {
      await dropUsage('global_limit')
      return sendError(res, 429, 'bg_gen_global_limit', '지금은 AI 배경을 만들 수 없어요. 잠시 후 다시 시도해 주세요.')
    }
  } catch (e) {
    await dropUsage('limit_check')
    throw e
  }

  let result
  try {
    const imageUrl = await storageSignDownload(cfg, BUCKET, originalPath, BG_SIGN_SECONDS)
    result = await generateBackground({ falKey: p.falKey, modelKey: p.modelKey, imageUrl, prompt: BG_GEN_PRESETS[preset] })
  } catch (e) {
    await dropUsage('fal')
    const code = e instanceof BgProviderError ? e.code : 'bg_failed'
    console.error(`[studio-upload] bg_gen 외부 처리 실패 ${t.image.id} (${p.modelKey}, ${code}):`, e.message)
    return code === 'bg_timeout'
      ? sendError(res, 504, 'bg_gen_timeout', 'AI 배경이 오래 걸려 멈췄어요. 횟수는 줄지 않았어요. 잠시 후 다시 눌러 주세요.')
      : sendError(res, 502, 'bg_gen_failed', 'AI 배경을 만들지 못했어요. 횟수는 줄지 않았어요. 잠시 후 다시 눌러 주세요.')
  }

  // 받은 바이트 그대로 저장 (다시 인코딩하지 않는다). 형식·크기는 머리에서만 읽는다
  let out
  try {
    const buf = result.buf
    const mime = sniffMime(buf)
    const ext = BG_AI_EXT[mime]
    if (!ext) throw new Error(`결과 형식이 이미지가 아님 (${mime})`)
    if (buf.length > BG_GEN_MAX_BYTES) throw new Error(`결과 ${buf.length} bytes`)
    const dims = readDimensions(buf, mime)
    if (!dims?.width || !dims?.height) throw new Error('결과 크기를 읽을 수 없음')
    const key = bgAiKey(buf)
    const name = `ai_${key}.${ext}`
    const path = `${folder}/${name}`
    const names = await storageList(cfg, BUCKET, folder)
    if (!names.includes(name)) await storageUpload(cfg, BUCKET, path, buf, mime)
    out = { path, key, w: dims.width, h: dims.height, preset, model: p.modelKey }
  } catch (e) {
    await dropUsage('save')
    console.error(`[studio-upload] bg_gen 결과 저장 실패 ${t.image.id}:`, e.message)
    return sendError(res, 502, 'bg_gen_failed', 'AI 배경을 만들지 못했어요. 횟수는 줄지 않았어요. 잠시 후 다시 눌러 주세요.')
  }

  try {
    await sb(cfg, `studio_ai_usage?id=eq.${usageId}&user_id=eq.${ctx.userId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: { status: 'ok', cost_usd: result.costUsd, meta: { ms: result.ms, via: result.via, preset, w: out.w, h: out.h, src: [W, H] } },
    })
  } catch (e) {
    // 결과는 이미 저장됨 — pending으로 남으면 2분 뒤부터 세지 않는다(손님에게 유리). 숨기지 않고 남긴다
    console.error(`[studio-upload] bg_gen 사용 기록 완료 표시 실패 id=${usageId}:`, e.message)
  }
  let left = null
  if (!staff) {
    try {
      left = Math.max(0, BG_GEN_FREE_PER_DAY - (await genUsageToday(ctx, limit)).mine)
    } catch (e) {
      console.error('[studio-upload] bg_gen 남은 횟수 다시 세기 실패 (화면이 상태를 다시 묻는다):', e.message)
    }
  }
  console.log(`[studio-upload] bg_generate ${t.image.id} ${p.modelKey} ${preset} ${result.ms}ms via=${result.via} ${out.w}x${out.h}`)
  return res.status(200).json({ ...out, left })
}

// ── product_facts (원클릭 1단계 글자 초안) ──────────────────────────────────
const OFFER_ID_RE = /^\d{9,16}$/
async function productFacts(ctx, body, res) {
  const project = await loadOwnedRow(ctx, 'studio_projects', String(body.projectId ?? ''), 'id,offer_id')
  if (!project) return sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.')
  const offerId = String(project.offer_id ?? '')
  if (!OFFER_ID_RE.test(offerId)) return res.status(200).json({ facts: null, reason: 'no_offer', texts: 0, translated: 0 })
  const rows = await sb(ctx.cfg, `studio_product_snapshots?select=status,item:raw->item&offer_id=eq.${offerId}&limit=1`)
  const snap = Array.isArray(rows) && rows.length ? rows[0] : null
  if (!snap || snap.status !== 'ok' || !snap.item) {
    console.info(`[studio-upload] product_facts ${offerId}: 저장된 상품 정보 없음 (status=${snap?.status ?? '행 없음'})`)
    return res.status(200).json({ facts: null, reason: 'no_snapshot', texts: 0, translated: 0 })
  }
  const f = extractFacts(snap.item)
  const texts = factTexts(f)
  const ko = await lookupCachedTranslations(texts, CACHE_SOURCE_LANG, CACHE_TARGET_LANG)
  console.log(`[studio-upload] product_facts ${offerId}: 원문 ${texts.length}개 중 한국어 ${ko.size}개 (번역 캐시만)`)
  return res.status(200).json({ facts: withKo(f, ko), reason: null, texts: texts.length, translated: ko.size })
}

// ── 내 상품 보관 (2026-09-28) ────────────────────────────────────────────────
// 받기(브라우저 다운로드)는 그대로 — 받은 파일을 한 벌 더 둘 뿐이다. 표(studio_exports)가 없으면 503 export_sql_missing(보관만 준비 중).
const EXPORT_SELECT = 'id,project_id,stamp,folder,title,format,scale,mode,file_count,files,thumb_path,created_at'
const EXPORT_THUMB_MAX_BYTES = 2 * 1024 * 1024
const EXPORT_THUMB_MAX_SIDE = 1024

async function exportTableGate(ctx, res) {
  if (await exportsTableReady(ctx)) return true
  sendError(res, 503, 'export_sql_missing', '잠시 후 다시 시도해 주세요.')
  return false
}

/** 본인 보관 기록 한 줄. 없으면 404를 보내고 null */
async function loadOwnedExport(ctx, body, res) {
  const id = String(body.exportId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) { sendError(res, 400, 'invalid_input', 'exportId 형식이 올바르지 않습니다.'); return null }
  const rows = await sb(ctx.cfg, `studio_exports?select=${EXPORT_SELECT}&id=eq.${id}&user_id=eq.${ctx.userId}&limit=1`)
  const ex = Array.isArray(rows) ? rows[0] : null
  if (!ex) { sendError(res, 404, 'not_found', '내 상품을 찾을 수 없습니다.'); return null }
  return ex
}

/** 이 보관 기록에 넣을 파일 — key 'thumb' = 목록 미리보기 JPG, 그 밖 = 내보낸 파일 */
function exportTarget(ex, key) {
  if (key === 'thumb') return { path: `${ex.folder}/thumb.jpg`, name: 'thumb.jpg', mime: 'image/jpeg', maxBytes: EXPORT_THUMB_MAX_BYTES }
  if (!KEY_RE.test(key) || (ex.mode === 'long') !== (key === 'all')) return null
  return { path: `${ex.folder}/${key}.${ex.format}`, name: `${key}.${ex.format}`, mime: EXPORT_FORMATS[ex.format], maxBytes: EXPORT_MAX_BYTES }
}

/** POST { action:'export_begin', projectId, title, format, scale, mode, count, source?('save' = [작업 저장]) } → { exportId, stamp } */
async function exportBegin(ctx, body, res) {
  const format = String(body.format ?? ''), mode = String(body.mode ?? '')
  const scale = Number(body.scale), count = Number(body.count)
  if (!EXPORT_FORMATS[format] || !EXPORT_MODES.includes(mode) || !EXPORT_SCALES.includes(scale)
    || !Number.isInteger(count) || count < 1 || count > EXPORT_MAX_FILES || (mode === 'long' && count !== 1)) {
    return sendError(res, 400, 'invalid_input', 'format·scale·mode·count 값이 올바르지 않습니다.')
  }
  const project = await loadOwnedRow(ctx, 'studio_projects', String(body.projectId ?? ''), 'id')
  if (!project) return sendError(res, 404, 'not_found', '프로젝트를 찾을 수 없습니다.')
  if (!(await exportTableGate(ctx, res))) return
  const source = body.source === undefined ? 'download' : String(body.source)
  if (!EXPORT_SOURCES.includes(source)) return sendError(res, 400, 'invalid_input', 'source 값이 올바르지 않습니다.')
  const stamp = exportStamp()
  const title = String(body.title ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100) || null // 받을 때 보인 작업 이름 (표시용)
  const row0 = { user_id: ctx.userId, project_id: project.id, stamp, folder: exportFolder(ctx.userId, project.id, stamp), title, format, scale, mode, file_count: count, files: [] }
  if (source === 'save') row0.source = 'save' // [다운로드]는 칸을 보내지 않는다 (source 칸을 만들기 전에도 그대로 되게)
  let rows
  try {
    rows = await sb(ctx.cfg, 'studio_exports', { method: 'POST', body: row0, prefer: 'return=representation' })
  } catch (e) {
    if (source === 'save' && isSourceColumnMissing(e)) return saveColumnMissing(res, 'export_begin', e)
    throw e
  }
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) throw new Error('studio_exports insert: 응답에 행이 없음')
  return res.status(200).json({ exportId: row.id, stamp })
}

/** POST { action:'export_file_prepare', exportId, key, size } → { exists:true, path } | { path, token } */
async function exportFilePrepare(ctx, body, res) {
  if (!(await exportTableGate(ctx, res))) return
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const key = String(body.key ?? '')
  const t = exportTarget(ex, key)
  if (!t) return sendError(res, 400, 'invalid_input', 'key가 올바르지 않습니다.')
  const size = Number(body.size)
  if (!Number.isInteger(size) || size < 1 || size > t.maxBytes) {
    return sendError(res, 400, 'export_too_large', `파일은 ${Math.round(t.maxBytes / 1024 / 1024)}MB 이하여야 보관할 수 있습니다.`)
  }
  const files = Array.isArray(ex.files) ? ex.files : []
  if (key !== 'thumb' && !files.some(f => f.key === key) && files.length >= ex.file_count) {
    return sendError(res, 400, 'invalid_input', '처음에 알린 파일 수보다 많습니다.')
  }
  let names
  try {
    names = await storageList(ctx.cfg, BUCKET, ex.folder)
  } catch (e) {
    console.error(`[studio-upload] exports 목록 조회 실패 ${ex.folder}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소를 확인하지 못했습니다.')
  }
  if (names.includes(t.name)) return res.status(200).json({ exists: true, path: t.path })
  let token
  try {
    token = await storageSignUpload(ctx.cfg, BUCKET, t.path)
  } catch (e) {
    console.error(`[studio-upload] 내 상품 업로드 URL 발급 실패 ${t.path}:`, e.message)
    return sendError(res, 500, 'sign_failed', '업로드 준비에 실패했습니다.')
  }
  return res.status(200).json({ path: t.path, token })
}

/**
 * POST { action:'export_file_confirm', exportId, key, path, name } → { ok:true, saved }
 *   서버가 파일을 읽어 형식(JPG/PNG 매직바이트)·크기·가로세로를 확인 → files 칸(또는 thumb_path)에 기록. 불합격이면 파일을 지우고 오류
 */
async function exportFileConfirm(ctx, body, res) {
  if (!(await exportTableGate(ctx, res))) return
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const key = String(body.key ?? '')
  const t = exportTarget(ex, key)
  if (!t || String(body.path ?? '') !== t.path) return sendError(res, 400, 'invalid_input', '경로가 올바르지 않습니다.')
  const name = key === 'thumb' ? 'thumb.jpg' : cleanExportName(body.name, ex.format)
  if (!name) return sendError(res, 400, 'invalid_input', '파일 이름이 올바르지 않습니다.')
  let dl
  try {
    dl = await storageDownload(ctx.cfg, BUCKET, t.path)
  } catch (e) {
    console.error(`[studio-upload] 내 상품 읽기 실패 ${t.path}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소에서 파일을 확인하지 못했습니다.')
  }
  if (!dl.found) return sendError(res, 400, 'not_uploaded', '업로드된 파일이 없습니다.')
  const buf = dl.buf
  let bad = null
  let dims = null
  if (buf.length > t.maxBytes) bad = ['export_too_large', '파일이 너무 큽니다.']
  else if (sniffMime(buf) !== t.mime) bad = ['export_invalid', '파일 형식이 내보낸 형식과 다릅니다.']
  else {
    dims = readDimensions(buf, t.mime)
    if (!dims || !dims.width || !dims.height) bad = ['export_invalid', '이미지 크기를 읽을 수 없습니다.']
    else if (key === 'thumb' && Math.max(dims.width, dims.height) > EXPORT_THUMB_MAX_SIDE) bad = ['export_invalid', '미리보기가 너무 큽니다.']
  }
  if (bad) {
    console.warn(`[studio-upload] 내 상품 불합격 ${t.path}: ${bad[0]} (${buf.length} bytes)`)
    try {
      await storageRemove(ctx.cfg, BUCKET, [t.path])
    } catch (e) {
      console.error(`[studio-upload] 불합격 내 상품 삭제 실패 ${t.path}:`, e.message)
      return sendError(res, 400, `${bad[0]}+delete_failed`, bad[1])
    }
    return sendError(res, 400, bad[0], bad[1])
  }
  const patch = key === 'thumb'
    ? { thumb_path: t.path }
    : { files: upsertExportFile(ex.files, { key, name, path: t.path, width: dims.width, height: dims.height, bytes: buf.length }) }
  await sb(ctx.cfg, `studio_exports?id=eq.${ex.id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
  return res.status(200).json({ ok: true, saved: key === 'thumb' ? null : patch.files.length })
}

function saveColumnMissing(res, where, e) {
  console.error(`[studio-upload] ${where}: studio_exports.source 칸이 없음 — docs/sql/2026-09-28-studio-folders.sql 실행 필요:`, e.message)
  return sendError(res, 503, 'export_sql_missing', '잠시 후 다시 시도해 주세요.')
}

/**
 * POST { action:'export_save_commit', exportId } → { exportId, updated }
 *   [작업 저장] 마무리. exportId = 방금 source:'save'로 만든 보관 기록(파일 확인까지 끝난 것).
 *   그 작업에 예전 저장이 있으면: 예전 기록(id 그대로)에 새 결과물을 옮기고 방금 만든 기록은 지운다 → 카드가 늘지 않는다.
 *   판매처로 보낸 기록(marketplace_sends.export_id)은 예전 id를 가리키므로 그대로 남는다.
 */
async function exportSaveCommit(ctx, body, res) {
  if (!(await exportTableGate(ctx, res))) return
  const id = String(body.exportId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) return sendError(res, 400, 'invalid_input', 'exportId 형식이 올바르지 않습니다.')
  let fresh, olds
  try {
    const rows = await sb(ctx.cfg, `studio_exports?select=${EXPORT_SELECT},source&id=eq.${id}&user_id=eq.${ctx.userId}&limit=1`)
    fresh = Array.isArray(rows) ? rows[0] : null
    if (!fresh) return sendError(res, 404, 'not_found', '내 상품을 찾을 수 없습니다.')
    if (fresh.source !== 'save') return sendError(res, 400, 'invalid_input', '[작업 저장]으로 만든 기록이 아닙니다.')
    if (!Array.isArray(fresh.files) || fresh.files.length === 0) return sendError(res, 400, 'not_uploaded', '저장된 파일이 없습니다.')
    olds = await sb(ctx.cfg, `studio_exports?select=${EXPORT_SELECT}&project_id=eq.${fresh.project_id}&user_id=eq.${ctx.userId}&source=eq.save&id=neq.${fresh.id}&order=created_at.asc&limit=1`)
  } catch (e) {
    if (isSourceColumnMissing(e)) return saveColumnMissing(res, 'export_save_commit', e)
    throw e
  }
  const old = Array.isArray(olds) ? olds[0] : null
  if (!old) return res.status(200).json({ exportId: fresh.id, updated: false })

  // 방금 만든 기록을 지우고(같은 stamp가 두 줄이 될 수 없다) 예전 기록에 결과물을 옮긴다. 옮기기가 실패하면 방금 기록을 되살린다
  await sb(ctx.cfg, `studio_exports?id=eq.${fresh.id}&user_id=eq.${ctx.userId}`, { method: 'DELETE', prefer: 'return=minimal' })
  try {
    await sb(ctx.cfg, `studio_exports?id=eq.${old.id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', body: savePatchFrom(fresh), prefer: 'return=minimal' })
  } catch (e) {
    console.error(`[studio-upload] export_save_commit: 예전 저장 ${old.id} 갱신 실패 — 방금 기록 ${fresh.id}을 되살림:`, e.message)
    const { id: fid, ...rest } = fresh
    await sb(ctx.cfg, 'studio_exports', { method: 'POST', body: { id: fid, user_id: ctx.userId, ...rest }, prefer: 'return=minimal' })
    throw e
  }
  // 예전 파일 치우기 — 방금 판매처로 보냈으면(1시간 안) 판매처가 아직 내려받는 중일 수 있어 남겨 둔다. 실패해도 저장은 끝난 것
  try {
    const since = new Date(Date.now() - SAVE_CLEANUP_HOLD_MS).toISOString()
    const recent = await sb(ctx.cfg, `marketplace_sends?select=id&export_id=eq.${old.id}&user_id=eq.${ctx.userId}&created_at=gte.${encodeURIComponent(since)}&limit=1`)
    if (Array.isArray(recent) && recent.length) {
      console.info(`[studio-upload] export_save_commit: ${old.id} 예전 파일을 남겨 둠 (1시간 안에 판매처로 보냄)`)
    } else {
      const paths = [...(Array.isArray(old.files) ? old.files.map(f => f.path) : []), old.thumb_path].filter(p => typeof p === 'string' && p.startsWith(`${old.folder}/`))
      if (paths.length) await storageRemove(ctx.cfg, BUCKET, paths)
    }
  } catch (e) {
    console.error(`[studio-upload] export_save_commit: 예전 파일 정리 실패 ${old.folder} (저장은 끝남):`, e.message)
  }
  console.log(`[studio-upload] export_save_commit ${ctx.userId}: ${old.id} 갱신 (${fresh.files.length}장)`)
  return res.status(200).json({ exportId: old.id, updated: true })
}

/** POST { action:'exports_list' } → { ready, items:[{ id, projectId, title, createdAt, format, scale, mode, count, planned, previewUrl }] } */
async function exportsList(ctx, body, res) {
  if (!(await exportsTableReady(ctx))) return res.status(200).json({ ready: false, items: [] })
  const rows = await sb(ctx.cfg,
    `studio_exports?select=${EXPORT_SELECT}&user_id=eq.${ctx.userId}&order=created_at.desc&limit=${EXPORTS_LIST_MAX}`)
  const list = (Array.isArray(rows) ? rows : []).filter(r => Array.isArray(r.files) && r.files.length > 0)
  const items = await runPool(list, 6, async r => {
    let previewUrl = null
    if (r.thumb_path) {
      try {
        previewUrl = await storageSignDownload(ctx.cfg, BUCKET, r.thumb_path, EXPORT_SIGN_SECONDS)
      } catch (e) {
        console.error(`[studio-upload] 내 상품 미리보기 주소 실패 ${r.thumb_path}:`, e.message)
      }
    }
    return {
      id: r.id, projectId: r.project_id, title: r.title, createdAt: r.created_at, format: r.format, scale: r.scale, mode: r.mode,
      count: r.files.length, planned: r.file_count, previewUrl,
    }
  })
  return res.status(200).json({ ready: true, items })
}

/** POST { action:'export_download', exportId } → { files:[{ name, url, bytes }] } (서명 주소 10분) */
async function exportDownload(ctx, body, res) {
  if (!(await exportTableGate(ctx, res))) return
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const files = Array.isArray(ex.files) ? ex.files : []
  if (!files.length) return sendError(res, 404, 'not_found', '보관된 파일이 없습니다.')
  let out
  try {
    out = await runPool(files, 6, async f => ({ name: f.name, bytes: f.bytes, url: await storageSignDownload(ctx.cfg, BUCKET, f.path, EXPORT_SIGN_SECONDS) }))
  } catch (e) {
    console.error(`[studio-upload] 내 상품 받기 주소 실패 ${ex.folder}:`, e.message)
    return sendError(res, 500, 'storage_error', '저장소에서 파일을 찾지 못했습니다.')
  }
  return res.status(200).json({ files: out })
}

// ── handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ctx = await studioGuard(req, res)
  if (!ctx) return

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  try {
    // 화면이 스튜디오 화면을 열기 전에 묻는다 (2026-09-28) — 관문(studioGuard)을 통과했으면 쓸 수 있다. 막히면 관문이 이미 403 not_customer 등을 보냈다
    if (body.action === 'access') return res.status(200).json({ ok: true, staff: ctx.isAdmin === true, mode: ctx.mode })
    if (body.action === 'prepare') return await prepare(ctx, body, res)
    if (body.action === 'confirm') return await confirm(ctx, body, res)
    if (body.action === 'patch_prepare') return await patchPrepare(ctx, body, res)
    if (body.action === 'patch_confirm') return await patchConfirm(ctx, body, res)
    if (body.action === 'final_prepare') return await finalPrepare(ctx, body, res)
    if (body.action === 'final_confirm') return await finalConfirm(ctx, body, res)
    if (body.action === 'project_copy') return await projectCopy(ctx, body, res)
    if (body.action === 'bg_status') return await bgStatus(ctx, body, res)
    if (body.action === 'bg_remove') return await bgRemove(ctx, body, res)
    if (body.action === 'bg_refine_prepare') return await bgRefinePrepare(ctx, body, res)
    if (body.action === 'bg_refine_confirm') return await bgRefineConfirm(ctx, body, res)
    if (body.action === 'bg_gen_status') return await bgGenStatus(ctx, body, res)
    if (body.action === 'bg_generate') return await bgGenerate(ctx, body, res)
    if (body.action === 'product_facts') return await productFacts(ctx, body, res)
    if (body.action === 'export_begin') return await exportBegin(ctx, body, res)
    if (body.action === 'export_file_prepare') return await exportFilePrepare(ctx, body, res)
    if (body.action === 'export_file_confirm') return await exportFileConfirm(ctx, body, res)
    if (body.action === 'exports_list') return await exportsList(ctx, body, res)
    if (body.action === 'export_download') return await exportDownload(ctx, body, res)
    if (body.action === 'export_save_commit') return await exportSaveCommit(ctx, body, res)
    return sendError(res, 400, 'invalid_input', "action은 'access'·'prepare'·'confirm'·'patch_prepare'·'patch_confirm'·'final_prepare'·'final_confirm'·'project_copy'·'bg_status'·'bg_remove'·'bg_refine_prepare'·'bg_refine_confirm'·'bg_gen_status'·'bg_generate'·'product_facts'·'export_begin'·'export_file_prepare'·'export_file_confirm'·'exports_list'·'export_download'·'export_save_commit' 중 하나여야 합니다.")
  } catch (e) {
    console.error(`[studio-upload] ${body.action} 처리 실패:`, e.message)
    return sendError(res, 500, 'internal', '업로드 처리 중 오류가 발생했습니다.')
  }
}
