<template>
  <StudioModal :open="open" :wide="!saveOnly" :title="saveOnly ? '작업 저장' : '다운로드'" @close="requestClose">
    <div class="space-y-5" data-export-modal>
      <!-- 고르기 -->
      <template v-if="phase === 'setup'">
        <div class="space-y-2">
          <div class="st-xlabel">받는 방식</div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="st-opt" :class="mode === 'sections' ? 'is-active' : ''" data-export-mode="sections" @click="mode = 'sections'">
              <b>섹션별 여러 장</b><span>섹션마다 한 장씩 (판매처에 나눠 올릴 때)</span>
            </button>
            <button type="button" class="st-opt" :class="mode === 'long' ? 'is-active' : ''" data-export-mode="long" @click="mode = 'long'">
              <b>한 장으로 길게</b><span>고른 섹션을 위에서부터 이어 붙여 한 장</span>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <div class="st-xlabel">파일 형식</div>
            <div class="flex gap-1">
              <button v-for="f in FORMATS" :key="f.key" type="button" class="st-chip" :class="format === f.key ? 'is-active' : ''" :data-export-format="f.key" @click="format = f.key">{{ f.label }}</button>
            </div>
            <p class="st-desc-sm break-keep">{{ format === 'jpg' ? 'JPG 품질 92 — 파일이 가벼워요' : 'PNG — 글자가 더 또렷하지만 파일이 커요' }}</p>
          </div>
          <div class="space-y-2">
            <div class="st-xlabel">크기</div>
            <div class="flex gap-1">
              <button v-for="s in SCALES" :key="s" type="button" class="st-chip" :class="scale === s ? 'is-active' : ''" :data-export-scale="s" @click="scale = s">{{ s }}배 · {{ page.width * s }}px</button>
            </div>
            <p class="st-desc-sm break-keep">{{ scale === 2 ? '2배 — 확대해도 선명해요 (파일이 커져요)' : '1배 — 판매처 권장 폭 그대로' }}</p>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="st-xlabel">받을 섹션</span>
            <span class="ml-auto text-[11px] font-bold st-muted">{{ picked.size }} / {{ page.sections.length }}개</span>
            <button type="button" class="st-link-btn" data-export-all @click="pickAll(picked.size !== page.sections.length)">{{ picked.size === page.sections.length ? '모두 빼기' : '모두 고르기' }}</button>
          </div>
          <ul class="max-h-[34vh] overflow-y-auto space-y-1 pr-1" data-export-sections>
            <li v-for="s in page.sections" :key="s.id">
              <label class="st-sec-row" :class="tooLargeIds.has(s.id) ? 'is-warn' : ''">
                <input type="checkbox" class="st-check" :checked="picked.has(s.id)" :data-export-pick="s.id" @change="togglePick(s.id)" />
                <span class="flex-1 min-w-0 truncate">{{ labels[s.id] ?? s.id }}</span>
                <span v-if="pendingBySection[s.id]" class="text-[11px] font-bold st-ai-text-soft shrink-0">적용 중 {{ pendingBySection[s.id] }}</span>
                <span class="text-[11px] st-muted shrink-0 tabular-nums">{{ page.width * scale }} × {{ Math.round(s.height * scale) }}</span>
              </label>
            </li>
          </ul>
        </div>
        <div class="st-summary" data-export-summary>
          <template v-if="plan.files.length">
            <b>{{ plan.files.length }}장</b> 받아요 · {{ FORMAT_OF[format].label }} · {{ page.width * scale }}px 폭
            <span v-if="mode === 'long'"> · 높이 {{ plan.files[0].height.toLocaleString() }}px</span>
          </template>
          <template v-else>받을 섹션을 골라 주세요</template>
        </div>
        <p v-if="plan.tooLarge.length" class="text-[13px] font-bold st-danger-text break-keep" data-export-too-large>
          <template v-if="mode === 'long'">한 장으로 만들기에는 너무 길어요 ({{ plan.tooLarge[0].height.toLocaleString() }}px). [섹션별 여러 장]으로 받거나 1배로 받아 주세요.</template>
          <template v-else>{{ plan.tooLarge.map(f => labels[f.sectionIds[0]]).join(', ') }} 섹션은 {{ scale }}배로 만들기에는 너무 길어요. 1배로 받거나 섹션을 빼 주세요.</template>
        </p>
        <!-- 개발용 비교 보기 (개발 서버에서만 — 손님 화면에는 없다) -->
        <div v-if="devCompare" class="flex items-center gap-2 p-2 rounded-[8px] st-dev-box" data-export-dev>
          <span class="text-[11px] font-bold st-muted shrink-0">개발용</span>
          <select v-model="compareId" class="st-select flex-1" data-export-compare-pick>
            <option v-for="s in page.sections" :key="s.id" :value="s.id">{{ labels[s.id] ?? s.id }}</option>
          </select>
          <button type="button" class="st-btn" data-export-compare @click="$emit('compare', compareId)">화면과 비교</button>
        </div>
      </template>

      <!-- 적용 중인 사진이 있음 -->
      <div v-else-if="phase === 'askBake' || phase === 'waitBake'" class="space-y-2" data-export-bake>
        <p class="text-[14px] font-bold st-ink break-keep">지운 결과를 사진에 적용하는 중인 사진이 {{ pendingCount }}장 있어요.</p>
        <p class="st-desc break-keep">다 적용된 뒤에 받으면 지운 결과가 완성된 사진으로 들어가요. 지금 받아도 화면에 보이는 모습 그대로 받아요.</p>
        <p v-if="phase === 'waitBake'" class="text-[13px] font-bold st-accent-text" data-export-waiting>적용이 끝나길 기다리는 중… ({{ pendingCount }}장 남음) 끝나면 바로 받기 시작해요.</p>
      </div>

      <!-- 받는 중 -->
      <div v-else-if="phase === 'running'" class="space-y-3" data-export-running>
        <p class="text-[14px] font-bold st-ink">{{ progressText }}</p>
        <div class="st-progress"><div :style="{ width: `${progressPct}%` }" /></div>
        <p v-if="saveOnly" class="st-desc break-keep">저장하는 동안 이 창을 닫지 말아 주세요.</p>
        <p v-else class="st-desc break-keep">받는 동안 이 창을 닫지 말아 주세요. 브라우저가 "여러 파일 다운로드"를 물으면 허용을 눌러 주세요.</p>
      </div>

      <!-- [작업 저장] 끝 — 내 상품에 저장만 (받지 않는다) -->
      <div v-else-if="phase === 'saved'" class="space-y-1.5" data-export-saved>
        <p class="text-[15px] font-bold st-success-text">내 상품에 저장됐어요</p>
        <p class="st-desc break-keep">{{ doneCount }}장 · {{ saved.updated ? '전에 저장한 내 상품을 새 결과물로 바꿨어요.' : '내 작업의 [내 상품]에서 볼 수 있어요.' }}</p>
      </div>

      <!-- [작업 저장] 실패 -->
      <div v-else-if="phase === 'saveError'" class="space-y-2" data-export-save-error>
        <p class="text-[14px] font-bold st-danger-text break-keep">내 상품에 저장하지 못했어요.</p>
        <p class="st-desc break-keep">{{ error.message }}</p>
      </div>

      <!-- 끝 -->
      <div v-else-if="phase === 'done'" class="space-y-2" data-export-done>
        <p class="text-[14px] font-bold st-success-text">{{ doneCount }}장을 받았어요.</p>
        <p class="st-desc break-keep">브라우저의 다운로드 폴더에서 {{ baseName }}_… 파일을 확인해 주세요.</p>
      </div>

      <!-- 내 상품 보관 (받은 파일을 한 벌 더 — 작업 홈 [내 상품]에서 다시 받을 수 있음). 받기와 상관없이 따로 보여 준다 -->
      <p v-if="archiveLine && (phase === 'done' || phase === 'error')" class="text-[12px] font-bold break-keep" :class="archive.state === 'saved' ? 'st-success-text' : archive.state === 'soon' ? 'st-muted' : 'st-danger-text'" data-export-archive>{{ archiveLine }}</p>

      <!-- 실패 -->
      <div v-else-if="phase === 'error'" class="space-y-2" data-export-error>
        <p class="text-[14px] font-bold st-danger-text break-keep">{{ error.where }} — 이미지로 만들지 못했어요.</p>
        <p class="st-desc break-keep">{{ error.message }}</p>
        <p v-if="doneCount" class="st-desc break-keep">앞의 {{ doneCount }}장은 이미 받았어요. [다시 시도]를 누르면 멈춘 곳부터 이어서 받아요.</p>
      </div>

      <!-- 사진 준비 알림 (지우기 결과 일부를 못 그림 등 — 화면과 같은 상태로 받았음) -->
      <ul v-if="notes.length && (phase === 'done' || phase === 'error' || phase === 'running')" class="space-y-1" data-export-notes>
        <li v-for="(n, i) in summarizeNotes(notes, labels)" :key="i" class="text-[12px] st-ai-text-soft break-keep">{{ n }}</li>
      </ul>
    </div>

    <template #actions>
      <template v-if="phase === 'setup'">
        <button type="button" class="st-btn" @click="$emit('close')">닫기</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="!canStart" data-export-start @click="start">받기</button>
      </template>
      <template v-else-if="phase === 'askBake'">
        <button type="button" class="st-btn" @click="phase = 'setup'">취소</button>
        <button type="button" class="st-btn" data-export-now @click="run(0)">지금 받기</button>
        <button type="button" class="st-btn st-btn-primary" data-export-wait @click="phase = 'waitBake'">다 되면 받기</button>
      </template>
      <template v-else-if="phase === 'waitBake'">
        <button type="button" class="st-btn" @click="phase = 'setup'">취소</button>
        <button type="button" class="st-btn" data-export-now @click="run(0)">기다리지 않고 받기</button>
      </template>
      <template v-else-if="phase === 'running'">
        <button type="button" class="st-btn" :disabled="stopAsked" data-export-stop @click="stopAsked = true">{{ stopAsked ? '멈추는 중…' : saveOnly ? '그만두기' : '그만 받기' }}</button>
      </template>
      <template v-else-if="phase === 'saved'">
        <button type="button" class="st-btn" data-export-saved-continue @click="$emit('close')">계속 편집</button>
        <button type="button" class="st-btn" data-export-saved-home @click="$emit('home')">내 작업으로 가기</button>
        <button type="button" class="st-btn st-btn-primary" data-export-saved-send @click="$emit('send', saved.exportId)">판매처로 보내기</button>
      </template>
      <template v-else-if="phase === 'saveError' || (saveOnly && phase !== 'error')">
        <button type="button" class="st-btn" @click="$emit('close')">닫기</button>
        <button v-if="phase === 'saveError'" type="button" class="st-btn st-btn-primary" data-export-save-retry @click="run(0)">다시 시도</button>
      </template>
      <template v-else-if="phase === 'error'">
        <button type="button" class="st-btn" @click="saveOnly ? $emit('close') : (phase = 'setup')">{{ saveOnly ? '닫기' : '처음으로' }}</button>
        <button type="button" class="st-btn st-btn-primary" data-export-retry @click="run(saveOnly ? 0 : error.fileIndex)">다시 시도</button>
      </template>
      <template v-else>
        <button type="button" class="st-btn" @click="phase = 'setup'">다른 설정으로 받기</button>
        <button type="button" class="st-btn st-btn-primary" @click="$emit('close')">닫기</button>
      </template>
    </template>
  </StudioModal>
