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
import { cropRect, fillOnCrop } from '@/lib/studioFillPlan'
import { detectBleed } from '@/lib/studioBleed'

/**
 * @param {HTMLImageElement} img  crossOrigin='anonymous'로 받은 원본
 * @param {{x,y,w,h,method,pad}} l
 * @param {{ area, data }[]} prior  연결된 앞 레이어 조각 (배열 순서)
 * @returns {{ ok: true, canvas: HTMLCanvasElement, area, data, bleed: { sides, scores } } | { ok: false, reason: string }}
 *   bleed: 네모가 글자에 걸친 변 (studioBleed) — 계산이 읽은 것과 같은 샘플 띠(원본 + 앞 레이어 결과)로 판정
 */
export function computeFillPatch(img, l, prior = []) {
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
  const bleed = detectBleed(cropData, crop, l, W, H)

  const out = document.createElement('canvas')
  out.width = res.area.w
  out.height = res.area.h
  out.getContext('2d').putImageData(new ImageData(res.data.data, res.area.w, res.area.h), 0, 0)
  return { ok: true, canvas: out, area: res.area, data: res.data, bleed }
}
