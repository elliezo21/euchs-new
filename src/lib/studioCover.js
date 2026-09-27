/**
 * 덮기 (12-2단계) — 사진의 다른 부분을 복사해 글자·로고 위를 덮는다. 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-cover.mjs)
 *
 * ★ 저장 모양: 지우기와 같은 edit.layers 배열 안의 새 종류 (원본 픽셀 좌표, 정수)
 *     { id: 'c_…', type: 'cover', x, y, w, h, sx, sy, feather }
 *       x,y,w,h  덮을 곳 (지우기 레이어의 x,y,w,h와 같은 뜻 — 목록·선택·옮기기·크기 조절을 그대로 쓴다)
 *       sx,sy    가져올 곳의 왼쪽 위 (크기는 덮을 곳과 같은 w×h)
 *       feather  가장자리 부드럽게 (0~COVER_FEATHER_MAX px) — 덮을 곳 "바깥쪽"으로 이만큼 원래 사진과 섞는다.
 *                덮을 곳 네모 안은 가져온 픽셀 그대로(글자가 남지 않게), 바깥 띠에서 가져온 픽셀 → 원래 픽셀로 부드럽게 바뀐다.
 *   지우기 레이어(type 'fill')와 같은 배열이라 쌓인 순서대로 적용된다 (지우기 → 덮기 → 지우기 …, studioFillPlan 규칙).
 *   type이 없거나 모르는 레이어는 예전처럼 그리지 않고 보존만 한다 (studioEdit.readLayers).
 * ★ 덮기 한 개의 결과 = "그 앞까지 적용한 사진"에서 가져올 곳(+feather 띠)을 읽어 덮을 곳(+feather 띠)에 섞은 조각.
 *   화면(StudioCanvas)·완성 JPG(studioBake)·페이지 작은 사진·내보내기가 모두 같은 계산(studioFillPlan.coverOnCrops → blendCover)을 쓴다.
 *   완성 JPG에 들어가므로 덮기를 추가·수정·삭제하면 layers가 바뀌어 erase_v가 올라간다 (studioFinal.stampEraseVersion — 지우기와 같다).
 * ★ 가져올 곳은 사진 밖으로 나가지 않는다 (normalizeCover). feather 띠가 사진 끝에 닿으면 가장자리 픽셀을 늘여 읽는다(가장자리 반복).
 */
import { clampRectToImage, expandRect, MIN_RECT } from './studioCoords.js'

export const COVER_FEATHER_MIN = 0
export const COVER_FEATHER_MAX = 40
// 기본 8px: 상세페이지 사진(폭 750~1920px)이 780px 페이지에 거의 1:1로 보여, 화면에서 약 4~8px의 섞이는 띠가 된다.
// 복사한 조각과 원래 바탕의 밝기 차이·1~2px 이음선을 가리기에 충분하고, 무늬가 두 겹으로 비치는 폭(10px 이상)보다는 좁다.
export const COVER_FEATHER_DEFAULT = 8

const isInt = Number.isInteger

/** 편집기에서 다룰 수 있는 덮기 레이어인지 (모양이 어긋나면 그리지 않고 보존만) */
export function isValidCoverLayer(l) {
  return !!l && l.type === 'cover' && typeof l.id === 'string'
    && [l.x, l.y, l.w, l.h, l.sx, l.sy, l.feather].every(isInt)
    && l.w > 0 && l.h > 0 && l.x >= 0 && l.y >= 0 && l.sx >= 0 && l.sy >= 0
    && l.feather >= COVER_FEATHER_MIN && l.feather <= COVER_FEATHER_MAX
}

/** 가져올 곳 네모 (덮을 곳과 같은 크기) */
export function coverSourceRect(l) {
  return { x: l.sx, y: l.sy, w: l.w, h: l.h }
}

/** 결과가 쓰이는 범위 = 덮을 곳을 feather만큼 넓힌 네모 (사진 안으로 자름) */
export function coverArea(l, W, H) {
  return expandRect(l, l.feather, W, H)
}

/** 읽는 범위 = 가져올 곳을 feather만큼 넓힌 네모 (사진 안으로 자름) */
export function coverSourceArea(l, W, H) {
  return expandRect(coverSourceRect(l), l.feather, W, H)
}

/** 계산이 읽는 범위들 — 가져올 곳 + 덮을 곳(섞을 원래 픽셀). 앞 레이어 연결 판정에 쓴다 (studioFillPlan) */
export function coverReadRects(l, W, H) {
  return [coverSourceArea(l, W, H), coverArea(l, W, H)]
}

/** 계산 key 한 칸 (studioFillPlan.ownKey) — 값이 하나라도 바뀌면 다시 계산 */
export function coverOwnKey(l) {
  return `${l.id}|${l.x},${l.y},${l.w},${l.h}|cover|${l.sx},${l.sy}|${l.feather}`
}

/**
 * 저장 전 정리 — 정수로, 덮을 곳은 사진 안(최소 MIN_RECT), 가져올 곳은 크기 그대로 사진 안으로, feather는 범위 안으로.
 * @returns {{ layer, changed: boolean }}
 */
export function normalizeCover(l, W, H) {
  const r = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0)
  const w0 = Math.max(Math.min(MIN_RECT, W), r(l.w)), h0 = Math.max(Math.min(MIN_RECT, H), r(l.h))
  const { rect } = clampRectToImage({ x: r(l.x), y: r(l.y), w: w0, h: h0 }, W, H)
  const sx = Math.max(0, Math.min(W - rect.w, r(l.sx)))
  const sy = Math.max(0, Math.min(H - rect.h, r(l.sy)))
  const feather = Math.max(COVER_FEATHER_MIN, Math.min(COVER_FEATHER_MAX, r(l.feather)))
  const layer = { ...l, ...rect, sx, sy, feather }
  const changed = ['x', 'y', 'w', 'h', 'sx', 'sy', 'feather'].some(k => layer[k] !== l[k])
  return { layer, changed }
}

