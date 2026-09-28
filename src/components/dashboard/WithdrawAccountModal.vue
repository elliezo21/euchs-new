<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      data-withdraw-modal
    >
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" @click="close" />

      <div
        class="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-modal-title"
        @click.stop
      >
        <div class="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-5 h-5 text-red-600 shrink-0" />
            <h3 id="withdraw-modal-title" class="text-base font-black text-slate-900">회원 탈퇴</h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
            :disabled="state === 'submitting'"
            aria-label="닫기"
            @click="close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-4 text-sm text-slate-700">
          <!-- 판정 중 -->
          <div v-if="state === 'loading'" class="py-8 flex flex-col items-center gap-2 text-slate-500" data-withdraw-state="loading">
            <i class="fas fa-spinner animate-spin text-lg"></i>
            <p class="text-xs">탈퇴할 수 있는지 확인하고 있어요…</p>
          </div>

          <!-- 판정 오류 -->
          <div v-else-if="state === 'error'" class="space-y-3" data-withdraw-state="error">
            <p class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">{{ message }}</p>
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              @click="runCheck"
            >
              다시 확인하기
            </button>
          </div>

          <!-- 막힘: 이유 + 해결 방법 -->
          <div v-else-if="state === 'blocked'" class="space-y-3" data-withdraw-state="blocked">
            <p class="text-sm font-bold text-slate-900">지금은 탈퇴할 수 없어요. 아래 내용을 먼저 정리해 주세요.</p>
            <ul class="space-y-2.5">
              <li
                v-for="b in blockers"
                :key="b.code"
                class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5"
                :data-withdraw-blocker="b.code"
              >
                <p class="text-xs font-black text-amber-950">{{ b.message }}</p>
                <p v-if="b.orders && b.orders.length" class="text-[11px] text-amber-900 font-mono break-all">
                  주문번호: {{ b.orders.join(', ') }}<span v-if="b.count > b.orders.length"> 외 {{ b.count - b.orders.length }}건</span>
                </p>
                <p v-if="blockerHelp(b.code)" class="text-[11px] text-amber-900 leading-relaxed">{{ blockerHelp(b.code).help }}</p>
                <button
                  v-if="blockerHelp(b.code)?.action"
                  type="button"
                  class="mt-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-[11px] hover:bg-amber-100 cursor-pointer"
                  @click="goAction(blockerHelp(b.code).action)"
                >
                  {{ blockerHelp(b.code).action.label }} →
                </button>
              </li>
            </ul>
          </div>

          <!-- 탈퇴 가능: 안내 + 확인 문구 -->
          <div v-else-if="state === 'ok' || state === 'submitting' || state === 'failed'" class="space-y-4" data-withdraw-state="ok">
            <p class="text-sm font-black text-slate-900">회원 탈퇴 전에 확인해 주세요</p>
            <ul class="space-y-2.5 text-xs leading-relaxed">
              <li class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <b class="text-slate-900">바로 지워지는 정보</b><br />
                이름, 휴대전화번호, 이메일 계정, 사업장 주소, 사업자등록번호, 개인통관고유부호, 찜한 상품, 최근 본 상품, AI 스튜디오 작업·사진·완성 이미지
              </li>
              <li class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <b class="text-slate-900">법에 따라 보관하는 정보</b><br />
                주문·결제·환불 기록은 전자상거래법에 따라 5년 동안 따로 보관한 뒤 파기해요. 이 기록은 분쟁 처리와 세무 신고에만 쓰여요.
              </li>
              <li class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold">
                탈퇴하면 같은 계정으로 다시 로그인할 수 없고, 지운 정보는 되살릴 수 없어요.
              </li>
            </ul>

            <div class="space-y-1.5">
              <label for="withdraw-confirm-input" class="block text-xs font-bold text-slate-700">
                계속하려면 아래 칸에 <b class="text-red-600">{{ CONFIRM_WORD }}</b>를 입력해 주세요.
              </label>
              <input
                id="withdraw-confirm-input"
                v-model="confirmText"
                type="text"
                autocomplete="off"
                :placeholder="CONFIRM_WORD"
                :disabled="state === 'submitting'"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                data-withdraw-confirm-input
              />
            </div>

            <p v-if="state === 'failed'" class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed" data-withdraw-error>
              {{ message }}
            </p>

            <div class="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                :disabled="state === 'submitting'"
                @click="close"
              >
                취소
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                :disabled="!canSubmit"
                data-withdraw-submit
                @click="submit"
              >
                <i v-if="state === 'submitting'" class="fas fa-spinner animate-spin"></i>
                <span>{{ state === 'submitting' ? '탈퇴 처리 중…' : '탈퇴하기' }}</span>
              </button>
            </div>
          </div>

          <!-- 고객센터 (모든 상태) -->
          <div v-if="state !== 'loading'" class="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed" data-withdraw-support>
            도움이 필요하면 고객센터
            <a :href="`tel:${SUPPORT_PHONE}`" class="font-bold text-slate-700 hover:underline">{{ SUPPORT_PHONE }}</a>
            또는
            <a :href="SUPPORT_KAKAO" target="_blank" rel="noopener noreferrer" class="font-bold text-amber-700 hover:underline">카카오톡 상담</a>으로 알려 주세요.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * 회원 탈퇴 창 — 열리면 서버에 판정(check)만 먼저 묻는다(아무것도 지우지 않음).
 * 막히면 이유·해결 방법, 가능하면 안내 + "탈퇴합니다" 입력 → 실행(withdraw).
 * 성공하면 auth.withdrawAccount가 로그아웃까지 하고 'done'을 보낸다 → 부모가 메인으로 보내고 완료 안내.
 */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, X } from 'lucide-vue-next'
