<template>
  <div class="space-y-5 st-border rounded-[12px] p-4" data-mk-ss>
    <h4 class="st-h-card">스마트스토어</h4>

    <!-- 실패 사유 — 섹션 맨 위 + 실패하면 이 줄로 스크롤 (2026-10-01 운영: 창 맨 아래에만 있어 보이지 않았다) -->
    <p v-if="sendError" ref="errorEl" class="text-[13px] font-bold st-danger-text break-keep st-surface st-border rounded-[10px] p-3" role="alert" data-mk-ss-error>등록에 실패했습니다. (사유: {{ sendError }})
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">연결 설정으로 이동</router-link></p>

    <!-- 등록 템플릿 (2026-10-01) — 11번가 섹션과 같은 공용 템플릿. 고르면 칸이 채워지고 그 자리에서 고칠 수 있다. 기본 템플릿은 창을 열 때 자동 선택. 표가 없으면 그리지 않는다 -->
    <div v-if="lt.ready" class="st-surface st-border rounded-[10px] p-3 space-y-2" data-mk-ss-templates>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="k in TEMPLATE_KINDS" :key="k.key" class="block">
          <span class="st-desc-sm block mb-1">{{ k.name }}</span>
          <select v-model="lt.picked[k.key]" class="st-input w-full" :disabled="!!done" :data-mk-ss-lt="k.key" @change="applyTemplate(k.key)">
            <option value="">선택 안 함</option>
            <option v-for="t in ltList(k.key)" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
          </select>
          <button v-if="lt.saving !== k.key" type="button" class="st-link text-[12px] mt-1" :disabled="!!done || !!lt.saving" :data-mk-ss-lt-save="k.key" @click="startSaveTemplate(k.key)">현재 값으로 새 템플릿 저장</button>
          <div v-else class="flex flex-wrap items-center gap-1.5 mt-1.5" :data-mk-ss-lt-save-box="k.key">
            <input v-model="lt.name" type="text" :maxlength="TEMPLATE_NAME_MAX" class="st-input flex-1 min-w-[140px]" placeholder="템플릿 이름" data-mk-ss-lt-name />
            <button type="button" class="st-btn st-btn-primary" :disabled="lt.busy" data-mk-ss-lt-save-ok @click="saveTemplate(k.key)">{{ lt.busy ? '저장 중…' : '저장' }}</button>
            <button type="button" class="st-btn" :disabled="lt.busy" @click="lt.saving = ''">취소</button>
          </div>
          <p v-for="n in lt.notes[k.key]" :key="n" class="text-[12px] st-danger-text font-bold break-keep mt-1" :data-mk-ss-lt-note="k.key">{{ n }}</p>
        </div>
      </div>
      <p v-if="!lt.list.length" class="st-desc-sm break-keep" data-mk-ss-lt-empty>템플릿이 없습니다. <router-link :to="{ name: 'studio-channels-defaults' }" class="st-link">기본 설정</router-link> 탭에서 예시값으로 템플릿을 만들 수 있습니다.</p>
      <p v-if="lt.message" class="text-[12px] break-keep" :class="lt.error ? 'st-danger-text font-bold' : 'st-muted'" data-mk-ss-lt-msg>{{ lt.message }}</p>
    </div>

    <!-- 공통 정보를 쓰는 중 (2026-10-01) — 이 판매처만 다르게 할 묶음을 켜면 아래에 그 칸이 다시 보인다 -->
    <div v-if="common" class="st-surface st-border rounded-[10px] p-3 space-y-1.5" data-mk-ss-common>
      <p class="text-[13px] st-ink break-keep">상품명·판매가·재고·옵션·대표 이미지는 위 공통 정보 값을 사용합니다.</p>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] st-ink">
        <span class="st-desc-sm">이 판매처만 다르게:</span>
        <label v-for="g in COMMON_GROUPS" :key="g.key" class="flex items-center gap-1.5"><input v-model="own[g.key]" type="checkbox" :disabled="!!done" :data-mk-ss-own="g.key" /> {{ g.label }}</label>
      </div>
    </div>

    <!-- 상품명 -->
    <label v-show="showOwn('name')" class="block">
      <span class="st-label">상품명 *</span>
      <input v-model="f.productName" type="text" class="st-input w-full" maxlength="300" placeholder="상품명을 입력하세요" :disabled="!!done" data-mk-ss-name />
    </label>

    <!-- 카테고리 (리프만 — 서버 smartstore_categories) -->
    <div class="block" data-mk-ss-category-box>
      <span class="st-label">카테고리 *</span>
      <p v-if="catLoading" class="st-desc-sm" data-mk-ss-cat-loading>카테고리 목록을 불러오는 중…</p>
      <template v-else-if="categories.length">
        <input v-model="catQuery" type="text" class="st-input w-full mb-1.5" placeholder="카테고리 검색 (예: 머그컵)" :disabled="!!done" data-mk-ss-cat-search />
        <select v-model="f.leafCategoryId" class="st-input w-full" :disabled="!!done" data-mk-ss-category>
          <option :value="null">카테고리 선택</option>
          <option v-for="c in catOptions" :key="c.id" :value="c.id">{{ c.wholeName }}</option>
        </select>
        <span class="st-desc-sm block mt-1">검색 결과 {{ catMatches.length.toLocaleString('ko-KR') }}건<template v-if="catMatches.length > CAT_SHOWN"> · 앞 {{ CAT_SHOWN }}건 표시</template></span>
      </template>
      <p v-if="catError" class="mt-1 text-[12px] break-keep" :class="catSoft ? 'st-muted' : 'st-danger-text'" data-mk-ss-cat-error>{{ catError }}
        <button type="button" class="st-link ml-1" data-mk-ss-cat-retry @click="loadCategories">다시 불러오기</button></p>
    </div>

    <!-- 판매가 · 재고 -->
    <div v-show="showOwn('price') || showOwn('stock')" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label v-show="showOwn('price')" class="block">
        <span class="st-label">판매가 *</span>
        <input v-model.number="f.salePrice" type="number" min="1" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-ss-price />
      </label>
      <label v-if="!useOptions" v-show="showOwn('stock')" class="block">
        <span class="st-label">재고 수량 *</span>
        <input v-model.number="f.stock" type="number" min="0" step="1" class="st-input w-full" placeholder="개" :disabled="!!done" data-mk-ss-stock />
        <span class="st-desc-sm block mt-1">0이면 품절로 등록됩니다.</span>
      </label>
      <div v-else v-show="showOwn('stock')" class="block" data-mk-ss-stock-total>
        <span class="st-label">재고 수량</span>
        <p class="text-[13px] st-ink mt-1">판매할 옵션 재고 합계 {{ optionStockTotal.toLocaleString('ko-KR') }}개</p>
      </div>
    </div>

    <!-- 옵션 (조합형) — 옵션 종류·값을 넣으면 조합 목록이 만들어진다(가져온 옵션이 없으면 꺼진 채). 규칙·근거 api/_marketOptions.js -->
    <StudioSendOptions v-show="showOwn('stock')" :model="opts" :disabled="!!done" :range="optionRange" data-mk-ss-options />

    <!-- 대표 이미지 -->
    <div v-show="showOwn('image')" class="block">
      <span class="st-label">대표 이미지 *</span>
      <div v-if="!prepare.images.length" class="st-desc">이 작업에 사진이 없습니다.</div>
      <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-ss-images>
        <button v-for="im in prepare.images" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :disabled="!!done" :data-mk-ss-image="im.id" @click="f.repImageId = im.id">
          <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
      <label class="flex items-center gap-2 text-[12px] st-muted mt-2"><input v-model="f.fit" type="radio" value="contain" :disabled="!!done" /> 여백 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" :disabled="!!done" /> 중앙 자르기</label>
      <span class="st-desc-sm block mt-1">1000×1000으로 자동 변환됩니다. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 사용합니다.</span>
    </div>

    <!-- 배송 -->
    <div class="block space-y-2" data-mk-ss-delivery>
      <span class="st-label">배송 *</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <span class="st-desc-sm block mb-1">택배사</span>
          <select v-model="f.company" class="st-input w-full" :disabled="!!done" data-mk-ss-company>
            <option v-for="c in SS_DELIVERY_COMPANIES" :key="c.code" :value="c.code">{{ c.name }}</option>
          </select>
        </label>
        <div class="block">
          <span class="st-desc-sm block mb-1">배송비</span>
          <label class="flex items-center gap-2 text-[13px] st-ink">
            <input v-model="f.feeType" type="radio" value="FREE" :disabled="!!done" data-mk-ss-fee-free /> 무료
            <input v-model="f.feeType" type="radio" value="PAID" class="ml-3" :disabled="!!done" data-mk-ss-fee-paid /> 유료(선결제)
            <input v-model="f.feeType" type="radio" value="CONDITIONAL_FREE" class="ml-3" :disabled="!!done" data-mk-ss-fee-cond /> 조건부 무료
          </label>
          <input v-if="f.feeType === 'PAID' || f.feeType === 'CONDITIONAL_FREE'" v-model.number="f.baseFee" type="number" min="1" step="1" class="st-input w-full mt-1.5" placeholder="기본 배송비 (원)" :disabled="!!done" data-mk-ss-base-fee />
          <input v-if="f.feeType === 'CONDITIONAL_FREE'" v-model.number="f.freeOver" type="number" min="1" step="1" class="st-input w-full mt-1.5" placeholder="이 금액 이상 구매 시 무료 (원)" :disabled="!!done" data-mk-ss-free-over />
        </div>
        <label class="block">
          <span class="st-desc-sm block mb-1">반품 배송비 (편도)</span>
          <input v-model.number="f.returnFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-ss-return-fee />
        </label>
        <label class="block">
          <span class="st-desc-sm block mb-1">교환 배송비 (왕복)</span>
          <input v-model.number="f.exchangeFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-ss-exchange-fee />
        </label>
      </div>
    </div>

    <!-- 출고지 · 반품지 (판매자 주소록) -->
    <div class="block" data-mk-ss-address-box>
      <div class="flex flex-wrap items-center gap-2 mb-1">
        <span class="st-label">출고지 · 반품지 *</span>
        <!-- 주소록은 읽기만 — 바꾸기는 스마트스토어센터에서. 바꾼 뒤 [주소록 새로고침] -->
        <a :href="SMARTSTORE_CENTER_URL" target="_blank" rel="noopener noreferrer" class="st-btn ml-auto" data-mk-ss-addr-manage>주소록 관리</a>
        <button type="button" class="st-btn" :disabled="!!done || addrLoading || addrRefreshing" data-mk-ss-addr-refresh @click="refreshAddresses">{{ addrRefreshing ? '확인 중…' : '주소록 새로고침' }}</button>
      </div>
      <p v-if="addrLoading" class="st-desc-sm" data-mk-ss-addr-loading>주소록을 불러오는 중…</p>
      <template v-else-if="addresses.length">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="st-desc-sm block mb-1">출고지</span>
            <select v-model="f.shippingAddressId" class="st-input w-full" :disabled="!!done" data-mk-ss-shipping>
              <option :value="null">출고지 선택</option>
              <option v-for="a in addresses" :key="a.id" :value="a.id">{{ addressLabel(a) }}</option>
            </select>
          </label>
          <label class="block">
            <span class="st-desc-sm block mb-1">반품지</span>
            <select v-model="f.returnAddressId" class="st-input w-full" :disabled="!!done" data-mk-ss-return>
              <option :value="null">반품지 선택</option>
              <option v-for="a in addresses" :key="a.id" :value="a.id">{{ addressLabel(a) }}</option>
            </select>
          </label>
        </div>
        <!-- 관부가세 — 고른 출고지가 해외 주소(주소록 overseasAddress)일 때만, 필수 · 기본값 없음 -->
        <label v-if="shippingOverseas" class="block mt-3" data-mk-ss-customs-box>
          <span class="st-label">관부가세 *</span>
          <select v-model="f.customsTaxType" class="st-input w-full sm:w-64" :disabled="!!done" data-mk-ss-customs>
            <option value="">관부가세 선택</option>
            <option v-for="t in CUSTOMS_TAX_TYPES" :key="t.code" :value="t.code">{{ t.name }}</option>
          </select>
          <span class="st-desc-sm block mt-1">해외 출고지 상품은 관부가세 입력이 필수입니다.</span>
        </label>
      </template>
      <p v-else-if="!addrError" class="st-desc-sm break-keep" data-mk-ss-addr-empty>스마트스토어센터 판매자 주소록에 출고지·반품지를 등록한 뒤 [주소록 새로고침]을 누르세요.</p>
      <p v-if="addrError" class="mt-1 text-[12px] break-keep" :class="addrSoft ? 'st-muted' : 'st-danger-text'" data-mk-ss-addr-error>{{ addrError }}
        <button type="button" class="st-link ml-1" data-mk-ss-addr-retry @click="loadAddresses">다시 불러오기</button></p>
    </div>

    <!-- A/S · 원산지 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label class="block">
        <span class="st-label">A/S 전화번호 *</span>
        <input v-model="f.asPhone" type="text" maxlength="30" class="st-input w-full" placeholder="예: 010-0000-0000" :disabled="!!done" data-mk-ss-as-phone />
      </label>
      <label class="block">
        <span class="st-label">A/S 안내 *</span>
        <input v-model="f.asGuide" type="text" maxlength="300" class="st-input w-full" :disabled="!!done" data-mk-ss-as-guide />
      </label>
    </div>
    <div class="block" data-mk-ss-origin>
      <span class="st-label">원산지 *</span>
      <label class="flex items-center gap-2 text-[13px] st-ink mt-1">
        <input v-model="f.originCode" type="radio" value="03" :disabled="!!done" data-mk-ss-origin-detail /> 상세설명에 표시
        <input v-model="f.originCode" type="radio" value="04" class="ml-4" :disabled="!!done" data-mk-ss-origin-direct /> 직접 입력
      </label>
      <input v-if="f.originCode === '04'" v-model="f.originContent" type="text" maxlength="200" class="st-input w-full sm:w-64 mt-1.5" placeholder="국가명 입력" :disabled="!!done" data-mk-ss-origin-content />
    </div>

    <!-- 상품정보제공고시 (기타 재화) -->
    <div class="block space-y-2" data-mk-ss-notice>
      <span class="st-label">상품정보제공고시 (기타 재화) *</span>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label class="block"><span class="st-desc-sm block mb-1">품명</span><input v-model="f.itemName" type="text" maxlength="50" class="st-input w-full" :disabled="!!done" data-mk-ss-item-name /></label>
        <label class="block"><span class="st-desc-sm block mb-1">모델명</span><input v-model="f.modelName" type="text" maxlength="50" class="st-input w-full" :disabled="!!done" data-mk-ss-model-name /></label>
        <label class="block"><span class="st-desc-sm block mb-1">제조자(사)</span><input v-model="f.manufacturer" type="text" maxlength="200" class="st-input w-full" :disabled="!!done" data-mk-ss-manufacturer /></label>
      </div>
      <button type="button" class="st-btn text-[12px]" :disabled="!!done" data-mk-ss-notice-fill @click="fillNotice">빈 칸을 "{{ DETAIL_REF }}"로</button>
    </div>

    <!-- 판매 상태 — 등록 때 판매상태는 판매중만 가능(네이버 문서) → 노출은 전시 상태로. 기본 전시중지 -->
    <div class="block" data-mk-ss-display>
      <span class="st-label">판매 상태</span>
      <label class="flex items-center gap-2 text-[13px] st-ink mt-1">
        <input v-model="f.display" type="radio" value="SUSPENSION" :disabled="!!done" data-mk-ss-display-off /> 전시중지
        <input v-model="f.display" type="radio" value="ON" class="ml-4" :disabled="!!done" data-mk-ss-display-on /> 전시중
      </label>
      <span class="st-desc-sm block mt-1">네이버 등록 규칙상 판매상태는 판매중으로 등록됩니다. 전시중지 상품은 스토어에 노출되지 않습니다.</span>
    </div>

    <!-- 등록 정보 확인 -->
    <section class="space-y-2" data-mk-ss-preview>
      <h4 class="st-h-card">등록 정보 확인</h4>
      <div class="st-border rounded-[10px] overflow-hidden">
        <table class="sum-table">
          <tbody>
            <tr v-for="r in preview" :key="r.label" :data-mk-ss-preview-row="r.label">
              <th>{{ r.label }}</th>
              <td :class="r.value ? 'st-ink' : 'st-muted'">{{ r.value || '미입력' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="done" class="text-[13px] font-bold st-success-text break-keep" data-mk-ss-done>{{ done.updated ? '판매처에 있는 상품을 수정했습니다.' : '등록되었습니다.' }} 원상품번호 {{ done.originProductNo }}<template v-if="done.channelProductNo"> · 채널상품번호 {{ done.channelProductNo }}</template> · {{ DISPLAY_LABEL[done.display] || DISPLAY_LABEL[f.display] }}</p>
  </div>
</template>

<script setup>
// 보내기 창의 스마트스토어 섹션 (2026-10-01) — 내 상품 한 줄(prepare = send_prepare 응답)을 스마트스토어 상품으로 등록한다.
// 카페24 섹션(StudioSendCafe24)과 같은 모양으로 밖에 내놓는다: missing(빠진 것)·busy·done·submit(). 창(StudioSendModal)이 스마트스토어를 체크했을 때만 보인다.
// 항목은 네이버 상품 등록 문서의 필수 칸(api/_smartstore.js buildSmartstoreProduct)만 — 카테고리·판매가·재고·대표 이미지·배송·출고지/반품지·A/S·원산지·고시·전시 상태.
// 판매 상태: 등록 때는 판매중(SALE)만 가능(문서) → 기본 전시중지(SUSPENSION)로 노출하지 않는다. 필수값은 화면(missing)이 먼저 막고 서버가 다시 검사한다
// 카테고리·주소록은 창(StudioSendModal)이 화면이 떠 있는 동안 들고 있는 목록(sendCache)을 같이 쓴다 — 창을 다시 열어도 다시 받지 않는다
// 등록 템플릿(2026-10-01): 11번가 섹션과 같은 공용 템플릿(api/_listingTemplates.js) — 이 섹션 칸 변환은 api/_smartstoreFields.js에서만. 택배사·출고지·반품지는 템플릿에 없다(주소록 + 마지막 사용 기억 그대로)
import { ref, reactive, computed, watch, onMounted, inject, nextTick } from 'vue'
import { matchCategory } from '@/lib/studioBulkSend'
import { listSmartstoreCategories, listSmartstoreAddresses, sendSmartstoreProduct, isNotReady } from '@/lib/studioMarketplace'
import { COMMON_GROUPS, commonPatch } from '@/lib/studioSendCommon'
import { listListingTemplates, createListingTemplate } from '@/lib/studioListingTemplates'
import { TEMPLATE_KINDS, TEMPLATE_NAME_MAX, pickDefaultTemplate, uniqueTemplateName } from '../../../api/_listingTemplates.js'
import { SEND_CACHE_KEY } from '@/lib/studioMarketplaceRules'
import { pickKoreanName } from '../../../api/_coupangFields.js'
import {
  SS_DELIVERY_COMPANIES, SS_FEE_TYPES, DISPLAY_STATUSES, CUSTOMS_TAX_TYPES, ADDRESS_TYPES, pickSmartstoreAddress, SMARTSTORE_CENTER_URL,
  smartstoreFormFromProduct, smartstoreFormFromShipping, productTemplateFromSmartstoreForm, shippingTemplateFromSmartstoreForm,
} from '../../../api/_smartstoreFields.js'
import { optionsPayload, smartstoreOptionProblems, ssOptionPriceRange } from '../../../api/_marketOptions.js'
import { optionEditorFromSource } from '@/lib/studioOptionEditor'
import StudioSendOptions from './StudioSendOptions.vue'

const CAT_SHOWN = 200 // 선택 목록에 한 번에 보이는 카테고리 수 (검색으로 좁힌다)
const DETAIL_REF = '상세페이지 참조'
const DISPLAY_LABEL = { SUSPENSION: '전시중지', ON: '전시중' }
// common = 창의 공통 정보(2026-10-01) — 11번가와 함께 보낼 때만 온다. null이면 예전 그대로(이 섹션 칸에 직접 넣는다)
const props = defineProps({ prepare: { type: Object, required: true }, common: { type: Object, default: null } })

const busy = ref('')
const done = ref(null)
const sendError = ref('')
const errorGuide = ref(false)
const errorEl = ref(null)
const categories = ref([])
const catLoading = ref(false)
const catError = ref('')
const catSoft = ref(false)
const catQuery = ref('')
const addresses = ref([])
const addrLoading = ref(false)
const addrError = ref('')
const addrSoft = ref(false)
const addrRefreshing = ref(false)
// 템플릿이 채우는 칸의 처음 값 — 아래 f의 처음 값과 같다. 템플릿을 바꿔 고르면 이 값으로 되돌린 뒤 템플릿 값을 덮는다(앞 템플릿 값이 남지 않게)
const shippingBase = () => ({ feeType: 'FREE', baseFee: null, freeOver: null, returnFee: null, exchangeFee: null })
const productBase = () => ({ asPhone: '', asGuide: DETAIL_REF, originCode: '03', originContent: '', manufacturer: '' })
const f = ref({
  // 상품명 기본값 = 쿠팡·카페24 섹션과 같은 규칙(한글만), 없으면 빈칸
  productName: pickKoreanName([props.prepare?.export?.projectTitle, props.prepare?.export?.title, props.prepare?.source?.title?.ko]),
  leafCategoryId: null, salePrice: null, stock: null, repImageId: props.prepare?.images?.[0]?.id ?? null, fit: 'contain',
  company: SS_DELIVERY_COMPANIES[0].code, feeType: 'FREE', baseFee: null, returnFee: null, exchangeFee: null,
  freeOver: null, // 조건부 무료 기준 금액 — 조건부 무료일 때만 보낸다(임의 숫자 없음)
  shippingAddressId: null, returnAddressId: null,
  asPhone: '', asGuide: DETAIL_REF, originCode: '03', originContent: '',
  itemName: '', modelName: '', manufacturer: '',
  display: DISPLAY_STATUSES[0], // 기본 전시중지
  customsTaxType: '', // 해외 출고지일 때만 보이고 필수 — 기본값 없음
})
// 옵션 — 쿠팡 옵션 표와 같은 원천(send_prepare.source.skus)을 옵션 편집 모양으로(src/lib/studioOptionEditor.js). 가져온 옵션이 있으면 처음부터 "옵션 사용"
// 옵션 사용을 켜면 조합이 0개여도 옵션 상품으로 본다(빠짐 목록 "판매할 옵션") — 단일 재고 칸으로 몰래 돌아가지 않게
const opts = ref(optionEditorFromSource(props.prepare?.source?.skus))
const useOptions = computed(() => opts.value.enabled)
const optionsOut = computed(() => (useOptions.value ? optionsPayload(opts.value) : null))
const optionStockTotal = computed(() => (optionsOut.value?.rows || []).reduce((s, r) => s + (Number.isInteger(r.stock) ? r.stock : 0), 0))
const optionRange = computed(() => ssOptionPriceRange(f.value.salePrice))

// ── 공통 정보 (2026-10-01) — 창이 common을 주면 상품명·판매가·재고·옵션·대표 이미지를 그 값으로 채우고 칸을 가린다.
//    [이 판매처만 다르게]를 켠 묶음(own)은 채우지 않고 칸을 다시 보인다. 칸에 들어간 값은 예전 f·opts 그대로라 빠짐 목록·요약 표·보내기는 바뀌지 않는다
const own = reactive(Object.fromEntries(COMMON_GROUPS.map(g => [g.key, false])))
const showOwn = key => !props.common || own[key]
function syncCommon() {
  if (!props.common || done.value) return
  const p = commonPatch('smartstore', props.common, own)
  Object.assign(f.value, p.form)
  if (p.opts) opts.value = p.opts
}
watch(() => props.common, syncCommon, { deep: true, immediate: true })
watch(own, syncCommon)

const isWon = (v, min) => Number.isInteger(v) && v >= min
const catMatches = computed(() => {
  const q = catQuery.value.trim().toLowerCase()
  return q ? categories.value.filter(c => c.wholeName.toLowerCase().includes(q)) : categories.value
})
// 고른 카테고리는 검색어와 상관없이 늘 목록에 남긴다(선택이 풀려 보이지 않게)
const catOptions = computed(() => {
  const list = catMatches.value.slice(0, CAT_SHOWN)
  const sel = categories.value.find(c => c.id === f.value.leafCategoryId)
  return sel && !list.includes(sel) ? [sel, ...list] : list
})
const categoryName = computed(() => categories.value.find(c => c.id === f.value.leafCategoryId)?.wholeName || '')
const addressLabel = a => `${a.name}${ADDRESS_TYPES[a.type] ? ` (${ADDRESS_TYPES[a.type]})` : ''}${a.overseas ? ' · 해외' : ''} · ${a.address}`
// 고른 출고지가 해외 주소인지 — 주소록 응답 overseasAddress(서버 normalizeAddressBooks의 overseas) 그대로
const shippingOverseas = computed(() => addresses.value.find(a => a.id === f.value.shippingAddressId)?.overseas === true)
const customsName = code => CUSTOMS_TAX_TYPES.find(t => t.code === code)?.name || ''
const addressName = id => { const a = addresses.value.find(x => x.id === id); return a ? addressLabel(a) : '' }

const missing = computed(() => {
  const v = f.value, out = []
  if (!String(v.productName || '').trim()) out.push('상품명')
  if (!v.leafCategoryId) out.push('카테고리')
  if (!isWon(v.salePrice, 1)) out.push('판매가')
  if (useOptions.value) {
    // 서버와 같은 검사(_marketOptions.smartstoreOptionProblems) — 판매가가 없으면 범위 검사는 판매가 칸이 먼저 막는다
    if (!optionsOut.value) out.push('판매할 옵션')
    else out.push(...smartstoreOptionProblems(optionsOut.value, isWon(v.salePrice, 1) ? v.salePrice : null).map(m => `옵션: ${m}`))
  } else if (!isWon(v.stock, 0)) out.push('재고 수량')
  if (!v.repImageId) out.push('대표 이미지')
  if (!SS_FEE_TYPES.includes(v.feeType)) out.push('배송비') // 서버 검사와 같은 목록(api/_smartstoreFields.js)
  if ((v.feeType === 'PAID' || v.feeType === 'CONDITIONAL_FREE') && !isWon(v.baseFee, 1)) out.push('기본 배송비')
  if (v.feeType === 'CONDITIONAL_FREE' && !isWon(v.freeOver, 1)) out.push('무료배송 기준 금액')
  if (!isWon(v.returnFee, 0)) out.push('반품 배송비')
  if (!isWon(v.exchangeFee, 0)) out.push('교환 배송비')
  if (!v.shippingAddressId) out.push('출고지')
  if (!v.returnAddressId) out.push('반품지')
  if (shippingOverseas.value && !v.customsTaxType) out.push('관부가세')
  if (!v.asPhone.trim()) out.push('A/S 전화번호')
  if (!v.asGuide.trim()) out.push('A/S 안내')
  if (v.originCode === '04' && !v.originContent.trim()) out.push('원산지')
  if (!v.itemName.trim() || !v.modelName.trim() || !v.manufacturer.trim()) out.push('상품정보제공고시')
  return out
})
const won = n => (Number.isInteger(n) ? `${n.toLocaleString('ko-KR')}원` : '')
const optionsSummary = computed(() => {
  const o = optionsOut.value
  if (!o) return '없음 (단일상품)'
  const sample = o.rows.slice(0, 3).map(r => r.values.filter(Boolean).join('/')).filter(Boolean)
  return `${o.groupNames.filter(Boolean).join(' · ')} 조합 ${o.rows.length}개${sample.length ? ` (${sample.join(', ')}${o.rows.length > 3 ? ' …' : ''})` : ''}`
})
const preview = computed(() => {
  const v = f.value
  return [
    { label: '상품명', value: String(v.productName || '').trim() },
    { label: '카테고리', value: categoryName.value },
    { label: '판매가', value: isWon(v.salePrice, 1) ? won(v.salePrice) : '' },
    { label: '재고 수량', value: useOptions.value ? `${optionStockTotal.value.toLocaleString('ko-KR')}개 (옵션 재고 합계)` : isWon(v.stock, 0) ? `${v.stock.toLocaleString('ko-KR')}개` : '' },
    { label: '옵션', value: optionsSummary.value },
    { label: '대표 이미지', value: v.repImageId ? '대표 이미지 1장' : '' },
    { label: '상세 이미지', value: `상세 이미지 ${props.prepare.export.files.length}장` },
    { label: '배송비', value: v.feeType === 'PAID' ? (isWon(v.baseFee, 1) ? `${won(v.baseFee)} (선결제)` : '')
      : v.feeType === 'CONDITIONAL_FREE' ? (isWon(v.baseFee, 1) && isWon(v.freeOver, 1) ? `${won(v.baseFee)} · ${won(v.freeOver)} 이상 무료 (선결제)` : '') : v.feeType === 'FREE' ? '무료' : '' },
    { label: '반품·교환 배송비', value: isWon(v.returnFee, 0) && isWon(v.exchangeFee, 0) ? `반품 ${won(v.returnFee)} · 교환 ${won(v.exchangeFee)}` : '' },
    { label: '출고지', value: addressName(v.shippingAddressId) },
    { label: '반품지', value: addressName(v.returnAddressId) },
    ...(shippingOverseas.value ? [{ label: '관부가세', value: customsName(v.customsTaxType) }] : []),
    { label: '판매상태', value: '판매중' },
    { label: '전시상태', value: DISPLAY_LABEL[v.display] },
  ]
})
function fillNotice() {
  for (const k of ['itemName', 'modelName', 'manufacturer']) if (!f.value[k].trim()) f.value[k] = DETAIL_REF
}

// 같은 화면 안에서 다시 받지 않는 목록 — 받는 중에 다시 열면 같은 요청을 기다린다. 실패는 기억하지 않는다
const sendCache = inject(SEND_CACHE_KEY, null)
function cached(key, load) {
  if (!sendCache) return load()
  if (!sendCache[key]) {
    const p = load()
    sendCache[key] = p
    p.then(r => { if (sendCache[key] === p) sendCache[`${key}Done`] = r },
      () => { if (sendCache[key] === p) delete sendCache[key] }) // 원인은 부르는 쪽이 console.error로 남긴다
  }
  return sendCache[key]
}
async function loadCategories() {
  const kept = sendCache?.smartstoreCategoriesDone
  if (kept) { categories.value = Array.isArray(kept.categories) ? kept.categories : []; return }
  catLoading.value = true
  catError.value = ''
  try {
    const r = await cached('smartstoreCategories', listSmartstoreCategories)
    categories.value = Array.isArray(r.categories) ? r.categories : []
    if (!categories.value.length) catError.value = '카테고리 목록이 비어 있습니다.'
  } catch (e) {
    console.error('[StudioSendSmartstore] 카테고리 조회 실패:', e.code, e)
    catError.value = e.message
    catSoft.value = isNotReady(e.code)
  } finally {
    catLoading.value = false
  }
}
/**
 * 처음 골라 둘 주소 — 규칙은 서버와 같은 함수 하나(api/_smartstoreFields.js pickSmartstoreAddress)
 *   마지막으로 등록에 성공한 출고지·반품지(서버 r.last) → 국내 + 용도 유형 → 다른 용도가 아닌 국내 주소 → 국내 첫째 → 목록 첫째
 *   (2026-10-01 운영: 해외(항주) 출고지가 기본 → 관부가세 400 / 출고지 기본이 "반품교환지"로 잡힘). 해외 주소도 목록에는 그대로 둔다(고를 수 있음)
 */
function applyAddresses(r) {
  addresses.value = Array.isArray(r.addresses) ? r.addresses : []
  // 고른 주소가 새 목록에도 있으면 그대로 — 없어졌거나(새로고침) 아직 안 골랐으면 규칙으로 다시
  const kept = id => id != null && addresses.value.some(a => a.id === id)
  if (!kept(f.value.shippingAddressId)) f.value.shippingAddressId = pickSmartstoreAddress(addresses.value, 'shipping', r.last?.shipping ?? null)
  if (!kept(f.value.returnAddressId)) f.value.returnAddressId = pickSmartstoreAddress(addresses.value, 'return', r.last?.return ?? null)
}
/** [주소록 새로고침] — 창이 들고 있는 목록(sendCache)을 버리고 다시 받는다 (네이버 주소록은 읽기만) */
async function refreshAddresses() {
  if (addrRefreshing.value || addrLoading.value) return
  if (sendCache) { delete sendCache.smartstoreAddresses; delete sendCache.smartstoreAddressesDone }
  addrRefreshing.value = true
  addrError.value = ''
  try {
    applyAddresses(await cached('smartstoreAddresses', listSmartstoreAddresses))
  } catch (e) {
    console.error('[StudioSendSmartstore] 주소록 새로고침 실패:', e.code, e)
    addrError.value = e.message
    addrSoft.value = isNotReady(e.code)
  } finally {
    addrRefreshing.value = false
  }
}
async function loadAddresses() {
  const kept = sendCache?.smartstoreAddressesDone
  if (kept) { applyAddresses(kept); return }
  addrLoading.value = true
  addrError.value = ''
  try {
    applyAddresses(await cached('smartstoreAddresses', listSmartstoreAddresses))
  } catch (e) {
    console.error('[StudioSendSmartstore] 주소록 조회 실패:', e.code, e)
    addrError.value = e.message
    addrSoft.value = isNotReady(e.code)
  } finally {
    addrLoading.value = false
  }
}

// ── 등록 템플릿 (2026-10-01) — 11번가 섹션과 같은 방식 ──
// 목록은 창의 sendCache('listingTemplates')를 11번가 섹션과 같이 쓴다(다시 받지 않음). 표가 없으면 ready = false → 칸을 그리지 않는다
// notes = 이 섹션에 넣지 못한 템플릿 값 안내(예: 조건부 무료) — 템플릿을 다시 고르면 지운다
const lt = reactive({ ready: false, list: [], picked: { product: '', shipping: '' }, notes: { product: [], shipping: [] }, saving: '', name: '', busy: false, message: '', error: false })
const ltList = kind => lt.list.filter(t => t.kind === kind)
/** 고른 템플릿 → 칸. 그 템플릿이 채우는 칸은 처음 값으로 되돌린 뒤 덮는다. "선택 안 함"이면 칸을 그대로 둔다 */
function applyTemplate(kind) {
  lt.notes[kind] = []
  const t = lt.list.find(x => x.id === lt.picked[kind] && x.kind === kind)
  if (!t) return
  const r = kind === 'product' ? smartstoreFormFromProduct(t.data) : smartstoreFormFromShipping(t.data)
  Object.assign(f.value, kind === 'product' ? productBase() : shippingBase(), r.form)
  lt.notes[kind] = r.notes
  lt.message = ''
}
/** 목록 → 기본 템플릿 자동 선택 (창을 열 때 한 번 — 섹션은 창을 열 때마다 새로 만든다) */
let ltApplied = false
function applyTemplateList(r) {
  lt.ready = r?.ready === true
  lt.list = Array.isArray(r?.templates) ? r.templates : []
  if (ltApplied || !lt.ready) return
  ltApplied = true
  for (const k of TEMPLATE_KINDS) {
    const d = pickDefaultTemplate(lt.list, k.key)
    if (d) { lt.picked[k.key] = d.id; applyTemplate(k.key) }
  }
}
async function loadTemplates() {
  try {
    applyTemplateList(await cached('listingTemplates', listListingTemplates))
  } catch (e) {
    console.error('[StudioSendSmartstore] 등록 템플릿 조회 실패 — 직접 입력으로 진행:', e) // 보내기는 막지 않는다
  }
}
function startSaveTemplate(kind) {
  lt.saving = kind
  lt.name = uniqueTemplateName(kind === 'product' ? '스마트스토어 상품정보' : '스마트스토어 배송', lt.list, kind)
  lt.message = ''
}
/** [현재 값으로 새 템플릿 저장] — 지금 칸의 값을 마켓 공용 값으로 바꿔 저장. 그 종류의 첫 템플릿이면 기본으로 */
async function saveTemplate(kind) {
  if (lt.busy) return
  lt.busy = true
  lt.message = ''
  lt.error = false
  try {
    const data = kind === 'product' ? productTemplateFromSmartstoreForm(f.value) : shippingTemplateFromSmartstoreForm(f.value)
    const row = await createListingTemplate({ kind, name: lt.name, data, is_default: ltList(kind).length === 0 })
    lt.list = [...lt.list, row]
    if (sendCache) sendCache.listingTemplatesDone = { ready: true, templates: lt.list }
    lt.picked[kind] = row.id
    lt.notes[kind] = []
    lt.saving = ''
    lt.message = `"${row.name}" 템플릿을 저장했습니다.${row.is_default ? ' 기본 템플릿으로 지정되었습니다.' : ''}`
  } catch (e) {
    console.error('[StudioSendSmartstore] 템플릿 저장 실패:', e)
    lt.message = e.message
    lt.error = true
  } finally {
    lt.busy = false
  }
}

// ── 여러 상품 한 번에 보내기 (2026-10-02 StudioBulkSendModal) — 카테고리·등록 템플릿을 밖에서 정한다.
//    목록(카테고리·템플릿)이 아직 없으면 기다렸다가 받은 뒤에 고른다. 보낸 뒤(done)는 바꾸지 않는다
const pendingBulk = reactive({ category: null, listing: null })
function setCategoryById(id) {
  const hit = matchCategory(categories.value, id)
  if (!hit) return false
  f.value.leafCategoryId = hit.id
  return true
}
function applyPendingBulk() {
  if (done.value) return
  if (pendingBulk.category != null && setCategoryById(pendingBulk.category)) pendingBulk.category = null
  if (pendingBulk.listing && lt.ready) {
    for (const k of TEMPLATE_KINDS) { const id = pendingBulk.listing[k.key]; if (id && lt.list.some(t => t.id === id && t.kind === k.key)) { lt.picked[k.key] = id; applyTemplate(k.key) } }
    pendingBulk.listing = null
  }
}
function applyPreset({ category = null, listing = null } = {}) {
  if (done.value) return
  if (category?.id != null) pendingBulk.category = category.id
  if (listing) pendingBulk.listing = listing
  applyPendingBulk()
}
watch([categories, () => lt.ready], applyPendingBulk)
const pickedCategory = computed(() => { const c = categories.value.find(x => x.id === f.value.leafCategoryId); return c ? { id: String(c.id), name: c.wholeName || c.name || '' } : null })

/** 창의 [보내기]가 부른다 — 성공하면 결과, 실패하면 null(이유는 이 섹션 안에) */
async function submit() {
  if (busy.value || done.value || missing.value.length) return null
  busy.value = 'send'
  sendError.value = ''
  errorGuide.value = false
  const v = f.value
  try {
    const r = await sendSmartstoreProduct({
      exportId: props.prepare.export.id, productName: String(v.productName).trim(), salePrice: v.salePrice, stock: optionsOut.value ? optionStockTotal.value : v.stock,
      ...(optionsOut.value ? { options: optionsOut.value } : {}), // 옵션을 안 쓰면 보내지 않는다(단일상품 — 예전 그대로)
      leafCategoryId: v.leafCategoryId, categoryName: categoryName.value, repImageId: v.repImageId, fit: v.fit, display: v.display,
      delivery: { company: v.company, feeType: v.feeType, baseFee: v.feeType === 'PAID' || v.feeType === 'CONDITIONAL_FREE' ? v.baseFee : null, ...(v.feeType === 'CONDITIONAL_FREE' ? { freeOver: v.freeOver } : {}), returnFee: v.returnFee, exchangeFee: v.exchangeFee, shippingAddressId: v.shippingAddressId, returnAddressId: v.returnAddressId, shippingOverseas: shippingOverseas.value },
      afterService: { phone: v.asPhone.trim(), guide: v.asGuide.trim() },
      origin: v.originCode === '04' ? { code: '04', content: v.originContent.trim() } : { code: '03' },
      notice: { itemName: v.itemName.trim(), modelName: v.modelName.trim(), manufacturer: v.manufacturer.trim() },
      ...(shippingOverseas.value ? { customsTaxType: v.customsTaxType } : {}), // 국내 출고지면 보내지 않는다
    })
    done.value = r
    // 같은 화면에서 창을 다시 열 때도 방금 보낸 출고지·반품지가 기본 (서버는 다음 조회부터 보내기 기록에서 읽는다)
    const kept = sendCache?.smartstoreAddressesDone
    if (kept) sendCache.smartstoreAddressesDone = { ...kept, last: { shipping: v.shippingAddressId, return: v.returnAddressId } }
    return r
  } catch (e) {
    console.error('[StudioSendSmartstore] 스마트스토어 보내기 실패:', e.code, e)
    sendError.value = e.message
    errorGuide.value = ['not_connected', 'token_invalid', 'scope_denied', 'ip_not_allowed', 'bad_key'].includes(e.code)
    // 실패 사유가 보이게 — 섹션 맨 위 사유 줄로 스크롤 (창 안 스크롤 영역)
    nextTick(() => errorEl.value?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }))
    return null
  } finally {
    busy.value = ''
  }
}

