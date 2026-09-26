/**
 * 편집기용 지우기 계산 (브라우저) — 영역 주변만 잘라서 메운 "조각(patch)"을 만든다.
 *
 * ★ 계산 순서 규칙은 studioFillPlan.js 상단 주석이 기준이다 (1-9 굽기도 같은 규칙):
 *   배열 순서대로 메우고, 레이어 k는 "원본 + 앞 레이어들을 메운 결과"에서 테두리 색을 읽는다.
 *   편집기는 연결된(영향 범위가 겹치는) 앞 레이어의 조각만 덮어쓴 뒤 계산한다 → 전체 이미지 순차 계산과 같은 결과.
 * ★ 전체 이미지를 getImageData 하지 않는다 (20000px 이미지에서 멈춤). 영역 + pad + 테두리 샘플 + 여유만 자른다.
 *   잘라낸 조각이 이미지 끝에 닿으면 조각 끝 = 이미지 끝이므로 전체 이미지에서 계산한 것과 같다.
 * ★ pad: studioFill에는 "떨어져서 읽기" 인자가 없어, 영역을 사방 pad px 넓혀서 메운다 (메우는 범위 = 화면의 점선).
 */
import { cropRect, fillOnCrop, coverCrops, coverOnCrops } from '@/lib/studioFillPlan'
import { detectBleed } from '@/lib/studioBleed'

/** 원본의 r 범위 픽셀 (오염 시 SecurityError — 호출한 쪽에서 사유를 보여준다) */
function readCrop(img, r) {
  const c = document.createElement('canvas')
  c.width = r.w
  c.height = r.h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
  return ctx.getImageData(0, 0, r.w, r.h)
}

/**
 * 덮기 조각 (12-2, studioCover) — 가져올 곳·덮을 곳 두 군데만 잘라 계산한다 (전체 이미지를 읽지 않음).
 * 반환 모양은 지우기 조각과 같다 (걸침 판정은 없음).
 */
function computeCoverPatch(img, l, prior) {
  const W = img.naturalWidth, H = img.naturalHeight
  const { src, dst } = coverCrops(l, W, H)
  if (src.w < 1 || src.h < 1 || dst.w < 1 || dst.h < 1) return { ok: false, reason: 'empty_rect' }
  const res = coverOnCrops(readCrop(img, src), readCrop(img, dst), l, W, H, prior)
  if (!res.ok) return res
  const out = document.createElement('canvas')
  out.width = res.area.w
  out.height = res.area.h
  out.getContext('2d').putImageData(new ImageData(res.data.data, res.area.w, res.area.h), 0, 0)
  return { ok: true, canvas: out, area: res.area, data: res.data, bleed: { sides: [], scores: {} } }
}

/**
 * @param {HTMLImageElement} img  crossOrigin='anonymous'로 받은 원본
 * @param {{x,y,w,h,method,pad}} l  지우기 레이어 — 덮기(type 'cover')면 computeCoverPatch로 (같은 반환 모양)
 * @param {{ area, data }[]} prior  연결된 앞 레이어 조각 (배열 순서)
 * @returns {{ ok: true, canvas: HTMLCanvasElement, area, data, bleed: { sides, scores } } | { ok: false, reason: string }}
 *   bleed: 네모가 글자에 걸친 변 (studioBleed) — 계산이 읽은 것과 같은 샘플 띠(원본 + 앞 레이어 결과)로 판정
 */
export function computeFillPatch(img, l, prior = []) {
  if (l.type === 'cover') return computeCoverPatch(img, l, prior)
  const W = img.naturalWidth, H = img.naturalHeight
  const crop = cropRect(l, W, H)
  if (crop.w < 1 || crop.h < 1) return { ok: false, reason: 'empty_rect' }

  const c = document.createElement('canvas')
  c.width = crop.w
  c.height = crop.h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  const cropData = ctx.getImageData(0, 0, crop.w, crop.h) // 오염 시 SecurityError — 호출한 쪽에서 사유를 보여준다
  const res = fillOnCrop(cropData, crop, l, W, H, prior)
  if (!res.ok) return res
  // applyFill은 메우는 범위 안만 고치므로, 바깥 샘플 띠는 계산이 읽은 값 그대로다
  // 붓은 사각형 테두리가 없어 걸침 판정을 하지 않는다
  const bleed = l.shape === 'brush' ? { sides: [], scores: {} } : detectBleed(cropData, crop, l, W, H)

  const out = document.createElement('canvas')
  out.width = res.area.w
  out.height = res.area.h
  out.getContext('2d').putImageData(new ImageData(res.data.data, res.area.w, res.area.h), 0, 0)
  return { ok: true, canvas: out, area: res.area, data: res.data, bleed }
}