</template>

<script setup>
// [다운로드] 창 (13-1, 예전 이름 [내보내기]) · [작업 저장] 창 (saveOnly) — 같은 그리기·보관 길을 쓴다.
//   [다운로드]  = 고른 설정으로 파일을 만들어 내려받고, 내 상품에도 한 벌 보관 (받을 때마다 새 카드)
//   [작업 저장] = 받지 않고 기본 설정(섹션별·JPG·1배·전체)으로 만들어 내 상품에 저장만. 같은 작업을 다시 저장하면 그 카드를 새 결과물로 바꾼다(commitSave)
// 받는 방식(구간별 여러 장 기본·한 장으로 길게) · 형식(JPG 품질 92 기본·PNG) · 크기(1배 780px 기본·2배) · 받을 구간.
// 그리기는 편집기가 넘긴 render(file, { format, scale, onStep }) → { blob, notes } (studioExport 엔진 + 편집기의 사진·글꼴).
// 파일은 하나씩 만들어 바로 내려받는다 (작업이름_01.jpg …). 실패하면 어느 구간인지와 원인, [다시 시도] = 멈춘 파일부터.
// 적용 중(5단계 완성 사진 만드는 중)인 사진이 고른 구간에 있으면 먼저 묻는다 — 다 되면 받기 / 지금 받기(화면 모습 그대로).
import { ref, computed, watch } from 'vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import { exportPlan, exportFileName, fileBaseName, EXPORT_FORMATS, EXPORT_SCALES } from '@/lib/studioExport'
import { summarizeNotes } from '@/lib/studioPreview' // 같은 알림은 한 줄로 (review-1)
import { beginArchive, archiveFile, archiveThumb, makeThumb, archiveKey, commitSave } from '@/lib/studioExportArchive'