function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * 덮을 곳을 고르면 가져올 곳을 옆에 자동으로 — 오른쪽 → 왼쪽 → 아래 → 위 중 사진 안에 다 들어가는 첫 자리.
 * 사이 간격 = feather + 4 (가져올 곳의 섞는 띠가 덮을 곳 글자를 읽지 않게). 어디에도 다 안 들어가면(덮을 곳이 사진 절반보다 큼)
 * 사진 안으로 맞춘 자리 중 덮을 곳과 가장 적게 겹치는 곳.
 * @param {{x,y,w,h}} dst  정리된 덮을 곳  @returns {{ sx, sy }}
 */
export function autoSource(dst, feather, W, H) {
  const gap = feather + 4
  const cands = [
    { x: dst.x + dst.w + gap, y: dst.y },
    { x: dst.x - gap - dst.w, y: dst.y },
    { x: dst.x, y: dst.y + dst.h + gap },
    { x: dst.x, y: dst.y - gap - dst.h },
  ]
  const fits = c => c.x >= 0 && c.y >= 0 && c.x + dst.w <= W && c.y + dst.h <= H
  const hit = cands.find(fits)
  if (hit) return { sx: hit.x, sy: hit.y }
  let best = null
  for (const c of cands) {
    const p = { x: Math.max(0, Math.min(W - dst.w, c.x)), y: Math.max(0, Math.min(H - dst.h, c.y)), w: dst.w, h: dst.h }
    const o = overlapArea(p, dst)
    if (!best || o < best.o) best = { p, o }
  }
  return { sx: best.p.x, sy: best.p.y }
}

/**
 * 섞는 정도 (0~1) — 덮을 곳 네모 안 = 1, 바깥은 네모에서 떨어진 거리(픽셀 가운데 기준, 모서리는 둥글게)에 따라 부드럽게 0으로 (smoothstep).
 * feather 0 = 네모 안 1 · 바깥 0 (또렷한 경계)
 */
export function coverAlpha(px, py, l) {
  const cx = px + 0.5, cy = py + 0.5
  const dx = Math.max(l.x - cx, 0, cx - (l.x + l.w))
  const dy = Math.max(l.y - cy, 0, cy - (l.y + l.h))
  if (dx === 0 && dy === 0) return 1
  if (l.feather <= 0) return 0
  const t = Math.max(0, Math.min(1, 1 - Math.hypot(dx, dy) / l.feather))
  return t * t * (3 - 2 * t)
}

/**
 * 덮기 계산 — 앞 레이어 결과를 이미 덮어쓴 두 조각에서 결과 조각을 만든다 (조각 픽셀을 바꾸지 않는다).
 * @param src  { data: Uint8ClampedArray, width, height } — coverSourceArea(l) 범위의 픽셀
 * @param dst  { data, width, height } — coverArea(l) 범위의 픽셀
 * @returns {{ ok: true, area, data } | { ok: false, reason }}  data = area 크기 RGBA (지우기 조각과 같은 모양)
 */
export function blendCover(src, dst, l, W, H) {
  const area = coverArea(l, W, H)
  const sArea = coverSourceArea(l, W, H)
  if (area.w < 1 || area.h < 1 || sArea.w < 1 || sArea.h < 1) return { ok: false, reason: 'empty_rect' }
  if (src.width !== sArea.w || src.height !== sArea.h || dst.width !== area.w || dst.height !== area.h) {
    return { ok: false, reason: 'crop_size_mismatch' }
  }
  const ox = l.sx - l.x, oy = l.sy - l.y
  const out = new Uint8ClampedArray(area.w * area.h * 4)
  const sd = src.data, dd = dst.data
  for (let y = 0; y < area.h; y++) {
    const py = area.y + y
    // 가져올 줄 — 사진 밖이면 가장자리 줄을 쓴다 (feather 띠만 해당, 네모 안은 normalizeCover가 사진 안으로 둔다)
    const qy = Math.max(0, Math.min(H - 1, py + oy)) - sArea.y
    for (let x = 0; x < area.w; x++) {
      const px = area.x + x
      const a = coverAlpha(px, py, l)
      const o = (y * area.w + x) * 4
      if (a === 0) { out[o] = dd[o]; out[o + 1] = dd[o + 1]; out[o + 2] = dd[o + 2]; out[o + 3] = dd[o + 3]; continue }
      const qx = Math.max(0, Math.min(W - 1, px + ox)) - sArea.x
      const s = (qy * sArea.w + qx) * 4
      if (a === 1) { out[o] = sd[s]; out[o + 1] = sd[s + 1]; out[o + 2] = sd[s + 2]; out[o + 3] = sd[s + 3]; continue }
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(dd[o + c] + (sd[s + c] - dd[o + c]) * a)
    }
  }
  return { ok: true, area, data: { data: out, width: area.w, height: area.h } }
}

/**
 * 레이어를 골랐을 때 지우기 화면 도구 (검수 2묶음) — 고른 레이어 종류에 맞춘다
 *   덮기 → [주변으로 덮기] (그 도구에서 덮을 곳·가져올 곳을 잡아 옮긴다) / 지우기 → [사각형 선택] (옮기기·크기) / 고른 것 없음 → 그대로
 * @param layer 고른 레이어(없으면 null)  @param tool 지금 도구
 */
export function toolForLayer(layer, tool) {
  if (!layer) return tool
  if (layer.type === 'cover') return 'cover'
  if (layer.type === 'fill') return 'marquee'
  return tool
}
