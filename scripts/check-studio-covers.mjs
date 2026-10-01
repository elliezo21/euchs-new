// 빌드 전 검사 — 기본 템플릿 표지·미리보기 그림이 모두 있고 템플릿 내용(해시)과 맞는지. npm run build가 vite build 전에 돌린다.
// 그림을 다시 그리지 않고 해시만 비교한다 (sharp·크롬 안 씀). 하나라도 옛것이거나 없으면 템플릿 이름을 알리고 종료 코드 1 → 빌드·Vercel 배포가 멈춘다.
// 고치는 법: npm run studio:covers 를 돌리고 바뀐 public/studio-covers/*.webp · src/data/studioTemplateCovers.json 을 같이 커밋.
import { allCoverProblems } from './studio-covers-lib.mjs'

const t0 = Date.now()
const problems = allCoverProblems()
if (problems.length) {
  for (const p of problems) console.error(`  · ${p}`)
  console.error(`\n템플릿 표지·미리보기 그림 ${problems.length}건이 템플릿 내용과 맞지 않아 빌드를 멈춥니다.\n→ npm run studio:covers 를 돌리고 바뀐 그림과 src/data/studioTemplateCovers.json 을 같이 커밋해 주세요.\n`)
  process.exit(1)
}
console.log(`템플릿 표지·미리보기 그림 확인 (${Date.now() - t0}ms)`)
