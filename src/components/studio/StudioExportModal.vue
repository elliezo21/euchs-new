<template>
  <StudioModal :open="open" wide title="이미지로 받기" @close="requestClose">
    <div class="space-y-5" data-export-modal>
      <!-- 고르기 -->
      <template v-if="phase === 'setup'">
        <div class="space-y-2">
          <div class="st-xlabel">받는 방식</div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="st-opt" :class="mode === 'sections' ? 'is-active' : ''" data-export-mode="sections" @click="mode = 'sections'">
              <b>구간별 여러 장</b><span>구간마다 한 장씩 (판매처에 나눠 올릴 때)</span>
            </button>
            <button type="button" class="st-opt" :class="mode === 'long' ? 'is-active' : ''" data-export-mode="long" @click="mode = 'long'">
              <b>한 장으로 길게</b><span>고른 구간을 위에서부터 이어 붙여 한 장</span>
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
            <span class="st-xlabel">받을 구간</span>
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
          <template v-else>받을 구간을 골라 주세요</template>
        </div>
        <p v-if="plan.tooLarge.length" class="text-[13px] font-bold st-danger-text break-keep" data-export-too-large>
          <template v-if="mode === 'long'">한 장으로 만들기에는 너무 길어요 ({{ plan.tooLarge[0].height.toLocaleString() }}px). [구간별 여러 장]으로 받거나 1배로 받아 주세요.</template>
          <template v-else>{{ plan.tooLarge.map(f => labels[f.sectionIds[0]]).join(', ') }} 구간은 {{ scale }}배로 만들기에는 너무 길어요. 1배로 받거나 구간을 빼 주세요.</template>
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
        <p class="st-desc break-keep">받는 동안 이 창을 닫지 말아 주세요. 브라우저가 "여러 파일 다운로드"를 물으면 허용을 눌러 주세요.</p>
      </div>

      <!-- 끝 -->
      <div v-else-if="phase === 'done'" class="space-y-2" data-export-done>
        <p class="text-[14px] font-bold st-success-text">{{ doneCount }}장을 받았어요.</p>
        <p class="st-desc break-keep">브라우저의 다운로드 폴더에서 {{ baseName }}_… 파일을 확인해 주세요.</p>
      </div>

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
        <button type="button" class="st-btn" :disabled="stopAsked" data-export-stop @click="stopAsked = true">{{ stopAsked ? '멈추는 중…' : '그만 받기' }}</button>
      </template>
      <template v-else-if="phase === 'error'">
        <button type="button" class="st-btn" @click="phase = 'setup'">처음으로</button>
        <button type="button" class="st-btn st-btn-primary" data-export-retry @click="run(error.fileIndex)">다시 시도</button>
      </template>
      <template v-else>
        <button type="button" class="st-btn" @click="phase = 'setup'">다른 설정으로 받기</button>
        <button type="button" class="st-btn st-btn-primary" @click="$emit('close')">닫기</button>
      </template>
    </template>
  </StudioModal>
</template>

<script setup>
// [내보내기] 창 (13-1) — 받는 방식(구간별 여러 장 기본·한 장으로 길게) · 형식(JPG 품질 92 기본·PNG) · 크기(1배 780px 기본·2배) · 받을 구간.
// 그리기는 편집기가 넘긴 render(file, { format, scale, onStep }) → { blob, notes } (studioExport 엔진 + 편집기의 사진·글꼴).
// 파일은 하나씩 만들어 바로 내려받는다 (작업이름_01.jpg …). 실패하면 어느 구간인지와 원인, [다시 시도] = 멈춘 파일부터.
// 적용 중(5단계 완성 사진 만드는 중)인 사진이 고른 구간에 있으면 먼저 묻는다 — 다 되면 받기 / 지금 받기(화면 모습 그대로).
import { ref, computed, watch } from 'vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import { exportPlan, exportFileName, fileBaseName, EXPORT_FORMATS, EXPORT_SCALES } from '@/lib/studioExport'
import { summarizeNotes } from '@/lib/studioPreview' // 같은 알림은 한 줄로 (review-1)

const props = defineProps({
  open: { type: Boolean, default: false },
  page: { type: Object, required: true },
  title: { type: String, default: '' },                    // 작업 이름 (파일 이름에 씀)
  labels: { type: Object, default: () => ({}) },           // 구간 id → "03 대표 사진"
  pendingBySection: { type: Object, default: () => ({}) }, // 구간 id → 적용 중인 사진 수
  render: { type: Function, required: true },              // (file, { format, scale, onStep }) → Promise<{ blob, notes }>
  devCompare: { type: Boolean, default: false },           // 개발 서버에서만 비교 보기 버튼
})
const emit = defineEmits(['close', 'compare'])

const FORMATS = [{ key: 'jpg', label: 'JPG' }, { key: 'png', label: 'PNG' }]
const FORMAT_OF = EXPORT_FORMATS
const SCALES = EXPORT_SCALES

const mode = ref('sections')
const format = ref('jpg')
const scale = ref(1)
const picked = ref(new Set())
const phase = ref('setup') // setup | askBake | waitBake | running | done | error
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
  if (p.steps > 1) return `구간 ${p.step + 1} / ${p.steps} 그리는 중 · ${p.label}`
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

/** from번째 파일부터 차례로 만들어 받는다 (0 = 처음부터 — 그때의 설정으로 목록을 새로 잡는다) */
async function run(from) {
  if (from === 0) {
    runPlan = { files: plan.value.files, format: format.value, scale: scale.value, base: baseName.value }
    notes.value = []
    doneCount.value = 0
  }
  if (!runPlan) return
  phase.value = 'running'
  stopAsked.value = false
  const { files, format: fmt, scale: sc, base } = runPlan
  for (let i = from; i < files.length; i++) {
    if (stopAsked.value || !props.open) break
    const file = files[i]
    const label = file.no === null ? `${file.sectionIds.length}개 구간을 한 장으로` : props.labels[file.sectionIds[0]] ?? ''
    progress.value = { file: i, files: files.length, step: 0, steps: file.sectionIds.length, label }
    try {
      const out = await props.render(file, {
        format: fmt, scale: sc,
        onStep: (step, steps, sid) => { progress.value = { ...progress.value, step, steps, label: file.no === null ? props.labels[sid] ?? '' : label } },
      })
      notes.value.push(...out.notes)
      download(out.blob, exportFileName(base, file, FORMAT_OF[fmt].ext))
      doneCount.value++
      if (i < files.length - 1) await sleep(400) // 여러 파일을 한꺼번에 내려받지 않게 조금씩 띄운다
    } catch (e) {
      console.error('[StudioExportModal] 이미지 만들기 실패:', file, e)
      const sid = e?.sectionId ?? (file.sectionIds.length === 1 ? file.sectionIds[0] : null)
      error.value = {
        where: sid ? `${props.labels[sid] ?? ''} 구간` : '이미지',
        message: `${e?.message || String(e)}${e?.kind === 'tooLarge' ? ' — 구간별 여러 장이나 1배로 받아 주세요.' : ''}`,
        fileIndex: i,
      }
      phase.value = 'error'
      return
    }
  }
  phase.value = doneCount.value || !stopAsked.value ? 'done' : 'setup'
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
