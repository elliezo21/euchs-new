/**
 * 스튜디오 랜딩 임시 그림 — 직접 그린 SVG (저작권 걱정 없음, 1688 판매자 사진 아님).
 * 실제 사진이 준비되면 studioLandingMedia.js에서 주소만 바꾼다. 이 파일은 그때 지워도 된다.
 *
 * 모든 그림은 800×800 같은 틀 — 제품 자리가 같아서 원본·지운 뒤·배경 뺀 제품이 정확히 겹친다.
 * 중국어 문구 자리(TEXT_BOXES)는 사진 대비 % — 랜딩의 "글자 찾기" 네모가 이 자리에 뜬다.
 */

const uri = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** 중국어 문구 자리 (%, 800×800 기준) — 제목·원형 딱지·아래 띠 */
export const TEXT_BOXES = [
  { x: 16, y: 8.5, w: 68, h: 11.5 },
  { x: 73, y: 22.5, w: 19, h: 19 },
  { x: 13.5, y: 79.5, w: 73, h: 13 },
]

const SHADOW = '<ellipse cx="400" cy="640" rx="210" ry="26" fill="rgba(0,0,0,0.16)"/>'

const PRODUCTS = {
  // 머리띠
  band: `
    <defs><linearGradient id="pb" x1="0" x2="1"><stop offset="0" stop-color="#c2185b"/><stop offset="1" stop-color="#8e1041"/></linearGradient></defs>
    <path d="M225 560 C 225 290, 575 290, 575 560" fill="none" stroke="url(#pb)" stroke-width="44" stroke-linecap="round"/>
    <path d="M225 560 C 225 290, 575 290, 575 560" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="8" stroke-linecap="round" transform="translate(-6,-8)"/>
    <ellipse cx="350" cy="330" rx="62" ry="40" fill="#e91e63" transform="rotate(-18 350 330)"/>
    <ellipse cx="450" cy="330" rx="62" ry="40" fill="#e91e63" transform="rotate(18 450 330)"/>
    <circle cx="400" cy="336" r="24" fill="#ad1457"/>`,
  // 머그
  mug: `
    <path d="M520 360 h40 a60 60 0 0 1 0 150 h-40" fill="none" stroke="#f5f5f5" stroke-width="30"/>
    <rect x="260" y="300" width="270" height="310" rx="34" fill="#fafafa"/>
    <rect x="260" y="300" width="60" height="310" rx="30" fill="rgba(0,0,0,0.05)"/>
    <ellipse cx="395" cy="304" rx="135" ry="22" fill="#e0e0e0"/>
    <ellipse cx="395" cy="306" rx="118" ry="15" fill="#6d4c41"/>
    <rect x="330" y="430" width="130" height="70" rx="12" fill="#ffb74d"/>`,
  // 텀블러
  bottle: `
    <defs><linearGradient id="pt" x1="0" x2="1"><stop offset="0" stop-color="#26a69a"/><stop offset="0.55" stop-color="#4db6ac"/><stop offset="1" stop-color="#00796b"/></linearGradient></defs>
    <rect x="335" y="215" width="130" height="410" rx="52" fill="url(#pt)"/>
    <rect x="352" y="240" width="18" height="330" rx="9" fill="rgba(255,255,255,0.35)"/>
    <rect x="345" y="165" width="110" height="70" rx="16" fill="#263238"/>
    <rect x="335" y="420" width="130" height="16" fill="rgba(0,0,0,0.12)"/>`,
  // 가방
  bag: `
    <path d="M320 330 C 320 230, 480 230, 480 330" fill="none" stroke="#8d6e63" stroke-width="18"/>
    <path d="M250 330 h300 l30 290 h-360 z" fill="#d7a86e"/>
    <path d="M250 330 h300 l6 60 h-312 z" fill="rgba(0,0,0,0.08)"/>
    <rect x="370" y="410" width="60" height="40" rx="8" fill="#8d6e63"/>`,
}

