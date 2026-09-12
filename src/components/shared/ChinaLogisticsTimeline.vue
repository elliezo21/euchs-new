<template>
  <div class="china-logistics-timeline">
    <!-- 헤더: 운송장번호 + 현재 상태 + 새로고침 버튼 -->
    <div class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-sm">🚚</span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-mono text-xs font-bold text-slate-700 truncate">{{ trackingNo }}</span>
            <span
              v-if="statusText"
              class="px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              :class="statusBadgeClass"
            >{{ statusText }}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition border"
        :class="isLoading
          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
          : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 cursor-pointer'"
      >
        <svg class="w-3 h-3" :class="isLoading ? 'animate-spin' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <span>{{ isLoading ? '조회중...' : '새로고침' }}</span>
      </button>
    </div>

    <!-- 오류 표시 및 快递100 직접 확인 링크 -->
    <div
      v-if="error && !isLoading"
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 mb-2"
    >
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="shrink-0">⚠️</span>
        <span class="break-all">배송상태 조회 실패 — {{ error }}</span>
      </div>
      <a
        v-if="trackingNo"
        :href="`https://www.kuaidi100.com/chaxun?nu=${encodeURIComponent(trackingNo)}`"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-red-100/60 text-red-700 border border-red-300 hover:border-red-400 rounded-lg font-medium text-[11px] transition shadow-xs self-start sm:self-auto"
      >
        <span>快递100에서 직접 확인하기</span>
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>

    <!-- 로딩 스켈레톤 (가로형) -->
    <div v-if="isLoading && (!traces || traces.length === 0)"
      class="flex items-start overflow-x-auto pb-1 animate-pulse">
      <div v-for="i in 4" :key="i" class="flex items-start shrink-0">
        <div class="flex flex-col items-center" style="min-width:72px">
          <div class="w-6 h-6 rounded-full bg-slate-200"></div>
          <div class="h-2.5 bg-slate-200 rounded w-12 mt-1.5"></div>
          <div class="h-2 bg-slate-100 rounded w-8 mt-1"></div>
        </div>
        <div v-if="i < 4" class="h-0.5 bg-slate-200 shrink-0" style="width:28px; margin-top:11px"></div>
      </div>
    </div>

    <!-- 가로 스텝 타임라인 -->
    <div v-if="!isLoading || (traces && traces.length > 0)" class="overflow-x-auto pb-1">
      <div class="flex items-start" style="min-width: max-content">
        <template v-for="(entry, idx) in allItems" :key="idx">
          <!-- 스텝 노드 -->
          <div class="flex flex-col items-center" style="min-width:76px; max-width:96px">
            <!-- Dot -->
            <div class="relative z-10">
              <!-- 현재 위치: 파란 원 + 트럭(오른쪽 향함) + box-shadow 아웃라인 강조 -->
              <span v-if="entry._role === 'current'"
                class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
                style="display:inline-flex">
                <span style="display:inline-block; transform:scaleX(-1)">🚚</span>
              </span>
              <!-- 완료 이력: 초록 원 + 체크 -->
              <span v-else-if="entry._role === 'done'"
                class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px]">
                ✓
              </span>
              <!-- 도착 예정: 회색 빈 원 (테두리만) -->
              <span v-else
                class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-300 bg-white">
              </span>
            </div>

            <!-- 텍스트: 상태/이벤트명 -->
            <div class="mt-1.5 text-center px-1 w-full">
              <!-- 도착 예정 -->
              <template v-if="entry._role === 'pending'">
                <p class="text-[10px] font-bold text-slate-400 leading-tight">이우 창고</p>
                <p class="text-[9px] text-slate-300 leading-tight mt-0.5">도착 예정</p>
              </template>
              <!-- 현재 위치 -->
              <template v-else-if="entry._role === 'current'">
                <p class="text-[10px] font-bold text-blue-600 leading-tight line-clamp-2">{{ shortContext(entry.context) }}</p>
                <p v-if="entry.time" class="text-[9px] text-blue-400 leading-tight mt-0.5 font-mono">{{ formatTime(entry.time) }}</p>
              </template>
              <!-- 완료 이력 -->
              <template v-else>
                <p class="text-[10px] text-slate-500 leading-tight line-clamp-2">{{ shortContext(entry.context) }}</p>
                <p v-if="entry.time" class="text-[9px] text-slate-400 leading-tight mt-0.5 font-mono">{{ formatTime(entry.time) }}</p>
              </template>
            </div>
          </div>

          <!-- 연결선 (마지막 노드 뒤 없음) -->
          <div
            v-if="idx < allItems.length - 1"
            class="h-0.5 shrink-0 self-start"
            style="width:28px; margin-top:11px"
            :class="entry._role === 'done' ? 'bg-emerald-300' : 'bg-slate-200'"
          ></div>
        </template>
      </div>

      <!-- 이력 없음 안내 (traces 비어있고 error도 없는 정상 상태) -->
      <p
        v-if="!traces || traces.length === 0"
        class="mt-2 text-[10px] text-slate-400 text-center"
      >
        아직 배송 이력이 없습니다 — 새로고침으로 다시 확인할 수 있습니다.
      </p>
    </div>

    <!-- 마지막 조회 시각 -->
    <p v-if="updatedAt && !isLoading" class="mt-1.5 text-[9px] text-slate-400 text-right font-mono">
      마지막 조회: {{ formatTime(updatedAt) }}
    </p>
  </div>
