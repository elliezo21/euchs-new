// 기본 템플릿 표지·미리보기 그림 미리 만들기 — node scripts/build-studio-covers.mjs  (npm run studio:covers)
//
// 템플릿 갤러리·편집기 [템플릿] 패널 카드(표지)와 미리보기 창(전체 페이지)은 기본 템플릿을 이 명령이 만든 그림으로만 보여 준다 (화면에서 그리지 않음).
//   · 그리는 코드는 화면과 같은 studioTemplateThumbs.drawCoverCanvas(첫 섹션)·drawFullCanvas(전체 페이지) — 크롬(헤드리스)에서 돌린다.
//     src/lib 스튜디오 모듈은 상대 경로 import만 쓰므로 이 파일의 작은 서버(/src = src, 그 밖 = public)로 충분하다 (vite 안 씀).
//   · 결과: public/studio-covers/<key>-<해시 8자>.webp (표지 480×640, 품질 82)
//           public/studio-covers/<key>-page-<해시 8자>.webp (미리보기 폭 560, 높이는 템플릿마다, 품질 80)
//           src/data/studioTemplateCovers.json (key → 파일·해시·용량, 미리보기는 높이도)
//   · 해시(studio-covers-lib)가 목록과 같은 것은 다시 만들지 않는다 (--force = 모두 다시).
//   · 옛 그림 파일은 지우지 않고 "목록에 없는 파일"로 알린다 (지우기는 사람이 한다).
//   · --check : 만들지 않고 목록이 최신인지만 본다 (= scripts/check-studio-covers.mjs, npm run build가 먼저 돌린다).
//   · 크롬 경로: CHROME_PATH 환경변수, 없으면 운영체제별 기본 설치 경로.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import {
  ROOT, COVER_FORMAT, COVER_WIDTH, COVER_HEIGHT, COVER_DIR, COVER_INDEX, PREVIEW_FORMAT, PREVIEW_WIDTH,
  coverHashes, previewHashes, coverFileOf, previewFileOf, readCoverIndex, readManifest, allCoverProblems,
} from './studio-covers-lib.mjs'

const CHECK = process.argv.includes('--check')
const FORCE = process.argv.includes('--force')
const COVER_QUALITY = 82
const PREVIEW_QUALITY = 80
const WEBP_MAX = 16383 // webp 한 변 한계

if (CHECK) {
  const problems = allCoverProblems()
  for (const p of problems) console.error(p)
  console.log(problems.length ? `표지·미리보기 ${problems.length}건이 최신이 아니에요 — npm run studio:covers 를 돌려 주세요` : '표지·미리보기가 모두 최신이에요')
  process.exit(problems.length ? 1 : 0)
}

const manifest = readManifest()
const hashes = coverHashes(manifest)
const pHashes = previewHashes(manifest)
const index = readCoverIndex()
const exists = file => !!file && fs.existsSync(path.join(ROOT, 'public', file))
const items = index.v === COVER_FORMAT && index.width === COVER_WIDTH && index.height === COVER_HEIGHT ? { ...index.items } : {}
const pItems = index.preview?.v === PREVIEW_FORMAT && index.preview?.width === PREVIEW_WIDTH ? { ...index.preview.items } : {}
const todo = [
  ...[...hashes].filter(([k, h]) => FORCE || items[k]?.hash !== h || !exists(items[k]?.file)).map(([key, hash]) => ({ kind: 'cover', key, hash })),
  ...[...pHashes].filter(([k, h]) => FORCE || pItems[k]?.hash !== h || !exists(pItems[k]?.file)).map(([key, hash]) => ({ kind: 'page', key, hash })),
]

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const list = process.platform === 'win32'
    ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
    : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  const found = list.find(p => fs.existsSync(p))
  if (!found) throw new Error('크롬을 찾지 못함 — CHROME_PATH 환경변수에 크롬 경로를 넣어 주세요')
  return found
}

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' }
function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><meta charset="utf-8"><title>covers</title>'); return }
    const base = url.startsWith('/src/') ? ROOT : path.join(ROOT, 'public')
    const file = path.normalize(path.join(base, url))
    if (!file.startsWith(base) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function openChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-covers-'))
  const port = 9200 + Math.floor(Math.random() * 600)
  const proc = spawn(chromePath(), ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })
  let target = null
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch { /* 아직 안 뜸 */ }
    if (!target) await sleep(200)
  }
  if (!target) { proc.kill(); throw new Error('크롬 디버깅 창을 열지 못함') }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })
  let id = 0
  const pending = new Map()
  const logs = []
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      logs.push(`${m.params.type}: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`)
    }
  })
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const close = () => { ws.close(); proc.kill() }
  return { send, logs, close }
}

