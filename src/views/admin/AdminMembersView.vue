<template>
  <div class="max-w-6xl mx-auto space-y-6 select-none pb-20">

    <!-- 0. 치명적 에러 발생 시 Fallback UI -->
    <div v-if="isFatalError" class="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
      <div class="text-3xl">⚠️</div>
      <h3 class="text-base font-bold text-rose-900">회원 데이터를 불러오는 중 일시적인 오류가 발생했습니다.</h3>
      <p class="text-sm text-rose-600 font-mono">{{ fatalErrorMessage || '네트워크 상태를 확인해 주세요.' }}</p>
      <button
        type="button"
        @click="retryLoadMembers"
        class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
      >
        🔄 다시 시도
      </button>
    </div>

    <!-- 0-1. 세션 만료 — 옛 캐시 목록을 보여주지 않고 재로그인을 안내 -->
    <div v-else-if="sessionExpired" class="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center space-y-3">
      <div class="text-3xl">🔒</div>
      <h3 class="text-base font-bold text-amber-900">로그인이 만료됐습니다 — 다시 로그인해 주세요.</h3>
      <p class="text-sm text-amber-700">회원 정보는 로그인한 관리자에게만 조회됩니다.</p>
      <button
        type="button"
        @click="reLogin"
        class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
      >
        관리자 다시 로그인
      </button>
    </div>

    <!-- 메인 컨텐츠 영역 -->
    <div v-else class="space-y-6">
      <!-- 관리자 계정 판정 정보(user_roles) 조회 실패 경고 -->
      <div v-if="adminIndexError" class="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 text-sm text-amber-800 font-bold">
        ⚠️ 관리자 계정 판정 정보를 불러오지 못해, user_roles에만 등록된 관리자가 목록에 섞여 있을 수 있습니다.
        <span class="font-mono font-normal text-amber-700 ml-1">({{ adminIndexError }})</span>
      </div>
      <!-- 1. 상단 헤더 배너 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base">
              👥
            </div>
            <h2 class="text-lg sm:text-xl font-black text-slate-900">회원 / 바이어 관리</h2>
          </div>
          <p class="text-sm sm:text-base text-slate-500 mt-1 font-medium">
            가입된 B2B 바이어 회원의 사업자 인증 심사, 통관부호(PCCC), 등급 및 예치금 현황을 관리합니다.
          </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-center">
          <span class="px-3 py-1.5 rounded-xl text-sm font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
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
            <span class="text-sm font-bold text-slate-600">전체 회원</span>
            <span class="p-1.5 rounded-lg bg-blue-50 text-blue-600 text-sm">👥</span>
          </div>
          <div class="text-2xl font-black font-mono text-slate-900">
            {{ membersList.length }}<span class="text-base font-normal text-slate-500">명</span>
          </div>
          <p class="text-xs text-slate-400 font-medium">클릭 시 전체 목록 보기</p>
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
            <span class="text-sm font-bold text-slate-600">사업자 인증 완료</span>
            <span class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm">🟢</span>
          </div>
          <div class="text-2xl font-black font-mono text-emerald-600">
            {{ verifiedCount }}<span class="text-base font-normal text-slate-500">개사</span>
          </div>
          <p class="text-xs text-emerald-600/80 font-medium">클릭 시 인증완료 바이어 필터</p>
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
            <span class="text-sm font-bold text-slate-600">사업자 승인 대기</span>
            <span class="p-1.5 rounded-lg bg-amber-50 text-amber-600 text-sm">⏳</span>
          </div>
          <div class="text-2xl font-black font-mono text-amber-600">
            {{ pendingCount }}<span class="text-base font-normal text-slate-500">건</span>
          </div>
          <p class="text-xs text-amber-600/80 font-medium">클릭 시 심사대기 목록 필터</p>
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
            <span class="text-sm font-bold text-slate-600">신규 가입 바이어</span>
            <span class="p-1.5 rounded-lg bg-purple-50 text-purple-600 text-sm">✨</span>
          </div>
          <div class="text-2xl font-black font-mono text-slate-900">
            {{ newMemberCount }}<span class="text-base font-normal text-slate-500">명</span>
          </div>
          <p class="text-xs text-slate-400 font-medium">클릭 시 최근 7일 가입자 필터</p>
        </div>
      </div>

      <!-- 3. 회원 목록 테이블 (스마트스토어 센터 화이트 테마) -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <!-- 테이블 헤더 및 필터/검색 -->
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
            <h3 class="font-black text-slate-900 text-base">바이어 회원 목록</h3>
            <span class="text-sm font-mono text-slate-400">({{ filteredMembers.length }}명)</span>
          </div>

          <!-- 필터 & 검색 인풋 -->
          <div class="flex items-center gap-2 flex-wrap">
            <select
              v-model="statusFilter"
              class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-blue-500/20"
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
              class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white text-slate-900 outline-none w-56 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <!-- 테이블 목록 -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-700">
            <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase">
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
                :key="m?.id || idx"
                class="hover:bg-slate-50/80 transition"
                :class="m?.verificationStatus === 'pending' ? 'bg-amber-50/30' : ''"
              >
                <!-- No -->
                <td class="py-3.5 px-4 text-center font-mono text-slate-400">
                  {{ idx + 1 }}
                </td>

                <!-- 회사명 & 등급 -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-900 text-sm">{{ m?.companyName || '개인 바이어' }}</span>
                    <!-- tier 뱃지 (관리자 계정은 목록에서 제외되므로 관리자 뱃지 없음) -->
                    <span
                      class="px-2 py-0.5 rounded text-xs font-bold"
                      :class="getTierBadgeClass(m?.tier)"
                    >
                      {{ getTierLabel(m?.tier) }}
                    </span>
                  </div>
                  <div class="text-xs text-slate-400 font-mono mt-0.5">가입: {{ formatDate(m?.createdAt) }}</div>
                </td>

                <!-- 대표자 / 성명 -->
                <td class="py-3.5 px-4 font-bold text-slate-800">
                  {{ m?.representativeName || m?.name || '-' }}
                </td>

                <!-- 이메일 -->
                <td class="py-3.5 px-4 font-mono text-xs text-slate-600">
                  {{ m?.email || '-' }}
                </td>

                <!-- 연락처 -->
                <td class="py-3.5 px-4 font-mono text-xs text-slate-600">
                  {{ m?.phone || '-' }}
                </td>

                <!-- 사업자번호 / 통관부호 -->
                <td class="py-3.5 px-4 font-mono text-xs">
                  <div class="text-slate-800 font-bold">{{ m?.bizNumber || '-' }}</div>
                  <div class="text-xs text-slate-400">{{ m?.pccc || '-' }}</div>
                </td>

                <!-- 보유 예치금 -->
                <td class="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                  ₩{{ fmtN(m?.balance || 0) }}
                </td>

                <!-- 사업자 인증 상태 -->
                <td class="py-3.5 px-4 text-center">
                  <span
                    class="px-2.5 py-1 rounded-full text-xs font-bold inline-block"
                    :class="getStatusBadgeClass(m?.verificationStatus)"
                  >
                    {{ getStatusLabel(m?.verificationStatus) }}
                  </span>
                </td>

                <!-- 관리 액션 -->
                <td class="py-3.5 px-4 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      @click="openDetailModal(m)"
                      class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      상세 & 심사
                    </button>

                    <button
                      v-if="m?.verificationStatus === 'pending'"
                      type="button"
                      @click="quickApprove(m)"
                      class="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
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
                  <p class="font-bold text-sm text-slate-600">등록된 회원/바이어 내역이 없습니다.</p>
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
                  {{ selectedMember?.companyName || selectedMember?.name || '바이어' }} 바이어 상세 정보
                </h3>
                <p class="text-xs text-slate-400 font-mono">{{ selectedMember?.email || '-' }}</p>
              </div>
            </div>
            <button @click="selectedMember = null" class="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
              ✕
            </button>
          </div>

          <div class="space-y-5 text-sm">
            <!-- 1) 기본 인적 & 등급 정보 -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 class="font-black text-slate-800 text-sm mb-2">👤 기본 회원 정보</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span class="text-slate-400 block text-xs">담당자/대표자</span>
                  <b class="text-slate-900">{{ selectedMember?.name || selectedMember?.representativeName || '-' }}</b>
                </div>
                <div>
                  <span class="text-slate-400 block text-xs">연락처</span>
                  <b class="text-slate-900 font-mono">{{ selectedMember?.phone || '-' }}</b>
                </div>
                <div>
                  <span class="text-slate-400 block text-xs">회원 등급</span>
                  <select
                    v-model="selectedMember.tier"
                    class="mt-0.5 px-2.5 py-1 rounded border border-slate-300 font-bold bg-white text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="general">일반회원</option>
                    <option value="business">사업자회원</option>
                  </select>
                </div>
                <div>
                  <span class="text-slate-400 block text-xs">가입일시</span>
                  <b class="text-slate-700 font-mono">{{ formatDate(selectedMember?.createdAt) }}</b>
                </div>
                <div>
                  <span class="text-slate-400 block text-xs">보유 예치금</span>
                  <b class="text-blue-600 font-mono font-bold">₩{{ fmtN(selectedMember?.balance || 0) }}</b>
                </div>
                <div>
                  <span class="text-slate-400 block text-xs">심사 상태</span>
                  <span
                    class="px-2 py-0.5 rounded text-xs font-bold"
                    :class="getStatusBadgeClass(selectedMember?.verificationStatus)"
                  >
                    {{ getStatusLabel(selectedMember?.verificationStatus) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 2) 사업자 등록 & 통관부호 정보 -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 class="font-black text-slate-800 text-sm">📑 사업자 및 통관 정보</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span class="text-slate-400 block text-xs">사업자등록번호</span>
                  <b class="text-slate-900 font-mono text-base">{{ selectedMember?.bizNumber || '미등록' }}</b>
                </div>
                <div>
                  <span class="text-slate-400 block text-xs">개인/사업자 통관고유부호 (PCCC)</span>
                  <div class="flex items-center gap-2 mt-0.5">
                    <b class="text-slate-900 font-mono">{{ selectedMember?.pccc || '미등록' }}</b>
                    <button
                      v-if="selectedMember?.pccc"
                      type="button"
                      @click="copyPccc(selectedMember.pccc)"
                      class="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      📋 복사
                    </button>
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-slate-400 block text-xs">사업장 소재지 주소</span>
                  <b class="text-slate-800">{{ selectedMember?.bizAddress || '주소 정보 미입력' }}</b>
                </div>
              </div>
            </div>

            <!-- 3) 사업자등록증 사본 서류 이미지 뷰어 -->
            <div class="space-y-2">
              <h4 class="font-black text-slate-800 text-sm flex items-center justify-between">
                <span>🖼️ 제출된 사업자등록증 사본</span>
                <span v-if="selectedMember?.bizCertUrl" class="text-emerald-600 font-bold text-xs">✓ 서류 첨부됨</span>
              </h4>
              <div class="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center text-center">
                <img
                  v-if="selectedMember?.bizCertUrl"
                  :src="selectedMember.bizCertUrl"
                  class="w-full h-full object-contain p-2"
                  alt="사업자등록증 사본"
                />
                <div v-else class="text-slate-400 space-y-1">
                  <div class="text-2xl">📄</div>
                  <p class="font-bold text-sm">제출된 사업자등록증 사본 이미지가 없습니다.</p>
                </div>
              </div>
            </div>

            <!-- 4) 심사 승인 / 반려 / 저장 액션 바 -->
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <div class="text-xs text-slate-400">
                * 승인 시 바이어는 한-중 FTA 협정관세 및 정식 B2B 수입대행 발주가 활성화됩니다.
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="selectedMember?.verificationStatus !== 'rejected'"
                  type="button"
                  @click="rejectMember(selectedMember)"
                  class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm transition cursor-pointer"
                >
                  ✕ 심사 반려
                </button>

                <button
                  v-if="selectedMember?.verificationStatus !== 'verified'"
                  type="button"
                  @click="approveMember(selectedMember)"
                  class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition active:scale-95 cursor-pointer shadow-sm"
                >
                  ✓ 사업자 인증 승인
                </button>

                <button
                  v-else
                  type="button"
                  @click="confirmSaveMember = true"
                  class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition active:scale-95 cursor-pointer shadow-sm"
                >
                  ✓ 변경사항 저장
                </button>

                <button
                  type="button"
                  @click="selectedMember = null"
                  class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 토스트 알림창 -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl font-bold text-base shadow-xl flex items-center gap-2.5 text-white"
        :class="toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span>{{ toast.type === 'error' ? '⚠️' : '✅' }}</span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- ConfirmSaveModal: 사업자 인증 승인 -->
    <ConfirmSaveModal
      v-model="confirmApprovalMember"
      :title="`[${pendingApprovalMember?.companyName || pendingApprovalMember?.name || '바이어'}] 님의 사업자 인증을 승인할까요?`"
      description="승인 시 '사업자회원' 등급으로 자동 전환됩니다."
      variant="blue"
      icon="check"
      confirmText="승인"
      @confirm="approveMember(pendingApprovalMember)"
    />

    <!-- ConfirmSaveModal: 회원 정보 저장 -->
    <ConfirmSaveModal
      v-model="confirmSaveMember"
      title="회원 정보를 저장할까요?"
      variant="blue"
      confirmText="저장"
      @confirm="saveMemberChanges(selectedMember)"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, isSupabaseConfigured, isValidUUID } from '../../lib/supabase'
