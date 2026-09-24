/**
 * 스튜디오 "내 사진 올리기" 흐름 — 진입 화면(새 프로젝트)과 편집기("사진 추가")가 같이 쓴다.
 *
 *   prepare(10장씩) → 1회용 토큰으로 Storage 직접 업로드(동시 3개) → confirm(6장씩)
 *   서버: api/studio-upload.js. 브라우저는 studio_images에 INSERT 권한이 없으므로 행은 서버가 만든다.
 *
 * 파일 상태: rejected(올리기 전 거름) / waiting / uploading / confirming / done / failed
 * 실패한 것만 retryFailed()로 다시 올린다 (새 prepare → 새 행. 이전 failed 행은 장수 상한에 안 센다).
 *
 * 셀러가 한 번에 고르는 장수에는 제한이 없다. 10장은 서버 prepare 한 번의 묶음 단위일 뿐이다.
 * 다만 프로젝트 남은 한도(STUDIO_MAX_IMAGES − 이미 쓴 장수)를 넘는 파일은 앞에서부터 한도만큼만 대기에 넣고
 * 나머지는 '제외'로 표시한다. 서버가 image_limit으로 remaining을 알려주면 그 값을 우선한다.
 */
import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { callStudioApi, studioErrorMessage, STUDIO_MAX_IMAGES } from '@/lib/studioApi'

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_BYTES = 20 * 1024 * 1024
const PREPARE_BATCH = 10
const CONFIRM_BATCH = 6
const UPLOAD_CONCURRENCY = 3
const TYPE_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
// 폴더 안에서 "이미지로 보이는" 확장자 — 이 밖의 파일(.txt .psd .mp4 등)은 조용히 건너뛰고 개수만 알린다
const IMAGE_LIKE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'tif', 'tiff', 'avif'])

const HEIC_MESSAGE = "아이폰 사진(HEIC)은 아직 지원하지 않아요. 아이폰 설정 → 카메라 → 포맷 → '높은 호환성'으로 바꾸거나, 사진을 JPG로 내보낸 뒤 올려주세요."

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''))
  return m ? m[1].toLowerCase() : ''
}

/** 선언 형식: 브라우저가 준 type, 비어 있으면 확장자로 */
function declaredType(file) {
  const t = String(file.type || '').toLowerCase()
  if (t) return t
  return TYPE_BY_EXT[extOf(file.name)] || ''
}

function isHeic(file) {
  const t = String(file.type || '').toLowerCase()
  const e = extOf(file.name)
  return t === 'image/heic' || t === 'image/heif' || e === 'heic' || e === 'heif'
}

/** 올리기 전 1차 검사. 통과면 null, 아니면 한국어 사유 */
function precheck(file) {
  if (isHeic(file)) return HEIC_MESSAGE
  const type = declaredType(file)
  if (!ALLOWED_TYPES.includes(type)) return '지원하지 않는 형식이에요. JPG·PNG·WebP 사진만 올릴 수 있어요.'
  if (file.size === 0) return '빈 파일이에요.'
  if (file.size > MAX_BYTES) return `파일이 너무 커요 (${(file.size / 1024 / 1024).toFixed(1)} MB). 20MB 이하로 줄여서 올려주세요.`
  return null
}

// ── 폴더 드롭 (webkitGetAsEntry) ──
function readAllEntries(dirEntry) {
  const reader = dirEntry.createReader()
  const all = []
  return new Promise((resolve, reject) => {
    const next = () => reader.readEntries(batch => {
      if (batch.length === 0) return resolve(all)
      all.push(...batch)
      next()
    }, reject)
    next()
  })
}
const entryFile = entry => new Promise((resolve, reject) => entry.file(resolve, reject))

/**
 * 드롭된 항목에서 파일 목록을 만든다. 폴더는 그 안의 파일 + 한 단계 아래 폴더의 파일까지 (더 깊으면 무시).
 * @returns {Promise<{ direct: File[], fromFolder: File[] }>}
 */