</template>

<script setup>
/**
 * ChinaLogisticsTimeline — 가로 스텝형 배송 현황 컴포넌트
 *
 * 표시 전용: orders.status / item.subStatus 절대 변경 금지
 * - isAdmin=false(바이어): 내부 운영 문구 미노출
 * - isAdmin=true(관리자): 보조 문구 표시 가능
 */
import { computed } from 'vue'

const props = defineProps({
  trackingNo:    { type: String,         default: '' },
  traces:        { type: Array,          default: () => [] },
  currentStatus: { type: String,         default: '' },
  updatedAt:     { type: String,         default: '' },
  isLoading:     { type: Boolean,        default: false },
  error:         { type: [String, null], default: null },
  isAdmin:       { type: Boolean,        default: false },
})

defineEmits(['refresh'])

const statusText = computed(() => props.currentStatus || (props.traces?.length ? '배송중' : ''))

const statusBadgeClass = computed(() => {
  const s = props.currentStatus || ''
  if (s === '배달완료') return 'bg-emerald-100 text-emerald-700'
  if (['배송이상','통관이상','수령이상'].includes(s)) return 'bg-red-100 text-red-700'
  if (['배송중','픽업완료','배달중'].includes(s)) return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-600'
})

/**
 * 가로 스텝 순서:
 * [오래된 이력(done)] → ... → [가장 최신(current)] → [도착예정(pending)]
 * 왼쪽=과거, 오른쪽=미래
 */
const allItems = computed(() => {
  const t = props.traces || []
  if (t.length === 0) return [{ _role: 'pending' }]

  const items = []
  // 과거 이력 (오래된 것부터, traces 역순)
  for (let i = t.length - 1; i >= 1; i--) {
    items.push({ ...t[i], _role: 'done' })
  }
  // 현재 (가장 최신)
  items.push({ ...t[0], _role: 'current' })
  // 도착 예정 (맨 오른쪽)
  items.push({ _role: 'pending' })
  return items
})

// 이벤트 텍스트 표시용 축약
// translateTraceContext(서버) 번역 결과를 타임라인 노드에 맞게 정돈
function shortContext(ctx) {
  if (!ctx) return ''
  let s = String(ctx).trim()

  // "→ 한자지명 발송" 패턴: 목적지 한자 제거하고 "발송"만 표시
  // 예: "[金华市] → 浙江义乌市江 발송" → "[金华市] 발송"
  //     "→ 浙江杭州临平 발송" → "발송"
  if (s.includes('→') && s.includes('발송')) {
    const mFrom = s.match(/^\[([^\]]+)\]/)
    return mFrom ? `[${mFrom[1]}] 발송` : '발송'
  }
  if (s.includes('→') && s.includes('이동')) {
    const mFrom = s.match(/^\[([^\]]+)\]/)
    return mFrom ? `[${mFrom[1]}] 이동 중` : '이동 중'
  }

  // 최종 안전장치: 중국어가 포함된 경우 원문 미노출
  // 단, 우리 코드에서 만든 "[지명] 도착/발송" 형태는 한자이지만 허용
  const hasKoreanKeyword = /도착|발송|이동|경유|수령|배달|픽업|출고|상차|통관|반송|이상|입고|분류|출발/.test(s)
  if (/[\u4e00-\u9fff]/.test(s) && !hasKoreanKeyword) return '배송 진행 중'

  // 타임라인 노드에 맞게 최대 20자로 제한
  return s.length > 20 ? s.slice(0, 19) + '…' : s
}

// "2026-09-10 14:30:00" → "09.10 14:30"
function formatTime(timeStr) {
  if (!timeStr) return ''
  try {
    const d = new Date(timeStr.replace(' ', 'T'))
    if (isNaN(d.getTime())) return timeStr.slice(5, 16)
    return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch {
    return timeStr.slice(0, 16)
  }
}
</script>
