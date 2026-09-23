<template>
  <div class="w-full">
    <input
      v-bind="$attrs"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      maxlength="10"
      :value="display"
      :placeholder="placeholder"
      :class="inputClass"
      @input="onInput"
      @blur="onBlur"
    />
    <p v-if="message" class="mt-1 leading-snug" style="font-size: 13px" :class="messageIsError ? 'text-red-600' : 'text-emerald-700'">
      {{ message }}
    </p>
  </div>
</template>

<script setup>
/**
 * 숫자만 치면 되는 날짜 입력칸 (달력 클릭 불필요)
 *
 * - "20190315" 8자리 → "2019-03-15" 로 자동 표시
 * - "2019.3.15", "2019/03/15", "2019-3-15", "2019 3 15" 붙여넣기도 정규화
 * - 없는 날짜·미래 날짜는 아래에 빨간 안내, 정상이면 "2019년 3월 15일로 입력됐어요."
 * - v-model 값은 항상 "YYYY-MM-DD"(정상 날짜) 또는 ""(미완성·없는 날짜·미래 날짜)
 */
import { ref, computed, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '20190315' },
  inputClass: {
    type: String,
    default: 'w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono',
  },
  /** 미래 날짜 허용 여부 (개업일자는 불가) */
  allowFuture: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const display = ref(props.modelValue || '')
const status = ref(props.modelValue ? 'ok' : 'idle') // idle | typing | ok | invalid | future
let lastEmitted = props.modelValue || ''

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * 입력 문자열 → { y, m, d } 또는 null(아직 미완성)
 * @param {boolean} final - 붙여넣기·칸 떠남. false(타이핑 중)이면 구분자 형식은 일(日)이 두 자리일 때만 확정한다
 *   (지우는 중인 "2019-03-1"이 "2019-03-01"로 바뀌어 버리지 않게)
 */
function parseParts(raw, final) {
  const text = String(raw || '').trim()
  if (!text) return null
  // 구분자가 있는 형식: 2019.3.15 / 2019/03/15 / 2019-3-15 / 2019 3 15
  const sep = text.match(/^(\d{4})\s*[.\-/\s]\s*(\d{1,2})\s*[.\-/\s]\s*(\d{1,2})\s*\.?$/)
  if (sep) {
    if (!final && sep[3].length < 2) return null
    return { y: Number(sep[1]), m: Number(sep[2]), d: Number(sep[3]) }
  }
  // 숫자만: 8자리가 되면 완성
  const digits = text.replace(/\D/g, '')
  if (digits.length === 8 && /^\d+$/.test(text.replace(/[.\-/\s]/g, ''))) {
    return { y: Number(digits.slice(0, 4)), m: Number(digits.slice(4, 6)), d: Number(digits.slice(6, 8)) }
  }
  return null
}

function isRealDate({ y, m, d }) {
  if (y < 1900 || m < 1 || m > 12 || d < 1) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function isFuture({ y, m, d }) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return new Date(y, m - 1, d) > today
}

function emitValue(v) {
  lastEmitted = v
  if (v !== props.modelValue) emit('update:modelValue', v)
}

function evaluate(raw, final) {
  const parts = parseParts(raw, final)
  if (!parts) {
    status.value = String(raw || '').trim() ? 'typing' : 'idle'
    emitValue('')
    return
  }
  const formatted = `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`
  display.value = formatted
  if (!isRealDate(parts)) {
    status.value = 'invalid'
    emitValue('')
  } else if (!props.allowFuture && isFuture(parts)) {
    status.value = 'future'
    emitValue('')
  } else {
    status.value = 'ok'
    emitValue(formatted)
  }
}

function onInput(e) {
  // 허용 문자(숫자·구분자)만 남긴다
  const cleaned = String(e.target.value || '').replace(/[^\d.\-/\s]/g, '')
  display.value = cleaned
  if (cleaned !== e.target.value) e.target.value = cleaned
  evaluate(cleaned, e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop')
}

function onBlur() {
  // 구분자 형식을 쓰다 만 경우("2019.3.1")도 칸을 떠날 때 한 번 더 판정
  evaluate(display.value, true)
}

// 부모가 값을 바꾼 경우(프로필 로딩·로그아웃 초기화)만 표시값을 따라간다
watch(() => props.modelValue, (v) => {
  if ((v || '') === lastEmitted) return
  lastEmitted = v || ''
  display.value = v || ''
  status.value = v ? 'ok' : 'idle'
})

const message = computed(() => {
  if (status.value === 'invalid') return '없는 날짜예요. 날짜를 다시 확인해 주세요.'
  if (status.value === 'future') return '오늘 이후 날짜는 입력할 수 없어요.'
  if (status.value === 'ok' && props.modelValue) {
    const [y, m, d] = props.modelValue.split('-').map(Number)
    return `${y}년 ${m}월 ${d}일로 입력됐어요.`
  }
  return ''
})
const messageIsError = computed(() => status.value === 'invalid' || status.value === 'future')
</script>
