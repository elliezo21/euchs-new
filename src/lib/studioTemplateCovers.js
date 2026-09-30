/**
 * 기본 템플릿 카드 표지 = 미리 만든 그림 (npm run studio:covers → public/studio-covers + src/data/studioTemplateCovers.json).
 *
 * ★ 기본 템플릿은 이 그림만 쓴다 — 화면에서 다른 방식으로 대신 그리지 않는다. 표지가 빠지거나 옛것이면 test-studio-template-covers.mjs가 실패한다.
 * ★ 기본 템플릿이 아닌 것(내 템플릿 등)은 카드가 studioTemplateThumbs.templateCover로 그린다 (미리 만들 수 없음).
 */
import COVERS from '../data/studioTemplateCovers.json'

export const COVER_W = COVERS.width
export const COVER_H = COVERS.height

/** 기본 템플릿 표지 주소 (목록에 없으면 null) */
export function builtInCoverUrl(key) {
  const it = COVERS.items[key]
  return it ? `/${it.file}` : null
}