const props = defineProps({
  open: { type: Boolean, default: false },
  page: { type: Object, required: true },
  projectId: { type: String, default: '' },                // 내 상품 보관 (없으면 보관하지 않음 — 받기는 그대로)
  title: { type: String, default: '' },                    // 작업 이름 (파일 이름에 씀)
  labels: { type: Object, default: () => ({}) },           // 구간 id → "03 대표 사진"
  pendingBySection: { type: Object, default: () => ({}) }, // 구간 id → 적용 중인 사진 수
  render: { type: Function, required: true },              // (file, { format, scale, onStep }) → Promise<{ blob, notes }>
  devCompare: { type: Boolean, default: false },           // 개발 서버에서만 비교 보기 버튼
  saveOnly: { type: Boolean, default: false },             // [작업 저장] — 받지 않고 내 상품에 저장만
})
const emit = defineEmits(['close', 'compare', 'saved', 'send', 'home'])

const FORMATS = [{ key: 'jpg', label: 'JPG' }, { key: 'png', label: 'PNG' }]
const FORMAT_OF = EXPORT_FORMATS
const SCALES = EXPORT_SCALES

const mode = ref('sections')
const format = ref('jpg')
const scale = ref(1)
const picked = ref(new Set())
const phase = ref('setup') // setup | askBake | waitBake | running | done | error | saved · saveError([작업 저장])
const saved = ref({ exportId: null, updated: false }) // [작업 저장] 결과 — 내 상품에 남은 카드
const progress = ref({ file: 0, files: 0, step: 0, steps: 0, label: '' })
const error = ref({ where: '', message: '', fileIndex: 0 })
const notes = ref([])
const doneCount = ref(0)
const stopAsked = ref(false)
const compareId = ref(null)
let runPlan = null // 받기를 누른 때의 파일 목록 (도중에 설정을 바꿔도 이어 받기는 같은 목록)