import { fetchAdminRoleRows, buildAdminIndex, isAdminAccount } from '../../lib/adminAccounts'
import { isAdminOrStaff, signOut } from '../../lib/auth'
import { useRouter } from 'vue-router'
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue'

const adminIndexError = ref('')
// 세션이 없거나 profiles가 0건 — 옛 목록 대신 재로그인 안내를 띄운다
const sessionExpired = ref(false)
const router = useRouter()

// 라우터 가드는 localStorage의 관리자 토큰(euchs_admin_token)만 보고도 통과시키므로,
// 그대로 /admin/login으로 보내면 다시 /admin으로 튕긴다. 잔여 토큰을 먼저 지운다.
async function reLogin() {
  await signOut()
  router.replace('/admin/login')
}

const statusFilter = ref('all')
const searchQuery = ref('')
const selectedMember = ref(null)
const confirmSaveMember = ref(false)
const confirmApprovalMember = ref(false)
const pendingApprovalMember = ref(null)
const isFatalError = ref(false)
const fatalErrorMessage = ref('')

const toast = ref({ show: false, message: '', type: 'success' })
let toastTimer = null

function showToast(msg, type = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message: msg, type }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, type === 'error' ? 6000 : 3000)
}

/**
 * profiles 행 수정 — 결과({ error }, 갱신된 행 수)를 반드시 확인한다.
 * supabase-js는 실패해도 throw하지 않으므로 반환값을 보지 않으면 조용히 실패한다.
 * 이제 화면의 기준은 DB뿐이라, 실패하면 목록을 DB에서 다시 불러와 화면을 되돌린다.
 * @returns {Promise<boolean>} 저장 성공 여부
 */
