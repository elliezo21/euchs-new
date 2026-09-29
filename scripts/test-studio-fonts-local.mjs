// 우리 도메인에 둔 글꼴(2026-09-29) 테스트 — node scripts/test-studio-fonts-local.mjs
// 목록 ↔ public/studio-fonts 파일·@font-face·라이선스 파일 대조, 외부 주소 없음(Google CDN 호출 없음), 예약 이름(RFN) 규칙, 불러오기 길(내보내기 전 기다림) 그대로
import fs from 'node:fs'
import { STUDIO_FONTS, LOCAL_FONT_CSS_URL, fontSpec } from '../src/lib/studioFonts.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const root = new URL('../', import.meta.url)
const read = p => fs.readFileSync(new URL(p, root), 'utf8')
const exists = p => fs.existsSync(new URL(p, root))

eq('글꼴 11종 모두 우리 도메인 (local)', [STUDIO_FONTS.length, STUDIO_FONTS.every(f => typeof f.local === 'string')], [11, true])
eq('새로 더한 5종', STUDIO_FONTS.slice(6).map(f => f.key), ['pretendard', 'gasoek-one', 'gowun-batang', 'east-sea-dokdo', 'cinzel'])
eq('스타일시트 주소 = 우리 public', [LOCAL_FONT_CSS_URL, exists(`public${LOCAL_FONT_CSS_URL}`)], ['/studio-fonts/studio-fonts.css', true])
eq('Noto Sans KR = 몰(index.html)과 다른 이름 (섞이지 않게)', STUDIO_FONTS.find(f => f.key === 'noto-sans-kr').family, 'Studio Noto Sans KR')

const css = read(`public${LOCAL_FONT_CSS_URL}`)
const faces = [...css.matchAll(/@font-face \{([^}]+)\}/g)].map(m => ({
  family: /font-family: '([^']+)'/.exec(m[1])?.[1],
  weight: Number(/font-weight: (\d+)/.exec(m[1])?.[1]),
  url: /src: url\(([^)]+)\) format\('(?:woff2|truetype)'\)/.exec(m[1])?.[1],
  sliced: /unicode-range:/.test(m[1]),
  swap: /font-display: swap/.test(m[1]),
}))
eq('스타일시트에 외부 주소 없음 (http·//)', /url\((https?:)?\/\//.test(css), false)
eq('@font-face 모두 woff2 또는 ttf · font-display swap', faces.every(f => f.url && /\.(woff2|ttf)$/.test(f.url) && f.swap), true)
eq('글꼴 파일이 모두 있음', faces.filter(f => !exists(`public/studio-fonts/${f.url}`)).map(f => f.url), [])
eq('스타일시트 글꼴 = 목록의 글꼴', [...new Set(faces.map(f => f.family))].sort(), STUDIO_FONTS.map(f => f.family).sort())
for (const f of STUDIO_FONTS) {
  const mine = faces.filter(x => x.family === f.family)
  const ws = [...new Set(mine.map(x => x.weight))].sort((a, b) => a - b)
  eq(`${f.key}: 고를 수 있는 굵기 = 파일에 있는 굵기`, ws, f.weights)
  eq(`${f.key}: 파일은 자기 폴더에만`, mine.every(x => x.url.startsWith(`${f.local}/`)), true)
  const lic = exists(`public/studio-fonts/${f.local}/OFL.txt`) ? read(`public/studio-fonts/${f.local}/OFL.txt`) : ''
  const flat = lic.replace(/\s+/g, ' ') // 원문마다 줄바꿈 자리가 달라 공백을 하나로
  eq(`${f.key}: 라이선스 파일 (SIL OFL 1.1 원문)`, [/licensed under the SIL Open Font License, Version 1\.1/.test(flat), /SIL OPEN FONT LICENSE Version 1\.1/.test(flat), /may be sold by itself/.test(flat)], [true, true, true])
  // 예약 이름(RFN): 변형판(Google 조각 — unicode-range)은 이름에 RFN이 들어가면 안 된다. RFN이 이름에 있으면 배포 원본 파일 그대로(조각 없음)만
  const header = lic.slice(0, lic.indexOf('This Font Software is licensed')).replace(/\s+/g, ' ')
  const rfn = /Reserved Font Names? ([^.]*)/i.exec(header)?.[1] ?? ''
  const names = rfn.split(/,|\band\b/).map(s => s.replace(/["'“”]/g, '').replace(/^\s*Naver\s+/, '').trim()).filter(Boolean)
  const clash = names.some(n => f.family.replace(/\s/g, '').toLowerCase().includes(n.replace(/\s/g, '').toLowerCase()))
  eq(`${f.key}: RFN이 이름에 있으면 원본 파일 그대로 (조각 없음)`, clash ? mine.some(x => x.sliced) : false, false)
}
eq('Pretendard = 제작사 woff2 그대로 (굵기마다 한 장)', faces.filter(f => f.family === 'Pretendard').map(f => f.url), ['pretendard/Pretendard-Regular.woff2', 'pretendard/Pretendard-Bold.woff2', 'pretendard/Pretendard-ExtraBold.woff2', 'pretendard/Pretendard-Black.woff2'])
eq('나눔고딕·나눔명조 = 배포 TTF 그대로 (RFN Nanum)', faces.filter(f => /^Nanum/.test(f.family)).map(f => f.url), [
  'nanum-gothic/NanumGothic-Regular.ttf', 'nanum-gothic/NanumGothic-Bold.ttf', 'nanum-gothic/NanumGothic-ExtraBold.ttf',
  'nanum-myeongjo/NanumMyeongjo-Regular.ttf', 'nanum-myeongjo/NanumMyeongjo-Bold.ttf', 'nanum-myeongjo/NanumMyeongjo-ExtraBold.ttf',
])

const src = read('src/lib/studioFonts.js')
eq('Google Fonts 주소 없음 · 스타일시트 한 장', [/googleapis|gstatic/.test(src), /const SHEETS = \[\{ id: 'studio-fonts-local-css', href: LOCAL_FONT_CSS_URL \}\]/.test(src)], [false, true])
eq('스튜디오 코드 어디에도 fonts.googleapis 없음', (() => {
  const walk = d => fs.readdirSync(new URL(d, root), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(`${d}${e.name}/`) : [`${d}${e.name}`]))
  return walk('src/').filter(p => /studio/i.test(p) && /\.(js|vue)$/.test(p) && /fonts\.googleapis/.test(read(p)))
})(), [])
eq('내보내기: 그리기 전에 글꼴 준비를 기다림 (그대로)', /if \(fonts\.length && !\(await deps\.prepareFonts\(fonts\)\)\)/.test(read('src/lib/studioExport.js')), true)
eq('캔버스 글꼴 한 줄', [fontSpec({ fontFamily: 'gowun-batang', fontWeight: 700, fontSize: 30 }), fontSpec({ fontFamily: 'noto-sans-kr', fontWeight: 400, fontSize: 20 })], ['700 30px "Gowun Batang", serif', '400 20px "Studio Noto Sans KR", sans-serif'])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