const orderedPicked = computed(() => props.page.sections.filter(s => picked.value.has(s.id)).map(s => s.id))
const plan = computed(() => exportPlan(props.page, { mode: mode.value, scale: scale.value, sectionIds: orderedPicked.value }))
const tooLargeIds = computed(() => new Set(plan.value.tooLarge.flatMap(f => (mode.value === 'long' ? [] : f.sectionIds))))
const canStart = computed(() => plan.value.files.length > 0 && plan.value.tooLarge.length === 0)
const baseName = computed(() => fileBaseName(props.title))
const pendingCount = computed(() => orderedPicked.value.reduce((n, id) => n + (props.pendingBySection[id] || 0), 0))

// 창을 열 때마다 처음 상태 (구간은 전체 고름)
watch(() => props.open, v => {
  if (!v) return
  phase.value = 'setup'
  picked.value = new Set(props.page.sections.map(s => s.id))
  compareId.value = props.page.sections[0]?.id ?? null
  notes.value = []
  doneCount.value = 0
  saved.value = { exportId: null, updated: false }
  if (props.saveOnly) { // 묻지 않고 기본 설정으로 바로 (적용 중인 사진이 있어도 화면에 보이는 모습 그대로 저장)
    mode.value = 'sections'
    format.value = 'jpg'
    scale.value = 1
    if (canStart.value) run(0)
    else { error.value = { where: '', message: plan.value.files.length ? '섹션이 너무 길어 이미지로 만들 수 없어요. [다운로드]에서 받을 섹션을 골라 주세요.' : '저장할 섹션이 없어요.', fileIndex: 0 }; phase.value = 'saveError' }
  }
})
// 적용이 끝나길 기다리는 중 — 다 끝나면 바로 받기
watch(pendingCount, n => { if (phase.value === 'waitBake' && n === 0) run(0) })

