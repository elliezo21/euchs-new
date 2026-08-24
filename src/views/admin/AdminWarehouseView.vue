<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 관리자 상단 헤더 & 네비게이션 바 -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black tracking-wide border border-amber-400/30">
            STAFF ONLY · ERP WMS
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Warehouse class="w-6 h-6 text-amber-400" />
            <span>이우 물류센터 현지 입고·정밀 검수 관리 시스템</span>
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">
          1688 공장 화물 실측 계근(kg/CBM), 현장 검수 실사 사진 드래그&드롭 업로드 및 바이어 전달 소견을 관리합니다.
        </p>
      </div>

      <!-- 상단 네비게이션 버튼 -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <router-link
          to="/dashboard/warehouse"
          target="_blank"
          class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
        >
          <ExternalLink class="w-4 h-4 text-amber-400" />
          <span>바이어 화면 확인</span>
        </router-link>

        <router-link
          to="/admin"
          class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
        >
          <ShieldAlert class="w-4 h-4" />
          <span>관리자 메인 콘솔</span>
        </router-link>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 관리자 WMS 4대 현황 KPI 카드 -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-400">입고 대기 화물</span>
          <div class="text-2xl font-black text-amber-400 font-mono">
            {{ getCount('pending_inbound') }} <span class="text-xs font-normal text-slate-500">건</span>
          </div>
          <p class="text-[11px] text-slate-500">현지 택배 운송중</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <Truck class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-400">실측 계근 완료</span>
          <div class="text-2xl font-black text-blue-400 font-mono">
            {{ getCount('inbound_weighed') }} <span class="text-xs font-normal text-slate-500">건</span>
          </div>
          <p class="text-[11px] text-slate-500">중량/CBM 입력완료</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
          <Scale class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-400">정밀 검수 진행중</span>
          <div class="text-2xl font-black text-orange-400 font-mono">
            {{ getCount('inspecting') }} <span class="text-xs font-normal text-slate-500">건</span>
          </div>
          <p class="text-[11px] text-slate-500">실사 사진 등록 필요</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
          <Camera class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-400">한국행 선적 대기</span>
          <div class="text-2xl font-black text-emerald-400 font-mono">
            {{ getCount('ready_to_ship') }} <span class="text-xs font-normal text-slate-500">건</span>
          </div>
          <p class="text-[11px] text-slate-500">포장/검수 완료</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <ShieldCheck class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 검색 및 상태 필터 바 -->
    <!-- ======================================================== -->
    <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="입고번호, 주문번호, 바이어명, 상품명 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap text-xs">
        <select
          v-model="statusFilter"
          class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none cursor-pointer"
        >
          <option value="all">전체 작업 상태</option>
          <option value="pending_inbound">입고 대기</option>
          <option value="inbound_weighed">실측 계근 완료</option>
          <option value="inspecting">정밀 검수중</option>
          <option value="passed">검수 통과 (정상)</option>
          <option value="defect_found">불량/파손 발견</option>
          <option value="ready_to_ship">한국행 선적 대기</option>
        </select>

        <button
          type="button"
          @click="resetStore"
          class="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold transition flex items-center gap-1"
          title="기본 샘플 데이터로 복원"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>초기화</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 관리자 작업 테이블 -->
    <!-- ======================================================== -->
    <div class="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs divide-y divide-slate-700">
          <thead class="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4">입고번호 / 일시</th>
              <th class="py-3.5 px-4">주문번호 / 바이어</th>
              <th class="py-3.5 px-4">입고 상품 & 수량</th>
              <th class="py-3.5 px-4 text-center">실측 계근 (kg / CBM)</th>
              <th class="py-3.5 px-4 text-center">검수 상태 & 실사</th>
              <th class="py-3.5 px-4">검수원 전달 메모</th>
              <th class="py-3.5 px-4 text-center">관리 액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/60 bg-slate-800/40">
            <tr
              v-for="item in filteredInbounds"
              :key="item.id"
              class="hover:bg-slate-700/40 transition"
            >
              <!-- 입고번호 -->
              <td class="py-3.5 px-4 whitespace-nowrap font-mono">
                <div class="font-bold text-amber-400">{{ item.inboundNo }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ item.inboundDate }}</div>
              </td>

              <!-- 주문번호 & 바이어 -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <div class="font-bold text-slate-200">{{ item.buyerName || '일반 바이어' }}</div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                  {{ item.orderNo }} <span class="text-slate-500">({{ item.buyerId || 'ID' }})</span>
                </div>
              </td>

              <!-- 상품 및 수량 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-[220px]">
                  <img
                    :src="item.thumbnail"
                    :alt="item.productName"
                    class="w-11 h-11 rounded-lg object-cover bg-slate-900 border border-slate-700 shrink-0"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <p class="font-bold text-white line-clamp-1">{{ item.productName }}</p>
                    <p class="text-[11px] text-slate-400">옵션: {{ item.sku }} · <b class="text-amber-300">{{ item.quantity }}개</b> ({{ item.boxCount }} CTN)</p>
                    <div v-if="getVasBadges(item).length" class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="vas in getVasBadges(item)"
                        :key="vas.id"
                        class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30"
                      >
                        {{ vas.shortName || vas.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 실측 계근 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div v-if="item.measuredWeightKg > 0" class="space-y-0.5 font-mono">
                  <div class="font-bold text-slate-200 text-xs">{{ item.measuredWeightKg }} kg</div>
                  <div class="text-[11px] text-blue-400 font-bold">{{ item.measuredCbm }} CBM</div>
                </div>
                <div v-else class="text-amber-400/80 font-bold text-[11px] flex items-center justify-center gap-1">
                  <AlertCircle class="w-3.5 h-3.5" />
                  <span>계근 필요</span>
                </div>
              </td>

              <!-- 검수 상태 & 실사 수량 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="getInspectionBadgeClass(item.inspectionStatus)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ getInspectionLabel(item.inspectionStatus) }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    실사 {{ item.inspectionPhotos?.length || 0 }}장
                  </span>
                </div>
              </td>

              <!-- 전달 메모 -->
              <td class="py-3.5 px-4 max-w-[200px]">
                <p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {{ item.inspectionNote || '-' }}
                </p>
              </td>

              <!-- 액션 버튼 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <button
                  type="button"
                  @click="openProcessModal(item)"
                  class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-sm flex items-center gap-1.5 mx-auto active:scale-95"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                  <span>입고·검수 처리</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 직원 전용 [입고·검수 처리] 모달 (드래그 & 드롭 사진 업로드) -->
    <!-- ======================================================== -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-700">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
                WMS 실무 처리
              </span>
              <span class="font-mono text-xs text-slate-400 font-bold">
                {{ editForm.inboundNo }}
              </span>
            </div>
            <h3 class="text-base font-bold text-white mt-1">
              {{ editForm.productName }}
            </h3>
          </div>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-white p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 부가서비스(VAS) 요청 내역 안내 -->
        <div v-if="getVasBadges(activeItem).length" class="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
              <i class="fas fa-screwdriver-wrench text-amber-400"></i>
              <span>바이어 현장 부가서비스(VAS) 요청 (총 {{ getVasBadges(activeItem).length }}건)</span>
            </span>
            <span class="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/15 px-2 py-0.5 rounded-full">
              필수 작업
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="vas in getVasBadges(activeItem)"
              :key="vas.id"
              class="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] font-bold"
            >
              {{ vas.shortName || vas.name }}
            </span>
          </div>
        </div>

        <form @submit.prevent="saveInboundProcessing" class="space-y-4 text-xs">
          <!-- 1. 실측 계근 입력 (중량, CBM, 박스수) -->
          <div class="p-4 bg-slate-900/70 border border-slate-700/80 rounded-2xl space-y-3">
            <h4 class="font-bold text-amber-400 flex items-center gap-1.5">
              <Scale class="w-4 h-4" />
              <span>1. 실측 계근 데이터 입력</span>
            </h4>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">실측 중량 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  v-model.number="editForm.measuredWeightKg"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">실측 부피 (CBM)</label>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="editForm.measuredCbm"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-blue-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">박스 수량 (CTN)</label>
                <input
                  type="number"
                  v-model.number="editForm.boxCount"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
          </div>

          <!-- 2. 검수 상태 변경 -->
          <div class="p-4 bg-slate-900/70 border border-slate-700/80 rounded-2xl space-y-3">
            <h4 class="font-bold text-amber-400 flex items-center gap-1.5">
              <CheckCircle class="w-4 h-4" />
              <span>2. 검수 상태 및 진행 단계 변경</span>
            </h4>
            <select
              v-model="editForm.inspectionStatus"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="pending_inbound">입고 대기 (1688 공장 배송중)</option>
              <option value="inbound_weighed">실측 계근 완료 (중량/체적 확정)</option>
              <option value="inspecting">정밀 검수 진행중 (실사 촬영)</option>
              <option value="passed">검수 통과 (정상 양품 100%)</option>
              <option value="defect_found">불량/파손/수량불일치 감지 (교환/환불 접수)</option>
              <option value="ready_to_ship">한국행 선적 대기 (컨테이너 적재 준비)</option>
            </select>
          </div>

          <!-- 3. 검수 실사 사진 등록 (드래그 & 드롭 및 파일 선택 드롭존) -->
          <div class="p-4 bg-slate-900/70 border border-slate-700/80 rounded-2xl space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-amber-400 flex items-center gap-1.5">
                <Camera class="w-4 h-4" />
                <span>3. 검수 실사 사진 등록 (드래그&드롭)</span>
              </h4>
              <span class="text-[11px] text-slate-400">등록된 사진: {{ editForm.inspectionPhotos.length }}장</span>
            </div>

            <!-- 드래그 & 드롭 업로드 영역 -->
            <div
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              @click="triggerFileInput"
              class="border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 group"
              :class="isDragging
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 bg-slate-800/60 hover:border-amber-500/50 hover:bg-slate-800'"
            >
              <input
                type="file"
                ref="fileInputRef"
                multiple
                accept="image/png, image/jpeg, image/webp, image/gif, image/jpg"
                class="hidden"
                @change="handleFileSelect"
              />
              <div class="w-12 h-12 rounded-2xl bg-slate-700/80 group-hover:bg-amber-500/20 group-hover:text-amber-300 flex items-center justify-center text-amber-400 transition">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div class="space-y-0.5">
                <p class="font-bold text-slate-200 text-xs">
                  📸 사진을 드래그하여 놓거나 클릭하여 업로드 (JPG, PNG, WEBP)
                </p>
                <p class="text-[11px] text-slate-400">
                  다중 파일(Multiple) 일괄 선택 가능 · 바이어 화면에 즉시 고화질 노출
                </p>
              </div>
              <div v-if="isUploading" class="flex items-center gap-2 text-amber-400 text-xs font-bold pt-1">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>이미지 파일 처리 및 동기화 중...</span>
              </div>
            </div>

            <!-- 사진 썸네일 갤러리 리스트 및 캡션 편집 -->
            <div v-if="editForm.inspectionPhotos.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div
                v-for="(p, pIdx) in editForm.inspectionPhotos"
                :key="pIdx"
                class="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 flex flex-col group shadow-xs"
              >
                <div class="relative aspect-square w-full bg-slate-900">
                  <img :src="p.url" :alt="p.caption" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    @click.stop="removePhoto(pIdx)"
                    class="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-xs transition active:scale-90"
                    title="사진 삭제"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div class="p-2 bg-slate-800/90 border-t border-slate-700/60">
                  <input
                    type="text"
                    v-model="p.caption"
                    placeholder="사진 설명 (예: 외관 실사)"
                    class="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 4. 검수원 전달 소견 메모 -->
          <div class="p-4 bg-slate-900/70 border border-slate-700/80 rounded-2xl space-y-2">
            <h4 class="font-bold text-amber-400 flex items-center gap-1.5">
              <FileText class="w-4 h-4" />
              <span>4. 현지 검수원 종합 소견 (바이어 대시보드 표시란)</span>
            </h4>
            <textarea
              v-model="editForm.inspectionNote"
              rows="3"
              placeholder="수량 전수 일치 여부, 작동 상태, 외관 도장 상태 등을 기재하세요."
              class="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
            ></textarea>
          </div>

          <!-- 푸터 버튼 -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-700 transition"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm"
            >
              저장 및 바이어 화면 즉시 반영
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Warehouse,
  Scale,
  Camera,
  Truck,
  ShieldCheck,
  Search,
  RefreshCw,
  Edit3,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  FileText,
  Trash2,
  X,
  UploadCloud,
  Loader2,
} from 'lucide-vue-next';
import { loadStoredInbounds, updateStoredInboundItem, saveStoredInbounds, DEFAULT_INBOUNDS } from '@/lib/warehouseStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const inbounds = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all');

