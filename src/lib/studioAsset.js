/**
 * 에셋 이미지 (고객 사진이 아닌 "우리 그림") — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-asset-images.mjs)
 *
 * ★ 파일은 정적 파일: public/studio-assets/<카테고리 폴더>/<파일>. 같은 사이트에서 내려받으므로 서명 주소·만료·CORS가 없다
 *   (캔버스에 그려도 오염되지 않는다 — 내보내기·미리보기가 그대로 쓴다).
 * ★ 목록 = public/studio-assets/manifest.json (scripts/build-studio-assets-manifest.mjs가 폴더를 훑어 만든다 — 파일을 넣고 그 명령만 돌리면 목록에 뜬다)
 *     { v: 1, categories: [{ key, label }], items: [{ id, category, label, file, thumb?, w, h, use, group?, source? }], groups?: [{ key, label }], license?: { source: 설명 } }
 *     file = 'studio-assets' 아래 경로 (예: 'objects/gift-box.svg'), w·h = 그림 크기(px), use = 'item'(요소) | 'bg'(섹션 배경·라이브러리 배경)
 *     thumb = 목록용 작은 그림 경로('thumbs/….webp' — 없으면 목록도 원본을 쓴다), group = 상품 묶음(공통·의류 …, groups의 key), source = 출처(license의 key)
 * ★ 목록 화면은 thumb만 받는다. 원본(file)은 페이지에 넣거나 배경으로 고른 뒤에만 받는다 (studioAsset.assetThumbUrl / assetUrl).
 * ★ 페이지 요소 = 공통 칸(id, x, y, w, h, rotation, opacity, flipX, flipY, locked, hidden, groupId?) + type: 'asset' + asset: 파일 경로
 *     + fit: 'contain'(기본 — 그림 비율 그대로 자리 안에) | 'cover'(자리를 채움) + label(레이어 이름용, 선택)
 *   사진 요소(type 'image' + imageId)와 다른 type이라 사진 쪽 기능(지우기·필터·배경·완성 JPG·parked)이 전혀 건드리지 않는다.
 *   이 코드가 없던 때의 편집기는 모르는 type으로 보고 그리지 않고 보존한다 (studioPage 규칙).
 * ★ 섹션 배경 이미지 = 섹션의 bgImage 칸(선택): { asset: 파일 경로, fit: 'cover' }. 배경색(bg) 위, 요소 아래. 칸이 없으면 배경색만 (예전 페이지 그대로).
 * ★ 페이지에는 파일 경로만 저장한다 (주소 아님). 경로는 검사한 것만 쓴다 — 소문자·숫자·-·_ 와 /, 확장자 svg·png·jpg·jpeg·webp,
 *   '..'·'//'·'\\'·':' 없음 → 다른 사이트 주소나 폴더 밖 파일을 가리킬 수 없다.
 */

export const ASSET_BASE = '/studio-assets/'
export const ASSET_MANIFEST_URL = `${ASSET_BASE}manifest.json`
export const ASSET_MANIFEST_VERSION = 1
export const ASSET_FITS = ['contain', 'cover']
export const ASSET_USES = ['item', 'bg']
export const ASSET_PATH_MAX = 120
export const ASSET_LABEL_MAX = 40
export const ASSET_INSERT_MAX = 420 // 넣을 때 긴 변 (페이지 px) — 그림이 더 작으면 그림 크기 그대로

const SEGMENT = '[a-z0-9][a-z0-9_-]*'
const ASSET_PATH = new RegExp(`^(?:${SEGMENT}/)+${SEGMENT}\\.(?:svg|png|jpg|jpeg|webp)$`)

/** 쓸 수 있는 에셋 경로인지 */
export function isAssetPath(p) {
  return typeof p === 'string' && p.length <= ASSET_PATH_MAX && ASSET_PATH.test(p)
}
/** 그림 주소 (같은 사이트) — 경로가 이상하면 null */
export function assetUrl(p) {
  return isAssetPath(p) ? `${ASSET_BASE}${p}` : null
}
/** 목록에 보일 작은 그림 주소 — thumb이 있으면 그것, 없으면(svg 등) 원본 */
export function assetThumbUrl(entry) {
  return assetUrl(entry?.thumb) ?? assetUrl(entry?.file)
}
export const ASSET_GROUP_ALL = 'all' // 목록 필터 "전체"
/**
 * 목록 거르기 — group = 묶음 key 또는 'all', category = 카테고리 key 또는 'all', use = 'item'|'bg' 또는 null(둘 다).
 * 묶음을 고르면 그 묶음의 그림만 (묶음이 없는 그림 = 직접 만든 샘플은 "전체"에서만 보인다). 순서는 목록 순서 그대로
 */
