/**
 * 완성 사진(5단계 final JPG)이 지금 쓸 수 있는지 — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-final.mjs)
 *
 * ★ final JPG에는 지우기만 들어 있다 (필터·조정 look은 넣지 않는다 — studioLook.js). 그래서 유효 여부는
 *   "그 JPG를 만든 뒤 지우기(layers)가 바뀌었는가"로만 판단한다. look만 바뀐 저장은 final을 무효로 만들지 않는다.
 * ★ edit.erase_v = 지우기(layers)가 마지막으로 바뀐 저장의 edit_version (DB 칸 추가 없이 edit JSON 안에 둔다).
 *   정확히 그 값이 아니어도 "그 값 이상"이면 안전하다(크게 잡으면 final을 덜 쓸 뿐, 틀린 사진을 쓰지 않는다).
 *   - 저장할 때 브라우저가 찍는다(stampEraseVersion): layers가 직전 저장본과 같으면 직전 값 유지, 다르면 이번 버전
 *   - 예전 edit(erase_v 없음)·이상한 값 = edit_version으로 본다 (예전 규칙 final_rendered_version = edit_version과 같음)
 * ★ final 유효: final_rendered_version ≥ erase_v (그리고 ≤ edit_version). 파일 경로는 final_rendered_version으로 만든다.
 * ★ 서버(api/studio-upload.js final_prepare·final_confirm)도 같은 규칙(eraseVersionOf)으로 판단한다 — 규칙을 바꾸면 둘 다.
 */

export const ERASE_VERSION_KEY = 'erase_v'

/** 지우기가 마지막으로 바뀐 버전 (모르면 editVersion — 가장 보수적인 값) */
export function eraseVersionOf(edit, editVersion) {
  const v = edit && typeof edit === 'object' ? edit[ERASE_VERSION_KEY] : undefined
  if (!Number.isInteger(editVersion)) return null
  return Number.isInteger(v) && v >= 0 && v <= editVersion ? v : editVersion
}

/** 두 layers 배열이 같은지 (저장 모양 그대로 비교) */
export function sameLayers(a, b) {
  return JSON.stringify(a || []) === JSON.stringify(b || [])
}

/** 이력·화면용 edit에서 erase_v를 뗀다 (erase_v는 저장할 때만 찍는다 — 이력 비교에 끼지 않게) */
export function withoutEraseVersion(edit) {
  if (!edit || typeof edit !== 'object' || !(ERASE_VERSION_KEY in edit)) return edit
  const { [ERASE_VERSION_KEY]: _drop, ...rest } = edit
  return rest
}

/**
 * 저장 직전: 이번 저장(curVersion → curVersion + 1)의 erase_v를 찍은 edit
 * @param {object} nextEdit 저장할 edit  @param {object|null} baseEdit 지금 서버에 있는 edit(curVersion의 것)
 */
export function stampEraseVersion(nextEdit, baseEdit, curVersion) {
  const keep = sameLayers(nextEdit?.layers, baseEdit?.layers)
  const eraseV = keep ? eraseVersionOf(baseEdit, curVersion) : curVersion + 1
  return { ...nextEdit, [ERASE_VERSION_KEY]: eraseV }
}

/**
 * 지금 쓸 수 있는 final JPG의 버전 (없으면 null) — 행의 저장된 값 기준
 * @param {{ edit, edit_version, final_rendered_version }} row
 */
export function usableFinalVersion(row) {
  const f = row?.final_rendered_version
  const e = row?.edit_version
  if (!Number.isInteger(f) || f < 1 || !Number.isInteger(e) || f > e) return null
  return f >= eraseVersionOf(row.edit, e) ? f : null
}
