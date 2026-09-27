<template>
  <!-- 개발용 비교 보기 (13-1) — 개발 서버에서만 불러온다(편집기가 import.meta.env.DEV일 때만 import). 손님 화면에는 없다.
       왼쪽 = 편집기 화면과 같은 페이지 그리기(StudioPageView, 배율 1), 오른쪽 = 내보낸 이미지(PNG, 780 CSS px 폭).
       [겹쳐 보기] = 화면 위에 내보낸 이미지를 차이(difference)로 겹침 — 같은 곳은 검게, 다른 곳만 밝게 보인다 -->
  <Teleport to="body">
    <div class="studio-root st-dark fixed inset-0 flex flex-col st-bg" style="z-index: 60" data-export-compare>
      <div class="h-12 shrink-0 px-4 flex items-center gap-3 st-topbar st-border-b">
        <span class="text-[13px] font-extrabold st-ink">[개발용] 화면 · 내보내기 비교 — {{ label }}</span>
        <span class="text-[11px] st-muted">내보낸 배율 {{ exportScale }}배 (기기 배율 {{ dpr }})</span>
        <div class="ml-auto flex gap-1">
          <button type="button" class="st-btn" :class="view === 'side' ? 'st-btn-primary' : ''" data-compare-view="side" @click="view = 'side'">나란히</button>
          <button type="button" class="st-btn" :class="view === 'diff' ? 'st-btn-primary' : ''" data-compare-view="diff" @click="view = 'diff'">겹쳐 보기(차이)</button>
          <button type="button" class="st-btn" data-compare-close @click="$emit('close')">닫기</button>
        </div>
      </div>
      <div class="flex-1 min-h-0 overflow-auto p-8">
        <p v-if="status === 'loading'" class="st-desc mb-3">내보내는 중…</p>
        <p v-if="status === 'error'" class="text-[13px] font-bold st-danger-text mb-3" data-compare-error>{{ errorText }}</p>
        <div class="flex gap-10 items-start" :style="{ width: 'max-content' }">
          <div>
            <div class="text-[11px] font-bold st-muted mb-2">화면 (편집기 그리기)</div>
            <div class="relative" data-compare-screen :style="{ width: `${page.width}px` }">
              <StudioPageView
                :page="onePage" :zoom="1" :images-by-id="imagesById" :views="views" :looks="looks"
              />
              <img
                v-if="view === 'diff' && url" :src="url" alt="" class="absolute left-0 top-0 pointer-events-none"
                :style="{ width: `${page.width}px`, mixBlendMode: 'difference' }" data-compare-diff
              />
            </div>
          </div>
          <div v-if="view === 'side'">
            <div class="text-[11px] font-bold st-muted mb-2">내보낸 이미지</div>
            <img v-if="url" :src="url" alt="" class="block" :style="{ width: `${page.width}px` }" data-compare-export />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import StudioPageView from '@/components/studio/StudioPageView.vue'

const props = defineProps({
  page: { type: Object, required: true },
  sectionId: { type: String, required: true },
  label: { type: String, default: '' },
  imagesById: { type: Map, required: true },
  views: { type: Object, required: true },
  looks: { type: Object, default: () => ({}) },
  render: { type: Function, required: true }, // (file, { format, scale }) → Promise<{ blob }>
})
defineEmits(['close'])

const view = ref('side')
const url = ref(null)
const status = ref('loading')
const errorText = ref('')
const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100
const exportScale = dpr >= 1.5 ? 2 : 1 // 화면 픽셀과 맞추려고 기기 배율에 가까운 쪽
const onePage = computed(() => ({ ...props.page, gap: 0, sections: props.page.sections.filter(s => s.id === props.sectionId) }))

onMounted(async () => {
  const s = props.page.sections.find(x => x.id === props.sectionId)
  if (!s) { status.value = 'error'; errorText.value = '없는 섹션이에요'; return }
  try {
    const out = await props.render({ no: 0, sectionIds: [s.id] }, { format: 'png', scale: exportScale })
    url.value = URL.createObjectURL(out.blob)
    status.value = 'ready'
  } catch (e) {
    console.error('[StudioExportCompare] 내보내기 실패:', e)
    status.value = 'error'
    errorText.value = e?.message || String(e)
  }
})
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value) })
</script>
