/**
 * 페이지용 화면 사진 — 지운 결과(원본 + 지우기 조각)를 브라우저에서 그린 뒤 페이지 폭에 맞게 줄여 메모리에 둔다 (4단계).
 *
 * ★ Supabase 이미지 변환(유료)을 쓰지 않는다 (Claude 결정, 해성 위임). 원본을 받아 브라우저 캔버스에서 줄인다.
 *   줄인 폭 = min(원본 폭, 페이지 폭 × min(기기 배율, 2)) → 780px 페이지·일반 화면이면 780px. 1920px 원본을 그대로 띄우지 않는다.
 *   결과는 WebP Blob → object URL로 메모리에만 둔다 (새로고침하면 다시 만든다). 저장하지 않는다.
 * ★ 지운 결과는 편집기 미리보기(StudioCanvas)와 같은 규칙으로 그린다 — Fabric 없이 같은 계산 함수를 그대로 부른다:
 *   fillPlan 순서대로 coons·단색은 computeFillPatch(원본, 레이어, 연결된 앞 결과), AI는 레이어의 ai.key가
 *   지금 계산 key(aiPatchKey)와 같을 때만 저장된 PNG(loadAiPatch)를 쓴다. 안 맞는 AI(실행 전·값이 바뀜)는 편집기처럼 원본 그대로.
 * ★ 5단계 굽기(studioBake)도 같은 composeErased를 쓴다 (원본 크기, 흰 바탕). 구운 JPG가 최신이면(final_rendered_version = edit_version)
 *   화면용 사진은 합성하지 않고 그 JPG를 받아 줄인다 (want의 finalVersion). 최신이 아니면 지금처럼 실시간 합성.
 * ★ 원본은 crossOrigin으로 받아야 캔버스가 오염되지 않는다 (getImageData·toBlob).
 * ★ [사진] 목록 썸네일도 이 작은 사진을 쓴다 — 원본은 사진마다 한 번만 받는다 (목록·페이지가 따로 받지 않음).
 *   서명 URL은 편집기의 서명 URL 모음(createSignedUrlPool)을 같이 쓴다 — 열 때 한 번에 묶어 받은 주소, 사진마다 따로 받지 않는다.
 *   화면에 보이는 사진을 먼저 만든다 (prioritize).
 */
import { createSignedUrlPool, loadWithResign } from '@/lib/studioImageCache'
import { computeFillPatch } from '@/lib/studioFillPatch'
import { fillPlan, fillArea, aiPatchKey } from '@/lib/studioFillPlan'
import { fillLayersOf } from '@/lib/studioEdit'
import { AI_MODEL_ID, loadAiPatch } from '@/lib/studioAiPatch'
import { geometryOf, drawGeometry, geometryHeightAt, readShape } from '@/lib/studioCrop'

export const VIEW_TYPE = 'image/webp'
export const VIEW_QUALITY = 0.9

/** 줄일 폭 (정수) */
export function viewWidth(naturalW, pageWidth, dpr = 1) {
  return Math.max(1, Math.min(naturalW, Math.round(pageWidth * Math.min(2, Math.max(1, dpr)))))
}

/**
 * 같은 결과인지 가르는 key — 원본 경로 + 지우기 레이어 값 (레이어가 바뀌면 다시 만든다). 구운 JPG를 쓰면 그 버전.
 * 12-1: 자르기·띠(정리한 값)도 key에 — 바뀌면 다시 만든다
 */
export function viewKey(row, layers, targetW, finalVersion = null, shape = null) {
  const s = readShape(shape, row.width, row.height)
  const shapeKey = s.crop || s.cuts.length ? `|shape:${JSON.stringify(s)}` : ''
  if (Number.isInteger(finalVersion)) return `final|${finalPathOf(row, finalVersion)}|${targetW}${shapeKey}`
  return `${row.original_path}|${targetW}|${JSON.stringify(fillLayersOf(layers || []))}${shapeKey}`
}

