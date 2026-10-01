<template>
  <!-- 상품정보 템플릿 -->
  <div v-if="kind === 'product'" class="space-y-4" data-mk-lt-form="product">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label class="block">
        <span class="st-desc-sm block mb-1">원산지</span>
        <select v-model="data.origin.type" class="st-input w-full" data-mk-lt-origin-type @change="onOriginType">
          <option value="">선택 안 함</option>
          <option v-for="t in ORIGIN_TYPES" :key="t.key" :value="t.key">{{ t.name }}</option>
        </select>
      </label>
      <label v-if="data.origin.type === 'overseas' || data.origin.type === 'domestic'" class="block">
        <span class="st-desc-sm block mb-1">{{ data.origin.type === 'domestic' ? '지역' : '국가' }}</span>
        <select v-model="data.origin.place" class="st-input w-full" data-mk-lt-origin-place>
          <option value="">선택</option>
          <option v-for="[code, name] in (data.origin.type === 'domestic' ? ORIGIN_DOMESTIC : ORIGIN_COUNTRIES)" :key="code" :value="name">{{ name }}</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label class="block"><span class="st-desc-sm block mb-1">제조자/수입자</span><input v-model="data.maker" type="text" :maxlength="TEXT_MAX" class="st-input w-full" placeholder="예: (주)OO상사 (수입자)" data-mk-lt-maker /></label>
      <label class="block"><span class="st-desc-sm block mb-1">제조국</span><input v-model="data.country" type="text" :maxlength="TEXT_MAX" class="st-input w-full" data-mk-lt-country /></label>
      <label class="block"><span class="st-desc-sm block mb-1">브랜드</span><input v-model="data.brand" type="text" :maxlength="TEXT_MAX" class="st-input w-full" placeholder="없으면 비워 두세요" data-mk-lt-brand /></label>
      <label class="block"><span class="st-desc-sm block mb-1">A/S 책임자·상담 전화번호</span><input v-model="data.asContact" type="text" :maxlength="TEXT_MAX" class="st-input w-full" placeholder="예: 홍길동 010-0000-0000" data-mk-lt-as-contact /></label>
      <label class="block"><span class="st-desc-sm block mb-1">A/S 안내</span><input v-model="data.asGuide" type="text" :maxlength="GUIDE_MAX" class="st-input w-full" data-mk-lt-as-guide /></label>
      <label class="block"><span class="st-desc-sm block mb-1">반품/교환 안내</span><input v-model="data.returnGuide" type="text" :maxlength="GUIDE_MAX" class="st-input w-full" data-mk-lt-return-guide /></label>
    </div>

    <div class="space-y-2">
      <span class="st-label">KC 인증</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="g in KC_GROUPS" :key="g.key" class="block st-border rounded-[10px] p-2.5" :data-mk-lt-kc-box="g.key">
          <span class="st-desc-sm block mb-1">{{ g.name }}</span>
          <select v-model="data.kc[g.key].choice" class="st-input w-full" :data-mk-lt-kc="g.key">
            <option value="">선택 안 함</option>
            <option v-for="c in KC_CHOICES[g.code]" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
          <div v-if="data.kc[g.key].choice === 'cert'" class="grid grid-cols-1 gap-1.5 mt-1.5">
            <select v-model="data.kc[g.key].certType" class="st-input w-full" :data-mk-lt-kc-type="g.key">
              <option value="">인증유형 선택</option>
              <option v-for="[code, label] in KC_CERT_TYPES[g.code]" :key="code" :value="label">{{ label }}</option>
            </select>
            <input v-model="data.kc[g.key].certNo" type="text" :maxlength="TEXT_MAX" class="st-input w-full" placeholder="인증번호" :data-mk-lt-kc-no="g.key" />
          </div>
        </div>
      </div>
      <p class="st-desc-sm break-keep">KC 인증 대상 여부는 판매자가 직접 확인하여 선택해야 합니다. 비워 두면 보낼 때 선택합니다.</p>
    </div>

    <div class="space-y-2">
      <span class="st-label">상품정보제공고시</span>
      <select v-model="data.notice.type" class="st-input w-full sm:w-80" data-mk-lt-notice-type>
        <option value="">선택 안 함</option>
        <option v-for="t in NOTICE_TYPES" :key="t.code" :value="t.name">{{ t.name }}</option>
      </select>
      <div v-if="restItems.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label v-for="[code, label] in restItems" :key="code" class="block">
          <span class="st-desc-sm block mb-1 break-keep">{{ label }}</span>
          <input v-model="data.notice.items[label]" type="text" :maxlength="TEXT_MAX" class="st-input w-full" :placeholder="NOTICE_DEFAULT_VALUE" :data-mk-lt-notice-item="code" />
        </label>
      </div>
      <p v-if="data.notice.type" class="st-desc-sm break-keep">제조자/수입자·제조국·전화번호 항목은 위 칸의 값을 사용합니다. 비워 둔 항목은 "{{ NOTICE_DEFAULT_VALUE }}"로 등록됩니다.</p>
    </div>
  </div>

  <!-- 배송 템플릿 (출고지·반품지는 판매처 주소록에서 고른다) -->
  <div v-else class="space-y-3" data-mk-lt-form="shipping">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] st-ink">
      <span class="st-label">배송비</span>
      <label v-for="t in SHIP_FEE_TYPES" :key="t.key" class="flex items-center gap-1.5"><input v-model="data.feeType" type="radio" :value="t.key" :data-mk-lt-fee-type="t.key" /> {{ t.name }}</label>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label v-if="data.feeType === 'fixed' || data.feeType === 'conditional'" class="block"><span class="st-desc-sm block mb-1">기본 배송비 (원)</span><input v-model.number="data.fee" type="number" min="10" step="10" class="st-input w-full" data-mk-lt-fee /></label>
      <label v-if="data.feeType === 'conditional'" class="block"><span class="st-desc-sm block mb-1">무료배송 기준 금액 (원 이상)</span><input v-model.number="data.freeOver" type="number" min="10" step="10" class="st-input w-full" data-mk-lt-free-over /></label>
      <label class="block"><span class="st-desc-sm block mb-1">제주 추가 (원)</span><input v-model.number="data.jejuFee" type="number" min="0" step="10" class="st-input w-full" data-mk-lt-jeju /></label>
      <label class="block"><span class="st-desc-sm block mb-1">도서산간 추가 (원)</span><input v-model.number="data.islandFee" type="number" min="0" step="10" class="st-input w-full" data-mk-lt-island /></label>
      <label class="block"><span class="st-desc-sm block mb-1">반품 배송비 (편도, 원)</span><input v-model.number="data.returnFee" type="number" min="0" step="10" class="st-input w-full" data-mk-lt-return /></label>
      <label class="block"><span class="st-desc-sm block mb-1">교환 배송비 (왕복, 원)</span><input v-model.number="data.exchangeFee" type="number" min="0" step="10" class="st-input w-full" data-mk-lt-exchange /></label>
    </div>
    <p class="st-desc-sm break-keep">금액은 10원 단위로 입력합니다. 출고지·반품지는 보낼 때 판매처 주소록에서 선택합니다.</p>
  </div>