import { checkWithdrawal, withdrawAccount } from '@/lib/auth'
import { CONFIRM_WORD, SUPPORT_PHONE, SUPPORT_KAKAO, blockerHelp, checkState, withdrawState } from '@/lib/accountWithdrawUi'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'go-tab', 'done'])
const router = useRouter()

// 'loading' | 'ok' | 'blocked' | 'error' | 'submitting' | 'failed'(실행 실패 — 입력 칸 그대로)
const state = ref('loading')
const blockers = ref([])
const message = ref('')
const confirmText = ref('')

const canSubmit = computed(() =>
  (state.value === 'ok' || state.value === 'failed') && confirmText.value.trim() === CONFIRM_WORD
)

async function runCheck() {
  state.value = 'loading'
  blockers.value = []
  message.value = ''
  try {
    const res = await checkWithdrawal()
    const s = checkState(res)
    if (s.state === 'error') console.error('[WithdrawAccountModal] 탈퇴 판정 실패:', res.status, res.body)
    state.value = s.state
    blockers.value = s.blockers
    message.value = s.message
  } catch (e) {
    console.error('[WithdrawAccountModal] 탈퇴 판정 요청 실패:', e?.message || e)
    state.value = 'error'
    message.value = checkState(null).message
  }
}

async function submit() {
  if (!canSubmit.value) return
  state.value = 'submitting'
  message.value = ''
  try {
    const res = await withdrawAccount(confirmText.value.trim())
    const s = withdrawState(res)
    if (s.state === 'done') {
      emit('update:modelValue', false)
      emit('done')
      return
    }
    console.error('[WithdrawAccountModal] 탈퇴 실행 실패:', res.status, res.body)
    if (s.state === 'blocked') {
      state.value = 'blocked'
      blockers.value = s.blockers
      return
    }
    state.value = 'failed'
    message.value = s.message
  } catch (e) {
    console.error('[WithdrawAccountModal] 탈퇴 요청 실패:', e?.message || e)
    state.value = 'failed'
    message.value = withdrawState(null).message
  }
}

function close() {
  if (state.value === 'submitting') return
  emit('update:modelValue', false)
}

function goAction(action) {
  emit('update:modelValue', false)
  if (action.type === 'tab') emit('go-tab', action.tab)
  else if (action.type === 'route') router.push(action.to)
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  confirmText.value = ''
  runCheck()
}, { immediate: true })
</script>
