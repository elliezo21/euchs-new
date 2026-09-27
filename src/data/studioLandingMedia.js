/**
 * 스튜디오 랜딩(/studio) 사진 — 여기 한 곳만 바꾸면 모든 장면이 바뀐다.
 *
 * 실제 사진으로 바꾸는 법:
 *   1) public/studio-landing/ 에 webp를 올린다 (예: public/studio-landing/hero-before.webp)
 *   2) 아래 값을 '/studio-landing/hero-before.webp' 처럼 바꾼다
 *   3) before·after(원본·지운 뒤)와 original·cutout(원래 배경·배경 뺀 제품)은 같은 크기·같은 구도여야 정확히 겹친다
 *   4) boxes = 원본 사진에서 지울 글자 자리 (% — x·y는 왼쪽 위, w·h는 폭·높이). 새 사진에 맞게 고친다
 *
 * 나중에 AI 영상으로 바꾸는 법 (장면마다):
 *   video = '/studio-landing/erase.mp4' 처럼 넣으면 그 장면 그림 자리에 코드 애니메이션 대신 영상이 나온다
 *   (autoplay·muted·loop·playsinline·preload=metadata, 화면 밖이면 멈춤·다시 들어오면 처음부터).
 *   poster = 영상 전 첫 화면 + 움직임 줄이기일 때 보여 줄 정지 사진. 비워 두면(video: '') 지금처럼 코드 애니메이션.
 *
 * ★ 1688 판매자 사진은 넣지 않는다 (직접 찍거나 권리가 확인된 사진만).
 * ★ 지금 값은 임시 그림(studioLandingPlaceholders.js — 직접 그린 SVG)이다.
 */
import { productShot, clutteredShot, cutoutShot, marbleShot, TEXT_BOXES } from './studioLandingPlaceholders.js'

const PINK = ['#fbe3e6', '#f3c6cd']
const CREAM = ['#f6eee2', '#e9dcc8']
const MINT = ['#e3f3ef', '#c7e6de']
const SKY = ['#e5eefb', '#c9daf3']

export const LANDING_MEDIA = {
  // 1. 히어로 — 원본 → 지운 뒤 반복 (정사각형 권장 1200×1200)
  hero: {
    before: productShot('band', PINK, true),
    after: productShot('band', PINK, false),
    alt: '글자가 적힌 머리띠 사진과, 글자를 지운 깨끗한 사진',
    video: '',
    poster: productShot('band', PINK, false),
  },
  // 2. 글자 지우기 — 원본·지운 뒤 + 문구 자리 (정사각형 1200×1200)
  erase: {
    before: productShot('mug', CREAM, true),
    after: productShot('mug', CREAM, false),
    boxes: TEXT_BOXES,
    alt: '글자가 적힌 머그 사진과, 글자를 지운 사진',
    video: '',
    poster: productShot('mug', CREAM, false),
  },
  // 3. 배경 — 원래 사진 · 배경 뺀 제품(투명 PNG/webp) · AI 배경(제품 없이) · 단색 (정사각형 1200×1200, 셋 다 같은 구도)
  background: {
    original: clutteredShot(),
    cutout: cutoutShot(),
    aiBackground: marbleShot(),
    solidColor: '#f1ece4',
    alt: '텀블러 사진의 배경이 투명, 단색, 대리석 테이블 배경으로 바뀌는 모습',
    video: '',
    poster: clutteredShot(),
  },
  // 4. 원클릭 — 넣는 사진 5장 (before = 글자가 적힌 원본, after = 지운 뒤, 정사각형 800×800)
  oneClick: {
    photos: [
      { before: productShot('band', PINK, true), after: productShot('band', PINK, false) },
      { before: productShot('mug', CREAM, true), after: productShot('mug', CREAM, false) },
      { before: productShot('bottle', MINT, true), after: productShot('bottle', MINT, false) },
      { before: productShot('bag', SKY, true), after: productShot('bag', SKY, false) },
      { before: productShot('band', MINT, true), after: productShot('band', MINT, false) },
    ],
    video: '',
    poster: productShot('band', PINK, false),
  },
  // 5. 편집 — 편집기 모형 속 사진 1장 (정사각형 800×800)
  editor: {
    photo: productShot('bag', SKY, false),
    video: '',
    poster: productShot('bag', SKY, false),
  },
  // 6. 내보내기 — 완성 페이지 속 사진 3장 (정사각형 800×800)
  export: {
    pagePhotos: [productShot('bottle', MINT, false), productShot('mug', CREAM, false), productShot('band', PINK, false)],
    video: '',
    poster: productShot('bottle', MINT, false),
  },
}
