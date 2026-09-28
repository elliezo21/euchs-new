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
