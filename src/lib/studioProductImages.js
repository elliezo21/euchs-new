/**
 * 내 상품 상세 이미지 — 필요할 때 만들기 (2026-10-02)
 *
 * 예전: [작업 저장]을 누를 때마다 상세 이미지를 그려 올렸다 (11장 46초 · 19장 113초 — 그리기 1초 안팎, 나머지는 업로드·서버 확인).
 * 지금: [작업 저장] = 작업 내용(페이지·사진 편집)만 저장 + 저장한 시각(서버 work_save). 상세 이미지는
 *   ① 편집기가 열려 있으면 저장 직후 뒤에서 만든다(startBackgroundRender — 화면을 막지 않는다, 편집기 위쪽에 진행 표시)
 *   ② 판매처로 보낼 때(한 상품·여러 상품)·[이미지 다시 받기] 때 최신이 아니면 그때 만든다(ensureProductImages — 진행 "상세 이미지 만드는 중 3/11")
 *   ③ 최신이면(내용 열쇠가 같으면 — api/_studioContentKey.js) 전에 만든 것을 그대로 쓴다
 * 그리기는 편집기와 같은 함수(studioExportDeps + studioExport 엔진). 사진 상태는 DB edit에서 읽는다(편집기 세션과 같은 읽기 함수).
 * 설정은 예전 [작업 저장]과 같다: 여러 장으로 나눠서(세로 SLICE_MAX_PX마다 · 섹션 경계 우선) · JPG(3MB 이하로 맞춤) · 1배 · 전체 섹션.
 * 올리기 = 예전 길 그대로(export_begin source 'save' → 파일마다 prepare·업로드·confirm(동시 ARCHIVE_POOL장, 확인은 한 줄) → 미리보기 → export_save_commit)
 *   → 내 상품 카드 id는 그대로(판매처로 보낸 기록이 끊기지 않는다). 파일 항목마다 만든 때의 내용 열쇠(ck)를 적는다.
 * 한 번에 한 작업만 그린다(큰 캔버스 — 여러 상품 보내기도 차례로). 같은 작업을 같은 내용으로 이미 만드는 중이면 그것을 기다린다.
 */
import { reactive } from 'vue'
import { loadMyProject, listEditorImages } from '@/lib/studioProjects'
import { readPage } from '@/lib/studioPage'
import { readLayers } from '@/lib/studioEdit'
import { readLook } from '@/lib/studioLook'
import { readBg } from '@/lib/studioBg'
import { shapeFromEdit } from '@/lib/studioCrop'
import { usableFinalVersion } from '@/lib/studioFinal'
import { createSignedUrlPool } from '@/lib/studioImageCache'
import { createTextMeasure } from '@/lib/studioFonts'
import { exportPlan, exportFileName, fileBaseName, EXPORT_FORMATS } from '@/lib/studioExport'
import { createExportDeps, renderExportFile } from '@/lib/studioExportDeps'
import {
  beginArchive, archiveFile, archiveThumb, makeThumb, archiveKey, commitSave, renderStatus, discardArchive, ARCHIVE_POOL,
} from '@/lib/studioExportArchive'
import { serializeByKey } from '@/lib/studioSerial'
import { contentKeyOf } from '../../api/_studioContentKey.js'
import { currentUser } from '@/lib/auth'

export const RENDER_SETTINGS = { mode: 'sections', format: 'jpg', scale: 1 } // 예전 [작업 저장]과 같은 기본 설정
const CANCELLED = 'render_cancelled'

/** 진행 문구 하나 — 편집기 위쪽·보내기 창·여러 상품 보내기가 같은 글자 */
export function renderProgressText(p) {
  if (!p) return ''
  if (p.phase === 'check') return '상세 이미지 확인 중…'
  if (p.phase === 'load') return '상세 이미지 준비 중…'
  if (p.phase === 'render') return `상세 이미지 만드는 중 ${p.done} / ${p.total}`
  if (p.phase === 'commit') return '상세 이미지 저장 중…'
  return ''
}

