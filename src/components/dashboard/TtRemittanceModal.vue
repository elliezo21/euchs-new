<template>
  <!-- T/T 해외송금(USD) 1차 결제 안내 + PROFORMA INVOICE 미리보기·PDF — emits: close -->
  <!-- 배치: 헤더(송금액) → 탭 ①처음(은행 방문) / ②등록 후(PC) → 2단(왼쪽 인보이스 · 오른쪽 선택 탭 안내) → 접이식 안내 -->
  <div class="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    @click.self="$emit('close')">
    <div class="bg-white rounded-3xl max-w-[1360px] w-full max-h-[94vh] lg:h-[94vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto">

      <!-- 헤더 -->
      <div class="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white flex items-center justify-between gap-3 shrink-0">
        <div class="min-w-0">
          <div class="text-[11px] font-bold text-sky-300 tracking-wide">1차 결제 · T/T 해외송금 (USD)</div>
          <div class="font-black text-base sm:text-lg truncate">발주번호 {{ order.orderNumber }}</div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <button v-if="state === 'ready' && invoice" type="button" @click="startGuide(isEditing ? 'edit' : 'main')"
            :aria-label="TT_GUIDE_REPLAY"
            class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/15 text-[12px] font-black text-amber-200 transition">
            <span>💡</span><span class="hidden sm:inline">{{ TT_GUIDE_REPLAY }}</span>
          </button>
          <div v-if="state === 'ready' && invoice" data-guide="amount" class="text-right">
            <div class="text-[11px] font-bold text-sky-300">송금액</div>
            <div class="flex items-center gap-1.5">
              <span class="font-black font-mono text-lg sm:text-2xl text-amber-300">USD {{ formatUsd(invoice.usdTotal) }}</span>
              <button type="button" @click="copyText(pcFieldValue('usdTotal'), '송금 금액')"
                class="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1 transition">
                <Copy class="w-3 h-3" />복사
              </button>
            </div>
          </div>
          <button type="button" @click="$emit('close')" class="p-2 rounded-xl hover:bg-white/10 transition" aria-label="닫기">
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- 로딩 -->
      <div v-if="state === 'loading'" class="py-16 flex flex-col items-center gap-3 text-gray-500">
        <Loader2 class="w-8 h-8 animate-spin text-sky-600" />
        <p class="font-bold">인보이스를 준비하고 있어요…</p>
      </div>

      <!-- 실패 -->
      <div v-else-if="state === 'error'" class="m-4 sm:m-6 p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3 text-sm">
        <div class="flex items-start gap-2 text-red-700">
          <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
          <p class="font-bold leading-relaxed">{{ errorMessage }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" @click="loadInvoice"
            class="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-700 font-bold text-xs hover:bg-red-100 transition">다시 시도</button>
          <button type="button" @click="openKakao"
            class="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition">1:1 상담</button>
        </div>
      </div>

      <template v-else-if="state === 'ready' && invoice">
        <!-- 탭 (세그먼트형, 창 전체 폭) -->
        <div class="px-3 sm:px-5 pt-3 pb-2 border-b border-gray-200 bg-white shrink-0">
          <div data-guide="tabs" class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-gray-100" role="tablist">
            <button v-for="t in TT_TABS" :key="t.key" type="button" role="tab" :aria-selected="activeTab === t.key"
              @click="activeTab = t.key"
              class="px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-base transition"
              :class="activeTab === t.key ? 'bg-slate-900 text-white shadow-md' : 'text-gray-600 hover:bg-white'">
              {{ t.label }}
            </button>
          </div>
          <p class="mt-1.5 text-[12px] text-sky-700 text-center">{{ TT_TAB_HINT }}</p>
        </div>

        <!-- 본문: 좁은 화면은 전체 스크롤(안내 → 인보이스), lg 이상은 2단 각자 스크롤 -->
        <div class="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden text-sm">
          <div class="flex flex-col lg:grid lg:grid-cols-[55fr_45fr] lg:grid-rows-[minmax(0,1fr)] lg:h-full">

            <!-- 오른쪽(좁은 화면에선 위): 선택된 탭 안내만 렌더링 -->
            <div class="order-1 lg:order-2 lg:min-h-0 lg:h-full lg:overflow-y-auto overscroll-contain p-4 sm:p-5 lg:border-l border-gray-200 bg-slate-50/60 space-y-4">

              <!-- ① 처음 보내요 · 은행 방문 -->
              <ol v-if="activeTab === 'first'" class="space-y-4">
                <li class="flex gap-3">
                  <span class="tt-step-no">1</span>
                  <div class="flex-1 min-w-0 space-y-2">
                    <h4 class="font-black text-gray-900">{{ TT_BUYER_STEP.title }}</h4>
                    <p class="text-gray-700 leading-relaxed">{{ TT_BUYER_STEP.desc }}</p>
                    <button v-if="!isEditing" type="button" @click="editBuyerFromStep"
                      class="px-4 py-2 rounded-xl border-2 border-sky-500 text-sky-700 font-black text-xs hover:bg-sky-50 transition flex items-center gap-1.5">
                      <Pencil class="w-4 h-4" />{{ TT_BUYER_EDIT.button }}
                    </button>
                  </div>
                </li>
                <li class="flex gap-3">
                  <span class="tt-step-no">2</span>
                  <div class="flex-1 min-w-0 space-y-2">
                    <h4 class="font-black text-gray-900">{{ TT_FIRST_STEPS.print.title }}</h4>
                    <button data-guide="pdf" type="button" @click="downloadPdf" :disabled="pdfBlockers.length > 0 || isGenerating"
                      class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                      <FileDown class="w-4 h-4" />{{ isGenerating ? 'PDF 만드는 중…' : '인보이스 PDF 다운로드' }}
                    </button>
                    <div v-if="pdfBlockers.length > 0" class="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-700 font-bold space-y-0.5">
                      <p v-for="b in pdfBlockers" :key="b">• {{ b }}</p>
                    </div>
                    <p class="text-gray-700 leading-relaxed">{{ TT_FIRST_STEPS.print.desc }}</p>
                  </div>
                </li>
                <li class="flex gap-3">
                  <span class="tt-step-no">3</span>
                  <div class="flex-1 min-w-0 space-y-2">
                    <h4 class="font-black text-gray-900">{{ TT_FIRST_STEPS.docs.title }}</h4>
                    <ul data-guide="docs" class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <li v-for="d in TT_FIRST_STEPS.docs.items" :key="d" class="flex items-center gap-1.5 text-gray-800">
                        <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />{{ d }}
                      </li>
                    </ul>
                  </div>
                </li>
                <li class="flex gap-3">
                  <span class="tt-step-no">4</span>
                  <div class="flex-1 min-w-0 space-y-2">
                    <h4 class="font-black text-gray-900">{{ TT_FIRST_STEPS.form.title }}</h4>
                    <p class="text-gray-700 leading-relaxed">{{ TT_FIRST_STEPS.form.desc }}</p>
                    <button data-guide="form-example" type="button" @click="showFormExample = true"
                      class="px-4 py-2 rounded-xl border-2 border-sky-500 text-sky-700 font-black text-xs hover:bg-sky-50 transition flex items-center gap-1.5">
                      <FileText class="w-4 h-4" />{{ TT_FIRST_STEPS.form.button }}
                    </button>
                    <div data-guide="register" class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <p class="font-bold text-emerald-900 leading-relaxed">{{ TT_FIRST_STEPS.register.text }}</p>
                      <button type="button" @click="activeTab = 'pc'"
                        class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition">{{ TT_FIRST_STEPS.register.button }}</button>
                    </div>
                  </div>
                </li>
                <li class="flex gap-3">
                  <span class="tt-step-no">5</span>
                  <div class="flex-1 min-w-0 space-y-2">
                    <h4 class="font-black text-gray-900">{{ TT_RECEIPT_STEP.title }}</h4>
                    <TtReceiptStep @consult="openKakao" />
                  </div>
                </li>
              </ol>

              <!-- ② 등록했어요 · 집·사무실 PC -->
              <div v-else class="space-y-4">
                <p data-guide="pc-notice" class="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 leading-relaxed font-medium">{{ TT_PC_NOTICE }}</p>
                <ol class="space-y-4">
                  <li class="flex gap-3">
                    <span class="tt-step-no">1</span>
                    <div class="flex-1 min-w-0 space-y-2">
                      <h4 class="font-black text-gray-900">{{ TT_BUYER_STEP.title }}</h4>
                      <p class="text-gray-700 leading-relaxed">{{ TT_BUYER_STEP.desc }}</p>
                      <button v-if="!isEditing" type="button" @click="editBuyerFromStep"
                        class="px-4 py-2 rounded-xl border-2 border-sky-500 text-sky-700 font-black text-xs hover:bg-sky-50 transition flex items-center gap-1.5">
                        <Pencil class="w-4 h-4" />{{ TT_BUYER_EDIT.button }}
                      </button>
                    </div>
                  </li>
                  <li class="flex gap-3">
                    <span class="tt-step-no">2</span>
                    <div class="flex-1 min-w-0 space-y-2">
                      <h4 class="font-black text-gray-900">{{ TT_PC_STEPS.pdf.title }}</h4>
                      <button data-guide="pdf" type="button" @click="downloadPdf" :disabled="pdfBlockers.length > 0 || isGenerating"
                        class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileDown class="w-4 h-4" />{{ isGenerating ? 'PDF 만드는 중…' : '인보이스 PDF 다운로드' }}
                      </button>
                      <div v-if="pdfBlockers.length > 0" class="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-700 font-bold space-y-0.5">
                        <p v-for="b in pdfBlockers" :key="b">• {{ b }}</p>
                      </div>
                      <p class="text-gray-700 leading-relaxed">{{ TT_PC_STEPS.pdf.desc }}</p>
                    </div>
                  </li>
                  <li data-guide="pc-fields" class="flex gap-3">
                    <span class="tt-step-no">3</span>
                    <div class="flex-1 min-w-0 space-y-2">
                      <h4 class="font-black text-gray-900">{{ TT_PC_STEPS.fields.title }}</h4>
                      <p class="text-gray-700 leading-relaxed">{{ TT_PC_STEPS.fields.desc }}</p>
                      <div class="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">
                        <div v-for="fd in TT_PC_FIELDS" :key="fd.key" class="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3"
                          :class="fd.emphasis ? 'bg-amber-50/60' : ''">
                          <div class="sm:w-32 shrink-0 text-[12px] font-bold text-gray-500 flex items-center gap-1">
                            {{ fd.label }}
                            <button v-if="fd.tip" type="button" @click="openTip = openTip === fd.key ? '' : fd.key"
                              class="text-sky-600 hover:text-sky-800" :aria-label="`${fd.label} 입력 도움말`">
                              <Info class="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div class="flex-1 min-w-0 space-y-0.5">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-black break-all" :class="[fd.emphasis ? 'text-base' : '', pcFieldValue(fd.key) ? 'text-gray-900' : 'text-red-600']">{{ pcFieldValue(fd.key) || '확인 필요' }}</span>
                              <button v-if="fd.copy && pcFieldValue(fd.key)" type="button" @click="copyText(pcFieldValue(fd.key), fd.label)"
                                class="px-2 py-0.5 rounded-lg border border-gray-300 text-[11px] font-bold text-gray-600 hover:bg-gray-100 transition flex items-center gap-1">
                                <Copy class="w-3 h-3" />복사
                              </button>
                            </div>
                            <p v-if="fd.note" class="text-[12px] text-gray-600 leading-relaxed">{{ fd.note }}</p>
                            <p v-if="fd.tip && openTip === fd.key" class="text-[12px] text-sky-800 bg-sky-50 rounded-lg px-2 py-1 leading-relaxed">ⓘ {{ fd.tip }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li class="flex gap-3">
                    <span class="tt-step-no">4</span>
                    <div class="flex-1 min-w-0 space-y-2">
                      <h4 class="font-black text-gray-900">{{ TT_RECEIPT_STEP.title }}</h4>
                      <TtReceiptStep @consult="openKakao" />
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <!-- 왼쪽(좁은 화면에선 아래): 인보이스 미리보기 — 탭과 상관없이 항상 표시 -->
            <div class="order-2 lg:order-1 lg:min-h-0 lg:h-full lg:overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
          <section class="space-y-2">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <h3 class="font-black text-gray-900">📄 인보이스 미리보기</h3>
            </div>
            <div data-guide="buyer" class="p-2.5 pl-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p class="flex-1 min-w-[220px] text-[12px] font-bold text-amber-800 leading-relaxed">⚠️ {{ TT_BUYER_CHECK }}</p>
              <button v-if="!isEditing" type="button" @click="onClickEditBuyer"
                class="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 hover:to-sky-700 text-white text-[13px] font-black ring-1 ring-sky-700/30 shadow-[0_8px_20px_-8px_rgba(2,132,199,0.75)] transition">
                <Pencil class="w-4 h-4" />{{ TT_BUYER_EDIT.button }}
              </button>
            </div>

            <div class="rounded-2xl border border-gray-300 bg-white p-3 sm:p-5 font-sans text-[11px] sm:text-[12px] text-gray-900 overflow-x-auto">
              <div class="min-w-[560px] space-y-3">
                <div class="text-center font-black text-lg sm:text-xl tracking-wide">PROFORMA INVOICE</div>
                <div class="text-right leading-snug">
                  <div class="font-bold">NO : {{ invoice.invoiceNo }}</div>
                  <div>DATE : {{ invoice.issueDateKst }}</div>
                </div>

                <div class="grid grid-cols-2 border border-gray-400">
                  <div class="p-2 border-r border-gray-400 space-y-0.5">
                    <div class="font-bold">SHIPPER / EXPORTER</div>
                    <div>{{ fixed.shipper.name }}</div>
                    <div>{{ fixed.shipper.address }}</div>
                    <div>TEL : {{ fixed.shipper.tel }}</div>
                  </div>
                  <div class="p-2 space-y-1">
                    <div class="font-bold">BUYER / IMPORTER</div>
                    <!-- 영문 상호 -->
                    <template v-if="isEditing">
                      <label class="block text-[10px] text-gray-500">영문 상호 (영문·숫자·공백·, . - &amp; ( ) / ' # 만)</label>
                      <div data-guide="edit-name" class="flex items-center gap-1">
                        <input v-model="editForm.nameEn" type="text" maxlength="100"
                          class="flex-1 min-w-0 px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 uppercase" />
                        <span class="shrink-0">({{ bizNoFormatted || '확인 필요' }})</span>
                      </div>
                    </template>
                    <div v-else :class="buyerNameDisplay ? '' : 'text-red-600 font-bold'">{{ buyerNameDisplay || '영문 상호 확인 필요' }}</div>

                    <!-- 영문 주소 -->
                    <template v-if="isEditing || addressMissing">
                      <template v-if="addressMissing || searchMode">
                        <label class="block text-[10px] text-gray-500">사업장 주소 검색 (사업자등록증 주소와 같게)</label>
                        <div data-guide="edit-search" class="space-y-1">
                          <AddressSearchInput v-model="addrSearch" :detail-input="detailKoRef" @select="onAddressSelect"
                            input-class="w-full px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                          <input ref="detailKoRef" v-model="editForm.detailKo" @input="onDetailKoInput" type="text" placeholder="한글 상세주소 (예: 2층 201호)"
                            class="w-full px-2 py-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                        </div>
                      </template>
                      <label class="block text-[10px] text-gray-500">영문 주소 (도로명)</label>
                      <input data-guide="edit-road" v-model="editForm.roadEn" type="text" maxlength="200" placeholder="주소를 검색하면 자동으로 채워져요"
                        class="w-full px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                      <label class="block text-[10px] text-gray-500">영문 상세주소</label>
                      <input data-guide="edit-detail" v-model="editForm.detailEn" type="text" maxlength="100" placeholder="예: #201, 2F"
                        class="w-full px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                      <button v-if="!addressMissing && !searchMode" type="button" @click="searchMode = true"
                        class="text-[11px] font-bold text-sky-700 underline">주소 다시 검색하기</button>
                      <p v-if="addrNotice" class="text-[11px] text-red-600">{{ addrNotice }}</p>
                    </template>
                    <div v-else>{{ buyerAddress }}</div>

                    <div :class="buyerTel ? '' : 'text-red-600 font-bold'">TEL : {{ buyerTel || '확인 필요' }}</div>

                    <div v-if="isEditing || addressMissing" data-guide="edit-save" class="flex gap-1.5 pt-1">
                      <button type="button" @click="saveBuyer" :disabled="isSaving"
                        class="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition disabled:opacity-50">
                        {{ isSaving ? '저장 중…' : '저장' }}
                      </button>
                      <button v-if="isEditing" type="button" @click="cancelEdit" :disabled="isSaving"
                        class="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 font-bold text-[11px] hover:bg-gray-100 transition">취소</button>
                    </div>
                    <p v-if="editError" class="text-[11px] text-red-600 font-bold">{{ editError }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 font-bold">
                  <div>SHIPPING COUNTRY : {{ fixed.shippingCountry }}</div>
                  <div>DESTINATION COUNTRY : {{ fixed.destinationCountry }}</div>
                </div>
                <div>{{ fixed.intro }}</div>

                <table class="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr class="bg-gray-100 font-bold">
                      <th class="border border-gray-400 px-1.5 py-1 w-[12%]">Model</th>
                      <th class="border border-gray-400 px-1.5 py-1 text-left">Item description</th>
                      <th class="border border-gray-400 px-1.5 py-1 text-right w-[12%]">Quantity</th>
                      <th class="border border-gray-400 px-1.5 py-1 text-right w-[15%]">U/Price (USD)</th>
                      <th class="border border-gray-400 px-1.5 py-1 text-right w-[17%]">Amount (USD)</th>
                      <th class="border border-gray-400 px-1.5 py-1 w-[10%]">Rmks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(l, i) in invoice.lines" :key="i">
                      <td class="border border-gray-400 px-1.5 py-1"></td>
                      <td class="border border-gray-400 px-1.5 py-1">{{ l.description }}</td>
                      <td class="border border-gray-400 px-1.5 py-1 text-right font-mono">{{ Number(l.quantity).toLocaleString('en-US') }}</td>
                      <td class="border border-gray-400 px-1.5 py-1 text-right font-mono">{{ formatUnitPrice(l.unitPrice) }}</td>
                      <td class="border border-gray-400 px-1.5 py-1 text-right font-mono">{{ formatUsd(l.amount) }}</td>
                      <td class="border border-gray-400 px-1.5 py-1"></td>
                    </tr>
                    <tr class="font-bold bg-gray-50">
                      <td class="border border-gray-400 px-1.5 py-1"></td>
                      <td class="border border-gray-400 px-1.5 py-1">TOTAL</td>
                      <td class="border border-gray-400 px-1.5 py-1 text-right font-mono">{{ totalQty.toLocaleString('en-US') }}</td>
                      <td class="border border-gray-400 px-1.5 py-1"></td>
                      <td class="border border-gray-400 px-1.5 py-1 text-right font-mono">USD {{ formatUsd(invoice.usdTotal) }}</td>
                      <td class="border border-gray-400 px-1.5 py-1"></td>
                    </tr>
                  </tbody>
                </table>

                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <div><b>Amount</b><br>{{ fixed.amountTerm }} &nbsp;USD {{ formatUsd(invoice.usdTotal) }}</div>
                    <div><b>Port of lading</b><br>{{ fixed.portOfLading }}</div>
                    <div><b>Port of discharge</b><br>{{ fixed.portOfDischarge }}</div>
                    <div><b>The date of issue</b><br>{{ invoice.issueDateKst }}</div>
                    <div><b>TERMS OF PAYMENT</b><br>{{ fixed.termsOfPayment }}</div>
                    <div><b>BANK CHARGES</b><br>{{ fixed.bankCharges }}</div>
                  </div>
                  <div class="space-y-1.5">
                    <div><b>INTERMEDIARY BANK</b><br>{{ fixed.intermediaryBank.name }}<br>SWIFT BIC : <CopyInline :text="fixed.intermediaryBank.swift" @copy="copyText" /></div>
                    <div><b>BENEFICIARY BANK</b><br>{{ fixed.beneficiaryBank.name }}<br>SWIFT CODE NO : <CopyInline :text="fixed.beneficiaryBank.swift" @copy="copyText" /><br>ADD : {{ fixed.beneficiaryBank.address }}</div>
                    <div><b>BENEFICIARY</b><br>NAME : <CopyInline :text="fixed.beneficiary.name" @copy="copyText" /><br>A/C NO : <CopyInline :text="fixed.beneficiary.accountNo" @copy="copyText" /><br>ADD : {{ fixed.beneficiary.address }}</div>
                    <div class="pt-1">
                      <b>Confirmed By</b>
                      <img :src="`data:image/png;base64,${seal}`" alt="Confirmed By seal" class="w-[132px] mt-1" />
                    </div>
                  </div>
                </div>
                <div class="italic text-gray-700">{{ fixed.validity }}</div>
              </div>
            </div>
          </section>

              <!-- 계산식 한 줄 -->
              <section data-guide="calc" class="p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-500 mb-1">송금 금액 계산</div>
                <p class="font-mono text-[13px] text-gray-800 break-words leading-relaxed">
                  ₩{{ formatKrw(invoice.krwTotal) }} ÷ {{ ttRateTypeLabel(invoice.rateType) }} {{ formatRate(invoice.rate) }}
                  (인보이스 발행 {{ kstDateTime(invoice.issuedAt) }} 기준·고정) = <b class="text-sky-800">USD {{ formatUsd(invoice.usdTotal) }}</b>
                </p>
              </section>
            </div>
          </div>
        </div>

        <!-- 맨 아래 접이식 (기본 접힘) -->
        <details class="shrink-0 border-t border-gray-200 bg-white text-sm">
          <summary class="px-5 sm:px-6 py-2.5 font-bold text-gray-600 cursor-pointer select-none">
            {{ TT_INTRO.title }} · 유효기간 · 보관 안내
          </summary>
          <div class="px-5 sm:px-6 pb-3 space-y-1.5 text-gray-700">
            <p class="leading-relaxed">{{ TT_INTRO.desc }}</p>
            <p class="font-bold text-sky-800">⏰ {{ TT_DEADLINE }}</p>
            <p class="text-[12px] text-gray-500">📁 {{ TT_KEEP_NOTICE }}</p>
          </div>
        </details>
      </template>

      <!-- 푸터 -->
      <div class="px-5 sm:px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
        <button type="button" @click="$emit('close')"
          class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition">닫기</button>
      </div>
    </div>

    <!-- 신청서 작성 예시 (오버레이) -->
    <TtApplicationFormExample v-if="showFormExample && invoice" :sections="formSections" @close="showFormExample = false" />

    <Transition name="toast-fade">
      <div v-if="toastMsg" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl">
        {{ toastMsg }}
      </div>
    </Transition>

    <SpotlightGuide v-model:open="guideOpen" :steps="guideSteps" :badge="TT_GUIDE_BADGE" @finish="onGuideFinish" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, defineComponent, h } from 'vue'
import { X, Loader2, AlertCircle, Copy, Pencil, FileDown, FileText, CheckCircle2, Info } from 'lucide-vue-next'
import AddressSearchInput from '@/components/common/AddressSearchInput.vue'
import TtReceiptStep from '@/components/dashboard/TtReceiptStep.vue'
import TtApplicationFormExample from '@/components/dashboard/TtApplicationFormExample.vue'
import SpotlightGuide from '@/components/common/SpotlightGuide.vue'
import { supabase } from '@/lib/supabase'
import { currentUser, currentUserProfile, fetchUserProfile, updateTtBuyerProfile } from '@/lib/auth'
import { romanizeKo } from '@/utils/romanizeKo'
import { convertDetailToEnglish, formatEnglishAddress, formatInvoiceBuyerAddress } from '@/utils/addressEnglish'
import { formatUsd, formatUnitPrice, findNonAsciiFields, downloadTtInvoicePdf } from '@/utils/ttInvoicePdf'
import {
  TT_TABS, TT_TAB_HINT, TT_FIRST_STEPS, TT_PC_NOTICE, TT_PC_STEPS, TT_PC_FIELDS, TT_CURRENCY_TEXT, TT_REMIT_REASON,
  TT_RECEIPT_STEP, TT_FORM_EXAMPLE, TT_INTRO, TT_DEADLINE, TT_KEEP_NOTICE, TT_BUYER_CHECK, TT_ERROR_MESSAGES,
  TT_FEE_BEARER_TEXT, TT_BUYER_EDIT, TT_BUYER_STEP, ttRateTypeLabel,
  TT_GUIDE_BADGE, TT_GUIDE_REPLAY, TT_GUIDE_STEPS_FIRST, TT_GUIDE_STEPS_PC, TT_GUIDE_STEPS_EDIT,
} from '@/data/ttRemittanceGuide'

const props = defineProps({
  /** OrderManageView 주문 객체 (dbId = orders.id, orderNumber) */
  order: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xmQWsK/chat'
// PDF(영문 폰트)에 넣을 수 있는 글자만 — 영문·숫자·공백·, . - & ( ) / ' #
const EN_ALLOWED_RE = /^[A-Za-z0-9 ,.\-&()/'#]*$/

/** 값 옆 작은 복사 버튼 */
const CopyInline = defineComponent({
  props: { text: { type: String, required: true } },
  emits: ['copy'],
  setup(p, { emit: e }) {
    return () => h('span', { class: 'inline-flex items-center gap-1' }, [
      h('span', p.text),
      h('button', {
        type: 'button',
        class: 'px-1 rounded border border-gray-300 text-[10px] text-gray-600 hover:bg-gray-100',
        onClick: () => e('copy', p.text),
      }, '복사'),
    ])
  },
})

// ── 상태 ─────────────────────────────────────────────────────────────
const state = ref('loading') // loading | ready | error
const errorReason = ref('')
const invoice = ref(null)
const fixed = ref(null)
const seal = ref('')
const isGenerating = ref(false)
const toastMsg = ref('')
// 탭: 모달을 열 때마다 ① 처음(은행 방문)으로 시작한다 — 기억하지 않는다
const activeTab = ref('first')
const showFormExample = ref(false)
const openTip = ref('') // ⓘ 도움말이 펼쳐진 칸 key
let toastTimer = null

const errorMessage = computed(() => TT_ERROR_MESSAGES[errorReason.value] || TT_ERROR_MESSAGES.unavailable)

async function loadInvoice() {
  state.value = 'loading'
  errorReason.value = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      console.error('[TtRemittanceModal] 세션 토큰 없음 — 인보이스 요청 불가')
      errorReason.value = 'not_logged_in'
      state.value = 'error'
      return
    }
    const r = await fetch('/api/tt-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ orderId: props.order.dbId }),
    })
    const body = await r.json().catch(() => null)
    if (r.status === 401) {
      errorReason.value = 'not_logged_in'
      state.value = 'error'
      return
    }
    if (body?.success !== true || !body.invoice || !body.fixed || !body.seal) {
      console.error('[TtRemittanceModal] 인보이스 발행 실패:', r.status, body)
      errorReason.value = body?.reason || 'unavailable'
      state.value = 'error'
      return
    }
    invoice.value = body.invoice
    fixed.value = body.fixed
    seal.value = body.seal
    state.value = 'ready'
  } catch (e) {
    console.error('[TtRemittanceModal] 인보이스 요청 오류:', e)
    errorReason.value = 'unavailable'
    state.value = 'error'
  }
}

// ── BUYER (profiles 기준 — 스냅샷에 넣지 않음) ────────────────────────
const profile = computed(() => currentUserProfile.value || {})

const companyNameKo = computed(() => String(profile.value.company_name || '').trim())
const buyerNameEn = computed(() => {
  const saved = String(profile.value.company_name_en || '').trim()
  if (saved) return saved
  return companyNameKo.value ? romanizeKo(companyNameKo.value) : ''
})
const bizNoFormatted = computed(() => {
  const d = String(profile.value.business_number || '').replace(/[^0-9]/g, '')
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : ''
})
const buyerNameDisplay = computed(() => (buyerNameEn.value && bizNoFormatted.value) ? `${buyerNameEn.value}(${bizNoFormatted.value})` : '')
// DB 값(영문 상세 + 영문 도로명) — 저장 값은 그대로 두고, 인보이스 표시(미리보기·PDF)에만 국가명을 붙인다
const buyerAddressRaw = computed(() => formatEnglishAddress(profile.value.business_address_en, profile.value.business_address_detail_en))
const buyerAddress = computed(() => formatInvoiceBuyerAddress(profile.value.business_address_en, profile.value.business_address_detail_en))
const addressMissing = computed(() => !buyerAddressRaw.value)
const buyerTel = computed(() => String(profile.value.phone || '').trim())

const totalQty = computed(() => (invoice.value?.lines || []).reduce((s, l) => s + Number(l.quantity || 0), 0))

/** PDF 다운로드를 막는 이유 목록 (값을 임의로 채우지 않는다) */
const pdfBlockers = computed(() => {
  if (!invoice.value) return []
  const list = []
  if (!companyNameKo.value) list.push('회원정보에 상호를 먼저 입력해 주세요. (계정 설정 > 통관 & 세무 증빙 정보)')
  if (!bizNoFormatted.value) list.push('회원정보의 사업자등록번호(10자리)를 확인해 주세요.')
  if (addressMissing.value) list.push('송금인(BUYER) 영문 주소를 입력하고 저장해 주세요.')
  if (!buyerTel.value) list.push('회원정보에 연락처를 먼저 입력해 주세요.')
  if (isEditing.value) list.push('수정 중인 송금인 정보를 먼저 저장해 주세요.')
  if (list.length === 0) {
    const bad = findNonAsciiFields({ invoice: invoice.value, fixed: fixed.value, buyer: pdfBuyer.value })
    if (bad.length > 0) list.push(`PDF는 영문만 들어갈 수 있어요. 한글 등이 섞인 칸을 [${TT_BUYER_EDIT.button}]로 고쳐 주세요: ${bad.join(', ')}`)
  }
  return list
})

const pdfBuyer = computed(() => ({ name: buyerNameDisplay.value, address: buyerAddress.value, tel: buyerTel.value }))

// ── 수정하기 ────────────────────────────────────────────────────────
const isEditing = ref(false)
const isSaving = ref(false)
const editError = ref('')
const searchMode = ref(false)
const addrSearch = ref('')
const addrNotice = ref('')
const detailKoRef = ref(null)
const detailEnTouched = ref(false)
const pickedAddress = ref(null) // 검색으로 고른 주소 { zipNo, roadAddr, jibunAddr }
const editForm = ref({ nameEn: '', roadEn: '', detailEn: '', detailKo: '' })

function resetEditForm() {
  editForm.value = {
    nameEn: buyerNameEn.value,
    roadEn: String(profile.value.business_address_en || ''),
    detailEn: String(profile.value.business_address_detail_en || ''),
    detailKo: String(profile.value.business_address_detail || ''),
  }
  addrSearch.value = ''
  addrNotice.value = ''
  editError.value = ''
  pickedAddress.value = null
  detailEnTouched.value = !!editForm.value.detailEn
  searchMode.value = false
}

// ── 사용가이드(SpotlightGuide) — 처음 한 번 자동, 헤더 버튼으로 다시 보기 ──
const GUIDE_SEEN_KEYS = { main: 'euchs_tt_guide_seen', edit: 'euchs_tt_edit_guide_seen' }
const guideOpen = ref(false)
const guideSteps = ref([])
const guideKind = ref('main')
function isGuideSeen(kind) {
  try { return localStorage.getItem(GUIDE_SEEN_KEYS[kind]) === '1' } catch (e) {
    console.error('[TtRemittanceModal] 가이드 상태를 읽지 못했습니다:', e)
    return false
  }
}
function markGuideSeen(kind) {
  try { localStorage.setItem(GUIDE_SEEN_KEYS[kind], '1') } catch (e) {
    console.error('[TtRemittanceModal] 가이드 상태를 저장하지 못했습니다:', e)
  }
}
async function startGuide(kind) {
  const all = kind === 'edit' ? TT_GUIDE_STEPS_EDIT : (activeTab.value === 'pc' ? TT_GUIDE_STEPS_PC : TT_GUIDE_STEPS_FIRST)
  if (guideOpen.value) guideOpen.value = false
  await nextTick()
  await nextTick()
  const visible = all.filter(s => document.querySelector(`[data-guide="${s.target}"]`))
  if (visible.length === 0) {
    console.error('[TtRemittanceModal] 가이드 대상이 화면에 없습니다:', kind)
    return
  }
  guideKind.value = kind
  guideSteps.value = visible
  guideOpen.value = true
}
function onGuideFinish() {
  markGuideSeen(guideKind.value)
}
function onClickEditBuyer() {
  if (guideOpen.value && guideKind.value === 'main') {
    guideOpen.value = false
    markGuideSeen('main')
  }
  startEdit()
  if (!isGuideSeen('edit')) startGuide('edit')
}
/** 오른쪽 1단계 버튼 — 왼쪽 BUYER 칸으로 스크롤한 뒤 수정 시작 */
function editBuyerFromStep() {
  const box = document.querySelector('[data-guide="buyer"]')
  if (box) box.scrollIntoView({ block: 'center', behavior: 'smooth' })
  else console.error('[TtRemittanceModal] BUYER 확인 칸을 찾지 못했습니다')
  onClickEditBuyer()
}
watch(state, (v) => {
  if (v === 'ready' && !isGuideSeen('main')) setTimeout(() => { if (state.value === 'ready' && !guideOpen.value) startGuide('main') }, 500)
})

function startEdit() {
  resetEditForm()
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  if (guideKind.value === 'edit') guideOpen.value = false
  resetEditForm()
}

function onDetailKoInput() {
  if (detailEnTouched.value && !pickedAddress.value) return
  editForm.value.detailEn = convertDetailToEnglish(editForm.value.detailKo)
}

/** 주소 선택 — 계정설정(AccountSettingsView.onBizAddressSelect)과 같은 규칙: engAddr 우선, 없으면 /api/juso-english */
async function onAddressSelect(item) {
  pickedAddress.value = { zipNo: item.zipNo, roadAddr: item.roadAddr, jibunAddr: item.jibunAddr }
  editForm.value.roadEn = ''
  editForm.value.detailEn = convertDetailToEnglish(editForm.value.detailKo)
  detailEnTouched.value = false
  addrNotice.value = ''
  const notFound = () => {
    editForm.value.roadEn = ''
    addrNotice.value = '영문주소를 찾지 못했어요. 직접 입력해 주세요.'
  }
  if ((item.engAddr || '').trim()) {
    editForm.value.roadEn = item.engAddr.trim()
    return
  }
  if (!item.matchKey || !item.roadAddrPart1) {
    console.error('[TtRemittanceModal] 매칭 키 없음 — 영문 변환 불가:', item)
    notFound()
    return
  }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      console.error('[TtRemittanceModal] 세션 토큰 없음 — 영문 변환 요청 불가')
      notFound()
      return
    }
    const r = await fetch('/api/juso-english', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ roadAddrPart1: item.roadAddrPart1, matchKey: item.matchKey }),
    })
    const body = await r.json().catch(() => null)
    if (pickedAddress.value?.roadAddr !== item.roadAddr) return
    if (body?.success === true && body.roadAddr) {
      editForm.value.roadEn = body.roadAddr
    } else {
      console.error('[TtRemittanceModal] 영문주소 변환 실패:', r.status, body)
      notFound()
    }
  } catch (e) {
    console.error('[TtRemittanceModal] 영문주소 변환 요청 오류:', e)
    notFound()
  }
}

