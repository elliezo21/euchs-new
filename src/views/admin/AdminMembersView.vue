<template>
  <div class="max-w-6xl mx-auto space-y-6 select-none pb-20">

    <!-- 1. 상단 헤더 배너 -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base">
            👥
          </div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">회원 / 바이어 관리</h2>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          가입된 B2B 바이어 회원의 사업자 인증 심사, 통관부호(PCCC), 등급 및 예치금 현황을 관리합니다.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-center">
        <span class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
          총 {{ membersList.length }}개 회원사
        </span>
      </div>
    </div>

    <!-- 2. 상단 4대 회원 KPI 통계 카드 (원클릭 퀵 필터) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1) 전체 회원 -->
      <div
        @click="statusFilter = 'all'"
        class="rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 cursor-pointer transition hover:shadow-md active:scale-98 select-none border"
        :class="statusFilter === 'all'
          ? 'bg-blue-50/30 border-blue-500 ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">전체 회원</span>
          <span class="p-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs">👥</span>
        </div>
        <div class="text-2xl font-black font-mono text-slate-900">
          {{ membersList.length }}<span class="text-sm font-normal text-slate-500">명</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium">클릭 시 전체 목록 보기</p>
      </div>

      <!-- 2) 사업자 인증 완료 -->
      <div
        @click="statusFilter = 'verified'"
        class="rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 cursor-pointer transition hover:shadow-md active:scale-98 select-none border"
        :class="statusFilter === 'verified'
          ? 'bg-emerald-50/30 border-emerald-500 ring-2 ring-emerald-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">사업자 인증 완료</span>
          <span class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs">🟢</span>
        </div>
        <div class="text-2xl font-black font-mono text-emerald-600">
          {{ verifiedCount }}<span class="text-sm font-normal text-slate-500">개사</span>
        </div>
        <p class="text-[11px] text-emerald-600/80 font-medium">클릭 시 인증완료 바이어 필터</p>
      </div>

      <!-- 3) 사업자 승인 대기 -->
      <div
        @click="statusFilter = 'pending'"
        class="rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 cursor-pointer transition hover:shadow-md active:scale-98 select-none border"
        :class="statusFilter === 'pending'
          ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">사업자 승인 대기</span>
          <span class="p-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs">⏳</span>
        </div>
        <div class="text-2xl font-black font-mono text-amber-600">
          {{ pendingCount }}<span class="text-sm font-normal text-slate-500">건</span>
        </div>
        <p class="text-[11px] text-amber-600/80 font-medium">클릭 시 심사대기 목록 필터</p>
      </div>

      <!-- 4) 신규 가입 바이어 (최근 7일) -->
      <div
        @click="statusFilter = 'new'"
        class="rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 cursor-pointer transition hover:shadow-md active:scale-98 select-none border"
        :class="statusFilter === 'new'
          ? 'bg-purple-50/30 border-purple-500 ring-2 ring-purple-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">신규 가입 바이어</span>
          <span class="p-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs">✨</span>
        </div>
        <div class="text-2xl font-black font-mono text-slate-900">
          {{ newMemberCount }}<span class="text-sm font-normal text-slate-500">명</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium">클릭 시 최근 7일 가입자 필터</p>
      </div>
    </div>

    <!-- 3. 회원 목록 테이블 (스마트스토어 센터 화이트 테마) -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <!-- 테이블 헤더 및 필터/검색 -->
      <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
          <h3 class="font-black text-slate-900 text-sm">바이어 회원 목록</h3>
          <span class="text-xs font-mono text-slate-400">({{ filteredMembers.length }}명)</span>
        </div>

        <!-- 필터 & 검색 인풋 -->
        <div class="flex items-center gap-2 flex-wrap">
          <select
            v-model="statusFilter"
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">전체 회원 구분 ({{ membersList.length }})</option>
            <option value="verified">사업자 인증 완료 ({{ verifiedCount }})</option>
            <option value="pending">사업자 승인 대기 ({{ pendingCount }})</option>
            <option value="new">신규 가입 바이어 ({{ newMemberCount }})</option>
            <option value="unverified">미인증 / 일반</option>
          </select>

          <input
            type="text"
            v-model="searchQuery"
            placeholder="회사명, 바이어명, 이메일, 전화번호 검색..."
            class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 outline-none w-56 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <!-- 테이블 목록 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700">
          <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
            <tr>
              <th class="py-3 px-4 w-12 text-center">No</th>
              <th class="py-3 px-4 min-w-[160px]">사업자 / 회사명</th>
              <th class="py-3 px-4">대표자 (바이어명)</th>
              <th class="py-3 px-4">이메일 (아이디)</th>
              <th class="py-3 px-4">연락처</th>
              <th class="py-3 px-4">사업자번호 / 통관부호</th>
              <th class="py-3 px-4 text-right">보유 예치금</th>
              <th class="py-3 px-4 text-center">인증 상태</th>
              <th class="py-3 px-4 text-center w-36">관리 액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(m, idx) in filteredMembers"
              :key="m.id || idx"
              class="hover:bg-slate-50/80 transition"
              :class="m.verificationStatus === 'pending' ? 'bg-amber-50/30' : ''"
            >
              <!-- No -->
              <td class="py-3.5 px-4 text-center font-mono text-slate-400">
                {{ idx + 1 }}
              </td>

              <!-- 회사명 & 등급 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-900 text-xs">{{ m.companyName || '개인 바이어' }}</span>
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold"
                    :class="getTierBadgeClass(m.tier)"
                  >
                    {{ getTierLabel(m.tier) }}
                  </span>
                </div>
                <div class="text-[10px] text-slate-400 font-mono mt-0.5">가입: {{ formatDate(m.createdAt) }}</div>
              </td>

              <!-- 대표자 / 성명 -->
              <td class="py-3.5 px-4 font-bold text-slate-800">
                {{ m.representativeName || m.name }}
              </td>

              <!-- 이메일 -->
              <td class="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                {{ m.email }}
              </td>

              <!-- 연락처 -->
              <td class="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                {{ m.phone || '-' }}
              </td>

              <!-- 사업자번호 / 통관부호 -->
              <td class="py-3.5 px-4 font-mono text-[11px]">
                <div class="text-slate-800 font-bold">{{ m.bizNumber || '-' }}</div>
                <div class="text-[10px] text-slate-400">{{ m.pccc || '-' }}</div>
              </td>

              <!-- 보유 예치금 -->
              <td class="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                ₩{{ fmtN(m.balance || 0) }}
              </td>

              <!-- 사업자 인증 상태 -->
              <td class="py-3.5 px-4 text-center">
                <span
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold inline-block"
                  :class="getStatusBadgeClass(m.verificationStatus)"
                >
                  {{ getStatusLabel(m.verificationStatus) }}
                </span>
              </td>

              <!-- 관리 액션 -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    @click="openDetailModal(m)"
                    class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    상세 & 심사
                  </button>

                  <button
                    v-if="m.verificationStatus === 'pending'"
                    type="button"
                    @click="quickApprove(m)"
                    class="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                    title="즉시 사업자 승인"
                  >
                    ✓ 승인
                  </button>
                </div>
              </td>
            </tr>

            <!-- 빈 목록일 때 -->
            <tr v-if="filteredMembers.length === 0">
              <td colspan="9" class="py-12 text-center text-slate-400 space-y-2">
                <div class="text-3xl">👥</div>
                <p class="font-bold text-xs text-slate-600">조건에 일치하는 바이어 회원이 없습니다.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 바이어 상세 정보 및 사업자 인증 심사 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="selectedMember"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              🏢
            </span>
            <div>
              <h3 class="text-base font-black text-slate-900">
                {{ selectedMember.companyName || selectedMember.name }} 바이어 상세 정보
              </h3>
              <p class="text-[11px] text-slate-400 font-mono">{{ selectedMember.email }}</p>
            </div>
          </div>
          <button @click="selectedMember = null" class="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            ✕
          </button>
        </div>

        <div class="space-y-5 text-xs">
          <!-- 1) 기본 인적 & 등급 정보 -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-black text-slate-800 text-xs mb-2">👤 기본 회원 정보</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span class="text-slate-400 block text-[11px]">담당자/대표자</span>
                <b class="text-slate-900">{{ selectedMember.name || selectedMember.representativeName }}</b>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">연락처</span>
                <b class="text-slate-900 font-mono">{{ selectedMember.phone || '-' }}</b>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">회원 등급</span>
                <select
                  v-model="selectedMember.tier"
                  class="mt-0.5 px-2.5 py-1 rounded border border-slate-300 font-bold bg-white text-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="general">일반회원</option>
                  <option value="business">사업자회원</option>
                </select>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">가입일시</span>
                <b class="text-slate-700 font-mono">{{ formatDate(selectedMember.createdAt) }}</b>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">보유 예치금</span>
                <b class="text-blue-600 font-mono font-bold">₩{{ fmtN(selectedMember.balance || 0) }}</b>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">심사 상태</span>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="getStatusBadgeClass(selectedMember.verificationStatus)"
                >
                  {{ getStatusLabel(selectedMember.verificationStatus) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 2) 사업자 등록 & 통관부호 정보 -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 class="font-black text-slate-800 text-xs">📑 사업자 및 통관 정보</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span class="text-slate-400 block text-[11px]">사업자등록번호</span>
                <b class="text-slate-900 font-mono text-sm">{{ selectedMember.bizNumber || '미등록' }}</b>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">개인/사업자 통관고유부호 (PCCC)</span>
                <div class="flex items-center gap-2 mt-0.5">
                  <b class="text-slate-900 font-mono">{{ selectedMember.pccc || '미등록' }}</b>
                  <button
                    v-if="selectedMember.pccc"
                    type="button"
                    @click="copyPccc(selectedMember.pccc)"
                    class="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    📋 복사
                  </button>
                </div>
              </div>
              <div class="sm:col-span-2">
                <span class="text-slate-400 block text-[11px]">사업장 소재지 주소</span>
                <b class="text-slate-800">{{ selectedMember.bizAddress || '주소 정보 미입력' }}</b>
              </div>
            </div>
          </div>

          <!-- 3) 사업자등록증 사본 서류 이미지 뷰어 -->
          <div class="space-y-2">
            <h4 class="font-black text-slate-800 text-xs flex items-center justify-between">
              <span>🖼️ 제출된 사업자등록증 사본</span>
              <span v-if="selectedMember.bizCertUrl" class="text-emerald-600 font-bold text-[11px]">✓ 서류 첨부됨</span>
            </h4>
            <div class="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center text-center">
              <img
                v-if="selectedMember.bizCertUrl"
                :src="selectedMember.bizCertUrl"
                class="w-full h-full object-contain p-2"
                alt="사업자등록증 사본"
              />
              <div v-else class="text-slate-400 space-y-1">
                <div class="text-2xl">📄</div>
                <p class="font-bold text-xs">제출된 사업자등록증 사본 이미지가 없습니다.</p>
              </div>
            </div>
          </div>

          <!-- 4) 심사 승인 / 반려 / 저장 액션 바 -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <div class="text-[11px] text-slate-400">
              * 승인 시 바이어는 한-중 FTA 협정관세 및 정식 B2B 수입대행 발주가 활성화됩니다.
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="selectedMember.verificationStatus !== 'rejected'"
                type="button"
                @click="rejectMember(selectedMember)"
                class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer"
              >
                ✕ 심사 반려
              </button>

              <button
                v-if="selectedMember.verificationStatus !== 'verified'"
                type="button"
                @click="approveMember(selectedMember)"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
              >
                ✓ 사업자 인증 승인
              </button>

              <button
                v-else
                type="button"
                @click="saveMemberChanges(selectedMember)"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
              >
                ✓ 변경사항 저장
              </button>

              <button
                type="button"
                @click="selectedMember = null"
                class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 토스트 알림창 -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2.5 bg-emerald-600 text-white"
      >
        <span>✅</span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