// 작업마다 지금 상태 — 편집기 위쪽 표시가 본다. { status: 'running'|'done'|'error', progress, message, exportId, at }
export const renderState = reactive({})
const jobs = new Map() // projectId → { key, promise, ctrl }
const textMeasure = createTextMeasure()

function cancelledError() {
  const e = new Error('상세 이미지 만들기를 멈췄어요')
  e.code = CANCELLED
  return e
}

/** DB에서 그릴 재료 읽기 — 페이지·사진 행 → { project, page, rows, contentKey } */
export async function loadRenderSource(projectId) {
  const [project, rows] = await Promise.all([loadMyProject(projectId), listEditorImages(projectId)])
  if (!project) throw Object.assign(new Error('작업을 찾을 수 없어요'), { code: 'not_found' })
  const { page, problems } = readPage(project.page, project.id)
  if (problems.length) {
    console.error('[studioProductImages] 페이지 내용을 읽지 못함:', project.id, problems)
    throw Object.assign(new Error(`페이지 내용을 읽지 못했어요 (${problems[0]})`), { code: 'page_invalid' })
  }
  if (!page || !page.sections.length) throw Object.assign(new Error('편집기에서 페이지를 만든 뒤 [작업 저장]을 눌러 주세요.'), { code: 'page_empty' })
  return { project, page, rows, contentKey: contentKeyOf(project.page_version, rows) }
}

/** 편집기 밖 그리기 재료 — 사진 상태는 DB edit에서 (편집기 세션이 여는 때와 같은 읽기 함수) */
function headlessDeps(rows, pool) {
  const byId = new Map(rows.map(r => [r.id, r]))
  const memo = new Map()
  const once = (key, id, fn) => { const k = `${key}:${id}`; if (!memo.has(k)) memo.set(k, fn(byId.get(id)?.edit)); return memo.get(k) }
  return createExportDeps({
    rowOf: id => byId.get(id),
    layersOf: id => once('layers', id, edit => readLayers(edit, id)),
    lookOf: id => once('look', id, readLook),
    shapeOf: id => once('shape', id, shapeFromEdit),
    bgOf: id => once('bg', id, readBg),
    finalVersionOf: usableFinalVersion,
    urlPool: pool,
    measure: textMeasure,
    where: 'studioProductImages',
  }).deps
}

/**
 * 그려서 올리기 (한 번) — 끝나면 내 상품 카드 id
 * @param {{ onProgress?:Function, pool?:object, ctrl:{ stopped:boolean } }} o
 */