async function saveBuyer() {
  editError.value = ''
  const nameEn = String(editForm.value.nameEn || '').replace(/\s+/g, ' ').trim().toUpperCase()
  const roadEn = String(editForm.value.roadEn || '').replace(/\s+/g, ' ').trim()
  const detailEn = String(editForm.value.detailEn || '').replace(/\s+/g, ' ').trim()
  // 주소가 비어 있던 고객(수정하기 없이 바로 입력)은 상호 칸이 없으므로 현재 표시값을 그대로 저장한다
  const nameToSave = isEditing.value ? nameEn : buyerNameEn.value
  if (!nameToSave) { editError.value = '영문 상호를 입력해 주세요.'; return }
  if (!roadEn) { editError.value = '영문 주소를 입력해 주세요.'; return }
  for (const [label, v] of [['영문 상호', nameToSave], ['영문 주소', roadEn], ['영문 상세주소', detailEn]]) {
    if (!EN_ALLOWED_RE.test(v)) {
      editError.value = `${label}에는 영문·숫자·공백과 , . - & ( ) / ' # 만 쓸 수 있어요.`
      return
    }
  }
  const patch = { company_name_en: nameToSave, business_address_en: roadEn, business_address_detail_en: detailEn }
  if (pickedAddress.value) {
    // 검색으로 새 주소를 골랐으면 한글 주소 칸도 계정설정 화면과 같은 방식으로 함께 저장한다
    patch.business_zipcode = pickedAddress.value.zipNo
    patch.business_address_road = pickedAddress.value.roadAddr
    patch.business_address_jibun = pickedAddress.value.jibunAddr
    patch.business_address_detail = editForm.value.detailKo
  }
  isSaving.value = true
  try {
    await updateTtBuyerProfile(patch)
    isEditing.value = false
    if (guideKind.value === 'edit') guideOpen.value = false
    resetEditForm()
    showToast('송금인 정보가 저장되었어요.')
  } catch (e) {
    console.error('[TtRemittanceModal] 송금인 정보 저장 실패:', e)
    editError.value = e?.message || '저장에 실패했어요.'
  } finally {
    isSaving.value = false
  }
}