const isModalOpen = ref(false);
const activeItem = ref(null);
const editForm = ref({
  id: '',
  inboundNo: '',
  productName: '',
  measuredWeightKg: 0,
  measuredCbm: 0,
  boxCount: 1,
  inspectionStatus: 'inbound_weighed',
  inspectionNote: '',
  inspectionPhotos: [],
});

const fileInputRef = ref(null);
const isDragging = ref(false);
const isUploading = ref(false);

const reloadData = () => {
  inbounds.value = loadStoredInbounds();
};

onMounted(() => {
  reloadData();
  window.addEventListener('euchs-warehouse-update', reloadData);
});

onUnmounted(() => {
  window.removeEventListener('euchs-warehouse-update', reloadData);
});

const getCount = (status) => {
  return inbounds.value.filter((i) => i.inspectionStatus === status).length;
};

const filteredInbounds = computed(() => {
  let list = [...inbounds.value];

  if (statusFilter.value !== 'all') {
    list = list.filter((i) => i.inspectionStatus === statusFilter.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (i) =>
        i.inboundNo.toLowerCase().includes(q) ||
        i.orderNo.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        (i.buyerName && i.buyerName.toLowerCase().includes(q))
    );
  }

  return list;
});

const VAS_OPTIONS_MAP = {
  inspection_precision: { id: 'inspection_precision', name: '정밀검수', shortName: '🔍 정밀검수' },
  origin_label: { id: 'origin_label', name: '원산지 라벨', shortName: '🏷️ 원산지' },
  barcode_label: { id: 'barcode_label', name: '바코드 라벨', shortName: '📦 바코드' },
  opp_repack: { id: 'opp_repack', name: 'OPP 재포장', shortName: '📦 OPP' },
  fta_co: { id: 'fta_co', name: 'FTA C/O', shortName: '📄 FTA C/O' },
  pallet_wood: { id: 'pallet_wood', name: '목재 파렛트', shortName: '🪵 파렛트' }
};

