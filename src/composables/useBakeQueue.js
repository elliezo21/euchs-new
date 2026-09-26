/**
 * 굽기 차례 — 편집기 화면 하나 동안. 지우기 화면 [완료] 때 편집기가 request()를 부른다 (화면은 막지 않는다).
 *
 * ★ 한 번에 한 장씩, 부른 순서대로.
 * ★ 사진마다 최신 요청 하나만: 굽는 중에 같은 사진이 또 오면 앞의 굽기는 다음 단계로 넘어가지 않고 버려지고(isCurrent),
 *   최신 요청을 이어서 굽는다. 서버도 edit_version이 그대로일 때만 최신으로 기록하므로 옛 결과가 최신을 덮지 않는다.
 * ★ 다시 하면 될 실패(네트워크·서버 일시)는 나가기 보호와 같은 규칙(studioSaveGuard: 2초 → 5초 → 10초, 인터넷 복구 시 바로).
 *   다시 해도 소용없는 실패는 'failed' — 화면이 "적용하지 못했어요 · 다시 시도"를 보인다 (지운 내용은 edit에 저장돼 있다).
 * ★ 상태 state[imageId].status: 'queued' | 'baking' | 'waiting'(자동 재시도 대기) | 'failed' | 'blocked'(결과 없는 AI가 있어 굽지 않음)
 *   굽기가 끝났거나 할 것이 없으면 state에서 빠진다.
 * @param {{ onBaked: (imageId: string, version: number) => void }} opts
 */
import { reactive, computed } from 'vue'
import { bakeImage } from '@/lib/studioBake'
import { nextRetryDelay } from '@/lib/studioSaveGuard'

export const BAKE_BLOCKED_MESSAGE = '다시 지우기를 마치면 적용돼요'

export function useBakeQueue({ onBaked }) {
  const state = reactive({})
  const jobs = new Map()   // image id → { row, layers, version, attempt, token, timer }
  const order = []         // 구울 차례 (image id)
  let running = null
  let tokenSeq = 0
  let disposed = false

  const pendingCount = computed(() => Object.values(state).filter(s => s.status === 'queued' || s.status === 'baking' || s.status === 'waiting').length)

  function setState(id, next) {
    if (next) state[id] = next
    else delete state[id]
  }

  /** 굽기 요청 (그 사진의 앞 요청은 버린다) */
  function request(row, layers, version) {
    const prev = jobs.get(row.id)
    if (prev?.timer) clearTimeout(prev.timer)
    const job = { row: { ...row }, layers: JSON.parse(JSON.stringify(layers || [])), version, attempt: 0, token: ++tokenSeq, timer: null }
    jobs.set(row.id, job)
    setState(row.id, { status: running === row.id ? 'baking' : 'queued', version })
    if (running !== row.id && !order.includes(row.id)) order.push(row.id)
    pump()
  }

  /** 결과 없는 AI가 있어 굽지 않음 — 표시만 (그 사진의 기다리던 굽기는 버린다) */
  function markBlocked(id) {
    const prev = jobs.get(id)
    if (prev?.timer) clearTimeout(prev.timer)
    jobs.delete(id)
    const i = order.indexOf(id)
    if (i >= 0) order.splice(i, 1)
    setState(id, { status: 'blocked', message: BAKE_BLOCKED_MESSAGE })
  }

  /** 할 것 없음(지우기가 없거나 이미 최신) — 표시를 걷는다 */
  function clear(id) {
    const prev = jobs.get(id)
    if (prev?.timer) clearTimeout(prev.timer)
    if (running !== id) jobs.delete(id)
    const i = order.indexOf(id)
    if (i >= 0) order.splice(i, 1)
    setState(id, null)
  }

  async function pump() {
    if (running || disposed) return
    const id = order.shift()
    if (!id) return
    const job = jobs.get(id)
    if (!job) { pump(); return }
    running = id
    const token = job.token
    const isCurrent = () => !disposed && jobs.get(id)?.token === token
    setState(id, { status: 'baking', version: job.version })
    try {
      const res = await bakeImage(job.row, job.layers, job.version, { isCurrent })
      if (!isCurrent() || res.superseded) return // 더 새 요청이 있다 — finally에서 차례에 다시 넣는다
      jobs.delete(id)
      if (res.blocked) {
        console.info('[BakeQueue] 결과 없는 AI 레이어가 있어 굽지 않음:', id, res.aiMissing, res.aiStale)
        setState(id, { status: 'blocked', message: BAKE_BLOCKED_MESSAGE })
      } else if (res.skipped) {
        setState(id, null)
      } else {
        console.info(`[BakeQueue] 구움: ${id} v${job.version} ${res.width}×${res.height} ${(res.bytes / 1048576).toFixed(2)}MB → ${res.path}${res.recorded ? '' : ' (그 사이 지우기가 바뀌어 최신 기록 안 됨)'}`)
        setState(id, null)
        if (res.recorded) onBaked?.(id, job.version)
      }
    } catch (err) {
      console.error(`[BakeQueue] 굽기 실패 (${job.attempt + 1}번째, code=${err.code || '없음'}):`, id, err)
      if (!isCurrent()) return
      if (err.code === 'final_stale') { // 그 사이 지우기가 바뀜 — 다음 [완료]가 최신으로 다시 요청한다
        jobs.delete(id)
        setState(id, null)
        return
      }
      const delay = nextRetryDelay(err.code, job.attempt)
      if (delay !== null) {
        job.attempt++
        setState(id, { status: 'waiting', version: job.version })
        job.timer = setTimeout(() => {
          job.timer = null
          if (jobs.get(id) !== job || disposed) return
          order.push(id)
          pump()
        }, delay)
      } else {
        jobs.delete(id)
        setState(id, { status: 'failed', message: err.message || String(err), code: err.code || '' })
      }
    } finally {
      running = null
      // 굽는 동안 같은 사진의 새 요청이 왔으면 차례에 다시 넣는다
      if (!disposed && jobs.get(id) && jobs.get(id).token !== token && !order.includes(id)) order.push(id)
      pump()
    }
  }

  /** 인터넷이 다시 연결되면 자동 재시도를 기다리지 않고 바로 */
  function onOnline() {
    for (const [id, job] of jobs) {
      if (!job.timer) continue
      clearTimeout(job.timer)
      job.timer = null
      if (!order.includes(id)) order.push(id)
    }
    pump()
  }
  window.addEventListener('online', onOnline)

  /** 로그아웃·다른 작업 — 기다리던 굽기를 모두 버린다 (굽는 중인 것은 다음 단계로 넘어가지 않는다) */
  function reset() {
    for (const job of jobs.values()) if (job.timer) clearTimeout(job.timer)
    jobs.clear()
    order.length = 0
    for (const k of Object.keys(state)) delete state[k]
    tokenSeq++ // 굽는 중인 것의 token도 무효 (jobs가 비어 isCurrent가 false)
  }

  function dispose() {
    disposed = true
    reset()
    window.removeEventListener('online', onOnline)
  }

  return { state, pendingCount, request, markBlocked, clear, reset, dispose }
}
