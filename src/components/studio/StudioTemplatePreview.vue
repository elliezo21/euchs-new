<template>
  <Teleport to="body">
    <div
      v-if="tpl" class="studio-root st-modal-overlay fixed inset-0 flex items-center justify-center p-3 sm:p-6" :class="dark ? 'st-dark' : ''"
      style="z-index: 60" data-template-preview-open @click.self="$emit('close')"
    >
      <div class="st-tprev" role="dialog" aria-modal="true" :aria-label="`${title} 미리보기`">
        <!-- 위: 이름·정보 + [닫기] [쓰기] -->
        <div class="st-tprev-head">
          <div class="min-w-0 flex-1">
            <div class="text-[15px] font-extrabold st-ink truncate" data-template-preview-title>{{ title }}</div>
            <div class="mt-0.5 text-[12px] st-muted truncate">{{ meta }}</div>
          </div>
          <button type="button" class="st-btn" data-template-preview-close @click="$emit('close')">닫기</button>
          <button
            ref="useBtn" type="button" class="st-btn st-btn-primary" :disabled="disabled"
            data-template-preview-use @click="$emit('use', tpl.key)"
          >{{ actionLabel }}</button>
        </div>
        <p v-if="disabledNote" class="px-4 pb-2 st-desc-sm break-keep">{{ disabledNote }}</p>
        <!-- 템플릿 전체 (위 → 아래) 를 줄여서 — 스크롤로 본다 -->
        <div class="st-tprev-body" data-template-preview-body>
          <img v-if="thumb" :src="thumb.full" alt="" class="st-tprev-img" draggable="false" data-template-preview-image />
          <div v-else-if="failed" class="st-tprev-fail">
            <p class="st-desc">잠시 후 다시 시도해 주세요.</p>
            <button type="button" class="st-btn mt-3" @click="load">다시 시도</button>
          </div>
          <div v-else class="st-tprev-img st-skeleton" style="aspect-ratio: 3 / 8" />
        </div>
        <p class="st-tprev-foot st-desc-sm break-keep">{{ footNote }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// 템플릿 미리보기 칸 (템플릿 갤러리·편집기 [템플릿] 패널) — 카드를 누르면 가운데에 연다. 바로 바꾸지 않는다.
// [이 템플릿 쓰기]/[이 템플릿으로 시작]을 눌러야 use(key) — 적용·확인창·되돌리기는 부르는 쪽 (편집기 askTemplate 그대로).
// 열린 동안 키는 여기서만 받는다 (Esc = 닫기) — 편집기 단축키가 뒤 페이지에 적용되지 않게 캡처 단계에서 막는다.
import { computed, inject, nextTick, onUnmounted, ref, watch } from 'vue'
import { templateByKey, templateCardTitle, templateMoodLabel, templateSectionCount, templateSlots } from '@/lib/studioTemplates'
import { templateThumb, templateThumbNow } from '@/lib/studioTemplateThumbs'

const props = defineProps({
  tplKey: { type: String, default: '' }, // 비어 있으면 닫힘
  actionLabel: { type: String, default: '이 템플릿 쓰기' },
  disabled: { type: Boolean, default: false },
  disabledNote: { type: String, default: '' },
  footNote: { type: String, default: '' },
})
const emit = defineEmits(['close', 'use'])
const dark = inject('studioDark', false)

const tpl = computed(() => (props.tplKey ? templateByKey(props.tplKey) : null))
const title = computed(() => (tpl.value ? templateCardTitle(tpl.value) : ''))
const meta = computed(() => {
  const t = tpl.value
  if (!t) return ''
  return [templateMoodLabel(t), `섹션 ${templateSectionCount(t)}개`, `사진 자리 ${templateSlots(t).length}곳`].filter(Boolean).join(' · ')
})
const thumb = ref(null)
const failed = ref(false)
const useBtn = ref(null)

async function load() {
  const key = props.tplKey
  if (!key) return
  failed.value = false
  try {
    const t = await templateThumb(key)
    if (props.tplKey === key) thumb.value = t
  } catch (e) {
    console.error('[StudioTemplatePreview] 미리보기를 그리지 못함:', key, e)
    if (props.tplKey === key) failed.value = true
  }
}

function onKey(e) {
  e.stopPropagation()
  if (e.key === 'Escape') { e.preventDefault(); emit('close') }
}
watch(() => props.tplKey, (k, old) => {
  if (k && !old) window.addEventListener('keydown', onKey, true)
  if (!k && old) window.removeEventListener('keydown', onKey, true)
  thumb.value = k ? templateThumbNow(k) : null
  failed.value = false
  if (k) {
    if (!thumb.value) load()
    nextTick(() => useBtn.value?.focus())
  }
}, { immediate: true })
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.st-tprev {
  display: flex; flex-direction: column; width: min(600px, 100%); max-height: 100%; border-radius: 16px; overflow: hidden;
  background: var(--st-panel, var(--st-surface)); box-shadow: 0 24px 60px rgba(0, 0, 0, .35);
}
.st-tprev-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px 12px; border-bottom: 1px solid var(--st-line); }
.st-tprev-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; background: var(--st-bg, #f4f5f7); overscroll-behavior: contain; }
.st-tprev-img { display: block; width: 100%; max-width: 480px; margin: 0 auto; border-radius: 6px; box-shadow: 0 0 0 1px var(--st-line-strong); background: #fff; }
.st-tprev-fail { display: flex; flex-direction: column; align-items: center; padding: 60px 0; }
.st-tprev-foot { padding: 10px 16px 12px; border-top: 1px solid var(--st-line); }
</style>