const CN_TEXT = `
  <g font-family="'Microsoft YaHei','PingFang SC','Noto Sans CJK SC','Noto Sans SC',sans-serif" font-weight="900" text-anchor="middle">
    <text x="400" y="142" font-size="70" fill="#d50000" stroke="#ffffff" stroke-width="10" paint-order="stroke">新款热卖 爆款</text>
    <circle cx="660" cy="256" r="72" fill="#e4002b"/>
    <text x="660" y="275" font-size="50" fill="#ffffff">包邮</text>
    <rect x="112" y="642" width="576" height="92" rx="18" fill="#ffe600"/>
    <text x="400" y="708" font-size="54" fill="#d50000">限时特价 ¥9.9</text>
  </g>`

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">${inner}</svg>`
}
function studioBg([a, b]) {
  return `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="800" fill="url(#bg)"/>`
}

/** 제품 사진 한 장 — withText면 중국어 문구가 올라간 원본, 아니면 지운 뒤 */
export function productShot(product, colors, withText) {
  return uri(frame(`${studioBg(colors)}${SHADOW}${PRODUCTS[product]}${withText ? CN_TEXT : ''}`))
}

/** 배경 장면 — 어수선한 원래 배경 + 텀블러 (중국어 없음) */
export function clutteredShot() {
  return uri(frame(`
    <rect width="800" height="800" fill="#b9b2a7"/>
    <rect x="40" y="40" width="300" height="360" rx="10" fill="#d8d3ca"/>
    <rect x="60" y="60" width="120" height="320" fill="#c9c2b6"/>
    <rect x="200" y="60" width="120" height="320" fill="#c9c2b6"/>
    <circle cx="640" cy="200" r="110" fill="#8a9a6b"/>
    <circle cx="560" cy="260" r="70" fill="#76875a"/>
    <rect x="600" y="300" width="40" height="200" fill="#6d5b45"/>
    <rect x="0" y="560" width="800" height="240" fill="#8c7b66"/>
    <rect x="90" y="500" width="150" height="90" rx="8" fill="#5f6b7a"/>
    ${SHADOW}${PRODUCTS.bottle}`))
}

/** 배경 장면 — 배경을 뺀 제품만 (투명) */
export function cutoutShot() {
  return uri(frame(`${SHADOW}${PRODUCTS.bottle}`))
}

/** 배경 장면 — AI 배경 자리 (대리석 테이블 느낌, 제품 없음) */
export function marbleShot() {
  return uri(frame(`
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4efe8"/><stop offset="1" stop-color="#e2d9cc"/></linearGradient>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f5f2"/><stop offset="1" stop-color="#e7e2da"/></linearGradient>
      <radialGradient id="sun" cx="0.8" cy="0.15" r="0.7"><stop offset="0" stop-color="rgba(255,244,214,0.9)"/><stop offset="1" stop-color="rgba(255,244,214,0)"/></radialGradient>
    </defs>
    <rect width="800" height="800" fill="url(#wall)"/>
    <rect width="800" height="800" fill="url(#sun)"/>
    <rect x="0" y="540" width="800" height="260" fill="url(#top)"/>
    <g fill="none" stroke="rgba(120,110,98,0.28)" stroke-width="3">
      <path d="M0 610 C 160 590, 260 660, 420 630 S 700 580, 800 620"/>
      <path d="M60 800 C 140 720, 300 740, 380 690"/>
      <path d="M520 800 C 560 740, 680 720, 800 700"/>
    </g>
    <rect x="0" y="536" width="800" height="8" fill="rgba(0,0,0,0.06)"/>
    <ellipse cx="660" cy="520" rx="60" ry="14" fill="rgba(0,0,0,0.08)"/>
    <rect x="630" y="400" width="60" height="120" rx="26" fill="#cfd8c4"/>`))
}
