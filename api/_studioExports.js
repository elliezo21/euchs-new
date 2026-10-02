/**
 * 내 상품 보관 (2026-09-28) — [내보내기]로 받은 이미지를 Storage studio 버킷에 한 벌 더 둔다. 서버 공통(순수 함수 + 표 확인).
 * 흐름(action export_begin·export_file_prepare·export_file_confirm·exports_list·export_download)은 api/studio-upload.js.
 *
 * 경로: {uid}/{projectId}/exports/{stamp}/{key}.{jpg|png}
 *   stamp = 내보낸 시각(KST) YYYYMMDD-HHmmss + '-' + 16진 4자 (같은 초에 두 번 눌러도 겹치지 않게) — 서버가 만든다
 *   key   = 섹션별 여러 장이면 페이지 안 섹션 번호 두 자리(01, 02 …), 한 장으로 길게면 'all'
 *   Storage 키에 한글을 쓸 수 없어서 파일 이름은 key만. 받을 때 이름(작업이름_01.jpg)은 studio_exports.files[].name에 둔다.
 * 쓰기는 서버가 준 1회용 서명 업로드 토큰으로만(브라우저 insert 정책은 final/·assets/뿐 — 열지 않는다). 읽기는 기존 "본인 폴더" 정책 + 서버 서명 주소.
 *
 * 기록 studio_exports (새 테이블 — SQL docs/sql/2026-09-28-studio-launch.sql, 해성이 실행). 없거나 권한이 없으면 보관만 "준비 중"(받기는 그대로).
 */
import crypto from 'crypto'
import { sb } from './_studio.js'
import { isCompleteExport } from './_studioContentKey.js'

export const EXPORT_MAX_BYTES = 20 * 1024 * 1024   // 버킷 file_size_limit 20971520과 같음
export const EXPORT_FORMATS = { jpg: 'image/jpeg', png: 'image/png' } // 브라우저 studioExport EXPORT_FORMATS와 같은 두 가지
export const EXPORT_MODES = ['sections', 'long']
export const EXPORT_SCALES = [1, 2]
export const EXPORT_MAX_FILES = 200                // 한 번 내보내기의 파일 수 상한 (섹션 수보다 넉넉하게)
export const EXPORTS_LIST_MAX = 60                 // 작업 홈 목록에 한 번에 보이는 수
export const EXPORT_SIGN_SECONDS = 600             // 미리보기·다시 받기 서명 주소 유효 시간 (10분)
export const STAMP_RE = /^\d{8}-\d{6}-[0-9a-f]{4}$/
export const KEY_RE = /^(all|\d{2,4})$/

/** 내보낸 시각 폴더 이름 — KST YYYYMMDD-HHmmss-xxxx */
export function exportStamp(d = new Date(), rand = () => crypto.randomBytes(2).toString('hex')) {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString() // 2026-09-28T09:03:12.345Z (KST 값)
  return `${k.slice(0, 4)}${k.slice(5, 7)}${k.slice(8, 10)}-${k.slice(11, 13)}${k.slice(14, 16)}${k.slice(17, 19)}-${rand()}`
}

export function exportFolder(uid, projectId, stamp) {
  return `${uid}/${projectId}/exports/${stamp}`
}

/** 파일 key — no = 페이지 안 섹션 번호(1부터), null = 한 장으로 길게 */
export function exportKey(no) {
  if (no === null) return 'all'
  return Number.isInteger(no) && no >= 1 && no <= 9999 ? String(no).padStart(2, '0') : null
}

/** 받을 때 이름 정리 — 경로에는 쓰지 않는다(표시·다운로드 이름만). 경로 구분자·제어문자 제거, 120자 */
export function cleanExportName(name, ext) {
  const s = String(name ?? '').replace(/[\\/\u0000-\u001f\u007f]/g, '').trim().slice(0, 120)
  return s && s.toLowerCase().endsWith(`.${ext}`) ? s : null
}

/**
 * files 칸에 한 파일 넣기 — 같은 key면 바꾼다(다시 시도). key 순서(01, 02 … all)로 정렬한 새 배열
 * @param {{ key, name, path, width, height, bytes }[]} files
 */
export function upsertExportFile(files, file) {
  const list = (Array.isArray(files) ? files : []).filter(f => f && f.key !== file.key)
  list.push(file)
  return list.sort((a, b) => (a.key === 'all' ? 1 : 0) - (b.key === 'all' ? 1 : 0) || a.key.localeCompare(b.key))
}

