// 기본 템플릿 표지 — 표지를 다시 만들어야 하는지 가리는 값(해시). build-studio-covers.mjs 와 test-studio-template-covers.mjs 가 같이 쓴다.
//
// 해시 = sha256(표지 형식 + 템플릿 내용 전체 + 이 템플릿에 나눈 예시 사진 목록 + 첫 섹션이 쓰는 그림 파일의 바이트).
//   · 템플릿(글자·색·자리·섹션)이 바뀌면, 예시 사진 나눔이 바뀌면, 표지에 들어가는 그림 파일이 바뀌면 값이 달라진다.
//   · 그리는 코드(studioTemplateThumbs·studioExport)나 글꼴을 바꿔 표지 모양이 달라지면 COVER_FORMAT을 올린다.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_TEMPLATES, assignTemplateSamples, coverSlotIndexes } from '../src/lib/studioTemplates.js'
import { readAssetManifest, sectionBgImageOf } from '../src/lib/studioAsset.js'

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
export const COVER_FORMAT = 1
export const COVER_WIDTH = 480 // 표지 폭 (px) — 높이 = 폭 × 4/3 (studioTemplateThumbs.COVER_RATIO)
export const COVER_HEIGHT = 640
export const COVER_DIR = 'studio-covers' // public/studio-covers/<key>-<해시 앞 8자>.webp
export const COVER_INDEX = path.join(ROOT, 'src', 'data', 'studioTemplateCovers.json')
const ASSETS = path.join(ROOT, 'public', 'studio-assets')

export function readManifest() {
  return readAssetManifest(JSON.parse(fs.readFileSync(path.join(ASSETS, 'manifest.json'), 'utf8')))
}

const fileSha = new Map()
function shaOfAsset(p) {
  if (!fileSha.has(p)) {
    const f = path.join(ASSETS, p)
    fileSha.set(p, fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : 'missing')
  }
  return fileSha.get(p)
}

/** 템플릿 key → 해시 (기본 템플릿 모두) */
export function coverHashes(manifest = readManifest()) {
  const assigned = assignTemplateSamples(manifest.samples || [])
  const thumbOf = new Map([...(manifest.items || []), ...(manifest.samples || [])].filter(e => e.thumb).map(e => [e.file, e.thumb]))
  const out = new Map()
  for (const tpl of STUDIO_TEMPLATES) {
    const samples = assigned.get(tpl.key) || []
    const first = tpl.sections[0] || {}
    const paths = new Set()
    for (const i of coverSlotIndexes(tpl)) if (samples[i]?.file) paths.add(samples[i].file)
    const bg = sectionBgImageOf(first)
    if (bg) paths.add(bg.asset)
    for (const p of first.items || []) if (p?.type === 'asset' && typeof p.asset === 'string') paths.add(p.asset)
    for (const p of [...paths]) if (thumbOf.has(p)) paths.add(thumbOf.get(p)) // 표지가 작은 그림을 쓸 수도 있다
    const files = Object.fromEntries([...paths].sort().map(p => [p, shaOfAsset(p)]))
    const body = JSON.stringify({ v: COVER_FORMAT, w: COVER_WIDTH, tpl, samples: samples.map(s => (s ? [s.file, s.w, s.h] : null)), files })
    out.set(tpl.key, crypto.createHash('sha256').update(body).digest('hex'))
  }
  return out
}

export const coverFileOf = (key, hash) => `${COVER_DIR}/${key}-${hash.slice(0, 8)}.webp`

export function readCoverIndex() {
  if (!fs.existsSync(COVER_INDEX)) return { v: COVER_FORMAT, width: COVER_WIDTH, height: COVER_HEIGHT, items: {} }
  return JSON.parse(fs.readFileSync(COVER_INDEX, 'utf8'))
}

/** 표지 목록 검사 — 문제 목록 (빈 배열 = 모두 최신) */
export function coverProblems(index = readCoverIndex(), hashes = coverHashes()) {
  const out = []
  if (index.v !== COVER_FORMAT || index.width !== COVER_WIDTH || index.height !== COVER_HEIGHT) out.push(`표지 형식이 다름 (v ${index.v}, ${index.width}×${index.height})`)
  for (const [key, hash] of hashes) {
    const it = index.items?.[key]
    if (!it) { out.push(`표지 없음: ${key}`); continue }
    if (it.hash !== hash) out.push(`템플릿이 바뀌었는데 표지를 다시 만들지 않음: ${key}`)
    if (it.file !== coverFileOf(key, it.hash)) out.push(`표지 파일 이름이 해시와 다름: ${key} (${it.file})`)
    if (!fs.existsSync(path.join(ROOT, 'public', it.file))) out.push(`표지 파일이 없음: ${key} (${it.file})`)
  }
  for (const key of Object.keys(index.items || {})) if (!hashes.has(key)) out.push(`없는 템플릿의 표지가 목록에 있음: ${key}`)
  return out
}
