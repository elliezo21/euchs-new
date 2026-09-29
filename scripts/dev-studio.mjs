// 스튜디오 스위치를 켜고 개발 서버를 띄운다 — npm run dev:studio (Windows PowerShell·cmd·bash 모두 같은 명령)
//   VITE_STUDIO_ENABLED=admin → /studio 화면 라우트 등록 (src/router/index.js)
//   STUDIO_ENABLED=admin      → /api/studio-* 저장 API 켜짐 (api/_studio.js — vite.config.js는 이미 있는 process.env 값을 덮지 않는다)
// 나머지는 기존 "dev"와 같다 (vite --host). 뒤에 붙인 인자는 vite에 그대로 넘긴다: npm run dev:studio -- --port 5180
// 이미 값을 넣어 두었으면(예: all) 그 값을 쓴다.
// ★ 사전 번들 폴더: node_modules/.vite-studio (다른 vite 서버와 node_modules/.vite를 같이 쓰면 AI 워커 모듈이 504로 지워질 수 있다 — vite.config.js)
//
// ★ 포트: 기본 5176, --strictPort (차 있으면 다른 포트로 옮기지 않고 멈춘다)
// ★ 자기 서버만 다시 켜기 (6-3 보완): 시작하면 부모(이 node)·자식(vite) PID·포트·시각을 프로젝트 루트 .studio-dev.pid에 적고,
//   다음에 시작할 때 그 포트를 지금 쥔 프로세스가 파일의 PID일 때만 그 PID들을 끈다 (판단은 dev-studio-pid.mjs 순수 함수).
//   포트 번호·"node" 이름으로 한꺼번에 끄지 않는다. 5173·5174는 끄지 않는다. 정상 종료(Ctrl+C·vite 종료) 때 파일을 지운다.
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import {
  PID_FILE_NAME, PROTECTED_PORTS, viteArgs, parsePidRecord, pidRecordText, listenPidsFromNetstat, pidsFromLsof, decideCleanup, ownsRecord,
} from './dev-studio-pid.mjs'

const require = createRequire(import.meta.url)
// vite의 package.json exports에 bin 경로가 없어 package.json 위치에서 만든다 (node_modules/.bin의 vite와 같은 파일)
const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
const pidFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', PID_FILE_NAME)
const isWin = process.platform === 'win32'
const STUDIO_CACHE_DIR = 'node_modules/.vite-studio'

/** 살아 있는 프로세스인지 (신호 0 = 확인만, 끄지 않음). ESRCH = 없음, EPERM = 있지만 권한 없음 */
function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    if (e.code === 'ESRCH') return false
    if (e.code !== 'EPERM') console.warn(`[dev:studio] PID ${pid} 확인 중 알 수 없는 응답(${e.code}) — 살아 있는 것으로 봄`)
    return true
  }
}

/** 그 포트를 LISTENING으로 쥔 PID들 — Windows는 netstat -ano, 그 밖은 lsof. 못 읽으면 [] (→ 아무것도 끄지 않음) */
function portOwners(port) {
  try {
    if (isWin) return listenPidsFromNetstat(execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' }), port)
    return pidsFromLsof(execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }))
  } catch (e) {
    if (!isWin && e.status === 1) return [] // lsof: 쥔 프로세스 없음
    console.error(`[dev:studio] 포트 ${port} 주인을 확인하지 못함 — 이전 서버를 끄지 않음:`, e.message)
    return []
  }
}

/** 파일의 PID 하나를 끈다 (Windows: taskkill /T = 그 PID와 그 자식들) */
function killPid(pid) {
  if (!alive(pid)) return
  try {
    if (isWin) execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(pid, 'SIGTERM')
  } catch (e) {
    if (alive(pid)) console.error(`[dev:studio] PID ${pid}를 끄지 못함:`, e.message)
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** 시작 전 — 이전 dev:studio 정리 */
async function cleanupPrevious() {
  const fileExists = fs.existsSync(pidFile)
  const record = fileExists ? parsePidRecord(fs.readFileSync(pidFile, 'utf8')) : null
  const plan = decideCleanup({
    record, fileExists, alive,
    portOwners: record ? portOwners(record.port) : [],
    protectedOwners: record ? PROTECTED_PORTS.flatMap(p => portOwners(p)) : [],
  })
  if (plan.action === 'none') { console.log(`[dev:studio] ${plan.message}`); return }
  if (plan.action === 'warn') { console.warn(`[dev:studio] 경고: ${plan.message}`); return }
  if (plan.action === 'kill') {
    for (const pid of plan.pids) killPid(pid)
    // 포트가 풀릴 때까지 잠깐 기다린다 (최대 5초)
    for (let i = 0; i < 25 && portOwners(record.port).some(pid => plan.pids.includes(pid)); i++) await sleep(200)
  }
  fs.rmSync(pidFile, { force: true })
  console.log(`[dev:studio] ${plan.message}`)
}

function removeOwnPidFile() {
  if (!fs.existsSync(pidFile)) return
  const rec = parsePidRecord(fs.readFileSync(pidFile, 'utf8'))
  if (ownsRecord(rec, process.pid)) fs.rmSync(pidFile, { force: true })
}

const { args, port } = viteArgs(process.argv.slice(2))
if (port === null) {
  console.error('[dev:studio] --port 값이 올바르지 않아요. 예: npm run dev:studio -- --port 5180')
  process.exit(1)
}

const env = {
  ...process.env,
  VITE_STUDIO_ENABLED: process.env.VITE_STUDIO_ENABLED || 'admin',
  STUDIO_ENABLED: process.env.STUDIO_ENABLED || 'admin',
  // 이 서버 전용 사전 번들 폴더 — 다른 vite 서버(npm run dev 5173·5174, 확인용 페이지)와 node_modules/.vite를 같이 쓰지 않는다 (vite.config.js studioDev)
  STUDIO_DEV_CACHE_DIR: STUDIO_CACHE_DIR,
}
console.log(`[dev:studio] VITE_STUDIO_ENABLED=${env.VITE_STUDIO_ENABLED} STUDIO_ENABLED=${env.STUDIO_ENABLED} 캐시=${STUDIO_CACHE_DIR}`)

await cleanupPrevious()

const child = spawn(process.execPath, [viteBin, '--host', ...args], { stdio: 'inherit', env })
child.on('error', e => { console.error('[dev:studio] vite를 띄우지 못함:', e.message); removeOwnPidFile(); process.exit(1) })
if (child.pid) {
  fs.writeFileSync(pidFile, pidRecordText({ parentPid: process.pid, childPid: child.pid, port, startedAt: new Date().toISOString() }))
  console.log(`[dev:studio] PID 기록 ${PID_FILE_NAME}: 부모 ${process.pid} · vite ${child.pid} · 포트 ${port}`)
}
child.on('exit', (code, signal) => { removeOwnPidFile(); process.exit(signal ? 1 : code ?? 0) })
process.on('exit', removeOwnPidFile)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
