// 스튜디오 에셋 이미지 목록 + 썸네일 만들기 — node scripts/build-studio-assets-manifest.mjs  (npm run studio:assets)
//
// public/studio-assets/<카테고리 폴더>/<파일> 을 훑어 public/studio-assets/manifest.json 을 다시 쓰고,
// 목록용 작은 그림 public/studio-assets/thumbs/<파일 이름>.webp (긴 변 240px)를 만든다.
//   · 파일을 폴더에 넣고 이 명령을 돌리면 [요소] → [이미지] 목록에 뜬다 (코드 수정 없음).
//   · 폴더 이름 = 카테고리 key. 'backgrounds'·'scenes' 폴더의 그림은 배경용(use 'bg'), 나머지는 요소용(use 'item'). 'thumbs' 폴더는 썸네일 자리(카테고리 아님).
//   · 이미 manifest.json에 있는 항목은 id·label·group·thumb·source·use·groundY를 그대로 둔다 (w·h만 파일에서 다시 읽는다).
//     groundY(0~1) = 바닥이 있는 연출 배경에서 제품 밑면을 맞출 선 — 그림을 보고 manifest.json에 직접 적는다.
//     categories의 이름·순서, groups, license도 그대로 둔다.
//   · 새 파일: label = 파일 이름(→ manifest.json에서 고쳐 쓰면 유지), 파일 이름이 'euchs-종류_묶음_이름_번호' 모양이고 묶음이 groups에 있으면 group을 채운다.
//     source는 채우지 않는다(출처는 사람이 적는다).
//   · 썸네일: png·jpg·jpeg·webp만 (svg는 가벼워서 원본을 그대로 쓴다). 원본보다 새 썸네일이 있으면 다시 만들지 않는다 (--force = 모두 다시).
//   · 파일·폴더 이름은 소문자·숫자·-·_ 만 (studioAsset.isAssetPath). 어긋난 파일은 건너뛰고 알린다.
//   · samples 폴더 = 예시 사진 (studioSamples) — 에셋 목록(items)이 아니라 manifest의 samples 칸에 따로 적는다.
//     파일 이름 'euchs-sample_카테고리_종류_이름_번호.webp'에서 category·type을 읽고, 썸네일은 samples/thumbs/<이름>.webp (긴 변 400).
//     원본 png → webp 는 scripts/build-studio-samples.mjs 가 먼저 한다.
//   · --check : 쓰지 않고, 지금 manifest.json·썸네일이 폴더와 맞는지만 본다 (다르면 종료 코드 1)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isAssetPath, readAssetManifest, ASSET_MANIFEST_VERSION } from '../src/lib/studioAsset.js'
import { SAMPLE_DIR, SAMPLE_THUMB_SIZE, parseSampleName, sampleThumbPath } from '../src/lib/studioSamples.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'studio-assets')
const OUT = path.join(ROOT, 'manifest.json')
const CHECK = process.argv.includes('--check')
const FORCE = process.argv.includes('--force')
const BG_FOLDERS = ['backgrounds', 'scenes']
const THUMB_DIR = 'thumbs'
export const THUMB_SIZE = 240
export const THUMB_QUALITY = 80
const RASTER = ['png', 'jpg', 'jpeg', 'webp']
const DEFAULT_LABELS = { objects: '오브제', decor: '장식', backgrounds: '배경', scenes: '연출 배경', placeholder: '이미지 자리' }
const ORDER = ['objects', 'decor', 'backgrounds', 'scenes', 'placeholder'] // 새 폴더의 자리 (이미 목록에 있는 카테고리는 그 순서 그대로)

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

/** 파일 이름 → 썸네일 경로 ('thumbs/<이름>.webp'). svg는 null (원본을 쓴다) */
export function thumbPathOf(file) {
  const name = file.split('/').pop()
  const ext = name.split('.').pop()
  return RASTER.includes(ext) ? `${THUMB_DIR}/${name.slice(0, -(ext.length + 1))}.webp` : null
}
/** 'euchs-obj_apparel_fabric-drape_01' → { group: 'apparel', rest: 'apparel_fabric-drape_01' } (모양이 다르면 null) */
export function parseAssetName(base) {
  const m = /^euchs-[a-z0-9]+_([a-z0-9]+)_(.+)$/.exec(base)
  return m ? { group: m[1], rest: `${m[1]}_${m[2]}` } : null
}

