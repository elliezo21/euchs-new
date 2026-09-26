// 스튜디오 스위치를 켜고 개발 서버를 띄운다 — npm run dev:studio (Windows PowerShell·cmd·bash 모두 같은 명령)
//   VITE_STUDIO_ENABLED=admin → /studio 화면 라우트 등록 (src/router/index.js)
//   STUDIO_ENABLED=admin      → /api/studio-* 저장 API 켜짐 (api/_studio.js — vite.config.js는 이미 있는 process.env 값을 덮지 않는다)
// 나머지는 기존 "dev"와 같다 (vite --host). 뒤에 붙인 인자는 vite에 그대로 넘긴다: npm run dev:studio -- --port 5180
// 이미 값을 넣어 두었으면(예: all) 그 값을 쓴다.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
// vite의 package.json exports에 bin 경로가 없어 package.json 위치에서 만든다 (node_modules/.bin의 vite와 같은 파일)
const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')

const env = {
  ...process.env,
  VITE_STUDIO_ENABLED: process.env.VITE_STUDIO_ENABLED || 'admin',
  STUDIO_ENABLED: process.env.STUDIO_ENABLED || 'admin',
}
console.log(`[dev:studio] VITE_STUDIO_ENABLED=${env.VITE_STUDIO_ENABLED} STUDIO_ENABLED=${env.STUDIO_ENABLED}`)

const child = spawn(process.execPath, [viteBin, '--host', ...process.argv.slice(2)], { stdio: 'inherit', env })
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
