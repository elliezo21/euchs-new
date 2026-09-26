/**
 * [사진] 목록 탭 (7단계) — 순수 함수 (node 테스트: scripts/test-studio-photo-tabs.mjs)
 *   출처 탭: [1688 사진] = kind gallery·desc (작업을 만들 때 이 작업의 1688 상품에서 가져온 것 — 결정 6) / [내 사진] = kind upload
 *   쓰임 칩: [사용] = included가 false가 아님 / [안 쓸 사진] = included === false (6-2). 두 필터가 함께 걸린다.
 * ★ 새 칸 없이 기존 studio_images.kind로만 나눈다. 목록 번호는 전체 순서 그대로 (탭을 바꿔도 번호가 안 바뀜 — 화면이 한다).
 */

export const SOURCE_1688 = '1688'
export const SOURCE_MINE = 'mine'
export const SOURCE_KINDS = { [SOURCE_1688]: ['gallery', 'desc'], [SOURCE_MINE]: ['upload'] }

/** 사진의 출처 탭 (모르는 kind면 null — 어느 탭에도 넣지 않고 사유를 남긴다) */
export function sourceOf(img) {
  const kind = img?.kind
  if (SOURCE_KINDS[SOURCE_1688].includes(kind)) return SOURCE_1688
  if (SOURCE_KINDS[SOURCE_MINE].includes(kind)) return SOURCE_MINE
  console.error('[studioPhotoTabs] 모르는 사진 종류 — 목록 탭에 넣지 않음:', img?.id, kind)
  return null
}

/** 쓰임 칩: 'used' | 'unused' */
export function usageOf(img) {
  return img?.included === false ? 'unused' : 'used'
}

/** 처음 열 때 출처 탭 — 1688 사진이 1장 이상이면 [1688 사진], 없으면 [내 사진] */
export function defaultSource(images) {
  return (images || []).some(i => sourceOf(i) === SOURCE_1688) ? SOURCE_1688 : SOURCE_MINE
}

/** 출처 + 쓰임으로 거른 목록 (원래 순서 그대로) */
export function filterImages(images, source, usage) {
  return (images || []).filter(i => sourceOf(i) === source && usageOf(i) === usage)
}

/** 개수 — 출처 탭별 전체, 지금 출처 안의 사용·안 씀 */
export function tabCounts(images, source) {
  const out = { [SOURCE_1688]: 0, [SOURCE_MINE]: 0, used: 0, unused: 0 }
  for (const i of images || []) {
    const s = sourceOf(i)
    if (!s) continue
    out[s]++
    if (s === source) out[usageOf(i)]++
  }
  return out
}

/** 이 사진이 보이는 탭 { source, usage } (모르는 kind면 null) */
export function tabOf(img) {
  const source = sourceOf(img)
  return source ? { source, usage: usageOf(img) } : null
}
