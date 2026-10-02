/**
 * 같은 key의 작업을 한 번에 하나씩 (순수 — 브라우저·node 모두). 앞 작업이 실패해도 다음 작업은 한다 — 실패는 그 작업의 호출자가 받는다
 * 쓰는 곳: studioExportArchive — 같은 내 상품의 export_file_confirm (서버가 studio_exports.files JSON 칸을 읽고 고쳐 쓰므로 동시에 하면 기록이 빠질 수 있다)
 */
const chains = new Map()
export function serializeByKey(id, fn) {
  const prev = chains.get(id) || Promise.resolve()
  const run = prev.then(fn, fn)
  const tail = run.then(() => {}, () => {})
  chains.set(id, tail)
  tail.then(() => { if (chains.get(id) === tail) chains.delete(id) })
  return run
}
export const pendingKeys = () => chains.size