function togglePick(id) {
  const next = new Set(picked.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  picked.value = next
}
function pickAll(on) { picked.value = new Set(on ? props.page.sections.map(s => s.id) : []) }

function start() {
  if (!canStart.value) return
  if (pendingCount.value > 0) { phase.value = 'askBake'; return }
  run(0)
}

const progressPct = computed(() => {
  const p = progress.value
  if (!p.files) return 0
  const inFile = p.steps ? p.step / p.steps : 0
  return Math.round(((p.file + inFile) / p.files) * 100)
})
const progressText = computed(() => {
  const p = progress.value
  if (p.files > 1) return `${p.file + 1} / ${p.files}장 만드는 중 · ${p.label}`
  if (p.steps > 1) return `섹션 ${p.step + 1} / ${p.steps} 그리는 중 · ${p.label}`
  return `만드는 중 · ${p.label}`
})

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000) // 내려받기가 시작될 시간을 준 뒤 메모리 돌려주기
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── 내 상품 보관 (2026-09-28) — 받은 파일마다 서버에 한 벌 더. 실패해도 받기는 계속, 이유는 창에 한 줄 ──
// state: idle | saving | saved | soon(표 설정 전) | failed(한 장이라도 못 함)
const archive = ref({ state: 'idle', saved: 0, failed: 0, message: '' })
let archiveId = null
let thumbDone = false
const archiveLine = computed(() => {
  const a = archive.value
  if (a.state === 'saved') return `내 상품에 ${a.saved}장 보관했어요 · 작업 홈 [내 상품]에서 다시 받을 수 있어요`
  if (a.state === 'soon') return a.message
  if (a.state === 'failed') return `${a.saved ? `${a.saved}장은 보관했지만 ` : ''}${a.failed}장은 내 상품에 보관하지 못했어요 — ${a.message}`
  return ''
})
async function startArchive(r) {
  archiveId = null
  thumbDone = false
  archive.value = { state: 'idle', saved: 0, failed: 0, message: '' }
  if (!props.projectId) return
  archive.value = { ...archive.value, state: 'saving' }
  try {
    archiveId = await beginArchive({ projectId: props.projectId, title: r.base, format: r.format, scale: r.scale, mode: r.mode, count: r.files.length, source: props.saveOnly ? 'save' : undefined })
  } catch (e) {
    console.error('[StudioExportModal] 내 상품 보관 시작 실패:', e.code, e)
    archive.value = { state: e.code === 'export_sql_missing' ? 'soon' : 'failed', saved: 0, failed: r.files.length, message: e.message }
  }
}
async function archiveOne(file, blob, name) {
  if (!archiveId) return
  try {
    await archiveFile(archiveId, { key: archiveKey(file.no), name, blob })
    archive.value = { ...archive.value, saved: archive.value.saved + 1 }
  } catch (e) {
    console.error('[StudioExportModal] 내 상품 보관 실패:', name, e.code, e)
    archive.value = { ...archive.value, failed: archive.value.failed + 1, message: e.message }
    return
  }
  if (thumbDone) return
  thumbDone = true
  try {
    await archiveThumb(archiveId, await makeThumb(blob))
  } catch (e) {
    // 파일은 보관됐다 — 목록에서 미리보기 자리만 비어 보인다 ("미리보기 없음")
    console.error('[StudioExportModal] 내 상품 미리보기 보관 실패:', e.code, e)
  }
}
function finishArchive() {
  const a = archive.value
  if (a.state !== 'saving') return
  archive.value = { ...a, state: a.failed ? 'failed' : a.saved ? 'saved' : 'idle' }
}