// 보관 종류 — download = [다운로드]로 받으면서 보관(받을 때마다 새 카드) / save = [작업 저장](작업마다 카드 하나 — 다시 저장하면 그 카드를 새 결과물로 바꾼다)
// studio_exports.source 칸 (SQL docs/sql/2026-09-28-studio-folders.sql). 칸이 없으면 [작업 저장]만 안 되고 [다운로드]는 그대로
export const EXPORT_SOURCES = ['download', 'save']
export const SAVE_CLEANUP_HOLD_MS = 60 * 60 * 1000 // 판매처로 보낸 지 1시간 안이면 예전 파일을 지우지 않는다 (판매처가 아직 내려받는 중일 수 있다)

/** source 칸이 없음 (SQL 실행 전) — PostgREST 400 + 칸 이름 */
export function isSourceColumnMissing(err) {
  return err?.status === 400 && /source/.test(String(err?.message || ''))
}

/**
 * [작업 저장] 마무리 — 새로 만든 보관 기록(fresh)의 결과물을 그 작업의 예전 저장(old)에 옮길 값.
 * id는 old 그대로(판매처로 보낸 기록 marketplace_sends.export_id가 끊기지 않는다), 결과물 칸만 바뀐다.
 */
export function savePatchFrom(fresh) {
  return {
    stamp: fresh.stamp, folder: fresh.folder, title: fresh.title, format: fresh.format, scale: fresh.scale, mode: fresh.mode,
    file_count: fresh.file_count, files: fresh.files, thumb_path: fresh.thumb_path, created_at: fresh.created_at,
  }
}

/**
 * [내 상품] 목록 한 줄 = 작업(project) 하나 (2026-10-02) — 작업마다 지금 판매처로 보낼 결과물 하나와 그 작업의 모든 결과물 id.
 * 지금 결과물 = [작업 저장](source 'save')이 있으면 그것(작업마다 하나 — 다시 저장하면 같은 id), 없으면 가장 최근 [다운로드] 보관.
 * 판매처로 보낸 기록(marketplace_sends.export_id)은 예전 결과물을 가리킬 수 있어 ids를 함께 준다(목록이 작업 단위로 모은다).
 * @param {[{ id, project_id, source?, created_at, files }]} rows 최근순이 아니어도 된다
 * @returns {[{ current, ids:string[] }]}  작업마다 하나 · 지금 결과물이 최근인 순
 */
export function currentExportsByProject(rows) {
  const t = r => { const v = new Date(r?.created_at).getTime(); return Number.isFinite(v) ? v : 0 }
  const by = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r?.id || !r.project_id) continue
    if (!by.has(r.project_id)) by.set(r.project_id, [])
    by.get(r.project_id).push(r)
  }
  const out = []
  for (const list of by.values()) {
    list.sort((a, b) => t(b) - t(a))
    // [작업 저장] 결과물은 파일이 다 들어온 것만 (2026-10-02 — 상세 이미지를 뒤에서 만들므로 만드는 중·멈춘 줄이 잠깐 있을 수 있다)
    const current = list.find(r => r.source === 'save' && isCompleteExport(r)) || list.find(r => r.source !== 'save') || null
    if (!current) continue
    out.push({ current, ids: list.map(r => r.id) })
  }
  return out.sort((a, b) => t(b.current) - t(a.current))
}
export const PRODUCT_EXPORTS_MAX = 2000 // [내 상품] 목록이 한 번에 읽는 결과물 수 상한 (넘으면 최근 것만 — 원인 로그)

/** 표가 없음·권한 없음(GRANT 누락) — 보관만 "준비 중"으로 */
export function isExportsUnavailable(err) {
  return err?.status === 404 || err?.status === 401 || err?.status === 403
}

/** studio_exports를 쓸 수 있는지 (읽기 한 번). 표 문제면 원인을 남기고 false, 그 밖의 실패는 throw */
export async function exportsTableReady(ctx) {
  try {
    await sb(ctx.cfg, `studio_exports?select=id&user_id=eq.${ctx.userId}&limit=1`)
    return true
  } catch (e) {
    if (isExportsUnavailable(e)) {
      console.error('[studio-export] studio_exports를 쓸 수 없음(테이블·GRANT 확인 — docs/sql/2026-09-28-studio-launch.sql) — 내 상품 보관 준비 중:', e.message)
      return false
    }
    throw e
  }
}
