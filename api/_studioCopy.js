/**
 * 작업 복사본 (16단계) — 복사 계획을 세우는 순수 함수 (네트워크 없음, node 테스트: scripts/test-studio-copy.mjs)
 * 실제 복사(행 넣기·Storage 파일 복사·실패 정리)는 api/studio-upload.js project_copy가 한다.
 *
 * ★ 원칙: 복사본과 원본은 파일을 같이 쓰지 않는다. 사진 행·Storage 파일을 모두 새 작업 폴더로 복사하고,
 *   행 안의 경로(original_path, edit.layers[].ai.patch.path)와 페이지 안의 사진 id(items[].imageId, parked)를 새 값으로 바꾼다.
 *   완성 JPG(final)는 행에 경로가 없고 규칙으로 만든다(final/{imageId}_v{final_rendered_version}.jpg) — 그 한 장만 복사한다.
 *   경로가 이 작업 폴더 규칙에 맞지 않으면 복사하지 않는다(throw) — 모르는 파일을 두 작업이 같이 가리키게 두지 않는다.
 *   예외: translated_path(_shared/mt/…)는 설계상 모든 작업이 같이 쓰는 번역 캐시라(작업 삭제 대상 아님) 그대로 둔다.
 * ★ 경로 규칙 (api/studio-upload.js·studio-ingest.js가 만드는 것과 같음)
 *     {uid}/{projectId}/orig/{imageId}.{ext}
 *     {uid}/{projectId}/patches/{imageId}/{layerId}_{key}.png
 *     {uid}/{projectId}/final/{imageId}_v{version}.jpg
 *     {uid}/{projectId}/bg/{imageId}/mask_{key}.png        (17-1 배경 마스크 — edit.bg.mask.path)
 */

export const COPY_SUFFIX = ' (복사본)'
export const TITLE_MAX = 100 // studio_projects.title check (char_length ≤ 100)

// 사진 행에서 그대로 옮기는 칸 (id·project_id·user_id·original_path·edit는 새로 만든다. created_at·updated_at은 DB 기본값)
export const COPY_IMAGE_FIELDS = [
  'kind', 'sort_order', 'source_url', 'source_key', 'width', 'height', 'bytes', 'mime', 'sha256',
  'ingest_status', 'ingest_error', 'translated_path', 'translated_width', 'translated_height',
  'mt_status', 'mt_error', 'mt_options_hash', 'mt_at', 'mode', 'included', 'auto_class', 'auto_confidence', 'auto_reason',
  'edit_version', 'final_rendered_version', 'upload_name',
]

/** 복사본 이름 = 원래 이름(없으면 1688 제목) + " (복사본)", 100자 안 (글자 단위로 자름 — 이모지를 반으로 자르지 않게) */
export function copyTitle(p) {
  const base = String(p?.title || p?.title_zh || '제목 없음').trim() || '제목 없음'
  const chars = Array.from(base)
  const room = TITLE_MAX - Array.from(COPY_SUFFIX).length
  return (chars.length > room ? chars.slice(0, room).join('').trimEnd() : base) + COPY_SUFFIX
}

function copyError(message) {
  const e = new Error(message)
  e.code = 'copy_bad_path'
  return e
}

/** 원본 사진 경로 → 새 경로. 규칙이 다르면 throw */
export function newOrigPath(path, { uid, fromProject, toProject, fromImage, toImage }) {
  const m = /^([^/]+)\/([^/]+)\/orig\/([^/]+)\.([a-z0-9]+)$/.exec(String(path || ''))
  if (!m || m[1] !== uid || m[2] !== fromProject || m[3] !== fromImage) throw copyError(`원본 경로가 규칙과 다름: ${path}`)
  return `${uid}/${toProject}/orig/${toImage}.${m[4]}`
}

/** AI 결과 조각 경로 → 새 경로 (파일 이름 = 레이어 id_key 그대로). 규칙이 다르면 throw */
export function newPatchPath(path, { uid, fromProject, toProject, fromImage, toImage }) {
  const from = `${uid}/${fromProject}/patches/${fromImage}/`
  const p = String(path || '')
  const name = p.startsWith(from) ? p.slice(from.length) : ''
  if (!name || name.includes('/')) throw copyError(`AI 결과 조각 경로가 규칙과 다름: ${path}`)
  return `${uid}/${toProject}/patches/${toImage}/${name}`
}

/** 배경 마스크 경로 → 새 경로 (17-1, 파일 이름 = mask_{key}.png 그대로). 규칙이 다르면 throw */
export function newBgPath(path, { uid, fromProject, toProject, fromImage, toImage }) {
  const from = `${uid}/${fromProject}/bg/${fromImage}/`
  const p = String(path || '')
  const name = p.startsWith(from) ? p.slice(from.length) : ''
  if (!/^mask_[0-9a-f]{16}\.png$/.test(name)) throw copyError(`배경 마스크 경로가 규칙과 다름: ${path}`)
  return `${uid}/${toProject}/bg/${toImage}/${name}`
}

/** 완성 JPG 경로 (studioViewImage.finalPathOf와 같은 규칙) */
export function finalPath(uid, projectId, imageId, version) {
  return `${uid}/${projectId}/final/${imageId}_v${version}.jpg`
}