/** 크롬에서 한 장 그려 PNG로 받는다 — kind 'cover' = drawCoverCanvas, 'page' = drawFullCanvas */
async function render(chrome, kind, key) {
  chrome.logs.length = 0
  const fn = kind === 'cover' ? 'drawCoverCanvas' : 'drawFullCanvas'
  const width = kind === 'cover' ? COVER_WIDTH : PREVIEW_WIDTH
  const r = await chrome.send('Runtime.evaluate', {
    awaitPromise: true, returnByValue: true,
    expression: `(async () => {
      const m = await import('/src/lib/studioTemplateThumbs.js')
      const { templateByKey } = await import('/src/lib/studioTemplates.js')
      const { canvas, fontsOk } = await m.${fn}(templateByKey(${JSON.stringify(key)}), ${width})
      const url = canvas.toDataURL('image/png')
      const out = { png: url.slice(url.indexOf(',') + 1), w: canvas.width, h: canvas.height, fontsOk }
      canvas.width = 0; canvas.height = 0
      return out
    })()`,
  })
  const v = r.result?.result?.value
  if (r.result?.exceptionDetails || !v) throw new Error(`그리지 못함 (${kind}): ${key} — ${r.result?.exceptionDetails?.exception?.description || r.error?.message || '결과 없음'}`)
  if (!v.fontsOk) throw new Error(`글꼴을 받지 못함 (${kind}): ${key} — ${chrome.logs.join(' / ')}`)
  const errors = chrome.logs.filter(l => l.startsWith('error'))
  if (errors.length) throw new Error(`그리는 중 오류 (${kind}): ${key} — ${errors.join(' / ')}`)
  if (v.w !== width) throw new Error(`폭이 다름 (${kind}): ${key} ${v.w}`)
  if (kind === 'cover' && v.h !== COVER_HEIGHT) throw new Error(`표지 높이가 다름: ${key} ${v.h}`)
  if (v.h > WEBP_MAX) throw new Error(`미리보기가 webp 한계보다 김: ${key} ${v.h}px`)
  return { png: Buffer.from(v.png, 'base64'), w: v.w, h: v.h }
}

async function main() {
  const { default: sharp } = await import('sharp')
  let made = 0
  if (todo.length) {
    const server = await startServer()
    const chrome = await openChrome()
    try {
      await chrome.send('Runtime.enable')
      await chrome.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` })
      await sleep(500)
      fs.mkdirSync(path.join(ROOT, 'public', COVER_DIR), { recursive: true })
      for (const { kind, key, hash } of todo) {
        const { png, h } = await render(chrome, kind, key)
        const webp = await sharp(png).webp({ quality: kind === 'cover' ? COVER_QUALITY : PREVIEW_QUALITY, effort: 6 }).toBuffer()
        const file = kind === 'cover' ? coverFileOf(key, hash) : previewFileOf(key, hash)
        fs.writeFileSync(path.join(ROOT, 'public', file), webp)
        if (kind === 'cover') items[key] = { file, hash, bytes: webp.length }
        else pItems[key] = { file, hash, bytes: webp.length, height: h }
        made++
        console.log(`${kind === 'cover' ? '표지' : '미리보기'} ${made}/${todo.length}  ${key}  ${(webp.length / 1024).toFixed(1)}KB`)
      }
    } finally {
      chrome.close()
      server.close()
    }
  }
  // 목록 순서 = 템플릿 목록 순서 (diff가 흔들리지 않게). 없어진 템플릿은 목록에서 뺀다 (파일은 알림만)
  const order = obj => Object.fromEntries([...hashes.keys()].filter(k => obj[k]).map(k => [k, obj[k]]))
  const out = { v: COVER_FORMAT, width: COVER_WIDTH, height: COVER_HEIGHT, items: order(items), preview: { v: PREVIEW_FORMAT, width: PREVIEW_WIDTH, items: order(pItems) } }
  fs.writeFileSync(COVER_INDEX, `${JSON.stringify(out, null, 2)}\n`)
  const used = new Set([...Object.values(out.items), ...Object.values(out.preview.items)].map(it => path.basename(it.file)))
  const dir = path.join(ROOT, 'public', COVER_DIR)
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => !used.has(x)) : []) console.warn(`목록에 없는 파일 (지우지 않음): public/${COVER_DIR}/${f}`)
  const sum = list => {
    const s = list.map(it => it.bytes)
    return s.length ? `합계 ${(s.reduce((a, b) => a + b, 0) / 1024).toFixed(0)}KB · 한 장 ${(Math.min(...s) / 1024).toFixed(1)}~${(Math.max(...s) / 1024).toFixed(1)}KB` : '없음'
  }
  console.log(`새로 만듦 ${made}장 · 표지 ${sum(Object.values(out.items))} · 미리보기 ${sum(Object.values(out.preview.items))}`)
  const problems = allCoverProblems(readCoverIndex(), manifest)
  if (problems.length) { for (const p of problems) console.error(p); process.exit(1) }
}

main().catch(e => { console.error(e.message || e); process.exit(1) })
