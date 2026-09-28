/**
 * 내 작업 목록 — 거르기·찾기·정렬·폴더 (순수 함수, import 없음 → scripts/test-studio-project-list.mjs가 그대로 부른다)
 * 작업이 수백 개인 고객 기준: 작은 카드 격자 / 표 목록, 폴더, 검색, 정렬.
 * 폴더는 스튜디오 전용이다(studio_folders) — 몰 카테고리·내상품리스트 카테고리와 연결하지 않는다.
 */

export const SOURCE_FILTERS = [{ key: 'all', label: '전체' }, { key: '1688', label: '1688' }, { key: 'upload', label: '내 사진' }]
export const SORTS = [{ key: 'updated', label: '최근 수정' }, { key: 'name', label: '이름' }, { key: 'created', label: '만든 날' }]
export const VIEWS = [{ key: 'grid', label: '격자' }, { key: 'list', label: '목록' }]
export const FOLDER_ALL = 'all'     // 전체
export const FOLDER_NONE = 'none'   // 폴더 없음
export const FOLDER_NAME_MAX = 40
export const FOLDERS_MAX = 100
export const FIRST_ROWS = 12        // 처음 보이는 수 (데스크톱 6칸 × 2줄). [모두 보기]로 전부

export const titleOf = p => (p?.title || p?.title_zh || '제목 없음')
export const sourceLabel = p => (p?.source_type === 'upload' ? '내 사진' : '1688')
const time = v => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0 }
const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, '')

/** 폴더 거르기 — all = 전부, none = 폴더 없음, 그 밖 = 그 폴더 */
export function inFolder(p, folder) {
  if (!folder || folder === FOLDER_ALL) return true
  if (folder === FOLDER_NONE) return !p.folder_id
  return p.folder_id === folder
}

/** 검색 — 제목·1688 상품명(title_zh)·1688 상품번호. 띄어쓰기·대소문자 무시, 낱말은 모두 들어 있어야 한다 */
export function matchesQuery(p, query) {
  const words = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = norm(`${p.title || ''} ${p.title_zh || ''} ${p.offer_id || ''}`)
  return words.every(w => hay.includes(norm(w)))
}

/** @param {{ source?, folder?, query? }} f */
export function filterProjects(list, { source = 'all', folder = FOLDER_ALL, query = '' } = {}) {
  return (Array.isArray(list) ? list : []).filter(p =>
    (source === 'all' || p.source_type === source) && inFolder(p, folder) && matchesQuery(p, query))
}

/** 정렬 — updated(최근 수정 먼저, 수정 시각이 없으면 만든 날) · name(가나다) · created(최근 만든 것 먼저). 원래 배열은 바꾸지 않는다 */
export function sortProjects(list, key = 'updated') {
  const out = [...(Array.isArray(list) ? list : [])]
  if (key === 'name') return out.sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'ko', { numeric: true }) || time(b.created_at) - time(a.created_at))
  if (key === 'created') return out.sort((a, b) => time(b.created_at) - time(a.created_at))
  return out.sort((a, b) => time(b.updated_at || b.created_at) - time(a.updated_at || a.created_at))
}

/** 폴더마다 작업 수 — { all, none, [folderId]: n } (출처·검색과 상관없이 전체 기준) */
export function folderCounts(list, folders) {
  const out = { [FOLDER_ALL]: 0, [FOLDER_NONE]: 0 }
  const ids = new Set((Array.isArray(folders) ? folders : []).map(f => f.id))
  for (const id of ids) out[id] = 0
  for (const p of Array.isArray(list) ? list : []) {
    out[FOLDER_ALL]++
    if (p.folder_id && ids.has(p.folder_id)) out[p.folder_id]++
    else out[FOLDER_NONE]++ // 폴더가 없거나, 지워진 폴더를 가리킴
  }
  return out
}

/** 폴더 이름 검사 → { ok:true, name } | { ok:false, message } (exceptId = 이름을 바꾸는 폴더 자신) */
export function checkFolderName(name, folders, exceptId = null) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim()
  if (!n) return { ok: false, message: '폴더 이름을 넣어 주세요.' }
  if (n.length > FOLDER_NAME_MAX) return { ok: false, message: `폴더 이름은 ${FOLDER_NAME_MAX}자까지예요.` }
  const list = Array.isArray(folders) ? folders : []
  if (list.some(f => f.id !== exceptId && norm(f.name) === norm(n))) return { ok: false, message: '같은 이름의 폴더가 있어요.' }
  if (!exceptId && list.length >= FOLDERS_MAX) return { ok: false, message: `폴더는 ${FOLDERS_MAX}개까지 만들 수 있어요.` }
  return { ok: true, name: n }
}

/** 폴더는 비어 있을 때만 지운다 */
export const canDeleteFolder = (folderId, counts) => !!folderId && (counts?.[folderId] || 0) === 0

/** 옮길 작업 — 이미 그 폴더에 있는 것은 뺀다. target = 폴더 id 또는 null(폴더 없음) */
export function idsToMove(list, ids, target) {
  const want = new Set(Array.isArray(ids) ? ids : [])
  const to = target || null
  return (Array.isArray(list) ? list : []).filter(p => want.has(p.id) && (p.folder_id || null) !== to).map(p => p.id)
}

const dayNo = v => { const t = new Date(v); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000 }
/** "오늘" · "어제" · "N일 전" (달력 날짜 기준) */
export function daysAgoLabel(at, now = new Date()) {
  const t = new Date(at)
  if (!Number.isFinite(t.getTime())) return ''
  const n = Math.round(dayNo(now) - dayNo(t))
  return n <= 0 ? '오늘' : n === 1 ? '어제' : `${n}일 전`
}
/** 카드 아래 작은 글씨 — "사진 N장 · N일 전" (기준 = 마지막으로 고친 때, 없으면 만든 때) */
export const cardMeta = (p, now = new Date()) => `사진 ${p.doneCount ?? 0}장 · ${daysAgoLabel(p.updated_at || p.created_at, now)}`

/** 보관 남은 일 — 표 목록용. 끝났으면 0, 모르면 null */
export function keepDaysLeft(expiresAt, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now
  if (!Number.isFinite(ms)) return null
  return ms <= 0 ? 0 : Math.floor(ms / 86400000)
}
export function keepLabel(expiresAt, now = Date.now()) {
  const d = keepDaysLeft(expiresAt, now)
  return d === null ? '' : d === 0 ? (new Date(expiresAt).getTime() <= now ? '끝남' : '오늘까지') : `${d}일`
}
/** 날짜 YYYY.MM.DD (KST) */
export function dateLabel(iso) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString()
  return `${k.slice(0, 4)}.${k.slice(5, 7)}.${k.slice(8, 10)}`
}