async function updateMemberProfile(member, updateData, label) {
  const q = supabase.from('profiles').update(updateData)
  const target = (member.id && isValidUUID(member.id))
    ? q.eq('id', member.id)
    : q.eq('email', String(member.email || '').trim().toLowerCase())
  const { data, error } = await target.select('id')
  if (error || !Array.isArray(data) || data.length === 0) {
    const reason = error?.message || '갱신된 행이 없습니다(권한 또는 세션 확인 필요)'
    console.error(`[AdminMembersView] ${label} 실패:`, reason, { memberId: member.id, email: member.email })
    showToast(`${label} 실패: ${reason}`, 'error')
    await loadMembers()
    return false
  }
  return true
}

function fmtN(val) {
  const n = Number(val)
  if (isNaN(n)) return '0'
  return Math.round(n).toLocaleString('ko-KR')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  } catch (e) {
    return '-'
  }
}

function copyPccc(pccc) {
  if (!pccc) return
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(pccc)
    showToast(`통관부호 ${pccc}가 복사되었습니다.`)
  }
}

const membersList = ref([])

// ----------------------------------------------------
// KPI 통계 계산 (안전 가드 적용)
// ----------------------------------------------------
const verifiedCount = computed(() => {
  if (!Array.isArray(membersList.value)) return 0
  return membersList.value.filter(m => m?.verificationStatus === 'verified').length
})