/**
 * 구운 사진(final JPG) 경로 — 서버 api/studio-upload.js final_prepare가 만드는 규칙과 같다:
 *   {uid}/{projectId}/final/{imageId}_v{edit_version}.jpg  (uid·projectId는 원본 경로 {uid}/{projectId}/orig/…에서)
 * 버전마다 새 파일 (서명 업로드는 같은 경로 덮어쓰기가 안 된다 — api/_studio.js storageSignUpload)
 */
export function finalPathOf(row, version) {
  const m = /^([^/]+)\/([^/]+)\/orig\//.exec(String(row?.original_path || ''))
  if (!m || !Number.isInteger(version) || version < 1) throw new Error(`적용한 사진 경로를 만들 수 없어요 (${row?.id}, v${version})`)
  return `${m[1]}/${m[2]}/final/${row.id}_v${version}.jpg`
}

function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

/**
 * 원본 + 지우기 조각 → 원본 크기 캔버스 (지우기가 없으면 null — 원본을 바로 줄인다). 5단계 굽기도 이 함수를 쓴다.
 * 결과가 없는 AI 레이어는 편집 화면처럼 원본 그대로 두고, 그 id를 돌려준다 (굽기 전에 알 수 있게 — 조용히 넘기지 않는다):
 *   aiMissing: 결과 조각이 없음 (실행했지만 저장 못 함·계산 중) / aiStale: 결과 조각은 있지만 영역이 바뀌어 지금 값과 맞지 않음
 * @param {{ background?: string }} opts background: 원본 아래 칠할 색 (굽기 = 흰색 — 투명한 PNG·WebP 원본을 JPG로 구울 때 검게 되지 않게)
 * @returns {Promise<{ canvas: HTMLCanvasElement|null, problems: string[], aiMissing: string[], aiStale: string[] }>}
 */
export async function composeErased(imgEl, fills, { background } = {}) {
  const W = imgEl.naturalWidth, H = imgEl.naturalHeight
  if (fills.length === 0) return { canvas: null, problems: [], aiMissing: [], aiStale: [] }
  const plan = new Map(fillPlan(fills, W, H).map(p => [p.id, p]))
  const byId = new Map(fills.map(l => [l.id, l]))
  const res = new Map()   // layer id → { canvas, area, data }
  const problems = []
  const aiMissing = [], aiStale = []
  for (const l of fills) {
    const e = plan.get(l.id)
    if (l.method === 'ai') {
      if (!l.ai?.patch) { aiMissing.push(l.id); continue } // 결과 조각 없음 — 편집기처럼 원본 그대로
      if (!AI_MODEL_ID) { problems.push('AI 모델 설정이 없어 AI 결과를 그릴 수 없어요'); continue }
      const key = await aiPatchKey(e.key, AI_MODEL_ID)
      if (l.ai.key !== key) { aiStale.push(l.id); continue } // 값이 바뀐 결과 — 편집기에서도 [다시 지우기] 상태, 원본 그대로
      const area = fillArea(l, W, H)
      if (!sameRect(l.ai.patch, area)) {
        console.error('[studioViewImage] 저장된 AI 결과 범위가 지금 범위와 다름:', l.id, l.ai.patch, area)
        problems.push('AI 결과 일부를 그리지 못했어요')
        continue
      }
      try {
        const loaded = await loadAiPatch(l.ai.patch)
        res.set(l.id, { canvas: loaded.canvas, area, data: loaded.data })
      } catch (err) {
        console.error('[studioViewImage] 저장된 AI 결과 받기 실패:', l.id, l.ai.patch.path, err)
        problems.push('AI 결과 일부를 불러오지 못했어요')
      }
      continue
    }
    // coons·단색: 연결된 앞 결과를 덮어쓴 뒤 계산 (편집기 runCompute와 같은 규칙 — 안 그린 앞 AI는 원본 그대로)
    const deps = e.deps.filter(d => byId.get(d)?.method !== 'ai' || res.has(d))
    if (deps.some(d => !res.has(d))) { problems.push('앞 지우기 결과가 없어 일부를 그리지 못했어요'); continue }
    const r = computeFillPatch(imgEl, l, deps.map(d => res.get(d)))
    if (!r.ok) {
      console.error('[studioViewImage] 지우기 계산 실패:', l.id, r.reason)
      problems.push(`지우기 계산에 실패했어요 (${r.reason})`)
      continue
    }
    res.set(l.id, r)
  }
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, W, H) }
  ctx.drawImage(imgEl, 0, 0)
  // 편집기와 같은 쌓는 순서: 원본 → 결과 조각(레이어 순)
  for (const l of fills) { const r = res.get(l.id); if (r) ctx.drawImage(r.canvas, r.area.x, r.area.y) }
  return { canvas: c, problems, aiMissing, aiStale }
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('화면용 사진을 만들지 못했어요 (toBlob 결과 없음)'))), VIEW_TYPE, VIEW_QUALITY)
  })
}

