/**
 * 요소 이름 한 줄 — 오른쪽 레이어 목록과 우클릭 "겹친 요소 고르기"가 같이 쓴다.
 * 글자 "글자 · 앞 10자" / 도형 "도형 · 네모"·"선"·"화살표" / 표 "사이즈표" / 에셋 "이미지 · 이름" / 사진 = 사진 종류 (없는 사진이면 "없는 사진")
 */
import { isValidShapeItem, isValidLineItem, elementLabel } from './studioShape.js'
import { isValidTableItem, tableLabel } from './studioTable.js'
import { isValidImageItem } from './studioPage.js'
import { isValidTextItem, textLabel } from './studioText.js'
import { KIND_LABEL } from './studioProjects.js'
import { isValidAssetItem, assetLabel } from './studioAsset.js'

/** @param {Map} imagesById image id → studio_images 행 */
export function layerNameOf(it, imagesById) {
  if (isValidTextItem(it)) return textLabel(it)
  if (isValidShapeItem(it) || isValidLineItem(it)) return elementLabel(it)
  if (isValidTableItem(it)) return tableLabel()
  if (isValidAssetItem(it)) return assetLabel(it)
  if (!isValidImageItem(it)) return '요소'
  const row = imagesById?.get(it.imageId)
  return row ? KIND_LABEL[row.kind] ?? '사진' : '없는 사진'
}