const MEMBERS_STORAGE_KEY = 'euchs_admin_members'

const statusFilter = ref('all')
const searchQuery = ref('')
const selectedMember = ref(null)

const toast = ref({ show: false, message: '' })
let toastTimer = null

function showToast(msg) {
  clearTimeout(toastTimer)
  toast.value = { show: true, message: msg }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

function fmtN(val) {
  return Math.round(Number(val) || 0).toLocaleString('ko-KR')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  } catch (e) {
    return dateStr
  }
}

function copyPccc(pccc) {
  navigator.clipboard.writeText(pccc)
  showToast(`통관부호 ${pccc}가 복사되었습니다.`)
}

// ----------------------------------------------------
// 기본 더미 데이터 (시스템 초기화 시 활용)
// ----------------------------------------------------
const DEFAULT_MEMBERS = [
  {
    id: 'mem-1',
    companyName: '이유씨글로벌 (주)',
    name: '김이유',
    representativeName: '김이유',
    email: 'euchs_buyer@gmail.com',
    phone: '010-9876-5432',
    bizNumber: '123-86-12345',
    pccc: 'P123456789012',
    bizAddress: '인천광역시 연수구 송도미래로 30',
    bizCertUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    tier: 'business',
    balance: 15420000,
    verificationStatus: 'verified',
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'mem-2',
    companyName: '스타일트레이딩',
    name: '최수현',
    representativeName: '최수현',
    email: 'sh_style@naver.com',
    phone: '010-3344-5566',
    bizNumber: '214-88-99887',
    pccc: 'P987654321098',
    bizAddress: '경기도 성남시 분당구 판교역로 166',
    bizCertUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80',
    tier: 'general',
    balance: 0,
    verificationStatus: 'pending',
    createdAt: '2026-08-24T14:20:00.000Z'
  },
  {
    id: 'mem-3',
    companyName: '탑글로벌물류',
    name: '박글로벌',
    representativeName: '박글로벌',
    email: 'topglobal@gmail.com',
    phone: '010-7788-9900',
    bizNumber: '603-81-44556',
    pccc: 'P554433221100',
    bizAddress: '부산광역시 중구 중앙대로 88',
    bizCertUrl: '',
    tier: 'business',
    balance: 10000000,
    verificationStatus: 'verified',
    createdAt: '2026-08-20T11:15:00.000Z'
  }
]

