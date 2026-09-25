/**
 * 페이지용 화면 사진 — 지운 결과(원본 + 지우기 조각)를 브라우저에서 그린 뒤 페이지 폭에 맞게 줄여 메모리에 둔다 (4단계).
 *
 * ★ Supabase 이미지 변환(유료)을 쓰지 않는다 (Claude 결정, 해성 위임). 원본을 받아 브라우저 캔버스에서 줄인다.
 *   줄인 폭 = min(원본 폭, 페이지 폭 × min(기기 배율, 2)) → 780px 페이지·일반 화면이면 780px. 1920px 원본을 그대로 띄우지 않는다.
 *   결과는 WebP Blob → object URL로 메모리에만 둔다 (새로고침하면 다시 만든다). 저장하지 않는다.
 * ★ 지운 결과는 편집기 미리보기(StudioCanvas)와 같은 규칙으로 그린다 — Fabric 없이 같은 계산 함수를 그대로 부른다:
 *   fillPlan 순서대로 coons·단색은 computeFillPatch(원본, 레이어, 연결된 앞 결과), AI는 레이어의 ai.key가
 *   지금 계산 key(aiPatchKey)와 같을 때만 저장된 PNG(loadAiPatch)를 쓴다. 안 맞는 AI(실행 전·값이 바뀜)는 편집기처럼 원본 그대로.
 *   (5단계 굽기(final JPG)가 생기면 페이지는 그 파일을 쓰고, 여기서는 다시 굽기 전 미리보기만 맡는다)
 * ★ 원본은 crossOrigin으로 받아야 캔버스가 오염되지 않는다 (getImageData·toBlob) — 목록 썸네일과 다른 서명 URL을 새로 받는다.
 */
import { signViewUrl } from '@/lib/studioProjects'
import { loadElement } from '@/lib/studioImageCache'
import { computeFillPatch } from '@/lib/studioFillPatch'
import { fillPlan, fillArea, aiPatchKey } from '@/lib/studioFillPlan'
import { fillLayersOf } from '@/lib/studioEdit'
import { AI_MODEL_ID, loadAiPatch } from '@/lib/studioAiPatch'

export const VIEW_TYPE = 'image/webp'
export const VIEW_QUALITY = 0.9

/** 줄일 폭 (정수) */
export function viewWidth(naturalW, pageWidth, dpr = 1) {
  return Math.max(1, Math.min(naturalW, Math.round(pageWidth * Math.min(2, Math.max(1, dpr)))))
}

/** 같은 결과인지 가르는 key — 원본 경로 + 지우기 레이어 값 (레이어가 바뀌면 다시 만든다) */
export function viewKey(row, layers, targetW) {
  return `${row.original_path}|${targetW}|${JSON.stringify(fillLayersOf(layers || []))}`
}

function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

/**
 * 원본 + 지우기 조각 → 원본 크기 캔버스 (지우기가 없으면 null — 원본을 바로 줄인다)
 * @returns {Promise<{ canvas: HTMLCanvasElement|null, problems: string[] }>}
 */
async function composeErased(imgEl, fills) {
  const W = imgEl.naturalWidth, H = imgEl.naturalHeight
  if (fills.length === 0) return { canvas: null, problems: [] }
  const plan = new Map(fillPlan(fills, W, H).map(p => [p.id, p]))
  const byId = new Map(fills.map(l => [l.id, l]))
  const res = new Map()   // layer id → { canvas, area, data }
  const problems = []
  for (const l of fills) {
    const e = plan.get(l.id)
    if (l.method === 'ai') {
      if (!l.ai) continue // 실행 전·계산 중 — 편집기처럼 원본 그대로
      if (!AI_MODEL_ID) { problems.push('AI 모델 설정이 없어 AI 결과를 그릴 수 없어요'); continue }
      const key = await aiPatchKey(e.key, AI_MODEL_ID)
      if (l.ai.key !== key) continue // 값이 바뀐 결과 — 편집기에서도 [다시 지우기] 상태, 원본 그대로
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
  ctx.drawImage(imgEl, 0, 0)
  // 편집기와 같은 쌓는 순서: 원본 → 결과 조각(레이어 순)
  for (const l of fills) { const r = res.get(l.id); if (r) ctx.drawImage(r.canvas, r.area.x, r.area.y) }
  return { canvas: c, problems }
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('화면용 사진을 만들지 못했어요 (toBlob 결과 없음)'))), VIEW_TYPE, VIEW_QUALITY)
  })
}

/** 사진 한 장 → { url, width, height, problems } */
async function renderView(row, layers, targetW) {
  const { url } = await signViewUrl(row.original_path)
  const imgEl = await loadElement(url)
  const W = imgEl.naturalWidth, H = imgEl.naturalHeight
  const { canvas: full, problems } = await composeErased(imgEl, fillLayersOf(layers || []))
  const tw = Math.min(targetW, W)
  const th = Math.max(1, Math.round(H * tw / W))
  const c = document.createElement('canvas')
  c.width = tw
  c.height = th
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(full || imgEl, 0, 0, tw, th)
  const blob = await toBlob(c) // 오염(SecurityError)이면 throw — 부른 쪽이 사유를 보여준다
  if (full) { full.width = 0; full.height = 0 } // 원본 크기 캔버스 메모리를 바로 돌려준다
  return { url: URL.createObjectURL(blob), width: tw, height: th, bytes: blob.size, problems }
}

/**
 * 화면용 사진 저장소 — 사진(id)마다 마지막 결과 하나만 둔다.
 *   want(row, layers): 필요하면 만들기 요청 (같은 key가 이미 있거나 만드는 중이면 아무것도 안 함)
 *   entry(id): { key, status: 'loading'|'ready'|'error', url, error, problems }
 *   onUpdate(id, entry): 상태가 바뀔 때마다 (화면이 반응형 값으로 옮겨 담는다)
 * @param {{ pageWidth: number, dpr?: number, concurrency?: number, onUpdate: Function }} opts
 */
export function createViewImageStore({ pageWidth, dpr = 1, concurrency = 2, onUpdate }) {
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

  function want(row, layers) {
    if (!row?.original_path) return
    const key = viewKey(row, layers, targetOf(row))
    const cur = entries.get(row.id)
    if (cur && cur.key === key) return
    // 만드는 동안 이전 결과(다른 key)는 그대로 보여준다 — 새 결과가 오면 바꾼다
    set(row.id, { key, status: 'loading', url: cur?.url || null, error: '', problems: [] })
    const i = queue.findIndex(q => q.row.id === row.id)
    if (i >= 0) queue.splice(i, 1)
    queue.push({ row: { ...row }, layers: layers ? JSON.parse(JSON.stringify(layers)) : [], key })
    pump()
  }

  function pump() {
    while (running < concurrency && queue.length) {
      const job = queue.shift()
      running++
      const g = gen
      renderView(job.row, job.layers, targetOf(job.row)).then(
        out => {
          if (g !== gen || entries.get(job.row.id)?.key !== job.key) { URL.revokeObjectURL(out.url); return } // 그 사이 바뀜 — 버린다
          set(job.row.id, { key: job.key, status: 'ready', url: out.url, error: '', problems: out.problems, width: out.width, height: out.height, bytes: out.bytes })
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
  function retry(row, layers) {
    const cur = entries.get(row.id)
    if (cur) set(row.id, { ...cur, key: '', status: 'loading', error: '' })
    want(row, layers)
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

  return { want, retry, entry, clear }
}