/**
 * edit 안의 경로를 새 경로로 — 레이어의 ai.patch.path(지우기 AI)와 bg.mask.path(17-1 배경 마스크)가 경로를 담는다. 덮기·필터·자르기에는 경로가 없다.
 * @returns {{ edit, files: {from,to,kind:'patch'|'bg'}[] }}  files = 복사할 파일 (같은 경로는 한 번만)
 */
export function rewriteEdit(edit, ids) {
  const out = edit && typeof edit === 'object' ? JSON.parse(JSON.stringify(edit)) : edit
  const files = []
  const seen = new Set()
  if (out && Array.isArray(out.layers)) {
    for (const l of out.layers) {
      const p = l?.ai?.patch
      if (!p || typeof p.path !== 'string') continue
      const to = newPatchPath(p.path, ids)
      if (!seen.has(p.path)) { seen.add(p.path); files.push({ from: p.path, to, kind: 'patch' }) }
      p.path = to
    }
  }
  const m = out && typeof out === 'object' ? out.bg?.mask : null
  if (m && typeof m.path === 'string') {
    const to = newBgPath(m.path, ids)
    files.push({ from: m.path, to, kind: 'bg' })
    m.path = to
  }
  return { edit: out, files }
}

/**
 * 페이지 안의 사진 id를 새 id로 (사진 요소 imageId · parked). 이 작업에 없는 사진 id는 그대로 두고 알려 준다.
 * @param {Map<string,string>} idMap 옛 사진 id → 새 사진 id
 * @returns {{ page: object|null, unknown: string[] }}
 */
export function rewritePage(page, idMap) {
  if (page === null || page === undefined) return { page: null, unknown: [] }
  const out = JSON.parse(JSON.stringify(page))
  const unknown = new Set()
  const map = id => {
    if (typeof id !== 'string') return id
    if (idMap.has(id)) return idMap.get(id)
    unknown.add(id)
    return id
  }
  if (Array.isArray(out.sections)) {
    for (const s of out.sections) {
      if (!Array.isArray(s?.items)) continue
      for (const it of s.items) if (it && it.type === 'image' && 'imageId' in it) it.imageId = map(it.imageId)
    }
  }
  if (Array.isArray(out.parked)) out.parked = out.parked.map(map)
  return { page: out, unknown: [...unknown] }
}

/**
 * 복사 계획 — 새 작업 행 · 새 사진 행 · 복사할 파일 목록
 * @param {{ uid, project, images, newProjectId, newImageId: (oldId) => string, hiddenAt: string }} o
 *   hiddenAt: 새 작업 행의 deleted_at — 다 복사할 때까지 목록에 안 보이게(중간에 끊겨도 반쯤 된 복사본이 보이지 않음), 끝나면 서버가 비운다
 * @returns {{ projectRow, imageRows, files: { from, to, kind: 'orig'|'patch'|'final', imageId, required }[], unknownImageIds }}
 */
export function buildCopyPlan({ uid, project, images, newProjectId, newImageId, hiddenAt }) {
  const idMap = new Map(images.map(img => [img.id, newImageId(img.id)]))
  const files = []
  const imageRows = images.map(img => {
    const ids = { uid, fromProject: project.id, toProject: newProjectId, fromImage: img.id, toImage: idMap.get(img.id) }
    const row = { id: ids.toImage, project_id: newProjectId, user_id: uid }
    for (const k of COPY_IMAGE_FIELDS) row[k] = img[k] === undefined ? null : img[k]
    row.original_path = null
    if (img.original_path) {
      row.original_path = newOrigPath(img.original_path, ids)
      files.push({ from: img.original_path, to: row.original_path, kind: 'orig', imageId: ids.toImage, required: true })
    }
    const { edit, files: patchFiles } = rewriteEdit(img.edit, ids)
    row.edit = edit
    // 조각이 Storage에 없으면(원본에서도 못 불러오는 상태) 복사본도 같은 상태로 둔다 — 지우기 화면이 [다시 계산]을 안내
    // 배경 마스크(17-1)도 같다 — 없으면 복사본 화면이 "배경 마스크를 불러오지 못했어요"로 알린다 (다시 [배경 지우기]를 누르면 새로 만든다)
    for (const f of patchFiles) files.push({ ...f, imageId: ids.toImage, required: false })
    if (Number.isInteger(img.final_rendered_version) && img.final_rendered_version >= 1) {
      // 완성 JPG는 지금 쓰는 버전 한 장만. 없으면 서버가 복사본의 final_rendered_version을 비운다(편집기가 다시 만든다)
      files.push({
        from: finalPath(uid, project.id, img.id, img.final_rendered_version),
        to: finalPath(uid, newProjectId, ids.toImage, img.final_rendered_version),
        kind: 'final', imageId: ids.toImage, required: false,
      })
    }
    return row
  })
  const { page, unknown } = rewritePage(project.page ?? null, idMap)
  const projectRow = {
    id: newProjectId, user_id: uid,
    source_type: project.source_type, offer_id: project.offer_id ?? null, source_url: project.source_url ?? null,
    title_zh: project.title_zh ?? null, title: copyTitle(project), desc_source: project.desc_source, status: project.status,
    // 보관 기간은 원본과 같게 — 복사로 보관 기간이 새로 늘어나지 않는다 (해성 확인 필요)
    expires_at: project.expires_at, extended_count: project.extended_count ?? 0,
    page, page_version: 0, deleted_at: hiddenAt,
  }
  return { projectRow, imageRows, files, unknownImageIds: unknown }
}