/** from번째 파일부터 차례로 만들어 받는다 (0 = 처음부터 — 그때의 설정으로 목록을 새로 잡는다) */
async function run(from) {
  if (from === 0) {
    runPlan = { files: plan.value.files, format: format.value, scale: scale.value, base: baseName.value, mode: mode.value }
    notes.value = []
    doneCount.value = 0
    progress.value = { file: 0, files: runPlan.files.length, step: 0, steps: 0, label: '' }
    phase.value = 'running' // 보관 기록을 만드는 동안에도 고르기 화면이 보이지 않게
    stopAsked.value = false
    await startArchive(runPlan)
  } else if (archive.value.state !== 'soon' && archiveId) {
    archive.value = { ...archive.value, state: 'saving' } // [다시 시도] — 같은 보관 기록에 이어서
  }
  if (!runPlan) return
  phase.value = 'running'
  stopAsked.value = false
  const { files, format: fmt, scale: sc, base } = runPlan
  for (let i = from; i < files.length; i++) {
    if (stopAsked.value || !props.open) break
    const file = files[i]
    const label = file.no === null ? `${file.sectionIds.length}개 섹션을 한 장으로` : props.labels[file.sectionIds[0]] ?? ''
    progress.value = { file: i, files: files.length, step: 0, steps: file.sectionIds.length, label }
    try {
      const out = await props.render(file, {
        format: fmt, scale: sc,
        onStep: (step, steps, sid) => { progress.value = { ...progress.value, step, steps, label: file.no === null ? props.labels[sid] ?? '' : label } },
      })
      notes.value.push(...out.notes)
      const name = exportFileName(base, file, FORMAT_OF[fmt].ext)
      if (!props.saveOnly) download(out.blob, name)
      doneCount.value++
      await archiveOne(file, out.blob, name)
      if (!props.saveOnly && i < files.length - 1) await sleep(400) // 여러 파일을 한꺼번에 내려받지 않게 조금씩 띄운다
    } catch (e) {
      console.error('[StudioExportModal] 이미지 만들기 실패:', file, e)
      const sid = e?.sectionId ?? (file.sectionIds.length === 1 ? file.sectionIds[0] : null)
      error.value = {
        where: sid ? `${props.labels[sid] ?? ''} 섹션` : '이미지',
        message: `${e?.message || String(e)}${e?.kind === 'tooLarge' ? ' — 섹션별 여러 장이나 1배로 받아 주세요.' : ''}`,
        fileIndex: i,
      }
      phase.value = 'error'
      finishArchive()
      return
    }
  }
  finishArchive()
  if (props.saveOnly) return finishSave(files.length)
  phase.value = doneCount.value || !stopAsked.value ? 'done' : 'setup'
}

/** [작업 저장] 마무리 — 전부 보관됐을 때만 내 상품 카드로 확정한다 (일부만 된 결과물로 예전 카드를 바꾸지 않는다) */
async function finishSave(total) {
  const a = archive.value
  if (stopAsked.value || !props.open) { emit('close'); return }
  if (!archiveId || a.state !== 'saved' || a.saved !== total) {
    console.error('[StudioExportModal] 작업 저장: 보관이 끝나지 않음', { state: a.state, saved: a.saved, total, message: a.message })
    error.value = { where: '', message: a.message || '잠시 후 다시 시도해 주세요.', fileIndex: 0 }
    phase.value = 'saveError'
    return
  }
  try {
    const r = await commitSave(archiveId)
    saved.value = { exportId: r.exportId, updated: r.updated === true }
    phase.value = 'saved'
    emit('saved', saved.value)
  } catch (e) {
    console.error('[StudioExportModal] 작업 저장 마무리 실패:', e.code, e)
    error.value = { where: '', message: e.message, fileIndex: 0 }
    phase.value = 'saveError'
  }
}

/** 바깥 누르기·Esc — 받는 중에는 닫지 않는다([그만 받기]로 멈춤) */
function requestClose() {
  if (phase.value === 'running') return
  emit('close')
}
</script>

<style scoped>
.st-xlabel { font-size: 12px; font-weight: 800; color: var(--st-ink-2); }
.st-opt {
  display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 10px 12px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink);
}
.st-opt b { font-size: 13px; }
.st-opt span { font-size: 11px; color: var(--st-muted); }
.st-opt.is-active { border-color: var(--st-accent); background: var(--st-accent-soft); }
.st-chip {
  height: 30px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2);
}
.st-chip.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
.st-sec-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700;
  color: var(--st-ink-2); background: var(--st-card);
}
.st-sec-row.is-warn { box-shadow: inset 0 0 0 1px var(--st-danger); }
.st-check { accent-color: var(--st-accent); width: 14px; height: 14px; }
.st-summary { padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--st-ink-2); background: var(--st-card); }
.st-summary b { color: var(--st-ink); }
.st-link-btn { font-size: 11px; font-weight: 700; color: var(--st-accent); background: transparent; border: 0; cursor: pointer; }
.st-ai-text-soft { color: var(--st-ai); }
.st-dev-box { border: 1px dashed var(--st-line-strong); }
.st-select {
  height: 30px; padding: 0 8px; border-radius: 8px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink); outline: none;
}
</style>