// ── PDF ─────────────────────────────────────────────────────────────
async function downloadPdf() {
  if (pdfBlockers.value.length > 0 || isGenerating.value) return
  isGenerating.value = true
  try {
    await downloadTtInvoicePdf({ invoice: invoice.value, fixed: fixed.value, seal: seal.value, buyer: pdfBuyer.value })
  } catch (e) {
    console.error('[TtRemittanceModal] PDF 생성 실패:', e)
    alert('PDF를 만들지 못했어요: ' + (e?.message || e))
  } finally {
    isGenerating.value = false
  }
}

// ── 표시·복사 ────────────────────────────────────────────────────────
/**
 * 탭 ② 칸별 값 (TT_PC_FIELDS의 key). 값이 없으면 '' → 화면이 "확인 필요"로 표시하고 복사 버튼을 숨긴다.
 * 수취인·은행 값은 서버 응답 fixed(api/_ttRemittance.js)에서만 가져온다.
 */
function pcFieldValue(key) {
  const inv = invoice.value
  const fx = fixed.value
  switch (key) {
    case 'currency': return TT_CURRENCY_TEXT
    case 'usdTotal': return inv ? `USD ${formatUsd(inv.usdTotal)}` : ''
    case 'feeBearer': return TT_FEE_BEARER_TEXT
    case 'reason': return TT_REMIT_REASON
    case 'senderName': return buyerNameEn.value
    case 'beneficiaryName': return fx?.beneficiary?.name || ''
    case 'beneficiaryAddress': return fx?.beneficiary?.address || ''
    case 'beneficiaryBankName': return fx?.beneficiaryBank?.name || ''
    case 'beneficiaryBankSwift': return fx?.beneficiaryBank?.swift || ''
    case 'accountNo': return fx?.beneficiary?.accountNo || ''
    case 'beneficiaryBankAddress': return fx?.beneficiaryBank?.address || ''
    case 'intermediaryBankName': return fx?.intermediaryBank?.name || ''
    case 'intermediaryBankSwift': return fx?.intermediaryBank?.swift || ''
    case 'invoiceNo': return inv?.invoiceNo || ''
    default:
      console.error('[TtRemittanceModal] 알 수 없는 입력 칸 key:', key)
      return ''
  }
}