// 창을 다시 열 때 이미 받은 목록은 바로 채운다(깜빡임 없음) — 받지 않은 것만 화면에 붙은 뒤 서버에 묻는다
if (sendCache?.smartstoreCategoriesDone) categories.value = Array.isArray(sendCache.smartstoreCategoriesDone.categories) ? sendCache.smartstoreCategoriesDone.categories : []
if (sendCache?.smartstoreAddressesDone) applyAddresses(sendCache.smartstoreAddressesDone)
if (sendCache?.listingTemplatesDone) applyTemplateList(sendCache.listingTemplatesDone)
onMounted(() => {
  if (!sendCache?.smartstoreCategoriesDone) loadCategories()
  if (!sendCache?.smartstoreAddressesDone) loadAddresses()
  if (!sendCache?.listingTemplatesDone) loadTemplates()
})
defineExpose({ missing, busy, done, submit, sendError, applyPreset, pickedCategory }) // sendError = 창의 결과 표가 실패 사유를 그대로 보인다 (2026-10-01) · applyPreset·pickedCategory = 여러 상품 보내기 (2026-10-02)
</script>

<style scoped>
/* 쿠팡·카페24 섹션의 요약 표와 같은 모양 */
.sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sum-table th { width: 130px; padding: 7px 10px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.sum-table td { padding: 7px 10px; border-bottom: 1px solid var(--st-line); word-break: break-all; }
.sum-table tr:last-child th, .sum-table tr:last-child td { border-bottom: 0; }
</style>