async function renderAndStore(projectId, { onProgress, pool, ctrl }) {
  const t0 = performance.now()
  onProgress({ phase: 'load', done: 0, total: 0 })
  const src = await loadRenderSource(projectId)
  if (!src.contentKey) {
    console.error('[studioProductImages] 내용 열쇠를 만들 수 없음 (page_version·edit_version 값 확인):', projectId, src.project.page_version)
    throw Object.assign(new Error('잠시 후 다시 시도해 주세요.'), { code: 'content_key' })
  }
  const page = src.page
  const plan = exportPlan(page, { ...RENDER_SETTINGS, sectionIds: page.sections.map(s => s.id) })
  if (plan.tooLarge.length || !plan.files.length) throw Object.assign(new Error('섹션이 너무 길어 이미지로 만들 수 없어요. 편집기에서 섹션 높이를 줄여 주세요.'), { code: 'too_large' })
  const deps = headlessDeps(src.rows, pool || createSignedUrlPool())
  const files = plan.files
  const base = fileBaseName(src.project.title)
  const ext = EXPORT_FORMATS[RENDER_SETTINGS.format].ext
  const exportId = await beginArchive({ projectId, title: base, ...RENDER_SETTINGS, count: files.length, source: 'save' })
  let renderMs = 0
  let done = 0
  const notes = []
  onProgress({ phase: 'render', done: 0, total: files.length })
  const inflight = new Set()
  const errors = []
  let thumbDone = false
  const cache = { entry: null }
  try {
    for (let i = 0; i < files.length; i++) {
      if (ctrl.stopped) throw cancelledError()
      if (errors.length) break
      const file = files[i]
      const tr = performance.now()
      const out = await renderExportFile(page, file, deps, { format: RENDER_SETTINGS.format, scale: RENDER_SETTINGS.scale, cache })
      renderMs += performance.now() - tr
      notes.push(...out.notes)
      const name = exportFileName(base, file, ext)
      const first = i === 0
      const job = (async () => {
        await archiveFile(exportId, { key: archiveKey(file.no), name, blob: out.blob, contentKey: src.contentKey })
        done++
        onProgress({ phase: 'render', done, total: files.length })
        if (first && !thumbDone) {
          thumbDone = true
          try {
            await archiveThumb(exportId, await makeThumb(out.blob))
          } catch (e) {
            // 파일은 보관됐다 — 목록에서 미리보기 자리만 첫 사진으로 보인다
            console.error('[studioProductImages] 내 상품 미리보기 보관 실패:', e.code, e)
          }
        }
      })().catch(e => { errors.push(e) }).finally(() => inflight.delete(job))
      inflight.add(job)
      if (inflight.size >= ARCHIVE_POOL) await Promise.race(inflight)
    }
    await Promise.all(inflight)
    if (errors.length) throw errors[0]
    if (ctrl.stopped) throw cancelledError()
    onProgress({ phase: 'commit', done, total: files.length })
    const r = await commitSave(exportId)
    if (notes.length) console.warn('[studioProductImages] 그리면서 남은 알림 (화면과 같은 상태로 만들었음):', notes)
    console.info(`[studioProductImages] 상세 이미지 ${files.length}장 · 전체 ${Math.round(performance.now() - t0)}ms · 그리기 ${Math.round(renderMs)}ms · 동시 ${ARCHIVE_POOL}장 · 작업 ${projectId}`)
    return { exportId: r.exportId, count: files.length, contentKey: src.contentKey }
  } catch (e) {
    await Promise.all(inflight)
    // 다 못 올린 줄은 지운다(내 상품 카드는 그대로). 못 지우면 서버가 30분 뒤 정리한다(export_render_status·export_save_commit)
    discardArchive(exportId).catch(d => console.error('[studioProductImages] 만들다 멈춘 줄 지우기 실패 (서버가 나중에 정리):', exportId, d.code, d))
    throw e
  }
}

/** 한 작업 그리기 — 같은 작업을 다른 내용으로 만드는 중이면 그것을 멈추고 새로 (한 번에 한 작업만 그린다) */
function startJob(projectId, key, { pool }) {
  const prev = jobs.get(projectId)
  if (prev && prev.key === key) return prev
  if (prev) prev.ctrl.stopped = true
  const ctrl = { stopped: false }
  const job = { key, ctrl, promise: null }
  shownUid = currentUser.value?.id || null
  renderState[projectId] = { status: 'running', progress: { phase: 'check', done: 0, total: 0 }, message: '', exportId: renderState[projectId]?.exportId || null, at: Date.now() }
  const onProgress = p => { if (jobs.get(projectId) === job) renderState[projectId] = { ...renderState[projectId], progress: p } }
  job.promise = serializeByKey('studio-product-render', () => {
    if (ctrl.stopped) throw cancelledError()
    return renderAndStore(projectId, { onProgress, pool, ctrl })
  }).then(r => {
    if (jobs.get(projectId) === job) {
      jobs.delete(projectId)
      renderState[projectId] = { status: 'done', progress: null, message: '', exportId: r.exportId, at: Date.now() }
    }
    return r
  }, e => {
    if (jobs.get(projectId) === job) {
      jobs.delete(projectId)
      renderState[projectId] = { status: e.code === CANCELLED ? 'idle' : 'error', progress: null, message: e.message || String(e), exportId: renderState[projectId]?.exportId || null, at: Date.now() }
    }
    throw e
  })
  jobs.set(projectId, job)
  return job
}