function build() {
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { categories: [], items: [] }
  const oldCats = (old.categories || []).filter(c => c && typeof c.key === 'string')
  const oldItem = new Map((old.items || []).map(i => [i.file, i]))
  const groupKeys = new Set((old.groups || []).map(g => g.key))
  const skipped = []
  const rank = k => { const i = oldCats.findIndex(c => c.key === k); return i >= 0 ? i : 100 + (ORDER.indexOf(k) + 1 || 99) }
  const folders = fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== THUMB_DIR && d.name !== SAMPLE_DIR).map(d => d.name)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  const categories = [], fresh = []
  const seen = new Set()
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
      const was = oldItem.get(file)
      const parsed = parseAssetName(base)
      const thumb = was?.thumb ?? thumbPathOf(file)
      const group = was?.group ?? (parsed && groupKeys.has(parsed.group) ? parsed.group : undefined)
      // 칸 순서는 받은 manifest와 같게 (id·category·label·file·thumb·w·h·use·group·source·groundY)
      const item = {
        id: was?.id ?? `${folder}-${parsed ? parsed.rest : base}`, category: folder, label: was?.label ?? base, file,
        ...(thumb ? { thumb } : {}), w: size.w, h: size.h, use: was?.use ?? (BG_FOLDERS.includes(folder) ? 'bg' : 'item'),
        ...(group ? { group } : {}), ...(was?.source ? { source: was.source } : {}),
        ...(was?.groundY !== undefined ? { groundY: was.groundY } : {}), // 바닥선 — 사람이 그림을 보고 적은 값 그대로 (이상하면 readAssetManifest가 알림)
      }
      seen.add(file)
      fresh.push(item)
      n++
    }
    if (n) categories.push({ key: folder, label: oldCats.find(c => c.key === folder)?.label ?? DEFAULT_LABELS[folder] ?? folder })
  }
  // 항목 순서: 이미 있던 것은 있던 순서 그대로, 새 파일은 뒤에 (폴더·이름순)
  const order = new Map((old.items || []).map((i, n) => [i.file, n]))
  const items = fresh.map((it, n) => ({ it, k: order.has(it.file) ? order.get(it.file) : 100000 + n })).sort((a, b) => a.k - b.k).map(x => x.it)
  const gone = (old.items || []).filter(i => !seen.has(i.file)).map(i => i.file)
  const samples = buildSamples(old.samples, skipped, gone)
  const manifest = {
    v: ASSET_MANIFEST_VERSION, categories, items, ...(old.groups ? { groups: old.groups } : {}), ...(old.license ? { license: old.license } : {}),
    ...(samples.length ? { samples } : {}),
  }
  return { manifest, skipped, gone }
}

/** 예시 사진 목록 (samples 폴더의 webp, 이름순) — 있던 항목의 label은 그대로 */
function buildSamples(oldList, skipped, gone) {
  const dir = path.join(ROOT, SAMPLE_DIR)
  const was = new Map((oldList || []).map(i => [i.file, i]))
  const out = []
  const names = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name).sort() : []
  for (const name of names) {
    const file = `${SAMPLE_DIR}/${name}`
    const p = name.endsWith('.webp') ? parseSampleName(name.slice(0, -5)) : null
    if (!p || !isAssetPath(file)) { skipped.push(`${file} — 예시 사진 이름이 아님 (euchs-sample_카테고리_종류_이름_번호.webp)`); continue }
    const size = imageSize(fs.readFileSync(path.join(dir, name)), 'webp')
    if (!size) { skipped.push(`${file} — 크기를 읽지 못함`); continue }
    out.push({
      id: `sample-${p.category}-${p.type}-${p.slug}-${p.no}`, kind: 'sample', category: p.category, type: p.type,
      label: was.get(file)?.label ?? p.slug, file, thumb: sampleThumbPath(file), w: size.w, h: size.h, ratio: Math.round((size.h / size.w) * 10000) / 10000,
    })
  }
  for (const i of oldList || []) if (!out.some(o => o.file === i.file)) gone.push(i.file)
  return out
}

