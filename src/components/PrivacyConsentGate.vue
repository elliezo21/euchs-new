<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      data-privacy-consent-gate
    >
      <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-xs" />

      <div
        class="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-[480px] w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title"
      >
        <div class="px-6 pt-6 pb-3 space-y-1.5">
          <h3 id="privacy-consent-title" class="text-base font-black text-slate-900">개인정보 수집·이용 동의</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            서비스를 계속 이용하려면 한 번만 동의해 주세요. 동의한 시각이 회원 정보에 기록돼요.
          </p>
        </div>

        <div class="px-6 pb-6 space-y-3">
          <div class="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                v-model="agreed"
                type="checkbox"
                class="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
                :disabled="busy"
                data-privacy-consent-check
              />
              <span class="text-xs font-black text-slate-900">[필수] 개인정보 수집·이용에 동의합니다</span>
            </label>
            <div class="overflow-x-auto rounded-lg border border-slate-200">
              <table class="w-full text-[11px] text-slate-700 leading-snug">
                <thead class="bg-slate-50 text-slate-900">
                  <tr><th class="px-2 py-1.5 text-left font-bold">수집 항목</th><th class="px-2 py-1.5 text-left font-bold">목적</th><th class="px-2 py-1.5 text-left font-bold whitespace-nowrap">보유 기간</th></tr>
                </thead>
                <tbody>
                  <tr class="border-t border-slate-200">
                    <td class="px-2 py-1.5 align-top">
                      이메일, 상호, 대표자·담당자 이름, 사업자등록번호, 사업장 주소, 휴대전화번호, (선택) 개인통관고유부호<br />
                      간편 로그인(구글·카카오·네이버)은 각 서비스가 넘겨주는 이메일, 이름(또는 별명), 프로필 사진 (네이버는 휴대전화번호 포함)
                    </td>
                    <td class="px-2 py-1.5 align-top">회원 관리, 사업자 확인, 구매대행·수입통관·배송, 상담·진행 알림</td>
                    <td class="px-2 py-1.5 align-top">회원 탈퇴 시까지 (법령에 따라 보관할 기록은 그 기간까지)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-[11px] text-slate-500 leading-snug">
              동의하지 않을 수 있지만, 동의하지 않으면 서비스를 이용할 수 없어 로그아웃돼요. 자세한 내용은
              <a href="/privacy" target="_blank" rel="noopener" class="text-blue-600 font-bold underline" data-privacy-consent-link>개인정보처리방침</a>에서 볼 수 있어요.
            </p>
          </div>

          <p v-if="error" class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed" data-privacy-consent-error>{{ error }}</p>

          <div class="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              class="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              :disabled="busy"
              data-privacy-consent-decline
              @click="decline"
            >
              동의하지 않음
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="!agreed || busy"
              data-privacy-consent-agree
              @click="agree"
            >
              <i v-if="busy" class="fas fa-spinner animate-spin"></i>
              <span>동의하고 계속하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * 동의 기록(profiles.privacy_agreed_at)이 없는 회원에게 로그인 뒤 한 번 띄우는 [필수] 개인정보 동의 창.
 * 판정은 src/lib/privacyConsent.js needsPrivacyConsent (관리자·스태프 제외, /privacy 화면 제외).
 * 동의 → /api/privacy-consent(서버 시각) → currentUserProfile에 반영되면 창이 닫힌다. 동의 안 함 → 로그아웃.
 * App.vue에 한 번만 둔다.
 */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { currentUser, currentUserProfile, isAdminOrStaff, isAuthLoading, signOut } from '@/lib/auth'
import { needsPrivacyConsent } from '@/lib/privacyConsent'

const route = useRoute()
const agreed = ref(false)
const busy = ref(false)
const error = ref('')

const show = computed(() => needsPrivacyConsent({
  user: currentUser.value,
  profile: currentUserProfile.value,
  isStaff: isAdminOrStaff.value,
  authLoading: isAuthLoading.value,
  path: route.path,
}))

// 다른 계정으로 바뀌면 체크·오류를 비운다
watch(() => currentUser.value?.id, () => {
  agreed.value = false
  error.value = ''
})

async function agree() {
  if (!agreed.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      console.error('[PrivacyConsentGate] 세션 토큰 없음 — 동의를 기록할 수 없음')
      error.value = '로그인이 끝났어요. 다시 로그인해 주세요.'
      return
    }
    const r = await fetch('/api/privacy-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
    })
    const body = await r.json().catch((e) => {
      console.error('[PrivacyConsentGate] 응답을 읽지 못함:', r.status, e?.message || e)
      return null
    })
    if (!r.ok || body?.ok !== true || !body.privacy_agreed_at) {
      console.error('[PrivacyConsentGate] 동의 기록 실패:', r.status, body)
      error.value = body?.message || '동의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
      return
    }
    // 서버에 기록된 값을 그대로 반영 → show가 false가 되어 창이 닫힌다
    currentUserProfile.value = {
      ...(currentUserProfile.value || {}),
      privacy_agreed_at: body.privacy_agreed_at,
      privacy_version: body.privacy_version,
    }
    agreed.value = false
  } catch (e) {
    console.error('[PrivacyConsentGate] 동의 요청 실패:', e?.message || e)
    error.value = '동의를 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'
  } finally {
    busy.value = false
  }
}

async function decline() {
  if (busy.value) return
  busy.value = true
  try {
    await signOut()
  } finally {
    busy.value = false
    agreed.value = false
  }
}
</script>
