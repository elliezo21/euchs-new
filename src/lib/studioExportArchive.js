/**
 * 내 상품 보관 (2026-09-28) — [내보내기]로 받은 이미지를 서버(api/studio-upload.js export_*)에 한 벌 더 둔다.
 *   export_begin(보관 기록 한 줄) → 파일마다 export_file_prepare(1회용 토큰) → uploadToSignedUrl → export_file_confirm(서버가 형식·크기 확인 후 기록)
 *   studioFinalUpload와 같은 2단계. 받기(브라우저 다운로드)는 이것과 상관없이 그대로 — 보관이 실패해도 받은 파일은 남는다.
 * 실패는 throw — err.code는 서버·studioApi 코드 그대로. 'export_sql_missing' = 표(studio_exports) 설정 전이라 준비 중.
 */
import { supabase } from '@/lib/supabase'
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

export const ARCHIVE_MAX_BYTES = 20 * 1024 * 1024 // 버킷 file_size_limit 20971520 · 서버 _studioExports.EXPORT_MAX_BYTES와 같은 값
export const THUMB_W = 360                         // 목록 미리보기 폭
export const THUMB_MAX_H = 480                     // 긴 이미지는 위쪽만

function apiError(r) {
  const err = new Error(studioErrorMessage('export', r.code))
  err.code = r.code
  return err
}

/** 파일 key — 서버 _studioExports.exportKey와 같은 규칙 (no = 섹션 번호, null = 한 장으로 길게) */
export function archiveKey(no) {
  return no === null ? 'all' : String(no).padStart(2, '0')
}

/**
 * @param source 'save' = [작업 저장] (작업마다 카드 하나 — 끝나면 commitSave로 마무리) / 없음 = [다운로드]
 * @returns {Promise<string>} exportId
 */
export async function beginArchive({ projectId, title, format, scale, mode, count, source }) {
  const r = await callStudioApi('studio-upload', { action: 'export_begin', projectId, title, format, scale, mode, count, ...(source ? { source } : {}) })
  if (!r.ok) throw apiError(r)
  return r.data.exportId
}

async function putFile(exportId, key, blob, name, contentType) {
  const prep = await callStudioApi('studio-upload', { action: 'export_file_prepare', exportId, key, size: blob.size })
  if (!prep.ok) throw apiError(prep)
  const { path, token, exists } = prep.data
  if (!exists) {
    const { error } = await supabase.storage.from('studio').uploadToSignedUrl(path, token, blob, { contentType })
    if (error) {
      console.error('[studioExportArchive] 내 상품 업로드 실패:', path, error.message)
      const err = new Error(studioErrorMessage('export', 'upload_failed'))
      err.code = 'upload_failed'
      throw err
    }
  }
  const conf = await callStudioApi('studio-upload', { action: 'export_file_confirm', exportId, key, path, name })
  if (!conf.ok) throw apiError(conf)
  return conf.data
}

/** 내보낸 파일 하나 보관 — 20MB가 넘으면 올리지 않고 export_too_large */
export async function archiveFile(exportId, { key, name, blob }) {
  if (blob.size > ARCHIVE_MAX_BYTES) {
    const err = new Error(studioErrorMessage('export', 'export_too_large'))
    err.code = 'export_too_large'
    throw err
  }
  return putFile(exportId, key, blob, name, blob.type)
}

/** 목록 미리보기 — 첫 파일을 폭 THUMB_W로 줄이고 위쪽 THUMB_MAX_H까지 JPG */
export async function makeThumb(blob) {
  const bmp = await createImageBitmap(blob)
  try {
    const w = THUMB_W
    const fullH = Math.max(1, Math.round((bmp.height * w) / bmp.width))
    const h = Math.min(THUMB_MAX_H, fullH)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, w, h)
    g.drawImage(bmp, 0, 0, bmp.width, (h * bmp.width) / w, 0, 0, w, h)
    const out = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82))
    if (!out) throw new Error('미리보기 JPG를 만들지 못했어요')
    return out
  } finally {
    bmp.close()
  }
}

export async function archiveThumb(exportId, blob) {
  return putFile(exportId, 'thumb', blob, 'thumb.jpg', 'image/jpeg')
}

/**
 * [작업 저장] 마무리 — 그 작업에 예전 저장이 있으면 그 카드를 새 결과물로 바꾼다(카드가 늘지 않는다, 판매처로 보낸 기록은 그대로)
 * @returns {Promise<{ exportId:string, updated:boolean }>} exportId = 내 상품에 남은 카드의 id
 */
export async function commitSave(exportId) {
  const r = await callStudioApi('studio-upload', { action: 'export_save_commit', exportId })
  if (!r.ok) throw apiError(r)
  return r.data
}

/** 작업 홈 내 상품 목록 → { ready, items } (ready=false = 표 설정 전) */
export async function listArchives() {
  const r = await callStudioApi('studio-upload', { action: 'exports_list' })
  if (!r.ok) throw apiError(r)
  return r.data
}

/** [내 상품] 목록(2026-10-02) — 작업마다 지금 결과물 하나 + 그 작업의 결과물 id 전부 → { ready, items:[{ …, source, exportIds }] } */
export async function listProductExports() {
  const r = await callStudioApi('studio-upload', { action: 'exports_list', perProject: true })
  if (!r.ok) throw apiError(r)
  return r.data
}

/**
 * [다시 받기] — 보관된 파일을 받는다(편집기를 열지 않는다). 파일마다 서명 주소 → 받아서 원래 이름으로 저장
 * @param onStep (done, total)
 */
export async function downloadArchive(exportId, onStep = () => {}) {
  const r = await callStudioApi('studio-upload', { action: 'export_download', exportId })
  if (!r.ok) throw apiError(r)
  const files = r.data.files
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const resp = await fetch(f.url)
    if (!resp.ok) {
      console.error('[studioExportArchive] 보관 파일 받기 실패:', f.name, resp.status)
      const err = new Error(`${f.name}을(를) 받지 못했어요 (HTTP ${resp.status})`)
      err.code = 'storage_error'
      throw err
    }
    saveBlob(await resp.blob(), f.name)
    onStep(i + 1, files.length)
    if (i < files.length - 1) await new Promise(res => setTimeout(res, 400)) // 여러 파일을 한꺼번에 내려받지 않게 (내보내기 창과 같게)
  }
  return files.length
}

/** 브라우저 다운로드 (내보내기 창 download와 같은 방식) */
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