/** YYYY-MM-DD (KST) + n일 */
function kstDatePlusDays(days) {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** 신청서 작성 예시 — 이 주문 데이터로 채운 표 (TtApplicationFormExample에 전달) */
const formSections = computed(() => {
  const inv = invoice.value
  const fx = fixed.value
  if (!inv || !fx) return []
  const L = TT_FORM_EXAMPLE.labels
  const V = TT_FORM_EXAMPLE.values
  const S = TT_FORM_EXAMPLE.sections
  const row = (label, value, hint) => ({ label, value: value || '확인 필요', hint, missing: !value })
  const addrKo = [profile.value.business_address_road, profile.value.business_address_detail].map(v => String(v || '').trim()).filter(Boolean).join(' ')
  const goods = [...new Set((inv.lines || []).map(l => l.description).filter(Boolean))].join(', ')
  return [
    { title: S.applicant, rows: [
      row(L.nameKo, companyNameKo.value),
      row(L.nameEn, buyerNameEn.value, '인보이스 BUYER와 같게'),
      row(L.bizNo, bizNoFormatted.value),
      row(L.account, V.account),
      row(L.address, addrKo, buyerAddress.value ? `영문: ${buyerAddress.value}` : ''),
      row(L.tel, buyerTel.value),
    ] },
    { title: S.remittance, rows: [
      row(L.method, V.method),
      row(L.amount, `USD ${formatUsd(inv.usdTotal)}`, '인보이스 TOTAL 그대로'),
      row(L.feeBearer, V.feeBearer, V.feeBearerHint),
    ] },
    { title: S.beneficiary, rows: [
      row(L.beneficiaryName, fx.beneficiary?.name),
      row(L.beneficiaryAddress, fx.beneficiary?.address),
    ] },
    { title: S.bank, rows: [
      row(L.swift, fx.beneficiaryBank?.swift),
      row(L.accountNo, fx.beneficiary?.accountNo),
      row(L.bankName, fx.beneficiaryBank?.name),
      row(L.bankAddress, fx.beneficiaryBank?.address),
      row(L.intermediary, fx.intermediaryBank?.name && fx.intermediaryBank?.swift ? `${fx.intermediaryBank.name} (SWIFT ${fx.intermediaryBank.swift})` : ''),
    ] },
    { title: S.reason, rows: [
      row(L.reason, TT_REMIT_REASON),
      row(L.customsCleared, V.customsCleared),
      row(L.receiveDate, V.receiveDate, `${V.receiveDateHint} (오늘 송금하면 ${kstDatePlusDays(15)})`),
      row(L.destination, V.destination),
      row(L.goods, goods),
      row(L.message, inv.invoiceNo),
    ] },
  ]
})

async function copyText(text, label) {
  // 송금 금액("USD 1,234.56")은 은행 입력칸에 숫자만 넣도록 "USD "·쉼표 없이 복사한다
  const raw = String(text || '')
  const value = raw.startsWith('USD ') ? raw.slice(4).replace(/,/g, '') : raw
  try {
    await navigator.clipboard.writeText(value)
    showToast(`${label ? label + ' ' : ''}복사됨: ${value}`)
  } catch (e) {
    console.error('[TtRemittanceModal] 클립보드 복사 실패:', e)
    showToast('복사하지 못했어요. 직접 선택해서 복사해 주세요.')
  }
}

function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

function openKakao() {
  window.open(KAKAO_CHANNEL_URL, '_blank', 'noopener,noreferrer')
}

function formatKrw(n) { return Number(n).toLocaleString('ko-KR') }
// 환율 기준 시각은 우리 발행 시각(issuedAt)으로 보여준다 — 마이뱅크 "기준" 표기(rateAsOf)는 값이 갱신돼도 안 바뀔 때가 있어 고객 화면에 쓰지 않는다
function kstDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    console.error('[TtRemittanceModal] 인보이스 발행 시각(issuedAt) 형식 이상:', iso)
    return '확인 필요'
  }
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
}
function formatRate(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ── 로그아웃 시 개인 데이터 비우기 (CLAUDE.md 2-9) ──────────────────────
function onAuthChanged(e) {
  if (!e.detail?.user) {
    invoice.value = null
    fixed.value = null
    seal.value = ''
    state.value = 'loading'
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onAuthChanged)
  loadInvoice()
  // BUYER는 최신 profiles 기준 — 다른 화면에서 고친 값이 있을 수 있어 다시 읽는다
  if (currentUser.value) fetchUserProfile(currentUser.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('euchs-auth-changed', onAuthChanged)
  clearTimeout(toastTimer)
})
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.25s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(8px); }
/* 단계 번호 동그라미 */
.tt-step-no {
  flex-shrink: 0; width: 1.75rem; height: 1.75rem; border-radius: 9999px;
  background: #0284c7; color: #fff; font-weight: 900; font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center; margin-top: 0.05rem;
}
</style>
