<template>
  <div class="max-w-5xl mx-auto space-y-6 select-none pb-20">

    <!-- 상단 페이지 타이틀 & 안내 배너 -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base">
            ⚙️
          </div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">시스템 환경 및 운영 관리 설정</h2>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          EUCHS B2B 수입대행 ERP의 환율·수수료 기준 및 4대 핵심 서비스 카드, 메인 Hero 미디어를 관리합니다.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-center">
        <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
          마지막 저장: {{ activeTab === 'rate' ? rateLastSavedTime : mediaLastSavedTime }}
        </span>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2단 서브 탭 바 (스마트스토어 센터 스타일) -->
    <!-- ======================================================== -->
    <div class="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/80 text-xs sm:text-sm font-bold">
      <!-- 탭 1: 환율 & 운영 수수료 설정 -->
      <button
        type="button"
        @click="activeTab = 'rate'"
        class="flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        :class="activeTab === 'rate'
          ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-900/5 font-black'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'"
      >
        <span>💱 환율 & 운영 수수료 설정</span>
        <span
          class="px-1.5 py-0.2 rounded text-[10px] font-mono"
          :class="activeTab === 'rate' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300/60 text-slate-600'"
        >
          KRW/CNY
        </span>
      </button>

      <!-- 탭 2: 메인 동영상 & 미디어 관리 -->
      <button
        type="button"
        @click="activeTab = 'media'"
        class="flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        :class="activeTab === 'media'
          ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-900/5 font-black'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'"
      >
        <span>🎬 메인 동영상 & 미디어 관리</span>
        <span
          class="px-1.5 py-0.2 rounded text-[10px] font-mono"
          :class="activeTab === 'media' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300/60 text-slate-600'"
        >
          4대 카드 & Hero
        </span>
      </button>
    </div>

    <!-- ======================================================== -->
    <!-- [TAB 1] 환율 & 운영 수수료 설정 폼 -->
    <!-- ======================================================== -->
    <div v-show="activeTab === 'rate'" class="space-y-6">

      <!-- 1. 위안화(CNY/RMB) 적용 환율 설정 섹션 -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 class="font-black text-slate-900 text-sm">1. 위안화(CNY / RMB) 적용 환율 설정</h3>
          </div>
          <span class="text-xs text-slate-400 font-medium">쇼핑몰 및 견적서 1차 결제액 계산의 기준 환율</span>
        </div>

        <div class="p-6 space-y-6">
          <!-- 환율 계산 모드 라디오 선택 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 모드 1: 실시간 고시환율 + 마진 연동 모드 (권장) -->
            <label
              class="relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition"
              :class="rateForm.exchangeRateMode === 'auto'
                ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/10'
                : 'border-slate-200 hover:border-slate-300 bg-white'"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2.5">
                  <input
                    type="radio"
                    v-model="rateForm.exchangeRateMode"
                    value="auto"
                    class="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span class="font-black text-sm text-slate-900">실시간 고시 환율 + 마진 자동 연동</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">권장 표준</span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed pl-6.5">
                국제/네이버 기준 실시간 고시환율에 안전 마진(스프레드)을 자동으로 합산하여 적용합니다.
              </p>
            </label>

            <!-- 모드 2: 수동 고정 환율 모드 -->
            <label
              class="relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition"
              :class="rateForm.exchangeRateMode === 'manual'
                ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/10'
                : 'border-slate-200 hover:border-slate-300 bg-white'"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2.5">
                  <input
                    type="radio"
                    v-model="rateForm.exchangeRateMode"
                    value="manual"
                    class="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span class="font-black text-sm text-slate-900">수동 고정 환율 모드</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">고정 입력</span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed pl-6.5">
                시장 환율 변동과 무관하게 관리자가 직접 지정한 고정 단일 환율을 시스템 전체에 적용합니다.
              </p>
            </label>
          </div>

          <!-- 세부 입력 영역 (모드에 따라 활성화) -->
          <div class="p-5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
            <!-- 자동 연동 모드일 때 세부 입력 -->
            <div v-if="rateForm.exchangeRateMode === 'auto'" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <!-- 1. 실시간 기준 고시환율 -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold text-slate-700">실시간 기준 고시환율 (KRW/CNY)</label>
                  <button
                    type="button"
                    @click="refreshLiveRate"
                    class="text-[11px] text-blue-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>갱신 ↻</span>
                  </button>
                </div>
                <div class="relative">
                  <input
                    type="number"
                    step="0.01"
                    v-model.number="rateForm.baseLiveRate"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span class="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">원</span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono">* 네이버 금융 / KEB하나은행 매매기준율</p>
              </div>

              <!-- 2. 설정 마진 (환위험 헤지) -->
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-slate-700">당사 안전 마진 (스프레드 + 송금수수료)</label>
                <div class="relative">
                  <input
                    type="number"
                    step="0.5"
                    v-model.number="rateForm.rateMargin"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white text-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span class="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">+ 원</span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono">* 송금 환전 수수료 및 환변동 보전액</p>
              </div>

              <!-- 3. 최종 계산된 적용 환율 디스플레이 -->
              <div class="p-3.5 rounded-xl bg-blue-600 text-white flex flex-col justify-between shadow-xs">
                <div class="text-[11px] text-blue-100 font-bold">ERP 최종 적용 환율 (자동 계산)</div>
                <div class="text-2xl font-black font-mono mt-1">
                  ₩{{ calculatedAppliedRate.toFixed(2) }}
                </div>
                <div class="text-[10px] text-blue-200 mt-0.5">
                  (고시 {{ rateForm.baseLiveRate }} + 마진 {{ rateForm.rateMargin }})
                </div>
              </div>
            </div>

            <!-- 수동 고정 모드일 때 세부 입력 -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-slate-700">당사 공식 고정 적용 환율 (KRW)</label>
                <div class="relative">
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="rateForm.manualRate"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-base bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="예: 231.0"
                  />
                  <span class="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">원 / 1위안</span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono">* 모든 1688 위안화 상품 환산에 단일 적용됩니다.</p>
              </div>

              <!-- 최종 고정 환율 디스플레이 -->
              <div class="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col justify-between shadow-xs">
                <div class="text-[11px] text-slate-300 font-bold">ERP 최종 적용 환율 (수동 고정)</div>
                <div class="text-2xl font-black font-mono mt-1">
                  ₩{{ Number(rateForm.manualRate || 0).toFixed(2) }}
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  수동 지정 환율 고정 적용 중
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 기본 수수료 및 물류·통관 기준 비용 설정 (4단 그리드 카드) -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h3 class="font-black text-slate-900 text-sm">2. 기본 대행 수수료 및 물류·통관 기준 비용</h3>
          </div>
          <span class="text-xs text-slate-400 font-medium">견적서 발행 및 2차 정산 자동 연산 기준</span>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <!-- 1) 구매대행 기본 수수료율 -->
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 hover:border-slate-300 transition">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-800">구매대행 기본 수수료율</label>
                <span class="text-sm">🛒</span>
              </div>
              <div class="relative">
                <input
                  type="number"
                  step="0.5"
                  v-model.number="rateForm.agencyFeeRate"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-black text-slate-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span class="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p class="text-[11px] text-slate-500 leading-tight">
                상품대금 합계액 기준 적용 (최소 수수료 ₩{{ fmtN(rateForm.minAgencyFee) }})
              </p>
            </div>

            <!-- 2) 해운 LCL 1 CBM당 운임 -->
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 hover:border-slate-300 transition">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-800">해운 LCL 1 CBM당 운임</label>
                <span class="text-sm">🚢</span>
              </div>
              <div class="relative">
                <input
                  type="number"
                  step="1000"
                  v-model.number="rateForm.oceanFreightPerCbm"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-black text-slate-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span class="absolute right-3 top-2 text-xs text-slate-400 font-bold">원</span>
              </div>
              <p class="text-[11px] text-slate-500 leading-tight">
                중국 이우 ➔ 인천/평택항 LCL 해상 운임 (기본 1 CBM 미만 절상)
              </p>
            </div>

            <!-- 3) 관세사 통관 수수료 -->
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 hover:border-slate-300 transition">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-800">관세사 통관 수수료</label>
                <span class="text-sm">📑</span>
              </div>
              <div class="relative">
                <input
                  type="number"
                  step="1000"
                  v-model.number="rateForm.customsBrokerFee"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-black text-slate-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span class="absolute right-3 top-2 text-xs text-slate-400 font-bold">원</span>
              </div>
              <p class="text-[11px] text-slate-500 leading-tight">
                정식 수입신고 통관 건당 고정 수수료 (부가세 포함)
              </p>
            </div>

            <!-- 4) 한-중 FTA C/O 원산지증명서 발급비 -->
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 hover:border-slate-300 transition">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-800">한-중 FTA C/O 발급비</label>
                <span class="text-sm">📜</span>
              </div>
              <div class="relative">
                <input
                  type="number"
                  step="1000"
                  v-model.number="rateForm.ftaCoIssuanceFee"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-black text-slate-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span class="absolute right-3 top-2 text-xs text-slate-400 font-bold">원</span>
              </div>
              <p class="text-[11px] text-slate-500 leading-tight">
                협정관세 적용을 위한 상공회의소 C/O 건당 발급 실비
              </p>
            </div>

          </div>
        </div>
      </div>

      <!-- 하단 액션 버튼 바 -->
      <div class="flex items-center justify-between pt-2">
        <div class="text-xs text-slate-500 font-medium">
          * 설정을 저장하면 쇼핑몰 상품 상세 및 발주 견적 계산에 즉시 반영됩니다.
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="resetRateToDefault"
            class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            기본값으로 초기화
          </button>

          <button
            type="button"
            @click="saveRateSettings"
            class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-2 active:scale-95"
          >
            <span>✓ 환율·수수료 설정 저장하기</span>
          </button>
        </div>
      </div>

    </div>

    <!-- ======================================================== -->
    <!-- [TAB 2] 메인 동영상 & 미디어 관리 폼 (원본 4대 카드 + Hero 관리) -->
    <!-- ======================================================== -->
    <div v-show="activeTab === 'media'" class="space-y-6">

      <!-- ======================================================== -->
      <!-- 섹션 1: 4대 핵심 서비스 카드 미디어 관리 (2x2 화이트 그리드) -->
      <!-- ======================================================== -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 class="font-black text-slate-900 text-sm">1. 메인 4대 핵심 서비스 카드 미디어 관리</h3>
          </div>
          <span class="text-xs text-blue-600 font-bold">
            * 파일 업로드 / 삭제 / URL 입력 시 즉시 자동 저장 (Auto-Save)
          </span>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- 4개 카드 반복 -->
            <div
              v-for="card in serviceCardsList"
              :key="card.key"
              class="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4 hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div class="space-y-3">
                <!-- 카드 헤더 및 삭제 버튼 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs border" :class="card.badgeTheme">
                      {{ card.icon }}
                    </span>
                    <div>
                      <h4 class="text-xs sm:text-sm font-bold text-slate-900">{{ card.title }}</h4>
                      <p class="text-[11px] text-slate-500 font-medium">{{ card.subTitle }}</p>
                    </div>
                  </div>

                  <!-- 붉은색 삭제 버튼 (미디어 있을 때) -->
                  <button
                    v-if="card.mediaUrl"
                    type="button"
                    @click="deleteMediaCard(card.key)"
                    class="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer active:scale-95"
                    title="등록된 미디어 삭제 (기본 스타일로 즉시 복원 및 자동 저장)"
                  >
                    <span>🗑️ 삭제</span>
                  </button>
                </div>

                <!-- URL 입력창 & 업로드 버튼 -->
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    v-model="card.mediaUrl"
                    @change="saveMediaCard(card.key)"
                    placeholder="동영상 MP4/GIF/이미지 URL (https://...)"
                    class="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <!-- 숨김 파일 인풋 -->
                  <input
                    type="file"
                    :ref="el => { fileInputs[card.key] = el }"
                    @change="e => handleFileUpload(e, card.key)"
                    accept="video/mp4,video/webm,video/ogg,image/*"
                    class="hidden"
                  />
                  <button
                    type="button"
                    @click="triggerUpload(card.key)"
                    class="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs border border-blue-200 hover:border-blue-600 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <span>📤 파일 업로드</span>
                  </button>
                </div>

                <!-- 실시간 라이브 미니 프리뷰 박스 -->
                <div class="relative h-36 w-full rounded-xl overflow-hidden border border-slate-300 bg-[#141e33] flex items-center justify-center text-center shadow-inner">
                  <template v-if="card.mediaUrl">
                    <video
                      v-if="isVideoMedia(card.mediaUrl)"
                      :src="card.mediaUrl"
                      autoplay
                      loop
                      muted
                      playsinline
                      webkit-playsinline
                      x5-playsinline
                      preload="auto"
                      class="absolute inset-0 w-full h-full object-cover"
                    ></video>
                    <img
                      v-else
                      :src="card.mediaUrl"
                      class="absolute inset-0 w-full h-full object-cover"
                    />
                    <div class="absolute inset-0 bg-black/60 z-10 pointer-events-none"></div>
                    <div class="relative z-20 text-white text-xs font-bold space-y-1">
                      <div class="flex items-center justify-center gap-1.5 text-emerald-400">
                        <span>✓ 미디어 등록 완료</span>
                      </div>
                      <p class="text-[10px] text-slate-300">메인 카드 배경으로 재생됩니다</p>
                    </div>
                  </template>
                  <div v-else class="text-xs text-slate-400 flex flex-col items-center gap-1.5 p-4">
                    <span class="text-xl">🌌</span>
                    <span class="font-bold text-slate-300">기본 다크 네이비 카드 스타일</span>
                    <span class="text-[10px] text-slate-500">미디어를 등록하지 않으면 깔끔한 다크 네이비 카드로 표시됩니다</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 섹션 2: 메인 상단 비주얼(Hero) 배경 관리 -->
      <!-- ======================================================== -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h3 class="font-black text-slate-900 text-sm">2. 메인 상단 비주얼(Hero) 배경 관리</h3>
          </div>
          <span class="text-xs text-slate-400 font-medium">홈페이지 최상단 첫인상 배경 비주얼</span>
        </div>

        <div class="p-6 space-y-6">
          <!-- 3단 미디어 타입 라디오 선택 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              class="flex items-center gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition"
              :class="heroForm.hero_media_type === 'video_mp4'
                ? 'border-purple-600 bg-purple-50/40 font-black text-purple-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
            >
              <input
                type="radio"
                v-model="heroForm.hero_media_type"
                value="video_mp4"
                class="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span class="text-xs sm:text-sm">동영상 파일 (mp4 URL)</span>
            </label>

            <label
              class="flex items-center gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition"
              :class="heroForm.hero_media_type === 'youtube'
                ? 'border-purple-600 bg-purple-50/40 font-black text-purple-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
            >
              <input
                type="radio"
                v-model="heroForm.hero_media_type"
                value="youtube"
                class="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span class="text-xs sm:text-sm">유튜브 영상 링크</span>
            </label>

            <label
              class="flex items-center gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition"
              :class="heroForm.hero_media_type === 'image'
                ? 'border-purple-600 bg-purple-50/40 font-black text-purple-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
            >
              <input
                type="radio"
                v-model="heroForm.hero_media_type"
                value="image"
                class="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span class="text-xs sm:text-sm">고화질 배경 이미지</span>
            </label>
          </div>

          <!-- URL 입력창 & 업로드 버튼 -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>
                {{ heroForm.hero_media_type === 'youtube' ? '유튜브 링크 / 영상 ID' : (heroForm.hero_media_type === 'video_mp4' ? '동영상 파일 MP4 URL' : '고화질 이미지 URL') }}
              </span>
              <span class="text-[11px] text-slate-400 font-mono">* 직접 URL을 입력하거나 우측 업로드 버튼을 클릭하세요</span>
            </label>
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                v-model="heroForm.hero_media_url"
                :placeholder="heroForm.hero_media_type === 'youtube' ? '예: https://www.youtube.com/watch?v=ScMzIvxBSi4' : 'https://... 미디어 링크'"
                class="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:ring-2 focus:ring-purple-500"
              />
              <!-- 숨김 Hero 파일 인풋 -->
              <input
                type="file"
                ref="heroFileInput"
                @change="handleHeroFileUpload"
                :accept="heroForm.hero_media_type === 'image' ? 'image/*' : 'video/mp4,video/webm,image/*'"
                class="hidden"
              />
              <button
                type="button"
                @click="triggerHeroUpload"
                class="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold text-xs border border-purple-200 hover:border-purple-600 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs"
              >
                <span>📤 동영상/이미지 업로드</span>
              </button>
            </div>
          </div>

          <!-- 다크 오버레이 어두움 강도 조절 슬라이더 -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-slate-800">다크 오버레이 어두움 강도</span>
                <span class="text-[11px] text-purple-600 font-bold font-mono">({{ heroForm.hero_overlay_opacity }}%)</span>
              </div>
              <span class="text-[11px] text-slate-500 font-medium">권장: 40% ~ 70% (텍스트 가독성 최적화)</span>
            </div>
            <div class="pt-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                v-model.number="heroForm.hero_overlay_opacity"
                class="w-full accent-purple-600 cursor-pointer"
              />
            </div>
          </div>

          <!-- 실시간 배경 렌더링 미리보기 박스 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>🖥️ 실시간 메인 상단 비주얼 미리보기 (Live Preview)</span>
              <span class="text-[11px] text-slate-400 font-mono">실제 텍스트 오버레이 렌더링</span>
            </div>
            <div class="relative h-56 sm:h-64 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center text-center shadow-inner">
              <!-- Background Layer -->
              <iframe
                v-if="heroForm.hero_media_type === 'youtube' && parsedHeroEmbed"
                :src="parsedHeroEmbed"
                class="absolute inset-0 w-full h-full border-0 pointer-events-none scale-125"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
              <video
                v-else-if="heroForm.hero_media_type === 'video_mp4' && heroForm.hero_media_url"
                :src="heroForm.hero_media_url"
                autoplay
                loop
                muted
                playsinline
                class="absolute inset-0 w-full h-full object-cover"
              ></video>
              <img
                v-else-if="heroForm.hero_media_url"
                :src="heroForm.hero_media_url"
                class="absolute inset-0 w-full h-full object-cover"
              />
              <div v-else class="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950"></div>

              <!-- Dynamic Dark Overlay Layer -->
              <div
                class="absolute inset-0 pointer-events-none transition-opacity"
                :style="{ backgroundColor: `rgba(0, 0, 0, ${heroForm.hero_overlay_opacity / 100})` }"
              ></div>

              <!-- Sample Text on Overlay (z-20) -->
              <div class="relative z-20 text-white space-y-2 p-4 pointer-events-none max-w-lg">
                <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  EUCHS B2B 수입대행 ERP
                </span>
                <h3 class="text-lg sm:text-xl font-black tracking-tight drop-shadow-md">
                  멋진일을 좋은 사람과 함께하는 이유씨컴퍼니
                </h3>
                <p class="text-xs text-slate-200 drop-shadow-xs font-medium">
                  중국 이우 4,000평 자체 물류센터 검수 및 한국 직배송 원스톱 솔루션
                </p>
              </div>
            </div>
          </div>

          <!-- Hero 저장 버튼 -->
          <div class="flex justify-end pt-2">
            <button
              type="button"
              @click="saveHeroSettings"
              class="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-2 active:scale-95"
            >
              <span>✓ 메인 상단 비주얼(Hero) 설정 저장하기</span>
            </button>
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
import { ref, computed, onMounted } from 'vue'
import {
  currentSettings,
  fetchSiteSettings,
  updateServiceMedia,
  saveSiteSettings,
  isVideoMedia
} from '@/lib/settings'

