// 우리 도메인에 둔 글꼴(2026-09-29) 테스트 — node scripts/test-studio-fonts-local.mjs
// 목록 ↔ public/studio-fonts 파일·@font-face·라이선스 파일 대조, 외부 주소 없음, 예약 이름(RFN) 규칙, 불러오기 길(내보내기 전 기다림) 그대로
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

const locals = STUDIO_FONTS.filter(f => f.local)
eq('우리 도메인 글꼴 5종', locals.map(f => f.key), ['pretendard', 'gasoek-one', 'gowun-batang', 'east-sea-dokdo', 'cinzel'])
eq('스타일시트 주소 = 우리 public', [LOCAL_FONT_CSS_URL, exists(`public${LOCAL_FONT_CSS_URL}`)], ['/studio-fonts/studio-fonts.css', true])

const css = read(`public${LOCAL_FONT_CSS_URL}`)
const faces = [...css.matchAll(/@font-face \{([^}]+)\}/g)].map(m => ({
  family: /font-family: '([^']+)'/.exec(m[1])?.[1],
  weight: Number(/font-weight: (\d+)/.exec(m[1])?.[1]),
  url: /src: url\(([^)]+)\) format\('woff2'\)/.exec(m[1])?.[1],
  swap: /font-display: swap/.test(m[1]),
}))
eq('스타일시트에 외부 주소 없음 (http·//)', /url\((https?:)?\/\//.test(css), false)
eq('@font-face 모두 woff2 · font-display swap', faces.every(f => f.url && f.url.endsWith('.woff2') && f.swap), true)
eq('woff2 파일이 모두 있음', faces.filter(f => !exists(`public/studio-fonts/${f.url}`)).map(f => f.url), [])
eq('스타일시트 글꼴 = 목록의 local 글꼴만', [...new Set(faces.map(f => f.family))].sort(), locals.map(f => f.family).sort())
for (const f of locals) {
  const ws = [...new Set(faces.filter(x => x.family === f.family).map(x => x.weight))].sort((a, b) => a - b)
  eq(`${f.key}: 고를 수 있는 굵기 = 파일에 있는 굵기`, ws, f.weights)
  eq(`${f.key}: 파일은 자기 폴더에만`, faces.filter(x => x.family === f.family).every(x => x.url.startsWith(`${f.local}/`)), true)
  const lic = exists(`public/studio-fonts/${f.local}/OFL.txt`) ? read(`public/studio-fonts/${f.local}/OFL.txt`) : ''
  eq(`${f.key}: 라이선스 파일 (SIL OFL 1.1 원문)`, [/licensed under the SIL Open Font License, Version 1\.1/.test(lic), /SIL OPEN FONT LICENSE Version 1\.1 - 26 February 2007/.test(lic)], [true, true])
  // Google 배포 조각(변형판)은 예약 이름이 없는 글꼴만 — 제작사 원본 파일(Pretendard)은 예약 이름이 있어도 된다
  const header = lic.slice(0, lic.indexOf('This Font Software is licensed'))
  if (f.key !== 'pretendard') eq(`${f.key}: 저작권 줄에 예약 이름(RFN) 없음`, /Reserved Font Name/i.test(header), false)
}
eq('Pretendard = 제작사 woff2 그대로 (굵기마다 파일 한 장, 글자 범위 나눔 없음)', faces.filter(f => f.family === 'Pretendard').map(f => f.url), ['pretendard/Pretendard-Regular.woff2', 'pretendard/Pretendard-Bold.woff2', 'pretendard/Pretendard-ExtraBold.woff2', 'pretendard/Pretendard-Black.woff2'])

const src = read('src/lib/studioFonts.js')
eq('Google 스타일시트에는 local 글꼴을 넣지 않음', /STUDIO_FONTS\.filter\(f => !f\.global && !f\.local\)/.test(src), true)
eq('편집기가 열릴 때 두 장을 붙이고 둘 다 끝나야 준비됨', /Promise\.all\(SHEETS\.map\(attachSheet\)\)\.then\(\(\) => \{ cssReady = true \}/.test(src), true)
eq('내보내기: 그리기 전에 글꼴 준비를 기다림 (그대로)', /if \(fonts\.length && !\(await deps\.prepareFonts\(fonts\)\)\)/.test(read('src/lib/studioExport.js')), true)
eq('캔버스 글꼴 한 줄 (local 글꼴)', fontSpec({ fontFamily: 'gowun-batang', fontWeight: 700, fontSize: 30 }), '700 30px "Gowun Batang", serif')

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
