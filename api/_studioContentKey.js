/**
 * 상세 이미지가 "지금 작업 내용"으로 만든 것인지 (2026-10-02 — [작업 저장]을 페이지만 저장으로 바꾸면서)
 * 순수 함수 — 서버(api/studio-upload.js work_save·export_render_status)와 브라우저(src/lib/studioProductImages.js)가 같은 파일을 쓴다.
 *
 * [내용 열쇠 contentKey] = 그림을 바꾸는 저장 값만으로 만든 짧은 글자
 *   studio_projects.page_version (페이지를 저장할 때마다 오른다 — 낙관적 잠금 칸)
 *   + 그 작업의 사진마다 studio_images.edit_version (지우기·덮기·필터·자르기·배경을 저장할 때마다 오른다)
 *   글꼴·에셋 그림은 사이트에 고정된 파일이라 넣지 않는다. 완성 JPG(final_rendered_version)는 같은 모습을 미리 구운 것이라 넣지 않는다.
 * [어디에 적나] 새 칸 없이 studio_exports.files 각 항목의 ck (서버가 export_file_confirm 때 받은 값을 적는다)
 *   → 파일이 다 있고(files.length = file_count) 모든 항목의 ck가 같을 때만 그 열쇠로 만든 결과물로 본다.
 */

export const CONTENT_KEY_RE = /^v1:p\d{1,9}:n\d{1,4}:[0-9a-f]{16}$/

// FNV-1a 32비트 두 벌(시작값이 다름) — 서버·브라우저 같은 결과, 외부 모듈 없음
function fnv(str, seed) {
  let h = seed >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/**
 * @param {number} pageVersion studio_projects.page_version
 * @param {{ id:string, edit_version:number }[]} images 그 작업의 studio_images 전부 (순서 상관없음)
 * @returns {string|null} 값이 이상하면 null (= 알 수 없음 → 다시 만든다)
 */
export function contentKeyOf(pageVersion, images) {
  if (!Number.isInteger(pageVersion) || pageVersion < 0) return null
  const list = Array.isArray(images) ? images : []
  const parts = []
  for (const r of list) {
    if (!r || typeof r.id !== 'string' || !Number.isInteger(r.edit_version)) return null
    parts.push(`${r.id}:${r.edit_version}`)
  }
  parts.sort()
  const s = `${pageVersion}|${parts.join(',')}`
  return `v1:p${pageVersion}:n${parts.length}:${fnv(s, 0x811c9dc5)}${fnv(s, 0x01234567)}`
}

/**
 * 결과물(studio_exports 한 줄)이 어떤 내용으로 만든 것인지 — 파일이 다 있고 모든 ck가 같을 때만 그 값, 아니면 null
 * @param {{ files?:object[], file_count?:number }} row
 */
export function filesContentKey(row) {
  const files = Array.isArray(row?.files) ? row.files : []
  if (!files.length || files.length !== row?.file_count) return null
  const ck = files[0]?.ck
  if (typeof ck !== 'string' || !CONTENT_KEY_RE.test(ck)) return null
  return files.every(f => f?.ck === ck) ? ck : null
}

/** 파일이 다 들어온 결과물인지 (처음에 알린 장 수만큼) */
export function isCompleteExport(row) {
  const files = Array.isArray(row?.files) ? row.files : []
  return files.length > 0 && files.length === row?.file_count
}
