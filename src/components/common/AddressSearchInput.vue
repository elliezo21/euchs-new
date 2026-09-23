<template>
  <div class="relative w-full">
    <input
      ref="inputRef"
      v-bind="$attrs"
      type="text"
      autocomplete="off"
      role="combobox"
      :aria-expanded="isOpen"
      :value="modelValue"
      :placeholder="placeholder"
      :class="inputClass"
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
    />

    <!-- 결과 드롭다운: 입력칸 바로 아래, 입력칸 너비 안에서만 펼친다 (모바일에서 화면 밖으로 안 나감) -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 top-full mt-1 z-[200] bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto"
      style="max-height: min(60vh, 22rem)"
      role="listbox"
    >
      <div v-if="state === 'loading'" class="px-3.5 py-3 text-[13px] text-gray-500">검색 중…</div>
      <div v-else-if="state === 'empty'" class="px-3.5 py-3 text-[13px] text-gray-500">
        검색 결과가 없어요. 동 이름이나 도로명으로 검색해 보세요.
      </div>
      <div v-else-if="state === 'error'" class="px-3.5 py-3 text-[13px] text-gray-500">
        주소 검색이 잠시 안 돼요. 잠시 후 다시 시도해 주세요.
      </div>
      <template v-else>
        <button
          v-for="(item, idx) in items"
          :key="item.bdMgtSn || item.roadAddr + idx"
          type="button"
          role="option"
          :aria-selected="idx === activeIndex"
          class="w-full text-left px-3.5 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer"
          :class="idx === activeIndex ? 'bg-orange-50' : 'hover:bg-gray-50'"
          @mousedown.prevent="selectItem(item)"
          @mouseenter="activeIndex = idx"
        >
          <span class="block text-[13px] font-bold text-gray-900 leading-snug">{{ item.roadAddr }}</span>
          <span class="block text-[12px] text-gray-500 mt-0.5 leading-snug">{{ item.zipNo }} · {{ item.jibunAddr }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * 도로명주소 검색 입력칸 (자동완성 드롭다운)
 *
 * - 2자 이상 입력 시 300ms 디바운스로 /api/juso-search 호출 (서버가 행안부 API 호출 — 키는 서버에만 있음)
 * - 마우스 클릭 / ↑↓ 이동 / Enter 선택 / Esc 닫기
 * - 한글 IME 조합 중에도 검색되도록 v-model 대신 input 이벤트의 실제 값(e.target.value)을 쓴다
 *   (v-model은 compositionend 전까지 값을 갱신하지 않는다)
 * - 선택 시 emit('select', item) → detailInput(상세주소 칸)이 넘어오면 그 칸으로 포커스 이동
 *
 * item: { zipNo, roadAddr, roadAddrPart1, roadAddrPart2, jibunAddr, bdNm, bdMgtSn, engAddr, matchKey }
 *
 * emit('availability', boolean): 검색 서비스 자체가 안 될 때(키 오류·타임아웃·서버 오류) false,
 *   이후 검색이 정상 응답하면 true. "검색 결과 없음"(검색어 문제)은 서비스 문제가 아니므로 true.
 *   직접 입력 예외를 둘 화면(LoginModal)만 구독한다.
 */
import { ref, nextTick, onBeforeUnmount } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '도로명, 건물명 또는 지번으로 검색 (예: 서방로135번길 54)' },
  inputClass: {
    type: String,
    default: 'w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20',
  },
  /** 선택 후 포커스를 옮길 상세주소 input 요소 (template ref를 그대로 넘기면 된다) */
  detailInput: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'select', 'availability'])

const MIN_LENGTH = 2
const DEBOUNCE_MS = 300

const inputRef = ref(null)
const isOpen = ref(false)
const state = ref('idle') // idle | loading | results | empty | error
const items = ref([])
const activeIndex = ref(-1)

let debounceTimer = null
let requestSeq = 0 // 늦게 도착한 이전 검색 응답이 최신 결과를 덮지 않게

function onInput(e) {
  const value = e.target.value
  emit('update:modelValue', value)
  scheduleSearch(value)
}

function scheduleSearch(value) {
  clearTimeout(debounceTimer)
  const keyword = String(value || '').trim()
  if (keyword.length < MIN_LENGTH) {
    requestSeq++
    isOpen.value = false
    items.value = []
    state.value = 'idle'
    return
  }
  debounceTimer = setTimeout(() => search(keyword), DEBOUNCE_MS)
}

async function search(keyword) {
  const seq = ++requestSeq
  isOpen.value = true
  state.value = 'loading'
  activeIndex.value = -1
  try {
    const r = await fetch('/api/juso-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, page: 1 }),
    })
    const body = await r.json().catch(() => null)
    if (seq !== requestSeq) return
    if (body?.success === true) {
      items.value = Array.isArray(body.items) ? body.items : []
      state.value = items.value.length > 0 ? 'results' : 'empty'
      emit('availability', true)
    } else if (body?.reason === 'input') {
      // 검색어 문제(너무 짧음·숫자만 등) — 결과 없음과 같은 안내. 서비스는 정상.
      items.value = []
      state.value = 'empty'
      emit('availability', true)
    } else {
      console.error('[AddressSearchInput] 주소 검색 실패:', r.status, body)
      items.value = []
      state.value = 'error'
      emit('availability', false)
    }
  } catch (err) {
    if (seq !== requestSeq) return
    console.error('[AddressSearchInput] 주소 검색 요청 오류:', err)
    items.value = []
    state.value = 'error'
    emit('availability', false)
  }
}

function selectItem(item) {
  clearTimeout(debounceTimer)
  requestSeq++
  isOpen.value = false
  activeIndex.value = -1
  emit('update:modelValue', item.roadAddr)
  emit('select', item)
  nextTick(() => {
    if (props.detailInput && typeof props.detailInput.focus === 'function') props.detailInput.focus()
  })
}

function onKeydown(e) {
  if (!isOpen.value) return
  const hasItems = state.value === 'results' && items.value.length > 0
  if (e.key === 'ArrowDown' && hasItems) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % items.value.length
  } else if (e.key === 'ArrowUp' && hasItems) {
    e.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? items.value.length - 1 : activeIndex.value - 1
  } else if (e.key === 'Enter') {
    // 드롭다운이 열려 있을 때 Enter는 폼 제출이 아니라 주소 선택이다
    if (e.isComposing) return
    e.preventDefault()
    if (hasItems) selectItem(items.value[activeIndex.value >= 0 ? activeIndex.value : 0])
  } else if (e.key === 'Escape') {
    // 모달 안에서도 Esc가 모달이 아니라 드롭다운만 닫게
    e.preventDefault()
    e.stopPropagation()
    isOpen.value = false
  }
}

function onFocus() {
  if (state.value === 'results' && items.value.length > 0) isOpen.value = true
}

function onBlur() {
  // 항목 클릭은 mousedown.prevent로 처리하므로 blur 시 바로 닫아도 선택이 먹힌다
  isOpen.value = false
}

onBeforeUnmount(() => clearTimeout(debounceTimer))

defineExpose({ focus: () => inputRef.value?.focus() })
</script>
