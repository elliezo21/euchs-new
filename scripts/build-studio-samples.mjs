// 예시 사진 넣기 — node scripts/build-studio-samples.mjs <원본 폴더>
//
// <원본 폴더>의 euchs-sample_<카테고리>_<종류>_<이름>_<번호>.png 54장을 webp(품질 85)로 바꿔 public/studio-assets/samples/ 에 둔다.
// 원본 png는 저장소에 넣지 않는다. 목록 등록·썸네일(긴 변 400)은 그다음 npm run studio:assets 가 한다 (samples 폴더 = 예시 사진 목록).
//   · 카테고리 apparel·bag·living, 종류 product·scene·detail·hand (studioSamples.SAMPLE_CATEGORIES·SAMPLE_TYPES)
//   · 장수가 SAMPLE_COUNT가 아니거나 이름이 어긋나면 아무것도 쓰지 않고 멈춘다
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSampleName } from '../src/lib/studioSamples.js'

export const SAMPLE_COUNT = 54
export const SAMPLE_WEBP_QUALITY = 85
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'studio-assets', 'samples')

const src = process.argv[2]
if (!src || !fs.existsSync(src)) {
  console.error('원본 폴더를 적어 주세요: node scripts/build-studio-samples.mjs <폴더>')
  process.exit(1)
}
const files = fs.readdirSync(src).filter(n => /^euchs-sample_.*\.png$/.test(n)).sort()
const bad = files.filter(n => !parseSampleName(n.slice(0, -4)))
if (files.length !== SAMPLE_COUNT || bad.length) {
  console.error(`예시 사진이 ${SAMPLE_COUNT}장이 아니거나 이름이 어긋나요 — 찾은 수 ${files.length}, 이름 어긋남 ${bad.length}`, bad)
  process.exit(1)
}
const sharp = (await import('sharp')).default
fs.mkdirSync(OUT, { recursive: true })
let bytes = 0
for (const n of files) {
  const dst = path.join(OUT, `${n.slice(0, -4)}.webp`)
  await sharp(path.join(src, n)).webp({ quality: SAMPLE_WEBP_QUALITY }).toFile(dst)
  bytes += fs.statSync(dst).size
}
console.log(`예시 사진 ${files.length}장 → public/studio-assets/samples (${Math.round(bytes / 1024)}KB). 이어서 npm run studio:assets 를 돌려 주세요.`)