const pendingCount = computed(() => {
  if (!Array.isArray(membersList.value)) return 0
  return membersList.value.filter(m => m?.verificationStatus === 'pending').length
})

const newMemberCount = computed(() => {
  if (!Array.isArray(membersList.value)) return 0
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return membersList.value.filter(m => {
    if (!m?.createdAt) return false
    const d = new Date(m.createdAt)
    return !isNaN(d.getTime()) && d >= sevenDaysAgo
  }).length
})

// ----------------------------------------------------
// 필터 & 검색 (안전 가드 적용)
// ----------------------------------------------------
const filteredMembers = computed(() => {
  if (!Array.isArray(membersList.value)) return []
  let list = [...membersList.value].filter(m => m && typeof m === 'object')

  if (statusFilter.value === 'verified') {
    list = list.filter(m => m?.verificationStatus === 'verified')
  } else if (statusFilter.value === 'pending') {
    list = list.filter(m => m?.verificationStatus === 'pending')
  } else if (statusFilter.value === 'new') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    list = list.filter(m => {
      if (!m?.createdAt) return false
      const d = new Date(m.createdAt)
      return !isNaN(d.getTime()) && d >= sevenDaysAgo
    })
  } else if (statusFilter.value === 'unverified') {
    list = list.filter(m => m?.verificationStatus === 'unverified' || m?.verificationStatus === 'rejected')
  }

  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(m =>
      (m?.companyName || '').toLowerCase().includes(q) ||
      (m?.name || '').toLowerCase().includes(q) ||
      (m?.representativeName || '').toLowerCase().includes(q) ||
      (m?.email || '').toLowerCase().includes(q) ||
      (m?.phone || '').includes(q) ||
      (m?.bizNumber || '').includes(q) ||
      (m?.pccc || '').toLowerCase().includes(q)
    )
  }

  return list.sort((a, b) => {
    if (a?.verificationStatus === 'pending' && b?.verificationStatus !== 'pending') return -1
    if (a?.verificationStatus !== 'pending' && b?.verificationStatus === 'pending') return 1
    const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0
    const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0
    return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da)
  })
})