/**
 * 사진 한 장 → { url, width, height, problems } — finalVersion이 있으면 구운 JPG를 받아 줄이기만 한다.
 * 12-1: 지운 결과(원본 크기) → 띠 잘라내기 → 자르기(studioCrop.geometryOf — 내보내기와 같은 함수) → 목표 폭으로 줄임
 */
async function renderView(pool, row, layers, targetW, finalVersion = null, shape = null) {
  const useFinal = Number.isInteger(finalVersion)
  const imgEl = await loadWithResign(pool, useFinal ? finalPathOf(row, finalVersion) : row.original_path)
  const W = imgEl.naturalWidth, H = imgEl.naturalHeight
  const { canvas: full, problems, aiMissing, aiStale } = useFinal
    ? { canvas: null, problems: [], aiMissing: [], aiStale: [] }
    : await composeErased(imgEl, fillLayersOf(layers || []))
  const geo = geometryOf(W, H, shape)
  if (geo.cropIgnored) problems.push('자르기 영역이 모두 잘라낸 띠 안이라 자르기를 쓰지 않았어요')
  const tw = Math.min(targetW, geo.width)
  const th = geometryHeightAt(geo, tw)
  const c = document.createElement('canvas')
  c.width = tw
  c.height = th
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  drawGeometry(ctx, full || imgEl, geo, 0, 0, tw, th)
  const blob = await toBlob(c) // 오염(SecurityError)이면 throw — 부른 쪽이 사유를 보여준다
  if (full) { full.width = 0; full.height = 0 } // 원본 크기 캔버스 메모리를 바로 돌려준다
  return { url: URL.createObjectURL(blob), width: tw, height: th, bytes: blob.size, problems, aiMissing, aiStale, fromFinal: useFinal }
}

/**
 * 화면용 사진 저장소 — 사진(id)마다 마지막 결과 하나만 둔다.
 *   want(row, layers): 필요하면 만들기 요청 (같은 key가 이미 있거나 만드는 중이면 아무것도 안 함)
 *   entry(id): { key, status: 'loading'|'ready'|'error', url, error, problems }
 *   onUpdate(id, entry): 상태가 바뀔 때마다 (화면이 반응형 값으로 옮겨 담는다)
 *   prioritize(ids): 기다리는 것 중 이 사진들을 맨 앞으로 (화면에 보이는 사진)
 * @param {{ pageWidth: number, dpr?: number, concurrency?: number, pool?: object, onUpdate: Function }} opts
 *   pool: 편집기의 서명 URL 모음 (createSignedUrlPool) — 없으면 따로 만든다
 */
