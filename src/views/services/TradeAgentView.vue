<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-industry text-emerald-400"></i>
            <span>OEM · ODM 주문생산 & 전문 무역 대행</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            중국 무역대행 & 공장 소싱<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
              1차 직영 공장 발굴부터 금형/양산까지
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 1차 제조 공장 다이렉트 소싱, 금형 사출, 로고 인쇄, 패키지 커스텀, 무역 수출입 계약 및 세관 통관까지 15년 무역 전문가가 A to Z 책임집니다.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a 
              href="#apply-form" 
              class="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
            >
              <i class="fas fa-file-contract"></i>
              <span>OEM/ODM 맞춤 견적 의뢰서 작성</span>
              <i class="fas fa-arrow-down text-xs"></i>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-slate-300">주요 서비스</span>
              <span>&gt;</span>
              <span class="text-emerald-400 font-semibold">무역대행 OEM/ODM</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      
      <!-- Key Features 3 Cards -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-building-circle-check"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">1차 직영 공장 발굴 & 단가 네고</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            중간 도매상을 거치지 않고 현지 1차 생산업체와의 직접 미팅 및 최저 단가 협상을 이끌어냅니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-compass-drafting"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">금형 설계 & 시제품 샘플링</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            3D 도면 검토, 사출 금형 개발, 시제품 제작 후 고객 승인을 거쳐 완벽한 품질의 양산을 진행합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-file-invoice"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">수출입 통관 & 인증 원스톱</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            KC 인증 자문, 관세 감면(한-중 FTA 원산지증명서 발급), B/L 및 선적 서류 일체를 전담 처리합니다.
          </p>
        </div>
      </section>

      <!-- 4-Step Process -->
      <section class="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="text-xs font-bold text-emerald-600 uppercase tracking-widest">Process</span>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-1">무역대행 OEM/ODM 제작 절차</h2>
          <p class="text-xs sm:text-sm text-gray-500 mt-2">상담부터 공장 실사, 양산 및 국내 납품까지의 체계적인 프로세스</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">01</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 1</span>
            <h4 class="text-base font-bold text-gray-900">상담 및 공장 소싱</h4>
            <p class="text-xs text-gray-600 mt-1.5">제품 사양서(스펙/도면) 접수 후 최적의 중국 1차 공장 수배 및 단가 비교</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">02</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 2</span>
            <h4 class="text-base font-bold text-gray-900">샘플 제작 & 검증</h4>
            <p class="text-xs text-gray-600 mt-1.5">사제품 샘플 제작, 인쇄/재질/색상 확인 후 고객 피드백 반영 및 최종 승인</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">03</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 3</span>
            <h4 class="text-base font-bold text-gray-900">본 계약 & 양산 검수</h4>
            <p class="text-xs text-gray-600 mt-1.5">무역 계약 체결 후 본 생산 착수, 공장 중간 실사 및 현지 창고 완제품 검품</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">04</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 4</span>
            <h4 class="text-base font-bold text-gray-900">통관 & 국내 직납</h4>
            <p class="text-xs text-gray-600 mt-1.5">한-중 FTA 원산지 증명 발행, 세관 정식 수입통관 후 고객 지정 창고 배송</p>
          </div>
        </div>
      </section>

      <!-- Advanced Trade Agent Application Form -->
      <section id="apply-form" class="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-10 border-2 border-emerald-600/20 shadow-2xl space-y-8">
        
        <!-- Form Header -->
        <div class="border-b border-gray-100 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full mb-2">
              <i class="fas fa-industry"></i>
              <span>OEM / ODM & SOURCING INQUIRY</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-gray-900">
              무역대행 & 공장 소싱 맞춤 의뢰서
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-1">
              제작하시려는 제품 기획서나 벤치마킹 링크를 전달해 주시면 15년 전문 소싱팀이 1차 공장 조사를 진행합니다.
            </p>
          </div>

          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <i class="fas fa-comment"></i>
            <span>카톡 실시간 공장 소싱 상담</span>
          </a>
        </div>

        <form @submit.prevent="submitTradeAgentForm" class="space-y-8">
          
          <!-- 1. 의뢰자 기본 정보 -->
          <div class="space-y-4">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>의뢰 업체 기본 정보</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">업체명 / 상호명 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.companyName" 
                  type="text" 
                  required 
                  placeholder="예: 주식회사 알파"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">담당자 성함 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.contactName" 
                  type="text" 
                  required 
                  placeholder="예: 이대표"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">연락처 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.phone" 
                  type="tel" 
                  required 
                  placeholder="예: 010-1234-5678"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">이메일 주소 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.email" 
                  type="email" 
                  required 
                  placeholder="예: contact@company.com"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>
            </div>
          </div>

          <!-- 2. 소싱 및 제작 의뢰 상세 -->
          <div class="space-y-4 pt-4 border-t border-gray-100">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span>소싱 및 OEM/ODM 제작 상세</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">
                  벤치마킹 제품 링크 (국내 스마트스토어/쿠팡/1688 등) <span class="text-red-500">*</span>
                </label>
                <input 
                  v-model="form.refUrl" 
                  type="url" 
                  required
                  placeholder="https://..."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">의뢰 분야 / 품목명 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.category" 
                  type="text" 
                  required 
                  placeholder="예: 실리콘 조리도구 세트 / 캠핑 테이블"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">목표 제작 수량 (MOQ) <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.moq" 
                  type="text" 
                  required 
                  placeholder="예: 1,000개 (또는 3,000개)"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">희망 목표 납품 단가 (선택)</label>
                <input 
                  v-model="form.targetPrice" 
                  type="text" 
                  placeholder="예: 개당 5,000원 이하 또는 ¥ 20 이하"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">상세 제작 요구 사항 (금형, 로고 인쇄, 패키지 등) <span class="text-red-500">*</span></label>
              <textarea 
                v-model="form.details" 
                rows="3" 
                required 
                placeholder="로고 실크인쇄/레이저 각인 여부, 칼라 박스 패키징 디자인 제작 필요 여부, 금형 신규 개발 여부 등을 기재해 주세요."
                class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs outline-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">도면 / 디자인 시안 첨부 (선택)</label>
              <input 
                type="file" 
                multiple
                class="w-full p-2.5 border border-dashed border-gray-300 rounded-xl bg-slate-50 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>
          </div>

          <!-- 3. 현지 출장 조사 및 공장 실사 동행 옵션 -->
          <div class="space-y-4 pt-4 border-t border-gray-100">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <span>현지 공장 실사 & 출장 동행 옵션</span>
            </h3>

            <div class="border border-gray-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <label class="flex items-center justify-between cursor-pointer">
                <span class="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900">
                  <i class="fas fa-plane-departure text-emerald-600"></i>
                  <span>현지 제조공장 직접 실사 및 출장 가이드 동행 요청 (비용 별도 협의)</span>
                </span>
                <input 
                  v-model="form.needInspectionTrip" 
                  type="checkbox" 
                  class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <!-- Detailed Trip Options when checked -->
              <div v-if="form.needInspectionTrip" class="pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label class="block text-[11px] font-semibold text-gray-600 mb-1">희망 출장 지역</label>
                  <input 
                    v-model="form.tripLocation" 
                    type="text" 
                    placeholder="예: 절강성 이우/영강, 광동성 광저우/심천"
                    class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-gray-600 mb-1">예상 출장 일정</label>
                  <input 
                    v-model="form.tripSchedule" 
                    type="text" 
                    placeholder="예: 2026년 9월 중순 (2박 3일)"
                    class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
            >
              <i v-if="isSubmitting" class="fas fa-spinner animate-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
              <span>{{ isSubmitting ? '의뢰서 전송 중...' : '무역대행 맞춤 견적 의뢰하기' }}</span>
            </button>
          </div>

        </form>

      </section>

    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl text-gray-900">
        <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-xl font-bold">무역대행 의뢰서가 접수되었습니다!</h3>
        <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
          <strong>{{ form.companyName }}</strong> 님의 OEM/ODM 소싱 의뢰가 정상 접수되었습니다.<br />
          중국 현지 1차 공장 데이터베이스 조회 후 <strong>{{ form.contactName }}</strong> ({{ form.phone }}) 님께 24시간 내로 1차 피드백을 전달해 드리겠습니다.
        </p>
        <div class="bg-slate-50 p-3.5 rounded-xl text-xs text-left space-y-1 border border-gray-100">
          <p><strong>품목명:</strong> {{ form.category }}</p>
          <p><strong>목표 수량:</strong> {{ form.moq }}</p>
          <p><strong>공장 실사 동행:</strong> {{ form.needInspectionTrip ? '신청함' : '미신청' }}</p>
        </div>
        <div class="flex flex-col gap-2 pt-2">
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
          >
            <i class="fas fa-comment"></i> 카카오톡으로 의뢰 확인
          </a>
          <button @click="showModal = false" class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition">
            닫기
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const isSubmitting = ref(false)
const showModal = ref(false)

const form = ref({
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  refUrl: '',
  category: '',
  moq: '1,000개',
  targetPrice: '',
  details: '',
  needInspectionTrip: false,
  tripLocation: '',
  tripSchedule: ''
})

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const submitTradeAgentForm = async () => {
  isSubmitting.value = true

  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').insert([
        {
          service_type: 'trade',
          service_name: '무역대행 OEM/ODM',
          customer_name: `${form.value.contactName} (${form.value.companyName})`,
          phone: form.value.phone,
          email: form.value.email,
          status: '접수대기',
          total_amount: 0,
          memo: form.value.details || '',
          details: {
            companyName: form.value.companyName,
            contactName: form.value.contactName,
            refUrl: form.value.refUrl,
            category: form.value.category,
            moq: form.value.moq,
            targetPrice: form.value.targetPrice,
            needInspectionTrip: form.value.needInspectionTrip,
            tripLocation: form.value.tripLocation,
            tripSchedule: form.value.tripSchedule
          }
        }
      ])

      if (error) {
        throw error
      }
    }
    showModal.value = true
  } catch (err) {
    console.error('Supabase trade insert error:', err)
    alert(`무역대행 신청서 접수 중 오류가 발생했습니다: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