function getTierLabel(tier) {
  const map = {
    business: '사업자',
    general: '일반',
    vip: 'VIP',
  }
  return map[tier] || '일반'
}

function getTierBadgeClass(tier) {
  const map = {
    business: 'bg-blue-100 text-blue-800 border border-blue-300',
    general: 'bg-slate-100 text-slate-600 border border-slate-200',
    vip: 'bg-amber-100 text-amber-800 border border-amber-300',
  }
  return map[tier] || 'bg-slate-100 text-slate-600 border border-slate-200'
}

function getStatusLabel(status) {
  const map = {
    verified: '🟢 인증완료',
    pending: '⏳ 심사대기',
    unverified: '⚪ 미인증/일반',
    rejected: '✕ 반려됨'
  }
  return map[status] || (status || '미인증')
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
  if (!member) return
  selectedMember.value = member
}

function quickApprove(member) {
  if (!member) return
  pendingApprovalMember.value = member
  confirmApprovalMember.value = true
}

async function approveMember(member) {
  if (!member) return
  member.verificationStatus = 'verified'
  member.tier = 'business' // 사업자회원으로 전환
  member.verifiedAt = new Date().toISOString()

  const ok = await updateMemberProfile(member, {
    is_business_verified: true,
    verification_status: 'verified',
    tier: 'business',
    updated_at: new Date().toISOString()
  }, '사업자 인증 승인')
  if (!ok) return

  showToast(`사업자 인증 승인 및 사업자회원 전환이 완료되었습니다.`)
  selectedMember.value = null // 모달 닫기
}

async function rejectMember(member) {
  if (!member) return
  const reason = prompt('반려 사유를 입력하세요:', '사업자등록증 식별 불가 / 통관부호 불일치')
  if (reason === null) return

  member.verificationStatus = 'rejected'
  member.tier = 'general' // 일반회원으로 유지
  member.rejectReason = reason

  const ok = await updateMemberProfile(member, {
    is_business_verified: false,
    verification_status: 'rejected',
    tier: 'general',
    updated_at: new Date().toISOString()
  }, '사업자 인증 반려')
  if (!ok) return

  showToast('사업자 인증 신청이 반려 처리되었습니다.')
  selectedMember.value = null // 모달 닫기
}

async function saveMemberChanges(member) {
  if (!member) return

  // ⚠️ 주의: verification_status / is_business_verified / tier 는 아래 정책에 따라 제한됨.
  // - verification_status / is_business_verified: approveMember() / rejectMember() 전담.
  // - tier: member.tier가 명시적으로 존재하는 경우에만 포함.
  //   member.tier가 null/undefined이면 payload에서 제외 — DB 기존 tier 값 보존.
  //   || 'general' fallback을 쓰면 이미 'business'로 설정된 등급이 덮어써지는 버그 발생.
  const updateData = {
    company_name: member.companyName || '',
    representative_name: member.representativeName || '',
    name: member.name || '',
    phone: member.phone || '',
    business_number: member.bizNumber || '',
    pccc: member.pccc || '',
    address: member.bizAddress || '',
    updated_at: new Date().toISOString()
  }
  // tier는 값이 있을 때만 명시적으로 포함 — falsy이면 제외해 DB 기존값 보존
  if (member.tier) {
    updateData.tier = member.tier
  }
  const ok = await updateMemberProfile(member, updateData, '회원 정보 저장')
  if (!ok) return

  showToast(`[${member.companyName || member.name || '바이어'}] 회원 정보가 성공적으로 저장되었습니다.`)
  selectedMember.value = null // 모달 닫기
}

