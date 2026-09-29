// 예시 사진 넣기 — node scripts/build-studio-samples.mjs <원본 폴더> [--count N] [--skip a.png,b.png] [--long 1044]
//
// <원본 폴더>의 png를 webp(품질 85)로 바꿔 public/studio-assets/samples/euchs-sample_<카테고리>_<종류>_<이름>_<번호>.webp 로 둔다.
// 원본 이름은 euchs-sample_…png 또는 앞머리 없이 <카테고리>_<종류>_<이름>_<번호>.png (2차 묶음) 모두 받는다.
// 원본 png는 저장소에 넣지 않는다. 목록 등록·썸네일(긴 변 400)은 그다음 npm run studio:assets 가 한다 (samples 폴더 = 예시 사진 목록).
//   · 카테고리·종류는 studioSamples.SAMPLE_CATEGORIES·SAMPLE_TYPES 안의 것만
//   · --skip = 넣지 않을 원본 파일 이름 (예: 실제 브랜드 제품과 닮은 사진)
//   · --long = 긴 변을 이만큼으로 줄임 (1차 54장 크기 891·1044에 맞춰 — 2차 원본 1640×2050은 --long 1044)
//   · --count = 넣을 장수 확인 (다르면 멈춤). 이름이 어긋난 파일이 있어도 아무것도 쓰지 않고 멈춘다
//   · 1차 54장: --count 54 / 2차 72장 중 2장 뺀 70장: --count 70 --long 1044 --skip digital_product_wireless-earbuds_01.png,digital_hand_earbuds-in-hand_08.png
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSampleName } from '../src/lib/studioSamples.js'

export const SAMPLE_WEBP_QUALITY = 85
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'studio-assets', 'samples')

const args = process.argv.slice(2)
const src = args[0]
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null }
const count = opt('--count') === null ? null : Number(opt('--count'))
const long = opt('--long') === null ? null : Number(opt('--long'))
const skip = new Set((opt('--skip') || '').split(',').map(s => s.trim()).filter(Boolean))
if (!src || !fs.existsSync(src)) {
  console.error('원본 폴더를 적어 주세요: node scripts/build-studio-samples.mjs <폴더> [--count N] [--skip a.png,b.png]')
  process.exit(1)
}
/** 원본 이름 → 저장 이름 (앞머리 없으면 붙인다). 모양이 어긋나면 null */
const baseOf = n => {
  const b = n.slice(0, -4)
  const full = b.startsWith('euchs-sample_') ? b : `euchs-sample_${b}`
  return parseSampleName(full) ? full : null
}
const all = fs.readdirSync(src).filter(n => /\.png$/i.test(n)).sort()
const missingSkip = [...skip].filter(n => !all.includes(n))
const files = all.filter(n => !skip.has(n))
const bad = files.filter(n => !baseOf(n))
if (bad.length || missingSkip.length || (count !== null && files.length !== count)) {
  console.error(`멈춤 — 넣을 사진 ${files.length}장${count !== null ? ` (기대 ${count})` : ''}, 이름 어긋남 ${bad.length}, 없는 --skip ${missingSkip.length}`, bad, missingSkip)
  process.exit(1)
}
const sharp = (await import('sharp')).default
fs.mkdirSync(OUT, { recursive: true })
let bytes = 0
for (const n of files) {
  const dst = path.join(OUT, `${baseOf(n)}.webp`)
  let img = sharp(path.join(src, n))
  if (long) img = img.resize(long, long, { fit: 'inside', withoutEnlargement: true })
  await img.webp({ quality: SAMPLE_WEBP_QUALITY }).toFile(dst)
  bytes += fs.statSync(dst).size
}
console.log(`예시 사진 ${files.length}장 → public/studio-assets/samples (${Math.round(bytes / 1024)}KB, 뺀 것 ${skip.size}장). 이어서 npm run studio:assets 를 돌려 주세요.`)