</template>

<script setup>
// 등록 템플릿 칸 (2026-10-01) — 마켓 공용 값(api/_listingTemplates.js)을 고친다. 판매처 > [기본 설정] 관리 화면에서 쓴다
// 고를 수 있는 목록(원산지 나라·지역, KC 인증유형, 고시 유형·항목)은 지금 연결된 판매처 중 처음인 11번가 표에서 가져온다 — 값은 이름으로 담는다
import { computed } from 'vue'
import { ORIGIN_TYPES, SHIP_FEE_TYPES, TEXT_MAX, GUIDE_MAX } from '../../../api/_listingTemplates.js'
import {
  ORIGIN_COUNTRIES, ORIGIN_DOMESTIC, KC_GROUPS, KC_CHOICES, KC_CERT_TYPES, NOTICE_TYPES, NOTICE_DEFAULT_VALUE,
  NOTICE_MAKER_CODES, NOTICE_COUNTRY_CODES, NOTICE_PHONE_CODES, ORIGIN_CHINA,
} from '../../../api/_elevenstFields.js'

// data = 부모가 들고 있는 템플릿 값(reactive) — 이 칸이 그 안을 고친다
const props = defineProps({ kind: { type: String, required: true }, data: { type: Object, required: true } })

const restItems = computed(() => {
  if (props.kind !== 'product') return []
  const t = NOTICE_TYPES.find(x => x.name === props.data.notice?.type)
  const own = [...NOTICE_MAKER_CODES, ...NOTICE_COUNTRY_CODES, ...NOTICE_PHONE_CODES]
  return t ? t.items.filter(([code]) => !own.includes(code)) : []
})
function onOriginType() {
  props.data.origin.place = props.data.origin.type === 'overseas' ? ORIGIN_CHINA.name : '' // 해외로 바꾸면 보내기 창과 같은 기본(중국)
}
</script>