/** 썸네일 만들기 — 있어야 하는데 없거나 원본보다 오래된 것만. @returns {{ made: string[], kept: number, failed: string[], stray: string[] }} */
async function makeThumbs(items, { write }) {
  const need = items.filter(i => i.thumb)
  const sizeOf = it => (it.kind === 'sample' ? SAMPLE_THUMB_SIZE : THUMB_SIZE)
  const made = [], failed = []
  let kept = 0
  let sharp = null
  for (const it of need) {
    const src = path.join(ROOT, it.file), dst = path.join(ROOT, it.thumb)
    const fresh = !FORCE && fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs
    if (fresh) { kept++; continue }
    if (!write) { made.push(it.thumb); continue }
    try {
      sharp ??= (await import('sharp')).default
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      await sharp(src).resize(sizeOf(it), sizeOf(it), { fit: 'inside', withoutEnlargement: true }).webp({ quality: THUMB_QUALITY, alphaQuality: 90 }).toFile(dst)
      made.push(it.thumb)
    } catch (e) {
      failed.push(`${it.thumb} ← ${it.file}: ${e.message}`)
    }
  }
  const want = new Set(need.filter(i => i.kind !== 'sample').map(i => i.thumb)) // 예시 사진 썸네일은 samples/thumbs (아래 stray 검사 밖)
  const dir = path.join(ROOT, THUMB_DIR)
  const stray = fs.existsSync(dir) ? fs.readdirSync(dir).map(n => `${THUMB_DIR}/${n}`).filter(p => !want.has(p)) : []
  return { made, kept, failed, stray }
}

// 다른 파일이 함수만 불러 쓸 때(테스트)는 아래를 돌리지 않는다
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { manifest, skipped, gone } = build()
  const text = `${JSON.stringify(manifest, null, 2)}\n`
  const problems = readAssetManifest(manifest).problems
  for (const s of skipped) console.error('건너뜀:', s)
  for (const g of gone) console.error('파일이 없어 목록에서 뺌:', g)
  for (const p of problems) console.error('문제:', p)
  const thumbs = await makeThumbs([...manifest.items, ...(manifest.samples || [])], { write: !CHECK })
  for (const f of thumbs.failed) console.error('썸네일을 만들지 못함:', f)
  for (const s of thumbs.stray) console.error('목록에 없는 썸네일 (지우지 않음):', s)
  if (CHECK) {
    const now = fs.existsSync(OUT) ? JSON.stringify(JSON.parse(fs.readFileSync(OUT, 'utf8')), null, 2) + '\n' : ''
    const same = now === text
    console.log(same ? `manifest.json이 폴더와 같아요 (그림 ${manifest.items.length}개)` : 'manifest.json이 폴더와 달라요 — npm run studio:assets 를 돌려 주세요')
    console.log(thumbs.made.length ? `썸네일 ${thumbs.made.length}개가 없거나 오래됐어요 — npm run studio:assets 를 돌려 주세요` : `썸네일 ${thumbs.kept}개 모두 있어요`)
    process.exit(same && problems.length === 0 && thumbs.made.length === 0 ? 0 : 1)
  }
  fs.writeFileSync(OUT, text)
  console.log(`manifest.json 을 썼어요 — 카테고리 ${manifest.categories.length}개 · 그림 ${manifest.items.length}개`)
  for (const c of manifest.categories) console.log(`  ${c.key} (${c.label}): ${manifest.items.filter(i => i.category === c.key).length}개`)
  if (manifest.samples) console.log(`  예시 사진 (samples): ${manifest.samples.length}장`)
  console.log(`썸네일 — 새로 만듦 ${thumbs.made.length}개 · 그대로 ${thumbs.kept}개 · 실패 ${thumbs.failed.length}개`)
  process.exit(problems.length || thumbs.failed.length ? 1 : 0)
}