const activeTab = ref('rate') // 'rate' | 'media'

const RATE_STORAGE_KEY = 'euchs_system_settings'
const SERVICE_MEDIA_STORAGE_KEY = 'euchs_service_media'

// ----------------------------------------------------
// [TAB 1] 환율 & 운영 수수료 상태
// ----------------------------------------------------
const DEFAULT_RATE_SETTINGS = {
  exchangeRateMode: 'auto', // 'auto' | 'manual'
  manualRate: 231.0,
  baseLiveRate: 206.19,
  rateMargin: 20.0,
  appliedRate: 226.19,
  agencyFeeRate: 8,
  minAgencyFee: 10000,
  oceanFreightPerCbm: 98000,
  customsBrokerFee: 33000,
  ftaCoIssuanceFee: 33000,
  updatedAt: ''
}

const rateForm = ref({ ...DEFAULT_RATE_SETTINGS })
const rateLastSavedTime = ref('기본 설정')

const calculatedAppliedRate = computed(() => {
  if (rateForm.value.exchangeRateMode === 'manual') {
    return Number(rateForm.value.manualRate || 0)
  }
  return Number(rateForm.value.baseLiveRate || 0) + Number(rateForm.value.rateMargin || 0)
})

// ----------------------------------------------------
// [TAB 2-1] 4대 핵심 서비스 카드 미디어 상태 (2x2 그리드)
// ----------------------------------------------------
const DEFAULT_SERVICE_CARDS = [
  {
    key: 'card1',
    title: '#1 쿠팡 로켓그로스 & 밀크런',
    subTitle: '바코드 부착 & 물류창고 입고보관',
    icon: '🚀',
    badgeTheme: 'bg-rose-50 text-rose-700 border-rose-200',
    mediaUrl: ''
  },
  {
    key: 'card2',
    title: '#2 1688 / 타오바오 구매대행',
    subTitle: '실시간 재고확인 & 안전 결제대행',
    icon: '🛒',
    badgeTheme: 'bg-blue-50 text-blue-700 border-blue-200',
    mediaUrl: ''
  },
  {
    key: 'card3',
    title: '#3 무역대행 & OEM/ODM 맞춤제조',
    subTitle: '공장 다이렉트 소싱 & 맞춤생산',
    icon: '🏭',
    badgeTheme: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    mediaUrl: ''
  },
  {
    key: 'card4',
    title: '#4 중국 이우(푸텐) 시장조사 투어',
    subTitle: '전담 가이드 & 도매시장 바이어 투어',
    icon: '🚩',
    badgeTheme: 'bg-amber-50 text-amber-700 border-amber-200',
    mediaUrl: ''
  }
]

