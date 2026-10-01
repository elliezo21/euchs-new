/**
 * 기본 템플릿 카드 표지·미리보기 전체 그림 = 미리 만든 그림
 * (npm run studio:covers → public/studio-covers + src/data/studioTemplateCovers.json, npm run build 전에 scripts/check-studio-covers.mjs가 최신인지 검사).
 *
 * ★ 기본 템플릿은 이 그림만 쓴다 — 화면에서 다른 방식으로 대신 그리지 않는다. 빠지거나 옛것이면 빌드·테스트가 멈춘다.
 * ★ 기본 템플릿이 아닌 것(내 템플릿 등)은 카드·미리보기 창이 studioTemplateThumbs로 그린다 (미리 만들 수 없음).
 * ★ 미리보기 그림은 한 번만 받는다 — 카드에 마우스를 올리거나 누르기 시작할 때(preloadPreview) 받기 시작하고, 미리보기 창은 같은 약속을 기다린다.
 */
import COVERS from '../data/studioTemplateCovers.json'

export const COVER_W = COVERS.width
export const COVER_H = COVERS.height

/** 기본 템플릿 표지 주소 (목록에 없으면 null) */
export function builtInCoverUrl(key) {
  const it = COVERS.items[key]
  return it ? `/${it.file}` : null
}

/** 기본 템플릿 미리보기 그림 { url, width, height } (목록에 없으면 null) */
export function builtInPreview(key) {
  const it = COVERS.preview?.items?.[key]
  return it ? { url: `/${it.file}`, width: COVERS.preview.width, height: it.height } : null
}

const previews = new Map() // key → Promise<blob 주소>
/**
 * 미리보기 그림을 받아 blob 주소로 (key마다 한 번 — 받는 중이면 같은 약속). 실패하면 목록에서 빼서 다음에 다시 받는다.
 * 기본 템플릿이 아니거나 목록에 없으면 reject.
 */
export function loadPreview(key) {
  if (previews.has(key)) return previews.get(key)
  const info = builtInPreview(key)
  if (!info) return Promise.reject(new Error(`미리 만든 미리보기 그림이 없음: ${key}`))
  const p = fetch(info.url)
    .then(res => {
      if (!res.ok) throw new Error(`미리보기 그림을 받지 못함 (${res.status}): ${info.url}`)
      return res.blob()
    })
    .then(b => URL.createObjectURL(b))
    .catch(e => {
      previews.delete(key)
      throw e
    })
  previews.set(key, p)
  return p
}

/** 카드에 마우스를 올리거나 누르기 시작할 때 — 미리 받기 시작 (실패는 여기서 로그만, 창을 열 때 다시 받는다) */
export function preloadPreview(key) {
  if (previews.has(key) || !builtInPreview(key)) return
  loadPreview(key).catch(e => console.warn('[studioTemplateCovers] 미리보기 미리 받기 실패 — 창을 열 때 다시 받음:', key, e))
}