const membersList = ref([])

// ----------------------------------------------------
// KPI 통계 계산
// ----------------------------------------------------
const verifiedCount = computed(() => {
  return membersList.value.filter(m => m.verificationStatus === 'verified').length
})

const pendingCount = computed(() => {
  return membersList.value.filter(m => m.verificationStatus === 'pending').length
})

const newMemberCount = computed(() => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return membersList.value.filter(m => new Date(m.createdAt) >= sevenDaysAgo).length
})

// ----------------------------------------------------
// 필터 & 검색
// ----------------------------------------------------
const filteredMembers = computed(() => {
  let list = [...membersList.value]

  if (statusFilter.value === 'verified') {
    list = list.filter(m => m.verificationStatus === 'verified')
  } else if (statusFilter.value === 'pending') {
    list = list.filter(m => m.verificationStatus === 'pending')
  } else if (statusFilter.value === 'new') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    list = list.filter(m => new Date(m.createdAt) >= sevenDaysAgo)
  } else if (statusFilter.value === 'unverified') {
    list = list.filter(m => m.verificationStatus === 'unverified' || m.verificationStatus === 'rejected')
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m =>
      (m.companyName || '').toLowerCase().includes(q) ||
      (m.name || '').toLowerCase().includes(q) ||
      (m.representativeName || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.bizNumber || '').includes(q) ||
      (m.pccc || '').toLowerCase().includes(q)
    )
  }

  return list.sort((a, b) => {
    if (a.verificationStatus === 'pending' && b.verificationStatus !== 'pending') return -1
    if (a.verificationStatus !== 'pending' && b.verificationStatus === 'pending') return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

function getStatusLabel(status) {
  const map = {
    verified: '🟢 인증완료',
    pending: '⏳ 심사대기',
    unverified: '⚪ 미인증/일반',
    rejected: '✕ 반려됨'
  }
  return map[status] || status
}

function getStatusBadgeClass(status) {
  const map = {
    verified: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    pending: 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse',
    unverified: 'bg-slate-100 text-slate-600 border border-slate-200',
    rejected: 'bg-rose-100 text-rose-800 border border-rose-300'
  }
  return map[status] || 'bg-slate-100 text-slate-600'
}

// ----------------------------------------------------
// 심사 승인 / 반려 / 모달 액션 (Supabase DB 영구 동기화)
// ----------------------------------------------------
function openDetailModal(member) {
  selectedMember.value = member
}

function quickApprove(member) {
  if (confirm(`[${member.companyName || member.name}] 님의 사업자 인증을 승인하시겠습니까?\n승인 시 '사업자회원' 등급으로 자동 전환됩니다.`)) {
    approveMember(member)
  }
}

async function approveMember(member) {
  member.verificationStatus = 'verified'
  member.tier = 'business' // 사업자회원으로 전환
  member.verifiedAt = new Date().toISOString()
  saveState()

  // Supabase DB profiles 테이블 동기화
  if (isSupabaseConfigured() && member.id && !member.id.startsWith('mem-')) {
    try {
      await supabase.from('profiles').update({
        is_business_verified: true,
        verification_status: 'verified',
        tier: 'business',
        updated_at: new Date().toISOString()
      }).eq('id', member.id)
    } catch (e) {
      console.warn('Supabase profile approve error:', e)
    }
  }

  showToast(`사업자 인증 승인 및 사업자회원 전환이 완료되었습니다.`)
  selectedMember.value = null // 모달 닫기
}


async function rejectMember(member) {
  const reason = prompt('반려 사유를 입력하세요:', '사업자등록증 식별 불가 / 통관부호 불일치')
  if (reason === null) return

  member.verificationStatus = 'rejected'
  member.tier = 'general' // 일반회원으로 유지
  member.rejectReason = reason
  saveState()

  // Supabase DB profiles 테이블 동기화
  if (isSupabaseConfigured() && member.id && !member.id.startsWith('mem-')) {
    try {
      await supabase.from('profiles').update({
        is_business_verified: false,
        verification_status: 'rejected',
        tier: 'general',
        updated_at: new Date().toISOString()
      }).eq('id', member.id)
    } catch (e) {
      console.warn('Supabase profile reject error:', e)
    }
  }

  showToast('사업자 인증 신청이 반려 처리되었습니다.')
  selectedMember.value = null // 모달 닫기
}

async function saveMemberChanges(member) {
  saveState()

  // Supabase DB profiles 테이블 동기화
  if (isSupabaseConfigured() && member.id && !member.id.startsWith('mem-')) {
    try {
      await supabase.from('profiles').update({
        company_name: member.companyName,
        representative_name: member.representativeName,
        name: member.name,
        phone: member.phone,
        business_number: member.bizNumber,
        pccc: member.pccc,
        address: member.bizAddress,
        tier: member.tier,
        verification_status: member.verificationStatus,
        is_business_verified: member.verificationStatus === 'verified',
        updated_at: new Date().toISOString()
      }).eq('id', member.id)
    } catch (e) {
      console.warn('Supabase profile update error:', e)
    }
  }

  showToast(`[${member.companyName || member.name}] 회원 정보가 성공적으로 저장되었습니다.`)
  selectedMember.value = null // 모달 닫기
}

// ----------------------------------------------------
// 스토리지 및 Supabase profiles 로드 & 저장
// ----------------------------------------------------
async function loadMembers() {
  let list = []
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY) || localStorage.getItem('euchs_members_list')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed
      }
    }
  } catch (e) {
    console.warn('Failed to load local members list:', e)
  }

  if (list.length === 0) {
    list = JSON.parse(JSON.stringify(DEFAULT_MEMBERS))
  }

  // Supabase profiles 테이블에서 실제 가입 회원 병합 조회
  if (isSupabaseConfigured()) {
    try {
      const { data: dbProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(dbProfiles) && dbProfiles.length > 0) {
        dbProfiles.forEach(p => {
          const formatted = {
            id: p.id,
            companyName: p.company_name || '',
            name: p.name || p.representative_name || p.email?.split('@')[0] || '바이어',
            representativeName: p.representative_name || p.name || '',
            email: p.email || '',
            phone: p.phone || '',
            bizNumber: p.business_number || '',
            pccc: p.pccc || '',
            bizAddress: p.address || '',
            bizCertUrl: p.biz_cert_url || '',
            tier: p.tier || (p.is_business_verified ? 'business' : 'general'),
            balance: Number(p.balance) || 0,
            verificationStatus: p.verification_status || (p.is_business_verified ? 'verified' : (p.business_number ? 'pending' : 'unverified')),
            createdAt: p.created_at || new Date().toISOString()
          }

          const existingIdx = list.findIndex(m => m.id === p.id || (m.email && m.email === p.email))
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...formatted }
          } else {
            list.unshift(formatted)
          }
        })
      }
    } catch (dbErr) {
      console.warn('Supabase profiles fetch notice in AdminMembersView:', dbErr)
    }
  }

  membersList.value = list
  saveState()
}

function saveState() {
  localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(membersList.value))
  localStorage.setItem('euchs_members_list', JSON.stringify(membersList.value))
  window.dispatchEvent(new CustomEvent('euchs-member-update', { detail: membersList.value }))
  window.dispatchEvent(new Event('storage'))
}

onMounted(() => {
  loadMembers()
  window.addEventListener('euchs-member-update', loadMembers)
  window.addEventListener('storage', loadMembers)
})

onUnmounted(() => {
  window.removeEventListener('euchs-member-update', loadMembers)
  window.removeEventListener('storage', loadMembers)
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
