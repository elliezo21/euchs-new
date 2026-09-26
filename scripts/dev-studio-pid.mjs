// dev:studio PID 파일 판단 — 순수 함수 (프로세스를 끄거나 파일을 읽지 않는다. 테스트: scripts/test-dev-studio-pid.mjs)
// scripts/dev-studio.mjs가 쓴다. 규칙:
//   ★ 끄는 대상은 .studio-dev.pid에 적힌 PID(부모 node·자식 vite)뿐. 포트 번호나 "node" 이름으로 한꺼번에 찾아 끄지 않는다.
//   ★ 그 포트를 지금 쥐고 있는 프로세스가 파일의 PID 중 하나일 때만 끈다 (PID가 다른 프로그램에 다시 쓰였을 수 있으므로).
//   ★ 5173·5174(해성 님 서버)는 어떤 경우에도 끄지 않는다.

export const PID_FILE_NAME = '.studio-dev.pid'
export const DEFAULT_PORT = 5176
export const PROTECTED_PORTS = [5173, 5174]

const isPid = v => Number.isInteger(v) && v > 0
const isPort = v => Number.isInteger(v) && v > 0 && v < 65536

/**
 * vite 인자에서 포트 (--port 5180 / --port=5180). 없으면 null
 * @param {string[]} args
 */
export function portFromArgs(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    let v = null
    if (a === '--port') v = args[i + 1]
    else if (a.startsWith('--port=')) v = a.slice('--port='.length)
    else continue
    const n = Number(v)
    return isPort(n) ? n : null
  }
  return null
}

/**
 * vite에 넘길 인자 — 포트가 없으면 기본 5176을 붙이고, --strictPort를 붙인다
 * (포트가 차 있으면 다른 포트로 몰래 옮기지 않고 멈춘다 → PID 파일의 포트가 늘 실제 포트)
 * @returns {{ args: string[], port: number|null }} port null = 인자의 포트가 이상함
 */
export function viteArgs(userArgs) {
  const has = userArgs.some(a => a === '--port' || a.startsWith('--port='))
  const args = has ? [...userArgs] : [...userArgs, '--port', String(DEFAULT_PORT)]
  if (!args.includes('--strictPort')) args.push('--strictPort')
  return { args, port: has ? portFromArgs(userArgs) : DEFAULT_PORT }
}

/** PID 파일 내용 → { parentPid, childPid, port, startedAt } (모양이 틀리면 null) */
export function parsePidRecord(text) {
  let o
  try {
    o = JSON.parse(text)
  } catch (e) {
    console.warn('[dev:studio] PID 파일을 JSON으로 읽지 못함:', e.message)
    return null
  }
  if (!o || typeof o !== 'object' || !isPid(o.parentPid) || !isPid(o.childPid) || !isPort(o.port)) return null
  return { parentPid: o.parentPid, childPid: o.childPid, port: o.port, startedAt: typeof o.startedAt === 'string' ? o.startedAt : '' }
}

export function pidRecordText({ parentPid, childPid, port, startedAt }) {
  return JSON.stringify({ parentPid, childPid, port, startedAt }, null, 2) + '\n'
}

/**
 * Windows `netstat -ano -p TCP` 출력에서 그 포트를 LISTENING으로 쥔 PID들 (중복 없이)
 *   예: "  TCP    0.0.0.0:5176    0.0.0.0:0    LISTENING    868"  /  "  TCP    [::]:5176    [::]:0    LISTENING    868"
 */
export function listenPidsFromNetstat(text, port) {
  const out = new Set()
  for (const line of String(text).split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 5 || cols[0].toUpperCase() !== 'TCP' || cols[3].toUpperCase() !== 'LISTENING') continue
    const local = cols[1]
    const p = Number(local.slice(local.lastIndexOf(':') + 1))
    const pid = Number(cols[4])
    if (p === port && isPid(pid)) out.add(pid)
  }
  return [...out]
}

/** `lsof -t` 출력(한 줄에 PID 하나) → PID들 (Windows가 아닐 때) */
export function pidsFromLsof(text) {
  return [...new Set(String(text).split(/\r?\n/).map(s => Number(s.trim())).filter(isPid))]
}

/**
 * 시작 전 정리 판단
 * @param {{ record: object|null, fileExists: boolean, alive: (pid: number) => boolean, portOwners: number[], protectedOwners?: number[] }} s
 *   record = parsePidRecord 결과, portOwners = record.port를 지금 쥔 PID들, protectedOwners = 5173·5174를 쥔 PID들
 * @returns {{ action: 'none'|'remove-file'|'kill'|'warn', pids: number[], message: string }}
 *   kill: pids(자식 먼저)를 끄고 파일을 지운다 / remove-file: 파일만 지운다 / warn: 아무것도 끄지 않는다(새 기록이 파일을 덮는다)
 */
export function decideCleanup({ record, fileExists, alive, portOwners, protectedOwners = [] }) {
  if (!fileExists) return { action: 'none', pids: [], message: 'PID 파일 없음 — 끌 것 없음' }
  if (!record) return { action: 'remove-file', pids: [], message: 'PID 파일 모양이 틀림 — 파일만 지움 (아무것도 끄지 않음)' }
  const mine = [record.childPid, record.parentPid]
  const living = mine.filter(pid => alive(pid))
  if (living.length === 0) return { action: 'remove-file', pids: [], message: `적힌 PID ${mine.join('·')}가 이미 없음 — 파일만 지움` }
  if (PROTECTED_PORTS.includes(record.port)) {
    return { action: 'warn', pids: [], message: `파일의 포트 ${record.port}는 해성 님 서버 포트 — 끄지 않음` }
  }
  const owns = (portOwners || []).some(pid => mine.includes(pid))
  if (!owns) {
    return { action: 'warn', pids: [], message: `포트 ${record.port} 주인(${(portOwners || []).join('·') || '없음'})이 파일의 PID(${mine.join('·')})와 다름 — 끄지 않음` }
  }
  if (living.some(pid => protectedOwners.includes(pid))) {
    return { action: 'warn', pids: [], message: `파일의 PID가 5173·5174를 쥐고 있음(해성 님 서버) — 끄지 않음` }
  }
  return { action: 'kill', pids: living, message: `이전 dev:studio(PID ${living.join('·')}, 포트 ${record.port}) 끔` }
}

/** 종료할 때 파일을 지워도 되는지 — 파일이 지금 이 부모 프로세스의 것일 때만 (다음 실행이 이미 덮어썼으면 두기) */
export function ownsRecord(record, parentPid) {
  return !!record && record.parentPid === parentPid
}