export function createViewImageStore({ pageWidth, dpr = 1, concurrency = 6, pool = createSignedUrlPool(), onUpdate }) {
  const entries = new Map()  // image id → entry
  const queue = []           // [{ row, layers, key }] — 사진마다 최신 요청 하나
  let running = 0
  let gen = 0

  function targetOf(row) {
    return viewWidth(Number.isInteger(row.width) && row.width > 0 ? row.width : pageWidth, pageWidth, dpr)
  }

  function set(id, next) {
    const prev = entries.get(id)
    if (prev?.url && prev.url !== next.url) URL.revokeObjectURL(prev.url)
    entries.set(id, next)
    onUpdate?.(id, next)
  }

  /**
   * @param {{ finalVersion?: number|null, shape?: { crop, cuts }|null }} opts finalVersion: 구운 JPG가 최신일 때 그 버전 (그 파일을 받아 쓴다),
   *   shape: 자르기·띠 (12-1 — 화면 값)
   */
  function want(row, layers, { finalVersion = null, shape = null } = {}) {
    if (!row?.original_path) return
    const key = viewKey(row, layers, targetOf(row), finalVersion, shape)
    const cur = entries.get(row.id)
    if (cur && cur.key === key) return
    // 만드는 동안 이전 결과(다른 key)는 그대로 보여준다 — 새 결과가 오면 바꾼다
    set(row.id, { key, status: 'loading', url: cur?.url || null, error: '', problems: [] })
    const i = queue.findIndex(q => q.row.id === row.id)
    if (i >= 0) queue.splice(i, 1)
    queue.push({ row: { ...row }, layers: layers ? JSON.parse(JSON.stringify(layers)) : [], key, finalVersion, shape: shape ? JSON.parse(JSON.stringify(shape)) : null })
    pump()
  }

  function pump() {
    while (running < concurrency && queue.length) {
      const job = queue.shift()
      running++
      const g = gen
      renderView(pool, job.row, job.layers, targetOf(job.row), job.finalVersion, job.shape).then(
        out => {
          if (g !== gen || entries.get(job.row.id)?.key !== job.key) { URL.revokeObjectURL(out.url); return } // 그 사이 바뀜 — 버린다
          set(job.row.id, { key: job.key, status: 'ready', url: out.url, error: '', problems: out.problems, aiMissing: out.aiMissing, aiStale: out.aiStale, fromFinal: out.fromFinal, width: out.width, height: out.height, bytes: out.bytes })
        },
        err => {
          if (g !== gen || entries.get(job.row.id)?.key !== job.key) return
          console.error('[studioViewImage] 화면용 사진 만들기 실패:', job.row.id, err)
          set(job.row.id, { key: job.key, status: 'error', url: null, error: err.message || String(err), problems: [] })
        },
      ).finally(() => { if (g === gen) { running--; pump() } }) // clear() 뒤에 끝난 것은 새 세대의 수에 넣지 않는다
    }
  }

  /** 실패한 사진 다시 만들기 */
  function retry(row, layers, opts) {
    const cur = entries.get(row.id)
    if (cur) set(row.id, { ...cur, key: '', status: 'loading', error: '' })
    want(row, layers, opts)
  }

  /** 기다리는 것 중 ids(앞일수록 먼저)를 맨 앞으로. 이미 만드는 중이거나 다 된 것은 그대로 */
  function prioritize(ids) {
    if (queue.length < 2 || !ids?.length) return
    const rank = new Map(ids.map((id, i) => [id, i]))
    const front = queue.filter(q => rank.has(q.row.id)).sort((a, b) => rank.get(a.row.id) - rank.get(b.row.id))
    if (front.length === 0) return
    const rest = queue.filter(q => !rank.has(q.row.id))
    queue.length = 0
    queue.push(...front, ...rest)
  }

  function entry(id) { return entries.get(id) || null }

  /** 모두 비우기 (로그아웃·화면 떠날 때) — 만드는 중인 결과는 도착해도 버린다 */
  function clear() {
    gen++
    queue.length = 0
    running = 0
    for (const e of entries.values()) if (e.url) URL.revokeObjectURL(e.url)
    entries.clear()
  }

  return { want, retry, prioritize, entry, clear }
}
