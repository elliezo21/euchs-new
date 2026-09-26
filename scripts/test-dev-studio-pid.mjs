// dev:studio PID 판단 테스트 (6-3 보완) — node scripts/test-dev-studio-pid.mjs
// 실제 프로세스를 끄거나 파일을 만들지 않는다 (순수 함수만)
import {
  DEFAULT_PORT, portFromArgs, viteArgs, parsePidRecord, pidRecordText, listenPidsFromNetstat, pidsFromLsof, decideCleanup, ownsRecord,
} from './dev-studio-pid.mjs'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(48)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

// ── 인자 ──
eq('기본 포트 5176', DEFAULT_PORT, 5176)
eq('--port 5180 / --port=5181 / 없음', [portFromArgs(['--port', '5180']), portFromArgs(['--port=5181']), portFromArgs(['--open'])], [5180, 5181, null])
eq('이상한 포트 → null', [portFromArgs(['--port', 'abc']), portFromArgs(['--port', '70000'])], [null, null])
eq('인자 없음 → --port 5176 --strictPort', viteArgs([]), { args: ['--port', '5176', '--strictPort'], port: 5176 })
eq('포트 인자 그대로 + strictPort 한 번만', viteArgs(['--port', '5180', '--strictPort']), { args: ['--port', '5180', '--strictPort'], port: 5180 })

// ── 파일 ──
const REC = { parentPid: 100, childPid: 200, port: 5176, startedAt: '2026-09-26T05:00:00.000Z' }
eq('기록 → 읽기 그대로', parsePidRecord(pidRecordText(REC)), REC)
eq('JSON 아님 / PID 없음 / 포트 이상 → null', [parsePidRecord('xx'), parsePidRecord('{"parentPid":1,"port":5176}'), parsePidRecord('{"parentPid":1,"childPid":2,"port":0}')], [null, null, null])

// ── netstat (Windows) ──
const NETSTAT = [
  '',
  '활성 연결',
  '',
  '  프로토콜  로컬 주소              외부 주소              상태            PID',
  '  TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       49848',
  '  TCP    0.0.0.0:5176           0.0.0.0:0              LISTENING       200',
  '  TCP    [::]:5176              [::]:0                 LISTENING       200',
  '  TCP    127.0.0.1:51760        0.0.0.0:0              LISTENING       777',
  '  TCP    127.0.0.1:5176         127.0.0.1:60000        ESTABLISHED     300',
  '  TCP    0.0.0.0:15176          0.0.0.0:0              LISTENING       888',
].join('\r\n')
eq('5176 LISTENING 주인 (IPv4·IPv6 한 번만)', listenPidsFromNetstat(NETSTAT, 5176), [200])
eq('51760·15176·ESTABLISHED는 5176 아님', listenPidsFromNetstat(NETSTAT, 5176).includes(777) || listenPidsFromNetstat(NETSTAT, 5176).includes(888) || listenPidsFromNetstat(NETSTAT, 5176).includes(300), false)
eq('5173 주인', listenPidsFromNetstat(NETSTAT, 5173), [49848])
eq('lsof -t', pidsFromLsof('200\n200\n\n'), [200])

// ── 판단 ──
const aliveSet = s => pid => s.has(pid)
eq('파일 없음 → 아무것도 안 함', decideCleanup({ record: null, fileExists: false, alive: () => true, portOwners: [200] }).action, 'none')
eq('파일 모양 틀림 → 파일만 지움', decideCleanup({ record: null, fileExists: true, alive: () => true, portOwners: [] }).action, 'remove-file')
eq('PID 둘 다 없음 → 파일만 지움',
  decideCleanup({ record: REC, fileExists: true, alive: aliveSet(new Set()), portOwners: [999] }), { action: 'remove-file', pids: [], message: '적힌 PID 200·100가 이미 없음 — 파일만 지움' })
eq('포트 주인 = 자식 vite → 자식·부모 끔',
  decideCleanup({ record: REC, fileExists: true, alive: aliveSet(new Set([100, 200])), portOwners: [200] }).pids, [200, 100])
eq('포트 주인 = 부모 → 끔', decideCleanup({ record: REC, fileExists: true, alive: aliveSet(new Set([100, 200])), portOwners: [100] }).action, 'kill')
eq('살아 있는 것만 끔 (부모만 남음 + 포트 주인)', decideCleanup({ record: REC, fileExists: true, alive: aliveSet(new Set([100])), portOwners: [100] }).pids, [100])
eq('포트 주인이 다른 프로세스 → 끄지 않고 경고',
  decideCleanup({ record: REC, fileExists: true, alive: aliveSet(new Set([100, 200])), portOwners: [555] }).action, 'warn')
eq('아무도 포트를 안 쥠(PID는 다른 프로그램이 다시 씀) → 경고',
  decideCleanup({ record: REC, fileExists: true, alive: aliveSet(new Set([100])), portOwners: [] }).action, 'warn')
eq('파일 포트가 5173 → 절대 끄지 않음',
  decideCleanup({ record: { ...REC, port: 5173 }, fileExists: true, alive: () => true, portOwners: [200] }).action, 'warn')
eq('파일 PID가 5174를 쥠 → 절대 끄지 않음',
  decideCleanup({ record: REC, fileExists: true, alive: () => true, portOwners: [200], protectedOwners: [100] }).action, 'warn')

// ── 종료할 때 ──
eq('내 파일이면 지움 / 다음 실행이 덮어쓴 파일이면 둠', [ownsRecord(REC, 100), ownsRecord(REC, 101), ownsRecord(null, 100)], [true, false, false])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