const getVasBadges = (item) => {
  if (!item) return [];
  const raw = item.vas_services || item.vasServices || item.details?.vas_services || item.details?.vasServices || [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(id => VAS_OPTIONS_MAP[id] || { id, name: id, shortName: id });
};

const getInspectionLabel = (status) => {
  const map = {
    pending_inbound: '입고 대기',
    inbound_weighed: '계근 완료',
    inspecting: '정밀 검수중',
    passed: '검수 통과',
    defect_found: '불량 발견',
    ready_to_ship: '선적 대기',
  };
  return map[status] || status || '진행중';
};

const getInspectionBadgeClass = (status) => {
  const map = {
    pending_inbound: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
    inbound_weighed: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
    inspecting: 'bg-orange-500/20 text-orange-300 border border-orange-400/30',
    passed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
    defect_found: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
    ready_to_ship: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
  };
  return map[status] || 'bg-slate-700 text-slate-300';
};

const openProcessModal = (item) => {
  activeItem.value = item;
  editForm.value = {
    id: item.id,
    inboundNo: item.inboundNo,
    productName: item.productName,
    measuredWeightKg: item.measuredWeightKg || 0,
    measuredCbm: item.measuredCbm || 0,
    boxCount: item.boxCount || 1,
    inspectionStatus: item.inspectionStatus || 'inbound_weighed',
    inspectionNote: item.inspectionNote || '',
    inspectionPhotos: JSON.parse(JSON.stringify(item.inspectionPhotos || [])),
  };
  isModalOpen.value = true;
};

// ---------------------------------------------------------
// 이미지 드래그 & 드롭 / 파일 선택 처리 로직
// ---------------------------------------------------------
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    processUploadedFiles(files);
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const handleFileDrop = (e) => {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length > 0) {
    processUploadedFiles(files);
  }
};