/**
 * 보내기·다시 받기 전 — 최신이면 그대로, 아니면 만든다
 * @param {{ projectId?:string, exportId?:string }} who 작업 또는 그 작업의 결과물
 * @param {{ onProgress?:(p)=>void, pool?:object }} o  onProgress = { phase, done, total } (문구는 renderProgressText)
 * @returns {Promise<{ exportId:string, rendered:boolean, count:number }>} exportId = 내 상품 카드(보낼 결과물)
 */
export async function ensureProductImages(who, { onProgress = () => {}, pool } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    onProgress({ phase: 'check', done: 0, total: 0 })
    const st = await renderStatus(who)
    if (st.fresh && st.cardId) return { exportId: st.cardId, rendered: false, count: st.count }
    const job = startJob(st.projectId, st.contentKey, { pool })
    const stop = watchProgress(st.projectId, job, onProgress)
    try {
      const r = await job.promise
      return { exportId: r.exportId, rendered: true, count: r.count }
    } catch (e) {
      if (e.code !== CANCELLED) throw e
      // 그 사이 편집기에서 다시 저장해 새 내용으로 만들기 시작함 — 처음부터 다시 확인
      console.info('[studioProductImages] 만드는 중에 내용이 바뀌어 다시 확인:', st.projectId)
      who = { projectId: st.projectId }
    } finally {
      stop()
    }
  }
  throw Object.assign(new Error('잠시 후 다시 시도해 주세요.'), { code: 'render_busy' })
}
function watchProgress(projectId, job, onProgress) {
  let last = null
  const timer = setInterval(() => {
    const p = jobs.get(projectId) === job ? renderState[projectId]?.progress : null
    if (p && p !== last) { last = p; onProgress(p) }
  }, 150)
  return () => clearInterval(timer)
}

/**
 * 편집기 [작업 저장] 직후 — 뒤에서 만든다(화면을 막지 않는다). 편집기를 떠나도 이 탭에서는 이어서 만든다(탭을 닫으면 보낼 때 다시 만든다).
 * 실패는 renderState[projectId].status = 'error' + message (편집기 위쪽에 [다시 시도]) — 원인은 콘솔
 * @param {{ contentKey:string|null, fresh:boolean, cardId }} saved work_save 응답
 */
export function startBackgroundRender(projectId, saved, { pool } = {}) {
  if (saved?.fresh && saved.cardId) {
    renderState[projectId] = { status: 'done', progress: null, message: '', exportId: saved.cardId, at: Date.now() }
    return
  }
  const job = startJob(projectId, saved?.contentKey || null, { pool })
  job.promise.catch(e => {
    if (e.code === CANCELLED) return
    console.error('[studioProductImages] 뒤에서 상세 이미지 만들기 실패 (보낼 때 다시 만든다):', projectId, e.code, e)
  })
}

/** 로그아웃·계정 바뀜 — 만들던 것을 멈춘다(다음 장부터) */
export function cancelAllRenders() {
  for (const [id, job] of jobs) { job.ctrl.stopped = true; jobs.delete(id) }
  for (const id of Object.keys(renderState)) delete renderState[id]
}
// auth.js는 같은 사용자로도 euchs-auth-changed를 다시 보낸다(탭 복귀·토큰 갱신) — 사용자가 바뀌었을 때만 멈춘다
let shownUid = null
if (typeof window !== 'undefined') {
  window.addEventListener('euchs-auth-changed', () => {
    const uid = currentUser.value?.id || null
    if (uid !== shownUid) cancelAllRenders()
    shownUid = uid
  })
}
