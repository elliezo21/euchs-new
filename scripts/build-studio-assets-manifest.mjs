// 스튜디오 에셋 이미지 목록 만들기 — node scripts/build-studio-assets-manifest.mjs  (npm run studio:assets)
//
// public/studio-assets/<카테고리 폴더>/<파일> 을 훑어 public/studio-assets/manifest.json 을 다시 쓴다.
//   · 파일을 폴더에 넣고 이 명령을 돌리면 [요소] → [이미지] 목록에 뜬다 (코드 수정 없음).
//   · 폴더 이름 = 카테고리 key. 'backgrounds' 폴더의 그림은 섹션 배경용(use 'bg'), 나머지는 요소용(use 'item').
//   · 이름(label)·카테고리 이름은 지금 manifest.json에 적힌 것을 그대로 둔다. 새 파일은 파일 이름이 이름이 된다 → manifest.json에서 고쳐 쓰면 다음에도 유지된다.
//   · 파일·폴더 이름은 소문자·숫자·-·_ 만 (studioAsset.isAssetPath). 어긋난 파일은 건너뛰고 알린다.
//   · --check : 쓰지 않고, 지금 manifest.json이 폴더와 맞는지만 본다 (다르면 종료 코드 1)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isAssetPath, readAssetManifest, ASSET_MANIFEST_VERSION } from '../src/lib/studioAsset.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'studio-assets')
const OUT = path.join(ROOT, 'manifest.json')
const CHECK = process.argv.includes('--check')
const BG_FOLDER = 'backgrounds'
const DEFAULT_LABELS = { objects: '오브제', decor: '장식', backgrounds: '배경', placeholder: '이미지 자리' }
const ORDER = ['objects', 'decor', 'backgrounds', 'placeholder'] // 이 밖의 폴더는 뒤에 이름순

/** 그림 크기 (px) — 못 읽으면 null */
export function imageSize(buf, ext) {
  if (ext === 'svg') {
    const head = buf.toString('utf8', 0, Math.min(buf.length, 4000))
    const tag = head.match(/<svg\b[^>]*>/i)?.[0]
    if (!tag) return null
    const num = name => { const m = tag.match(new RegExp(`\\b${name}="([0-9.]+)(?:px)?"`, 'i')); return m ? Number(m[1]) : null }
    const w = num('width'), h = num('height')
    if (w > 0 && h > 0) return { w: Math.round(w), h: Math.round(h) }
    const vb = tag.match(/\bviewBox="([^"]+)"/i)?.[1].trim().split(/[\s,]+/).map(Number)
    return vb?.length === 4 && vb[2] > 0 && vb[3] > 0 ? { w: Math.round(vb[2]), h: Math.round(vb[3]) } : null
  }
  if (ext === 'png') {
    if (buf.length < 24 || buf.toString('latin1', 1, 4) !== 'PNG') return null
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null
      const m = buf[i + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }
      i += 2 + buf.readUInt16BE(i + 2)
    }
    return null
  }
  if (ext === 'webp') {
    if (buf.length < 30 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null
    const kind = buf.toString('latin1', 12, 16)
    if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) } }
  }
  return null
}

function build() {
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { categories: [], items: [] }
  const oldCat = new Map((old.categories || []).map(c => [c.key, c.label]))
  const oldItem = new Map((old.items || []).map(i => [i.file, i]))
  const skipped = []
  const folders = fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))
  const categories = [], items = []
  for (const folder of folders) {
    const files = fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name).sort()
    let n = 0
    for (const name of files) {
      const file = `${folder}/${name}`
      if (!isAssetPath(file)) { skipped.push(`${file} — 이름에 쓸 수 없는 글자 (소문자·숫자·-·_ 와 svg·png·jpg·jpeg·webp만)`); continue }
      const ext = name.split('.').pop()
      const size = imageSize(fs.readFileSync(path.join(ROOT, folder, name)), ext)
      if (!size) { skipped.push(`${file} — 크기를 읽지 못함`); continue }
      const base = name.slice(0, -(ext.length + 1))
      items.push({ id: `${folder}-${base}`, category: folder, label: oldItem.get(file)?.label ?? base, file, w: size.w, h: size.h, use: folder === BG_FOLDER ? 'bg' : 'item' })
      n++
    }
    if (n) categories.push({ key: folder, label: oldCat.get(folder) ?? DEFAULT_LABELS[folder] ?? folder })
  }
  return { manifest: { v: ASSET_MANIFEST_VERSION, categories, items }, skipped }
}

// 다른 파일이 imageSize만 불러 쓸 때(테스트)는 아래를 돌리지 않는다
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { manifest, skipped } = build()
  const text = `${JSON.stringify(manifest, null, 2)}\n`
  const problems = readAssetManifest(manifest).problems
  for (const s of skipped) console.error('건너뜀:', s)
  for (const p of problems) console.error('문제:', p)
  if (CHECK) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : ''
    const same = now === text
    console.log(same ? `manifest.json이 폴더와 같아요 (그림 ${manifest.items.length}개)` : 'manifest.json이 폴더와 달라요 — npm run studio:assets 를 돌려 주세요')
    process.exit(same && problems.length === 0 ? 0 : 1)
  }
  fs.writeFileSync(OUT, text)
  console.log(`manifest.json 을 썼어요 — 카테고리 ${manifest.categories.length}개 · 그림 ${manifest.items.length}개`)
  for (const c of manifest.categories) console.log(`  ${c.key} (${c.label}): ${manifest.items.filter(i => i.category === c.key).length}개`)
  process.exit(problems.length ? 1 : 0)
}