export async function collectDroppedFiles(dataTransfer) {
  const direct = []
  const fromFolder = []
  const items = [...(dataTransfer?.items || [])]
  const entries = items.map(it => (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function' ? it.webkitGetAsEntry() : null))
  if (entries.every(e => !e)) {
    // webkitGetAsEntry를 못 쓰는 브라우저 — 파일 목록만
    return { direct: [...(dataTransfer?.files || [])], fromFolder }
  }
  for (const entry of entries) {
    if (!entry) continue
    if (entry.isFile) {
      direct.push(await entryFile(entry))
    } else if (entry.isDirectory) {
      for (const child of await readAllEntries(entry)) {
        if (child.isFile) fromFolder.push(await entryFile(child))
        else if (child.isDirectory) {
          for (const grand of await readAllEntries(child)) {
            if (grand.isFile) fromFolder.push(await entryFile(grand))
            // 두 단계 아래 폴더는 무시
          }
        }
      }
    }
  }
  return { direct, fromFolder }
}

/**
 * @param {{ getUsed?: () => number }} [opts]
 *   getUsed: 이 프로젝트에서 이미 한도를 쓰고 있는 장수(done + 직접 올린 pending). 새 프로젝트면 생략(0).
 *            첫 선택 시점에 한 번 읽어 고정한다 — 이 화면에서 올린 장수는 아래 items로 따로 센다.
 */
export function useStudioUpload({ getUsed } = {}) {
  const items = ref([])          // { key, file, name, size, type, status, reason, imageId, path, token, width, height }
  const skippedCount = ref(0)    // 폴더 안의 이미지 아닌 파일
  const busy = ref(false)
  const projectId = ref(null)
  const fatalMessage = ref('')   // prepare 단계 오류(프로젝트 상한 등) — 파일 목록 위에 크게
  let seq = 0
  let baseUsed = null            // 첫 선택 시점의 "이미 쓴 장수" (서버 image_limit이 오면 그 기준으로 다시 맞춘다)

  // 이 화면에서 한도를 차지하고 있는 파일 (실패·제외는 서버도 세지 않는다)
  const OCCUPYING = new Set(['waiting', 'uploading', 'confirming', 'done'])
  function remainingSlots() {
    if (baseUsed === null) baseUsed = getUsed ? Math.max(0, Number(getUsed()) || 0) : 0
    const occupied = items.value.filter(it => OCCUPYING.has(it.status)).length
    return Math.max(0, STUDIO_MAX_IMAGES - baseUsed - occupied)
  }
  const LIMIT_REASON = `이 프로젝트에 ${STUDIO_MAX_IMAGES}장까지만 올릴 수 있어요.`

  const counts = computed(() => {
    const c = { total: 0, done: 0, failed: 0, rejected: 0, active: 0 }
    for (const it of items.value) {
      c.total++
      if (it.status === 'done') c.done++
      else if (it.status === 'failed') c.failed++
      else if (it.status === 'rejected') c.rejected++
      else c.active++
    }
    return c
  })

  function pushFile(file) {
    // 형식·크기 검사 먼저, 통과한 것만 앞에서부터 남은 한도만큼 대기에 넣는다
    const reason = precheck(file) || (remainingSlots() === 0 ? LIMIT_REASON : null)
    items.value.push({
      key: ++seq, file, name: file.name, size: file.size, type: declaredType(file),
      status: reason ? 'rejected' : 'waiting', reason: reason || '', imageId: null, width: null, height: null,
    })
  }

  /** 파일 선택·일반 드롭: 모두 목록에 보여주고 거른 이유를 표시 */
  function addFiles(fileList) {
    for (const f of fileList || []) pushFile(f)
  }

  /** 드롭 이벤트: 폴더 안의 이미지 아닌 파일은 조용히 건너뛰고 개수만 */
  async function addDrop(dataTransfer) {
    const { direct, fromFolder } = await collectDroppedFiles(dataTransfer)
    addFiles(direct)
    for (const f of fromFolder) {
      if (IMAGE_LIKE_EXT.has(extOf(f.name)) || String(f.type || '').startsWith('image/')) pushFile(f)
      else skippedCount.value++
    }
  }

  function removeItem(key) {
    if (busy.value) return
    items.value = items.value.filter(it => it.key !== key)
  }

  function clearAll() {
    if (busy.value) return
    items.value = []
    skippedCount.value = 0
    fatalMessage.value = ''
    baseUsed = null
  }

  function setFailed(it, code, extra) {
    it.status = 'failed'
    it.reason = studioErrorMessage('upload', code, extra)
  }

  async function uploadOne(it) {
    it.status = 'uploading'
    const { error } = await supabase.storage.from('studio').uploadToSignedUrl(it.path, it.token, it.file, { contentType: it.type })
    if (error) {
      console.error('[useStudioUpload] Storage 업로드 실패:', it.name, error)
      it.uploadError = error.message || String(error)
    }
    it.status = 'confirming' // 실패해도 confirm을 부른다 → 서버가 not_uploaded로 행을 failed 처리(장수 상한에서 빠짐)
  }

  async function runPool(list, n, worker) {
    let next = 0
    await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
      while (next < list.length) await worker(list[next++])
    }))
  }

  /**
   * 대기 중인 파일을 올린다.
   * @param {{ projectId?: string|null, title?: string }} opts  projectId 없으면 서버가 새 프로젝트를 만든다
   * @returns {Promise<string|null>} 프로젝트 id (한 번도 prepare에 성공하지 못했으면 null)
   */
  async function start(opts = {}) {
    if (busy.value) return projectId.value
    if (opts.projectId) projectId.value = opts.projectId
    fatalMessage.value = ''
    busy.value = true
    try {
      const queue = items.value.filter(it => it.status === 'waiting')
      for (let i = 0; i < queue.length; i += PREPARE_BATCH) {
        const batch = queue.slice(i, i + PREPARE_BATCH)
        const body = {
          action: 'prepare',
          files: batch.map(it => ({ name: it.name, size: it.size, type: it.type })),
        }
        if (projectId.value) body.projectId = projectId.value
        else if (opts.title) body.title = opts.title

        const r = await callStudioApi('studio-upload', body)
        if (r.data?.projectId && !projectId.value) projectId.value = r.data.projectId
        if (!r.ok) {
          const msg = studioErrorMessage('upload', r.code, r.data || {})
          fatalMessage.value = msg
          // 이번 묶음과 남은 대기 파일은 올리지 않는다 (같은 이유로 막힐 것이므로)
          for (const it of queue.slice(i)) setFailed(it, r.code, r.data || {})
          // 서버가 알려준 남은 장수를 우선: 이후 선택·재시도가 그 값을 기준으로 계산되게 맞춘다
          if (r.code === 'image_limit' && Number.isFinite(r.data?.remaining)) {
            const occupied = items.value.filter(it => OCCUPYING.has(it.status)).length
            baseUsed = STUDIO_MAX_IMAGES - r.data.remaining - occupied
          }
          break
        }
        batch.forEach((it, k) => {
          const u = r.data.uploads[k]
          it.imageId = u.imageId
          it.path = u.path
          it.token = u.token
        })

        await runPool(batch, UPLOAD_CONCURRENCY, uploadOne)

        for (let j = 0; j < batch.length; j += CONFIRM_BATCH) {
          const part = batch.slice(j, j + CONFIRM_BATCH)
          const c = await callStudioApi('studio-upload', {
            action: 'confirm', projectId: projectId.value, imageIds: part.map(it => it.imageId),
          })
          if (!c.ok) {
            for (const it of part) setFailed(it, c.code)
            continue
          }
          for (const it of part) {
            const res = c.data.results?.[it.imageId]
            if (!res) { setFailed(it, 'internal'); continue }
            if (res.status === 'done') {
              it.status = 'done'
              it.reason = ''
              it.width = res.width
              it.height = res.height
            } else {
              // 업로드 자체가 실패했으면 그 원인을 우선 보여준다
              setFailed(it, it.uploadError && res.error === 'not_uploaded' ? 'upload_failed' : res.error,
                { width: res.width, height: res.height })
            }
          }
        }
      }
    } finally {
      busy.value = false
    }
    return projectId.value
  }

  /** 실패한 것만 다시 (새 prepare) — 남은 한도만큼만 대기로 되돌린다 */
  async function retryFailed(opts = {}) {
    for (const it of items.value) {
      if (it.status === 'failed') {
        if (remainingSlots() === 0) {
          it.reason = LIMIT_REASON
          continue
        }
        it.status = 'waiting'
        it.reason = ''
        it.imageId = null
        it.uploadError = null
      }
    }
    return start(opts)
  }

  // 업로드 도중 탭 닫기·새로고침 경고 (브라우저 기본 경고창 — 문구는 브라우저가 정한다)
  const onBeforeUnload = e => {
    if (!busy.value) return
    e.preventDefault()
    e.returnValue = ''
  }
  window.addEventListener('beforeunload', onBeforeUnload)
  onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

  return {
    items, skippedCount, busy, projectId, fatalMessage, counts,
    addFiles, addDrop, removeItem, clearAll, start, retryFailed,
  }
}