export function filterAssets(items, { group = ASSET_GROUP_ALL, category = ASSET_GROUP_ALL, use = null } = {}) {
  return (items || []).filter(i => (group === ASSET_GROUP_ALL || i.group === group)
    && (category === ASSET_GROUP_ALL || i.category === category) && (!use || i.use === use))
}

const isBox = it => !!it && typeof it.id === 'string' && [it.x, it.y, it.w, it.h].every(Number.isFinite) && it.w > 0 && it.h > 0
/** 그릴 수 있는 에셋 이미지 요소 */
export function isValidAssetItem(it) {
  return isBox(it) && it.type === 'asset' && isAssetPath(it.asset)
}
/** 에셋 칸을 채운 복사본 — fit이 빠지거나 이상하면 'contain', label은 글자만(길면 자름). asset 경로는 고치지 않는다(이상하면 그리지 않고 보존) */
export function normalizeAssetItem(it) {
  if (!it || typeof it !== 'object') return it
  const out = { ...it, fit: ASSET_FITS.includes(it.fit) ? it.fit : 'contain' }
  if ('label' in it) {
    if (typeof it.label === 'string' && it.label.trim() !== '') out.label = [...it.label.trim()].slice(0, ASSET_LABEL_MAX).join('')
    else delete out.label
  }
  return out
}
/** 레이어 목록 이름 — "이미지 · 선물 상자" */
export function assetLabel(it) {
  return typeof it?.label === 'string' && it.label !== '' ? `이미지 · ${it.label}` : '이미지'
}

/** 섹션 배경 이미지 (없거나 이상하면 null) — { asset, fit } */
export function sectionBgImageOf(section) {
  const b = section?.bgImage
  if (!b || typeof b !== 'object' || !isAssetPath(b.asset)) return null
  return { asset: b.asset, fit: ASSET_FITS.includes(b.fit) ? b.fit : 'cover' }
}

/**
 * 그림(가로 sw × 세로 sh)을 자리(w × h)에 놓는 네모 — 화면(object-fit)과 내보내기(캔버스)가 같이 쓴다.
 *   contain: 그림 전체가 자리 안에 (가운데, 남는 곳은 비움) → { sx: 0, sy: 0, sw, sh, dx, dy, dw, dh }
 *   cover:   자리를 다 채움 (가운데, 넘치는 곳은 자름)
 */
export function assetPlacement(sw, sh, w, h, fit = 'contain') {
  if (!(sw > 0 && sh > 0 && w > 0 && h > 0)) return null
  if (fit === 'cover') {
    const k = Math.max(w / sw, h / sh)
    const cw = w / k, ch = h / k
    return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch, dx: 0, dy: 0, dw: w, dh: h }
  }
  const k = Math.min(w / sw, h / sh)
  const dw = sw * k, dh = sh * k
  return { sx: 0, sy: 0, sw, sh, dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh }
}

/** 넣을 때 크기 — 그림 비율 그대로, 긴 변이 max를 넘지 않게 (정수, 최소 10) */
export function assetInsertSize(entry, max = ASSET_INSERT_MAX) {
  const k = Math.min(1, max / Math.max(entry.w, entry.h))
  return { w: Math.max(10, Math.round(entry.w * k)), h: Math.max(10, Math.round(entry.h * k)) }
}
/** 목록 항목 → 새 요소 칸 (자리·id는 넣는 쪽이 — studioPage.addElementItem) */
export function assetFieldsOf(entry, max = ASSET_INSERT_MAX) {
  return { type: 'asset', asset: entry.file, fit: 'contain', label: entry.label, ...assetInsertSize(entry, max) }
}

// ── 목록 (manifest) ──

const KEY = /^[a-z0-9][a-z0-9_-]*$/
/** 바닥선 값 — 0보다 크고 1보다 작은 숫자 (그림 맨 위·맨 아래는 바닥선이 될 수 없다) */
export function isGroundY(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1
}
/**
 * manifest.json → 쓸 수 있는 목록. 모양이 어긋난 항목은 빼고 사유를 돌려준다(하나가 이상해도 나머지는 쓴다).
 * @returns {{ categories: { key, label, items }[], groups: { key, label, count }[], items: object[], license: object, problems: string[] }}
 *   groups = 그림이 하나라도 있는 묶음만 (목록 순서)
 */
