<template>
  <div v-if="ordered.length || skus.length" class="space-y-2" data-mk-src-opt>
    <div class="flex flex-wrap items-center gap-2">
      <button v-if="ordered.length" type="button" class="st-btn" :disabled="disabled" data-mk-src-opt-ordered @click="onOrdered">주문한 옵션 불러오기</button>
      <button v-if="skus.length" type="button" class="st-btn" :disabled="disabled" data-mk-src-opt-open @click="open = !open">{{ open ? '1688 옵션 목록 닫기' : '1688 옵션 불러오기' }}</button>
      <span class="st-desc-sm break-keep">불러오면 지금 옵션 목록이 바뀝니다.</span>
    </div>
    <p v-if="msg" class="st-desc-sm break-keep" data-mk-src-opt-msg>{{ msg }}</p>

    <!-- 1688 옵션 전체 — 처음에는 아무것도 체크하지 않는다. 체크한 것만 가져온다 -->
    <div v-if="open" class="st-border rounded-[10px] p-2.5 space-y-2" data-mk-src-opt-list>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[13px] font-bold st-ink">1688 옵션 {{ skus.length }}개<template v-if="skuTotal > skus.length"> (전체 {{ skuTotal }}개 중)</template></span>
        <button type="button" class="st-link text-[12px]" :disabled="disabled" data-mk-src-opt-all @click="checkAll(checked.size !== skus.length)">{{ checked.size === skus.length ? '모두 빼기' : '모두 고르기' }}</button>
        <button type="button" class="st-btn st-btn-primary ml-auto" :disabled="disabled || !checked.size" data-mk-src-opt-take @click="onTake">선택한 {{ checked.size }}개 가져오기</button>
      </div>
      <ul class="max-h-[260px] overflow-y-auto space-y-0.5" data-mk-src-opt-rows>
        <li v-for="(s, i) in skus" :key="i">
          <label class="flex items-start gap-2 text-[13px] py-1 cursor-pointer">
            <input type="checkbox" class="mt-0.5" :checked="checked.has(i)" :disabled="disabled" :data-mk-src-opt-check="i" @change="toggle(i)" />
            <span class="min-w-0">
              <span class="st-ink">{{ labels[i].text || '옵션' }}</span>
              <span v-if="labels[i].original && labels[i].original !== labels[i].text" class="st-desc-sm block break-all">가져온 옵션: {{ labels[i].original }}</span>
            </span>
            <span v-if="s.stock === 0" class="st-badge shrink-0 ml-auto">1688 품절</span>
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
// 옵션 불러오기 버튼 (2026-10-02) — [주문한 옵션 불러오기](이 고객이 이유씨에서 주문한 옵션만) · [1688 옵션 불러오기](목록에서 체크한 것만, 처음 체크 없음)
// 고르기 규칙은 순수 함수 src/lib/studioSourceOptions.js — 결과(source.skus 모양의 부분 목록)를 'pick'으로 내보내고, 옵션을 바꾸는 일은 부르는 쪽이 한다
//   (공통 정보·스마트스토어·11번가·지그재그 = StudioSendOptions가 optionEditorFromSource로 · 쿠팡 = fillFromSource)
import { ref, computed } from 'vue'
import { skuLabel, pickSkus, orderedSkus, orderedMissingNote } from '@/lib/studioSourceOptions'

const props = defineProps({
  skus: { type: Array, default: () => [] },      // send_prepare.source.skus
  skuTotal: { type: Number, default: 0 },        // send_prepare.source.skuTotal (1688 전체 옵션 수 — 200개까지만 읽는다)
  ordered: { type: Array, default: () => [] },   // send_prepare.ordered
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['pick']) // ({ skus, from: 'ordered'|'1688' })

const open = ref(false)
const checked = ref(new Set())
const msg = ref('')
const labels = computed(() => props.skus.map(skuLabel))

function toggle(i) {
  const next = new Set(checked.value)
  if (next.has(i)) next.delete(i); else next.add(i)
  checked.value = next
}
function checkAll(on) { checked.value = new Set(on ? props.skus.map((_, i) => i) : []) }
function onTake() {
  const list = pickSkus(props.skus, [...checked.value])
  if (!list.length) return
  emit('pick', { skus: list, from: '1688' })
  msg.value = `1688 옵션 ${list.length}개를 가져왔습니다.`
  open.value = false
  checked.value = new Set()
}
function onOrdered() {
  const r = orderedSkus(props.skus, props.ordered)
  if (!r.skus.length) {
    msg.value = orderedMissingNote(r.missing) || '주문한 옵션을 찾지 못했습니다.'
    return
  }
  emit('pick', { skus: r.skus, from: 'ordered' })
  msg.value = [`주문한 옵션 ${r.skus.length}개를 가져왔습니다.`, orderedMissingNote(r.missing)].filter(Boolean).join(' ')
}
</script>
