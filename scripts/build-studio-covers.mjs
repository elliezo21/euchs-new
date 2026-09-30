// 기본 템플릿 표지 미리 만들기 — node scripts/build-studio-covers.mjs  (npm run studio:covers)
//
// 템플릿 갤러리·편집기 [템플릿] 패널 카드는 기본 템플릿 표지를 이 명령이 만든 그림으로만 보여 준다 (화면에서 그리지 않음).
//   · 그리는 코드는 화면과 같은 studioTemplateThumbs.drawCoverCanvas (첫 섹션, 같은 엔진) — 크롬(헤드리스)에서 돌린다.
//     src/lib 스튜디오 모듈은 상대 경로 import만 쓰므로 이 파일의 작은 서버(/src = src, 그 밖 = public)로 충분하다 (vite 안 씀).
//   · 결과: public/studio-covers/<key>-<해시 앞 8자>.webp (폭 480, 3:4, webp 품질 82) + src/data/studioTemplateCovers.json (key → 파일·해시·용량)
//   · 해시(studio-covers-lib.coverHashes)가 목록과 같은 템플릿은 다시 만들지 않는다 (--force = 모두 다시).
//   · 옛 표지 파일은 지우지 않고 "목록에 없는 표지 파일"로 알린다 (지우기는 사람이 한다).
//   · --check : 만들지 않고 목록이 최신인지만 본다 (다르면 종료 코드 1). 같은 검사를 test-studio-template-covers.mjs 도 한다.
//   · 크롬 경로: CHROME_PATH 환경변수, 없으면 운영체제별 기본 설치 경로.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { ROOT, COVER_FORMAT, COVER_WIDTH, COVER_HEIGHT, COVER_DIR, COVER_INDEX, coverHashes, coverFileOf, readCoverIndex, coverProblems } from './studio-covers-lib.mjs'

const CHECK = process.argv.includes('--check')
const FORCE = process.argv.includes('--force')
const QUALITY = 82

if (CHECK) {
  const problems = coverProblems()
  for (const p of problems) console.error(p)
  console.log(problems.length ? `표지 ${problems.length}건이 최신이 아니에요 — npm run studio:covers 를 돌려 주세요` : '표지가 모두 최신이에요')
  process.exit(problems.length ? 1 : 0)
}

const hashes = coverHashes()
const index = readCoverIndex()
const sameFormat = index.v === COVER_FORMAT && index.width === COVER_WIDTH && index.height === COVER_HEIGHT
const items = sameFormat ? { ...index.items } : {}
for (const key of Object.keys(items)) if (!hashes.has(key)) delete items[key] // 없어진 템플릿 (파일은 아래에서 알림만)
const todo = [...hashes].filter(([key, hash]) => FORCE || items[key]?.hash !== hash || !fs.existsSync(path.join(ROOT, 'public', items[key].file)))

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

async function main() {
  const made = []
  if (todo.length) {
    const server = await startServer()
    const chrome = await openChrome()
    try {
      await chrome.send('Runtime.enable')
      await chrome.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` })
      await sleep(500)
      for (const [key, hash] of todo) {
        chrome.logs.length = 0
        const r = await chrome.send('Runtime.evaluate', {
          awaitPromise: true, returnByValue: true,
          expression: `(async () => {
            const { drawCoverCanvas } = await import('/src/lib/studioTemplateThumbs.js')
            const { templateByKey } = await import('/src/lib/studioTemplates.js')
            const { canvas, fontsOk } = await drawCoverCanvas(templateByKey(${JSON.stringify(key)}), ${COVER_WIDTH})
            const url = canvas.toDataURL('image/png')
            const out = { png: url.slice(url.indexOf(',') + 1), w: canvas.width, h: canvas.height, fontsOk }
            canvas.width = 0; canvas.height = 0
            return out
          })()`,
        })
        const v = r.result?.result?.value
        if (r.result?.exceptionDetails || !v) throw new Error(`표지를 그리지 못함: ${key} — ${r.result?.exceptionDetails?.exception?.description || r.error?.message || '결과 없음'}`)
        if (!v.fontsOk) throw new Error(`글꼴을 받지 못함: ${key} — ${chrome.logs.join(' / ')}`)
        if (v.w !== COVER_WIDTH || v.h !== COVER_HEIGHT) throw new Error(`표지 크기가 다름: ${key} ${v.w}×${v.h}`)
        const errors = chrome.logs.filter(l => l.startsWith('error'))
        if (errors.length) throw new Error(`표지를 그리는 중 오류: ${key} — ${errors.join(' / ')}`)
        const webp = await sharp(Buffer.from(v.png, 'base64')).webp({ quality: QUALITY, effort: 6 }).toBuffer()
        const file = coverFileOf(key, hash)
        fs.mkdirSync(path.join(ROOT, 'public', COVER_DIR), { recursive: true })
        fs.writeFileSync(path.join(ROOT, 'public', file), webp)
        items[key] = { file, hash, bytes: webp.length }
        made.push(key)
        console.log(`표지 ${made.length}/${todo.length}  ${key}  ${(webp.length / 1024).toFixed(1)}KB`)
      }
    } finally {
      chrome.close()
      server.close()
    }
  }
  // 목록 순서 = 템플릿 목록 순서 (보기 좋게, diff가 흔들리지 않게)
  const ordered = Object.fromEntries([...hashes.keys()].filter(k => items[k]).map(k => [k, items[k]]))
  fs.writeFileSync(COVER_INDEX, `${JSON.stringify({ v: COVER_FORMAT, width: COVER_WIDTH, height: COVER_HEIGHT, items: ordered }, null, 2)}\n`)
  const used = new Set(Object.values(ordered).map(it => path.basename(it.file)))
  const dir = path.join(ROOT, 'public', COVER_DIR)
  const stray = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !used.has(f)) : []
  for (const f of stray) console.warn(`목록에 없는 표지 파일 (지우지 않음): public/${COVER_DIR}/${f}`)
  const sizes = Object.values(ordered).map(it => it.bytes)
  console.log(`표지 — 새로 만듦 ${made.length}개 · 그대로 ${sizes.length - made.length}개 · 합계 ${(sizes.reduce((a, b) => a + b, 0) / 1024).toFixed(0)}KB` +
    (sizes.length ? ` · 한 장 ${(Math.min(...sizes) / 1024).toFixed(1)}~${(Math.max(...sizes) / 1024).toFixed(1)}KB` : ''))
  const problems = coverProblems()
  if (problems.length) { for (const p of problems) console.error(p); process.exit(1) }
}

main().catch(e => { console.error(e.message || e); process.exit(1) })