export function readAssetManifest(raw) {
  const problems = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { categories: [], groups: [], items: [], license: {}, problems: ['manifest가 객체가 아님'] }
  if (raw.v !== ASSET_MANIFEST_VERSION) problems.push(`v가 ${ASSET_MANIFEST_VERSION}이 아님: ${raw.v}`)
  const cats = []
  for (const c of Array.isArray(raw.categories) ? raw.categories : []) {
    if (!c || !KEY.test(String(c.key ?? '')) || typeof c.label !== 'string' || c.label === '') { problems.push(`카테고리 모양이 이상함: ${JSON.stringify(c)}`); continue }
    if (cats.some(x => x.key === c.key)) { problems.push(`카테고리 key 겹침: ${c.key}`); continue }
    cats.push({ key: c.key, label: c.label })
  }
  const groups = []
  for (const g of Array.isArray(raw.groups) ? raw.groups : []) {
    if (!g || !KEY.test(String(g.key ?? '')) || typeof g.label !== 'string' || g.label === '' || groups.some(x => x.key === g.key)) { problems.push(`묶음 모양이 이상함: ${JSON.stringify(g)}`); continue }
    groups.push({ key: g.key, label: g.label })
  }
  const license = raw.license && typeof raw.license === 'object' && !Array.isArray(raw.license) ? raw.license : {}
  const items = []
  const ids = new Set()
  for (const e of Array.isArray(raw.items) ? raw.items : []) {
    const why = !e || typeof e !== 'object' ? '객체가 아님'
      : !KEY.test(String(e.id ?? '')) ? 'id'
        : ids.has(e.id) ? 'id 겹침'
          : !isAssetPath(e.file) ? '파일 경로'
            : !cats.some(c => c.key === e.category) ? '없는 카테고리'
              : !(Number.isFinite(e.w) && Number.isFinite(e.h) && e.w > 0 && e.h > 0) ? '크기'
                : !ASSET_USES.includes(e.use) ? 'use'
                  : typeof e.label !== 'string' || e.label === '' ? '이름' : null
    if (why) { problems.push(`항목을 뺌 (${why}): ${JSON.stringify(e?.id ?? e?.file ?? e)}`); continue }
    ids.add(e.id)
    const item = { id: e.id, category: e.category, label: [...e.label].slice(0, ASSET_LABEL_MAX).join(''), file: e.file, w: e.w, h: e.h, use: e.use }
    // 선택 칸 — 이상하면 그 칸만 빼고 그림은 쓴다 (썸네일이 이상하면 원본으로 보인다)
    if (e.thumb !== undefined) { if (isAssetPath(e.thumb)) item.thumb = e.thumb; else problems.push(`썸네일 경로를 뺌: ${e.id}`) }
    if (e.group !== undefined) { if (groups.some(g => g.key === e.group)) item.group = e.group; else problems.push(`없는 묶음을 뺌: ${e.id} (${e.group})`) }
    if (typeof e.source === 'string' && e.source !== '') item.source = e.source
    // groundY = 바닥이 있는 연출 배경에서 제품을 세울 선 (그림 높이의 비율 0~1 — 사람이 그림을 보고 적는다). 라이브러리 배경 합성이 제품 밑면을 이 선에 맞춘다
    if (e.groundY !== undefined) { if (isGroundY(e.groundY)) item.groundY = e.groundY; else problems.push(`바닥선(groundY)을 뺌: ${e.id} (${e.groundY})`) }
    items.push(item)
  }
  return {
    categories: cats.map(c => ({ ...c, items: items.filter(i => i.category === c.key) })).filter(c => c.items.length),
    groups: groups.map(g => ({ ...g, count: items.filter(i => i.group === g.key).length })).filter(g => g.count > 0),
    items, license, problems,
  }
}

/** 페이지에 쓰인 에셋 경로 (요소 + 섹션 배경, 중복 없이) */
export function pageAssetPaths(page) {
  const out = []
  const add = p => { if (isAssetPath(p) && !out.includes(p)) out.push(p) }
  for (const s of page?.sections || []) {
    add(s?.bgImage?.asset)
    for (const it of s.items || []) if (it?.type === 'asset') add(it.asset)
  }
  return out
}