const processUploadedFiles = async (files) => {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    alert('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
    return;
  }

  isUploading.value = true;

  for (const file of imageFiles) {
    try {
      let photoUrl = '';

      // 1. Supabase Storage 업로드 시도 (notices 또는 warehouse 버킷)
      if (isSupabaseConfigured()) {
        try {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `warehouse_inspection_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('notices')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });

          if (!error && data) {
            const { data: publicUrlData } = supabase.storage.from('notices').getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              photoUrl = publicUrlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('[Storage] Fallback to FileReader base64:', storageErr);
        }
      }

      // 2. Storage 실패 시 또는 로컬 모드: FileReader base64 로 변환
      if (!photoUrl) {
        photoUrl = await readFileAsBase64(file);
      }

      const defaultCaption = file.name.replace(/\.[^/.]+$/, '') || `실사 검수 사진 ${editForm.value.inspectionPhotos.length + 1}`;
      editForm.value.inspectionPhotos.push({
        url: photoUrl,
        caption: defaultCaption,
      });
    } catch (err) {
      console.error('File processing error:', err);
    }
  }

  isUploading.value = false;
};

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const removePhoto = (idx) => {
  editForm.value.inspectionPhotos.splice(idx, 1);
};

const saveInboundProcessing = () => {
  if (!editForm.value.id) return;

  updateStoredInboundItem(editForm.value.id, {
    measuredWeightKg: editForm.value.measuredWeightKg,
    measuredCbm: editForm.value.measuredCbm,
    boxCount: editForm.value.boxCount,
    inspectionStatus: editForm.value.inspectionStatus,
    inspectionNote: editForm.value.inspectionNote,
    inspectionPhotos: editForm.value.inspectionPhotos,
  });

  reloadData();
  isModalOpen.value = false;
  alert('입고 및 검수 데이터가 성공적으로 저장되었으며 바이어 화면에 즉시 반영되었습니다.');
};

const resetStore = () => {
  if (confirm('모든 입고 데이터를 기본 샘플 데이터로 복원하시겠습니까?')) {
    saveStoredInbounds(JSON.parse(JSON.stringify(DEFAULT_INBOUNDS)));
    reloadData();
  }
};
</script>