const serviceCardsList = ref(JSON.parse(JSON.stringify(DEFAULT_SERVICE_CARDS)))
const fileInputs = ref({})

// ----------------------------------------------------
// [TAB 2-2] 메인 상단 비주얼(Hero) 배경 상태
// ----------------------------------------------------
const heroForm = ref({
  hero_media_type: 'video_mp4', // 'video_mp4' | 'youtube' | 'image'
  hero_media_url: '',
  hero_overlay_opacity: 60
})
const heroFileInput = ref(null)
const mediaLastSavedTime = ref('기본 설정')

const toast = ref({ show: false, message: '' })
let toastTimer = null

function fmtN(val) {
  return Math.round(Number(val) || 0).toLocaleString('ko-KR')
}

function showToast(msg) {
  clearTimeout(toastTimer)
  toast.value = { show: true, message: msg }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// 유튜브 URL을 embed iframe용 URL로 자동 변환
const parsedHeroEmbed = computed(() => {
  const url = heroForm.value.hero_media_url
  if (!url || typeof url !== 'string') return ''

  let videoId = ''
  if (url.includes('youtube.com/watch')) {
    try {
      const u = new URL(url)
      videoId = u.searchParams.get('v') || ''
    } catch (e) {
      const match = url.match(/[?&]v=([^&#]+)/)
      videoId = match ? match[1] : ''
    }
  } else if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/')
    videoId = (parts[1] || '').split('?')[0].split('&')[0]
  } else if (url.includes('youtube.com/embed/')) {
    return url
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`
  }

  return ''
})

function refreshLiveRate() {
  const simulated = +(206.19 + (Math.random() * 0.8 - 0.4)).toFixed(2)
  rateForm.value.baseLiveRate = simulated
  showToast(`실시간 고시환율이 갱신되었습니다. (₩${simulated})`)
}

// ----------------------------------------------------
// 파일 업로드 핸들러 (로컬 Object URL / Supabase Storage 바인딩)
// ----------------------------------------------------
function triggerUpload(cardKey) {
  const inputEl = fileInputs.value[cardKey]
  if (inputEl) inputEl.click()
}

function handleFileUpload(e, cardKey) {
  const file = e.target?.files?.[0]
  if (!file) return

  // 로컬 브라우저 미리보기 Object URL 생성
  const fileUrl = URL.createObjectURL(file)
  const targetCard = serviceCardsList.value.find(c => c.key === cardKey)
  if (targetCard) {
    targetCard.mediaUrl = fileUrl
    saveMediaCard(cardKey)
  }
  e.target.value = ''
}

function triggerHeroUpload() {
  if (heroFileInput.value) heroFileInput.value.click()
}

function handleHeroFileUpload(e) {
  const file = e.target?.files?.[0]
  if (!file) return

  const fileUrl = URL.createObjectURL(file)
  heroForm.value.hero_media_url = fileUrl
  showToast('파일이 선택되었습니다. [Hero 설정 저장하기]를 눌러 완료해 주세요.')
  e.target.value = ''
}

// ----------------------------------------------------
// 데이터 로드 & 저장
// ----------------------------------------------------
async function loadAllSettings() {
  // 1. 환율 설정 로드
  try {
    const rawRate = localStorage.getItem(RATE_STORAGE_KEY)
    if (rawRate) {
      const parsed = JSON.parse(rawRate)
      rateForm.value = { ...DEFAULT_RATE_SETTINGS, ...parsed }
      if (parsed.updatedAt) rateLastSavedTime.value = parsed.updatedAt
    }
  } catch (e) {
    console.warn('Failed to load rate settings:', e)
  }

  // 2. 사이트 설정 및 서비스 카드 미디어 로드
  try {
    const settings = await fetchSiteSettings()
    if (settings) {
      // Hero 배경 로드
      heroForm.value.hero_media_type = settings.hero_media_type || 'video_mp4'
      heroForm.value.hero_media_url = settings.hero_media_url || ''
      heroForm.value.hero_overlay_opacity = Number(settings.hero_overlay_opacity) || 60

      // 4대 카드 미디어 바인딩
      const media = settings.service_media || {}
      serviceCardsList.value.forEach(card => {
        card.mediaUrl = media[card.key] || ''
      })

      if (settings.updated_at) {
        mediaLastSavedTime.value = new Date(settings.updated_at).toLocaleString('ko-KR')
      }
    }
  } catch (e) {
    console.warn('Failed to load site settings from lib:', e)
  }
}

function saveRateSettings() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const dataToSave = {
    ...rateForm.value,
    appliedRate: calculatedAppliedRate.value,
    updatedAt: dateStr
  }

  localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(dataToSave))
  rateLastSavedTime.value = dateStr

  window.dispatchEvent(new CustomEvent('euchs-settings-update', { detail: dataToSave }))
  window.dispatchEvent(new CustomEvent('euchs-rate-update', { detail: dataToSave }))
  window.dispatchEvent(new Event('storage'))

  showToast('환율 및 운영 수수료 설정이 저장되었습니다.')
}

async function saveMediaCard(cardKey) {
  const mediaObj = {}
  serviceCardsList.value.forEach(card => {
    mediaObj[card.key] = card.mediaUrl || ''
  })

  try {
    await updateServiceMedia(mediaObj)
    showToast('서비스 카드 미디어가 자동 저장되었습니다.')
  } catch (e) {
    showToast('미디어 저장 완료 (로컬 반영)')
  }
}

async function deleteMediaCard(cardKey) {
  const targetCard = serviceCardsList.value.find(c => c.key === cardKey)
  if (targetCard) {
    targetCard.mediaUrl = ''
  }
  await saveMediaCard(cardKey)
  showToast('등록된 미디어가 삭제되고 기본 스타일로 복원되었습니다.')
}

async function saveHeroSettings() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const mediaObj = {}
  serviceCardsList.value.forEach(card => {
    mediaObj[card.key] = card.mediaUrl || ''
  })

  const payload = {
    ...currentSettings.value,
    hero_media_type: heroForm.value.hero_media_type,
    hero_media_url: heroForm.value.hero_media_url,
    hero_overlay_opacity: heroForm.value.hero_overlay_opacity,
    service_media: mediaObj,
    updated_at: new Date().toISOString()
  }

  try {
    await saveSiteSettings(payload)
    mediaLastSavedTime.value = dateStr
    showToast('메인 상단 비주얼(Hero) 설정이 성공적으로 저장되었습니다.')
  } catch (e) {
    showToast('Hero 설정 저장 완료')
  }
}

function resetRateToDefault() {
  if (confirm('환율 및 수수료 설정을 기본 권장값으로 초기화하시겠습니까?')) {
    rateForm.value = { ...DEFAULT_RATE_SETTINGS }
    saveRateSettings()
  }
}

onMounted(() => {
  loadAllSettings()
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