// ----------------------------------------------------
// 스토리지 및 Supabase profiles 로드 (무한 루프 방지)
// ----------------------------------------------------
let _isLoading = false

async function loadMembers() {
  if (_isLoading) return
  _isLoading = true

  try {
    // ★ DB(profiles)가 유일한 기준이다 — localStorage 캐시를 합치거나 대신 보여주지 않는다.
    //   (2026-09-23 실측: 세션 없이 열리면 DB 조회가 비고 옛 캐시가 떠서, 관리자 계정이 섞이고
    //    예치금이 DB ₩17,140,434인 회원이 ₩990,414로 보였다)
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 연결 설정이 없어 회원 목록을 불러올 수 없습니다.')
    }

    // 세션이 없으면 RLS 때문에 조회가 "에러 없이 0건"으로 끝난다 → 빈 목록을 정상처럼 보이지 않게 막는다
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      membersList.value = []
      sessionExpired.value = true
      return
    }

    const { data: dbProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`profiles 조회 실패: ${error.message}`)

    // 관리자는 본인 행을 포함해 전체가 보여야 한다 — 0건이면 토큰이 무효(만료)된 것
    if (!Array.isArray(dbProfiles) || dbProfiles.length === 0) {
      console.error('[AdminMembersView] profiles 조회 0건 — 세션 만료로 판단합니다.')
      membersList.value = []
      sessionExpired.value = true
      return
    }
    sessionExpired.value = false

    const list = dbProfiles.filter(Boolean).map(p => ({
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
      role: p.role || 'user',
      balance: Number(p.balance) || 0,
      verificationStatus: p.verification_status || (p.is_business_verified ? 'verified' : (p.business_number ? 'pending' : 'unverified')),
      createdAt: p.created_at || new Date().toISOString()
    }))

    // 관리자·스태프 계정은 바이어가 아니므로 목록·카운트·심사 버튼에서 뺀다.
    // 이 계정들은 시스템 설정 > 운영진/직원 권한 관리 탭에 표시된다.
    // 판정 기준은 DB is_admin_or_staff()와 같다(lib/adminAccounts).
    // user_roles 조회가 실패하면 profiles.role만으로 걸러지고 user_roles에만 등록된
    // 관리자가 섞일 수 있으므로, 조용히 넘기지 않고 화면 상단에 경고를 띄운다.
    let adminIndex = buildAdminIndex([])
    adminIndexError.value = ''
    try {
      adminIndex = buildAdminIndex(await fetchAdminRoleRows())
      // RLS는 권한이 없으면 에러 대신 "빈 결과"를 준다. 관리자로 들어온 사람이
      // 자기 자신조차 user_roles에서 안 보이면 조회가 사실상 실패한 것으로 본다.
      const myEmail = String(session.user?.email || '').toLowerCase().trim()
      const myId = String(session.user?.id || '')
      const meVisible = (myEmail && adminIndex.emails.has(myEmail)) || (myId && adminIndex.userIds.has(myId))
      if (isAdminOrStaff.value && !meVisible) {
        throw new Error('user_roles에서 현재 로그인한 관리자 본인도 조회되지 않습니다')
      }
    } catch (e) {
      console.error('[AdminMembersView] 관리자 계정 판정용 user_roles 조회 실패:', e)
      adminIndexError.value = e.message
    }
    membersList.value = list.filter(m => !isAdminAccount(m, adminIndex))
    isFatalError.value = false
  } catch (err) {
    console.error('Fatal loadMembers error:', err)
    // 치명적 에러가 발생해도 기존 리스트가 있으면 유지
    if (membersList.value.length === 0) {
      isFatalError.value = true
      fatalErrorMessage.value = err?.message || '회원 목록 로딩 실패'
    }
  } finally {
    _isLoading = false
  }
}

function retryLoadMembers() {
  isFatalError.value = false
  loadMembers()
}

// ※ 예전에는 수정 결과를 localStorage(euchs_admin_members)에 저장하고 storage 이벤트로
//   다시 읽었다. 그 캐시가 세션 만료 시 옛 목록으로 대신 표시돼 제거했다 — 기준은 DB뿐이다.
onMounted(() => {
  loadMembers()
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
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
