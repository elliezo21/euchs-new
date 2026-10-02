<template>
  <div class="space-y-5 st-border rounded-[12px] p-4" data-mk-11st>
    <h4 class="st-h-card">11번가</h4>

    <!-- 실패 사유 — 섹션 맨 위 (해당 칸을 알 수 있으면 그 칸으로 스크롤) -->
    <p v-if="sendError" ref="errorEl" class="text-[13px] font-bold st-danger-text break-keep st-surface st-border rounded-[10px] p-3" role="alert" data-mk-11st-error>등록에 실패했습니다. (사유: {{ sendError }})
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">연결 설정으로 이동</router-link></p>

    <!-- 등록 템플릿 (2026-10-01) — 고르면 칸이 채워지고 그 자리에서 고칠 수 있다. 기본 템플릿은 창을 열 때 자동 선택. 표가 없으면(SQL 실행 전) 그리지 않는다 -->
    <div v-if="lt.ready" class="st-surface st-border rounded-[10px] p-3 space-y-2" data-mk-11st-templates>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="k in TEMPLATE_KINDS" :key="k.key" class="block">
          <span class="st-desc-sm block mb-1">{{ k.name }}</span>
          <select v-model="lt.picked[k.key]" class="st-input w-full" :disabled="!!done" :data-mk-11st-lt="k.key" @change="applyTemplate(k.key)">
            <option value="">선택 안 함</option>
            <option v-for="t in ltList(k.key)" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
          </select>
          <button v-if="lt.saving !== k.key" type="button" class="st-link text-[12px] mt-1" :disabled="!!done || !!lt.saving" :data-mk-11st-lt-save="k.key" @click="startSaveTemplate(k.key)">현재 값으로 새 템플릿 저장</button>
          <div v-else class="flex flex-wrap items-center gap-1.5 mt-1.5" :data-mk-11st-lt-save-box="k.key">
            <input v-model="lt.name" type="text" :maxlength="TEMPLATE_NAME_MAX" class="st-input flex-1 min-w-[140px]" placeholder="템플릿 이름" data-mk-11st-lt-name />
            <button type="button" class="st-btn st-btn-primary" :disabled="lt.busy" data-mk-11st-lt-save-ok @click="saveTemplate(k.key)">{{ lt.busy ? '저장 중…' : '저장' }}</button>
            <button type="button" class="st-btn" :disabled="lt.busy" @click="lt.saving = ''">취소</button>
          </div>
        </div>
      </div>
      <p v-if="!lt.list.length" class="st-desc-sm break-keep" data-mk-11st-lt-empty>템플릿이 없습니다. <router-link :to="{ name: 'studio-channels-defaults' }" class="st-link">기본 설정</router-link> 탭에서 예시값으로 템플릿을 만들 수 있습니다.</p>
      <p v-if="lt.message" class="text-[12px] break-keep" :class="lt.error ? 'st-danger-text font-bold' : 'st-muted'" data-mk-11st-lt-msg>{{ lt.message }}</p>
    </div>

    <!-- 판매자 사전 준비 -->
    <div class="st-surface st-border rounded-[10px] p-3 text-[13px] break-keep space-y-1" data-mk-11st-prep>
      <div class="font-bold st-ink">보내기 전 준비 사항</div>
      <p class="st-muted">11번가 셀러오피스에 출고지와 반품/교환지 주소가 등록되어 있어야 합니다.</p>
      <p class="st-muted">11번가 Open API(Seller API) 승인이 완료된 계정만 상품을 등록할 수 있습니다.</p>
      <p class="st-muted" data-mk-11st-prep-settle>11번가 셀러오피스에서 정산대금 수령방법·입금계좌 인증이 완료되어 있어야 합니다.</p>
      <a :href="SELLER_OFFICE_URL" target="_blank" rel="noopener noreferrer" class="st-link" data-mk-11st-office>셀러오피스 열기</a>
    </div>

    <!-- [공통 정보 사용] (2026-10-02 ②-1) — 처음에는 모두 체크(공통 값). 체크를 풀면 아래에 그 칸이 열린다 (useSendCommon) -->
    <StudioSendUseCommon v-if="common" market="11st" :groups="cm.groups" :use="cm.use" :disabled="!!done" data-mk-11st-common @toggle="cm.setUse" />

    <!-- 상품명 · 브랜드 -->
    <div ref="nameEl" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label v-show="showOwn('name')" class="block sm:col-span-2">
        <span class="st-label">상품명 *</span>
        <input v-model="f.productName" type="text" class="st-input w-full" :maxlength="PRODUCT_NAME_MAX" placeholder="상품명을 입력하세요" :disabled="!!done" data-mk-11st-name />
        <span class="st-desc-sm block mt-1" :class="{ 'st-danger-text font-bold': nameLeft < 0 }" data-mk-11st-name-bytes>{{ nameLeft >= 0 ? `남은 ${nameLeft}바이트` : `${-nameLeft}바이트 초과` }} · {{ PRODUCT_NAME_BYTES }}바이트까지(한글 2바이트·영문/숫자 1바이트)</span>
      </label>
      <label class="block">
        <span class="st-label">브랜드</span>
        <input v-model="f.brand" type="text" maxlength="100" class="st-input w-full" placeholder="없으면 비워 두세요" :disabled="!!done" data-mk-11st-brand />
        <span class="st-desc-sm block mt-1">비워 두면 "알수없음"으로 등록됩니다.</span>
      </label>
    </div>

    <!-- 카테고리 (최하위만) -->
    <div ref="catEl" class="block" data-mk-11st-category-box>
      <span class="st-label">카테고리 *</span>
      <p v-if="catLoading" class="st-desc-sm" data-mk-11st-cat-loading>카테고리 목록을 불러오는 중…</p>
      <template v-else-if="categories.length">
        <input v-model="catQuery" type="text" class="st-input w-full mb-1.5" placeholder="카테고리 검색 (예: 머그컵)" :disabled="!!done" data-mk-11st-cat-search />
        <select v-model="f.categoryId" class="st-input w-full" :disabled="!!done" data-mk-11st-category>
          <option :value="null">카테고리 선택</option>
          <option v-for="c in catOptions" :key="c.id" :value="c.id">{{ c.wholeName }}</option>
        </select>
        <span v-if="catQuery.trim()" class="st-desc-sm block mt-1">검색 결과 {{ catMatches.length.toLocaleString('ko-KR') }}건<template v-if="catMatches.length > CAT_SHOWN"> · 앞 {{ CAT_SHOWN }}건 표시</template></span>
        <span v-else class="st-desc-sm block mt-1" data-mk-cat-hint>카테고리 이름을 검색하면 목록이 보입니다.</span>
      </template>
      <p v-if="catError" class="mt-1 text-[12px] break-keep" :class="catSoft ? 'st-muted' : 'st-danger-text'" data-mk-11st-cat-error>{{ catError }}
        <button type="button" class="st-link ml-1" data-mk-11st-cat-retry @click="loadCategories">다시 불러오기</button></p>
    </div>

    <!-- 판매가 · 재고 -->
    <div v-show="showOwn('price') || showOwn('stock')" ref="priceEl" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label v-show="showOwn('price')" class="block">
        <span class="st-label">판매가 *</span>
        <input v-model.number="f.price" type="number" min="10" step="10" class="st-input w-full" placeholder="원 (10원 단위)" :disabled="!!done" data-mk-11st-price />
      </label>
      <label v-if="!useOptions" v-show="showOwn('stock')" class="block">
        <span class="st-label">재고 수량 *</span>
        <input v-model.number="f.stock" type="number" min="1" step="1" class="st-input w-full" placeholder="개" :disabled="!!done" data-mk-11st-stock />
        <span class="st-desc-sm block mt-1">11번가는 재고 0으로 등록할 수 없습니다.</span>
      </label>
      <div v-else v-show="showOwn('stock')" class="block" data-mk-11st-stock-total>
        <span class="st-label">재고 수량</span>
        <p class="text-[13px] st-ink mt-1">판매할 옵션 재고 합계 {{ optionStockTotal.toLocaleString('ko-KR') }}개</p>
      </div>
    </div>

    <!-- 옵션 (싱글옵션 한 칸 — 종류가 여럿이면 "/"로 합침) — 옵션 종류·값을 넣으면 조합 목록이 만들어진다(가져온 옵션이 없으면 꺼진 채). 규칙·근거 api/_marketOptions.js -->
    <div v-show="showOwn('stock')" ref="optionsEl">
      <StudioSendOptions :model="opts" :skus="prepare.source?.skus || []" :sku-total="prepare.source?.skuTotal || 0" :ordered="prepare.ordered || []" :disabled="!!done" :range="optionRange" :note="OPTION_NOTE" data-mk-11st-options />
    </div>

    <!-- 대표 이미지 — 공통 정보가 있으면 거기 한 곳에서만 고른다(2026-10-02 ②-1). 이 칸은 공통 정보가 없을 때(다시 보내기 등)만 -->
    <div v-if="!common" ref="imageEl" class="block">
      <span class="st-label">대표 이미지 *</span>
      <div v-if="!repImages.length" class="st-desc">{{ REP_IMAGE_EMPTY }}</div>
      <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-11st-images>
        <button v-for="im in repImages" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :disabled="!!done" :data-mk-11st-image="im.id" @click="f.repImageId = im.id">
          <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
      <label class="flex items-center gap-2 text-[12px] st-muted mt-2"><input v-model="f.fit" type="radio" value="contain" :disabled="!!done" /> 여백 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" :disabled="!!done" /> 중앙 자르기</label>
      <span class="st-desc-sm block mt-1">1000×1000으로 변환되며, 11번가가 내려받아 저장합니다. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 사용합니다.</span>
    </div>

    <!-- 배송 -->
    <div ref="deliveryEl" class="block space-y-2" data-mk-11st-delivery>
      <span class="st-label">배송 * (택배 · 전국 · 선결제)</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="block">
          <span class="st-desc-sm block mb-1">배송비</span>
          <label class="flex flex-wrap items-center gap-2 text-[13px] st-ink">
            <input v-model="f.feeType" type="radio" value="01" :disabled="!!done" data-mk-11st-fee-free /> 무료
            <input v-model="f.feeType" type="radio" value="02" class="ml-3" :disabled="!!done" data-mk-11st-fee-paid /> 고정 배송비
            <input v-model="f.feeType" type="radio" value="03" class="ml-3" :disabled="!!done" data-mk-11st-fee-cond /> 조건부 무료
          </label>
          <input v-if="feeHasBase(f.feeType)" v-model.number="f.fee" type="number" min="10" step="10" class="st-input w-full mt-1.5" placeholder="기본 배송비 (원)" :disabled="!!done" data-mk-11st-base-fee />
          <input v-if="f.feeType === '03'" v-model.number="f.freeOver" type="number" min="10" step="10" class="st-input w-full mt-1.5" placeholder="무료배송 기준 금액 (원 이상)" :disabled="!!done" data-mk-11st-free-over />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="block"><span class="st-desc-sm block mb-1">제주 추가</span><input v-model.number="f.jejuFee" type="number" min="0" step="10" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-11st-jeju /></label>
          <label class="block"><span class="st-desc-sm block mb-1">도서산간 추가</span><input v-model.number="f.islandFee" type="number" min="0" step="10" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-11st-island /></label>
        </div>
        <label class="block"><span class="st-desc-sm block mb-1">반품 배송비 (편도)</span><input v-model.number="f.returnFee" type="number" min="0" step="10" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-11st-return-fee /></label>
        <label class="block"><span class="st-desc-sm block mb-1">교환 배송비 (왕복)</span><input v-model.number="f.exchangeFee" type="number" min="0" step="10" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-11st-exchange-fee /></label>
      </div>
      <span class="st-desc-sm block">금액은 10원 단위로 입력하세요.</span>
    </div>

    <!-- 출고지 · 반품/교환지 (판매자 주소록 — 읽기만) -->
    <div ref="addressEl" class="block" data-mk-11st-address-box>
      <div class="flex flex-wrap items-center gap-2 mb-1">
        <span class="st-label">출고지 · 반품/교환지 *</span>
        <!-- 주소는 11번가 셀러오피스에서 바꾼다 — 바꾼 뒤 [주소록 새로고침] -->
        <a :href="SELLER_OFFICE_URL" target="_blank" rel="noopener noreferrer" class="st-btn ml-auto" data-mk-11st-addr-manage>주소록 관리</a>
        <button type="button" class="st-btn" :disabled="!!done || addrLoading || addrRefreshing" data-mk-11st-addr-refresh @click="refreshAddresses">{{ addrRefreshing ? '확인 중…' : '주소록 새로고침' }}</button>
      </div>
      <p v-if="addrLoading" class="st-desc-sm" data-mk-11st-addr-loading>주소록을 불러오는 중…</p>
      <div v-else-if="outAddresses.length || inAddresses.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <span class="st-desc-sm block mb-1">출고지</span>
          <select v-model="f.outAddr" class="st-input w-full" :disabled="!!done" data-mk-11st-out>
            <option :value="null">출고지 선택</option>
            <option v-for="a in outAddresses" :key="a.id" :value="a.id">{{ addressLabel(a) }}</option>
          </select>
        </label>
        <label class="block">
          <span class="st-desc-sm block mb-1">반품/교환지</span>
          <select v-model="f.inAddr" class="st-input w-full" :disabled="!!done" data-mk-11st-in>
            <option :value="null">반품/교환지 선택</option>
            <option v-for="a in inAddresses" :key="a.id" :value="a.id">{{ addressLabel(a) }}</option>
          </select>
        </label>
      </div>
      <p v-else-if="!addrError" class="st-desc-sm break-keep" data-mk-11st-addr-empty>11번가 셀러오피스에 출고지·반품/교환지를 등록한 뒤 [주소록 새로고침]을 누르세요.</p>
      <p v-if="addrError" class="mt-1 text-[12px] break-keep" :class="addrSoft ? 'st-muted' : 'st-danger-text'" data-mk-11st-addr-error>{{ addrError }}
        <button type="button" class="st-link ml-1" data-mk-11st-addr-retry @click="loadAddresses">다시 불러오기</button></p>
    </div>

    <!-- A/S · 반품/교환 안내 · 부가세 · 미성년자 -->
    <div ref="guideEl" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label class="block">
        <span class="st-label">A/S 안내 *</span>
        <input v-model="f.asDetail" type="text" maxlength="1000" class="st-input w-full" :disabled="!!done" data-mk-11st-as />
      </label>
      <label class="block">
        <span class="st-label">반품/교환 안내 *</span>
        <input v-model="f.rtngExchDetail" type="text" maxlength="1000" class="st-input w-full" :disabled="!!done" data-mk-11st-rtng />
      </label>
    </div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] st-ink">
      <span class="st-label">부가세 *</span>
      <label v-for="v in VAT_TYPES" :key="v.code" class="flex items-center gap-1.5"><input v-model="f.vat" type="radio" :value="v.code" :disabled="!!done" :data-mk-11st-vat="v.code" /> {{ v.name }}</label>
      <label class="flex items-center gap-1.5"><input v-model="f.minorBlocked" type="checkbox" :disabled="!!done" data-mk-11st-minor /> 미성년자 구매 불가</label>
    </div>
    <p v-if="f.vat === '02'" class="st-desc-sm break-keep" data-mk-11st-vat-note>면세상품으로 등록하면 세무·법률적 책임은 판매자에게 있습니다.</p>

    <!-- 원산지 — 기본 해외·중국, 판매자가 바꿀 수 있다 (11번가 법적 표시 칸) -->
    <div ref="originEl" class="block" data-mk-11st-origin>
      <span class="st-label">원산지 *</span>
      <div class="flex flex-wrap items-center gap-2 mt-1">
        <select v-model="f.originKind" class="st-input w-full sm:w-40" :disabled="!!done" data-mk-11st-origin-kind @change="onOriginKind">
          <option v-for="k in ORIGIN_KINDS" :key="k.code" :value="k.code">{{ k.name }}</option>
        </select>
        <select v-if="f.originKind !== '03'" v-model="f.originCode" class="st-input w-full sm:w-48" :disabled="!!done" data-mk-11st-origin-code>
          <option value="">{{ f.originKind === '01' ? '지역 선택' : '국가 선택' }}</option>
          <option v-for="[code, name] in (f.originKind === '01' ? ORIGIN_DOMESTIC : ORIGIN_COUNTRIES)" :key="code" :value="code">{{ name }}</option>
        </select>
      </div>
    </div>

    <!-- KC 인증 — 판매자가 직접 고른다 (기본값 없음) -->
    <div ref="kcEl" class="block space-y-2" data-mk-11st-kc>
      <span class="st-label">KC 인증 *</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="g in KC_GROUPS" :key="g.code" class="block st-border rounded-[10px] p-2.5" :data-mk-11st-kc-box="g.code">
          <span class="st-desc-sm block mb-1">{{ g.name }}</span>
          <select v-model="f.kc[g.code]" class="st-input w-full" :disabled="!!done" :data-mk-11st-kc-group="g.code">
            <option value="">선택</option>
            <option v-for="c in KC_CHOICES[g.code]" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
          <!-- 인증대상 → 인증유형 + 인증번호 -->
          <div v-if="f.kc[g.code] === 'cert'" class="grid grid-cols-1 gap-1.5 mt-1.5" :data-mk-11st-kc-cert="g.code">
            <select v-model="f.kcCerts[g.code].type" class="st-input w-full" :disabled="!!done" :data-mk-11st-kc-type="g.code">
              <option value="">인증유형 선택</option>
              <option v-for="[code, label] in KC_CERT_TYPES[g.code]" :key="code" :value="code">{{ label }}</option>
            </select>
            <input v-model="f.kcCerts[g.code].key" type="text" :maxlength="KC_CERT_KEY_MAX" class="st-input w-full" placeholder="인증번호" :disabled="!!done" :data-mk-11st-kc-key="g.code" />
          </div>
        </div>
      </div>
      <p class="st-desc-sm break-keep" data-mk-11st-kc-note>KC 인증 대상 여부는 판매자가 직접 확인하여 선택해야 합니다. 잘못 표시하여 발생하는 법적 책임은 판매자에게 있습니다.</p>
    </div>

    <!-- 상품정보제공고시 -->
    <div ref="noticeEl" class="block space-y-2" data-mk-11st-notice>
      <span class="st-label">상품정보제공고시 *</span>
      <select v-model="f.noticeType" class="st-input w-full sm:w-80" :disabled="!!done" data-mk-11st-notice-type>
        <option v-for="t in NOTICE_TYPES" :key="t.code" :value="t.code">{{ t.name }}</option>
      </select>
      <p v-if="heavyNotice" class="text-[13px] font-bold st-danger-text break-keep" data-mk-11st-notice-heavy>{{ noticeTypeName }}은 법정 표시 항목이 많습니다. 표시 내용이 사실과 다르면 판매자에게 법적 책임이 있으므로, 항목을 직접 확인한 뒤 등록하세요.</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label class="block"><span class="st-desc-sm block mb-1">제조자/수입자</span><input v-model="f.maker" type="text" :maxlength="NOTICE_VALUE_MAX" class="st-input w-full" :disabled="!!done" data-mk-11st-maker /></label>
        <label class="block"><span class="st-desc-sm block mb-1">제조국</span><input v-model="f.country" type="text" :maxlength="NOTICE_VALUE_MAX" class="st-input w-full" :disabled="!!done" data-mk-11st-country /></label>
        <label class="block"><span class="st-desc-sm block mb-1">A/S·상담 전화번호</span><input v-model="f.phone" type="text" :maxlength="NOTICE_VALUE_MAX" class="st-input w-full" :disabled="!!done" data-mk-11st-phone /></label>
      </div>
      <p class="st-desc-sm break-keep" data-mk-11st-notice-rest>나머지 항목({{ restLabels.join(' · ') }})은 비워 두면 "{{ NOTICE_DEFAULT_VALUE }}"로 등록됩니다. 값은 {{ NOTICE_VALUE_MAX }}자까지 입력할 수 있습니다.</p>
      <!-- 나머지 항목 직접 입력 (등록 템플릿의 고시 항목값이 여기로 들어온다) -->
      <details class="text-[13px]" :open="restFilled" data-mk-11st-notice-items>
        <summary class="st-link cursor-pointer">나머지 항목 직접 입력</summary>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <label v-for="[code, label] in restItems" :key="code" class="block">
            <span class="st-desc-sm block mb-1 break-keep">{{ label }}</span>
            <input v-model="f.noticeItems[code]" type="text" :maxlength="NOTICE_VALUE_MAX" class="st-input w-full" :placeholder="NOTICE_DEFAULT_VALUE" :disabled="!!done" :data-mk-11st-notice-item="code" />
          </label>
        </div>
      </details>
    </div>

    <!-- 관리자·스태프 테스트용 — 등록 직후 판매중지 -->
    <label v-if="isAdminOrStaff" class="flex items-center gap-2 text-[13px] st-ink" data-mk-11st-teststop>
      <input v-model="f.testStop" type="checkbox" :disabled="!!done" /> 테스트용: 등록 직후 판매중지 (관리자 전용)
    </label>

    <!-- 등록 정보 확인 -->
    <section class="space-y-2" data-mk-11st-preview>
      <h4 class="st-h-card">등록 정보 확인</h4>
      <div class="st-border rounded-[10px] overflow-hidden">
        <table class="sum-table">
          <tbody>
            <tr v-for="r in preview" :key="r.label" :data-mk-11st-preview-row="r.label">
              <th>{{ r.label }}</th>
              <td :class="r.value ? 'st-ink' : 'st-muted'">{{ r.value || '미입력' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="done" class="text-[13px] font-bold st-success-text break-keep" data-mk-11st-done>{{ done.updated ? '판매처에 있는 상품을 수정했습니다.' : '등록되었습니다.' }} 상품번호 {{ done.productNo }}<template v-if="done.stopped"> · 판매중지</template></p>
    <p v-if="done?.stopError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-11st-stop-error>{{ done.stopError }}</p>
  </div>
</template>

<script setup>
// 보내기 창의 11번가 섹션 (2026-10-01) — 내 상품 한 줄(prepare = send_prepare 응답)을 11번가 상품으로 등록한다.
// 스마트스토어 섹션(StudioSendSmartstore)과 같은 모양으로 밖에 내놓는다: missing(빠진 것)·busy·done·submit(). 창(StudioSendModal)이 11번가를 체크했을 때만 보인다.
// 항목·코드는 공용 파일(api/_elevenstFields.js — 공식 문서·셀러오피스 표 그대로). 필수값은 화면(missing)이 먼저 막고 서버(buildElevenstProduct)가 다시 검사한다
// 금액은 기본값 없이 비워 둔다(임의 숫자 없음). KC 인증은 판매자가 직접 고른다(기본값 없음)
// 카테고리·주소록은 창이 들고 있는 목록(sendCache)을 같이 쓴다 — 창을 다시 열어도 다시 받지 않는다
// 등록 템플릿(2026-10-01): 마켓 공용 값(api/_listingTemplates.js) ↔ 이 섹션 칸 변환은 api/_elevenstFields.js에서만. 출고지·반품지는 템플릿에 없다(주소록 + 마지막 사용 기억 그대로)
import { ref, reactive, computed, watch, onMounted, inject, nextTick } from 'vue'
import { matchCategory } from '@/lib/studioBulkSend'
import { listElevenstCategories, listElevenstAddresses, sendElevenstProduct, isNotReady } from '@/lib/studioMarketplace'
import { useSendCommon } from '@/lib/useSendCommon'
import StudioSendUseCommon from './StudioSendUseCommon.vue'
import { listListingTemplates, createListingTemplate } from '@/lib/studioListingTemplates'
import { TEMPLATE_KINDS, TEMPLATE_NAME_MAX, pickDefaultTemplate, uniqueTemplateName } from '../../../api/_listingTemplates.js'
import { SEND_CACHE_KEY, repImageCandidates, REP_IMAGE_EMPTY } from '@/lib/studioMarketplaceRules'
import { isAdminOrStaff } from '@/lib/auth'
import {
  NOTICE_TYPES, DEFAULT_NOTICE_TYPE, NOTICE_VALUE_MAX, NOTICE_DEFAULT_VALUE, NOTICE_COUNTRY_DEFAULT, HEAVY_NOTICE_TYPES, noticeTypeOf, noticeItemsFor,
  NOTICE_MAKER_CODES, NOTICE_COUNTRY_CODES, NOTICE_PHONE_CODES, KC_GROUPS, KC_CHOICES, KC_CERT_TYPES, KC_CERT_KEY_MAX, kcFor, VAT_TYPES, PRODUCT_NAME_BYTES, NAME_BYTES_OVER, nameBytesLeft, PRODUCT_NAME_MAX, is10Won,
  pickElevenstAddress, SELLER_OFFICE_URL, ORIGIN_CHINA, ORIGIN_KINDS, ORIGIN_DOMESTIC, ORIGIN_COUNTRIES, originFor, feeHasBase, bundleDeliveryYn, BUNDLE_OFF_NOTE,
  elevenstFormFromProduct, elevenstFormFromShipping, productTemplateFromElevenstForm, shippingTemplateFromElevenstForm,
} from '../../../api/_elevenstFields.js'
import { optionsPayload, elevenstOptionProblems, elevenstOptionPriceRange, elevenstOptionMerge } from '../../../api/_marketOptions.js'
import { emptyOptionEditor, cloneOptionEditor } from '@/lib/studioOptionEditor'
import { pickFields } from '@/lib/studioSendDraft'
import StudioSendOptions from './StudioSendOptions.vue'

const CAT_SHOWN = 200
const OPTION_NOTE = '11번가는 옵션 종류가 여럿이면 "/"로 합쳐 한 칸으로 등록합니다(예: 색상/사이즈 · 블랙/M). 추가금액 0원인 옵션이 1개 이상 있어야 하고, 판매할 옵션 재고는 1개 이상이어야 합니다.'
// common = 창의 공통 정보(2026-10-01) — 스마트스토어와 함께 보낼 때만 온다. null이면 예전 그대로(이 섹션 칸에 직접 넣는다)
const props = defineProps({ prepare: { type: Object, required: true }, common: { type: Object, default: null } })
const repImages = computed(() => repImageCandidates(props.prepare?.images)) // 대표 이미지 후보 = 1688 대표 사진 + 내 사진 (studioMarketplaceRules)

const busy = ref('')
const done = ref(null)
const sendError = ref('')
const errorGuide = ref(false)
const errorEl = ref(null)
const optionsEl = ref(null)
const nameEl = ref(null), catEl = ref(null), priceEl = ref(null), imageEl = ref(null), deliveryEl = ref(null), addressEl = ref(null), guideEl = ref(null), originEl = ref(null), kcEl = ref(null), noticeEl = ref(null)
const categories = ref([])
const catLoading = ref(false)
const catError = ref('')
const catSoft = ref(false)
const catQuery = ref('')
const outAddresses = ref([])
const inAddresses = ref([])
const addrLoading = ref(false)
const addrRefreshing = ref(false)
const addrError = ref('')
const addrSoft = ref(false)
// 템플릿이 채우는 칸의 처음 값 — 템플릿을 바꿔 고르면 이 값으로 되돌린 뒤 템플릿 값을 덮는다(앞 템플릿 값이 남지 않게)
// 금액은 기본값 없이 비워 둔다(임의 숫자 없음)
const shippingBase = () => ({ feeType: '01', fee: null, jejuFee: null, islandFee: null, returnFee: null, exchangeFee: null, freeOver: null })
const productBase = () => ({
  brand: '',
  asDetail: NOTICE_DEFAULT_VALUE, rtngExchDetail: NOTICE_DEFAULT_VALUE,
  kc: Object.fromEntries(KC_GROUPS.map(g => [g.code, ''])), // 기본값 없음 — 판매자가 직접 고른다 (4개 그룹 모두)
  kcCerts: Object.fromEntries(KC_GROUPS.map(g => [g.code, { type: '', key: '' }])), // 인증대상일 때 인증유형·인증번호
  originKind: ORIGIN_CHINA.orgnTypCd, originCode: ORIGIN_CHINA.orgnTypDtlsCd, // 원산지 기본 해외·중국 — 판매자가 바꿀 수 있다
  noticeType: DEFAULT_NOTICE_TYPE, maker: NOTICE_DEFAULT_VALUE, country: NOTICE_COUNTRY_DEFAULT, phone: NOTICE_DEFAULT_VALUE,
  noticeItems: {}, // 고시 나머지 항목 { 코드: 값 } — 비면 "상세페이지 참조"
})
const f = ref({
  // 상품명·대표 이미지는 비워 둔다 (2026-10-02 ②-1 — 판매처에 올리는 값은 셀러가 정한다)
  productName: '',
  categoryId: null, price: null, stock: null, repImageId: null, fit: 'contain',
  ...shippingBase(),
  outAddr: null, inAddr: null,
  vat: '01', minorBlocked: false,
  ...productBase(),
  testStop: false,
})
// 옵션 — 다른 판매처와 같은 원천(send_prepare.source.skus)·같은 옵션 편집 모양(src/lib/studioOptionEditor.js). 가져온 옵션이 있으면 처음부터 "옵션 사용"
// 옵션 사용을 켜면 조합이 0개여도 옵션 상품으로 본다(빠짐 목록 "판매할 옵션") — 단일 재고 칸으로 몰래 돌아가지 않게
// 옵션은 처음부터 채우지 않는다 (2026-10-02 — 사입 셀러는 실제로 들여온 옵션만 판다). [주문한 옵션 불러오기]·[1688 옵션 불러오기]로만 가져온다(StudioSendOptions)
const opts = ref(emptyOptionEditor())
const useOptions = computed(() => opts.value.enabled)
const optionsOut = computed(() => (useOptions.value ? optionsPayload(opts.value) : null))
const optionStockTotal = computed(() => (optionsOut.value?.rows || []).reduce((s, r) => s + (Number.isInteger(r.stock) ? r.stock : 0), 0))
const optionRange = computed(() => elevenstOptionPriceRange(f.value.price))

// ── 공통 정보 (2026-10-01) — 스마트스토어 섹션과 같은 방식(useSendCommon — [공통 정보 사용] 2026-10-02 ②-1). 칸에 들어간 값은 예전 f·opts 그대로라 빠짐 목록(10원 단위 등)·요약 표·보내기는 바뀌지 않는다
const cm = useSendCommon('11st', { props, f, opts, done })
const showOwn = cm.showOwn

const nameLeft = computed(() => nameBytesLeft(f.value.productName)) // 11번가 상품명 남은 바이트 (공통 정보를 쓰면 공통 상품명 기준)
const catMatches = computed(() => {
  const q = catQuery.value.trim().toLowerCase()
  return q ? categories.value.filter(c => c.wholeName.toLowerCase().includes(q)) : categories.value
})
const catOptions = computed(() => {
  // 검색했을 때만 목록을 그린다 (2026-10-02 창 열기 속도 — 고른 카테고리는 늘 보인다)
  const list = catQuery.value.trim() ? catMatches.value.slice(0, CAT_SHOWN) : []
  const sel = categories.value.find(c => c.id === f.value.categoryId)
  return sel && !list.includes(sel) ? [sel, ...list] : list
})
const categoryName = computed(() => categories.value.find(c => c.id === f.value.categoryId)?.wholeName || '')
const addressLabel = a => `${a.name || '이름 없음'} · ${a.address}`
const addressName = (list, id) => { const a = list.find(x => x.id === id); return a ? addressLabel(a) : '' }
const noticeTypeName = computed(() => noticeTypeOf(f.value.noticeType)?.name || '')
const heavyNotice = computed(() => HEAVY_NOTICE_TYPES.includes(f.value.noticeType))
const restItems = computed(() => (noticeTypeOf(f.value.noticeType)?.items || []).filter(([code]) => ![...NOTICE_MAKER_CODES, ...NOTICE_COUNTRY_CODES, ...NOTICE_PHONE_CODES].includes(code)))
const restLabels = computed(() => restItems.value.map(([, label]) => label))
const restFilled = computed(() => restItems.value.some(([code]) => String(f.value.noticeItems[code] ?? '').trim()))
const noticeItems = computed(() => noticeItemsFor(f.value.noticeType, { maker: f.value.maker, country: f.value.country, phone: f.value.phone, items: f.value.noticeItems }) || [])

const missing = computed(() => {
  const v = f.value, out = []
  if (!String(v.productName || '').trim()) out.push('상품명')
  else if (nameLeft.value < 0) out.push(NAME_BYTES_OVER) // 100바이트(한글 2) — 근거·세는 법 api/_elevenstFields.js (서버 buildElevenstProduct와 같은 함수)
  if (!v.categoryId) out.push('카테고리')
  if (!is10Won(v.price, 10)) out.push('판매가 (10원 단위)')
  if (useOptions.value) {
    // 서버와 같은 검사(_marketOptions.elevenstOptionProblems) — 판매가가 없으면 범위 검사는 판매가 칸이 먼저 막는다
    if (!optionsOut.value) out.push('판매할 옵션')
    else out.push(...elevenstOptionProblems(optionsOut.value, is10Won(v.price, 10) ? v.price : null).map(m => `옵션: ${m}`))
  } else if (!Number.isInteger(v.stock) || v.stock < 1) out.push('재고 수량 (1개 이상)')
  if (!v.repImageId) out.push(props.common ? '대표 이미지 (공통 정보)' : '대표 이미지')
  if (feeHasBase(v.feeType) && !is10Won(v.fee, 10)) out.push('기본 배송비')
  if (v.feeType === '03' && !is10Won(v.freeOver, 10)) out.push('무료배송 기준 금액')
  if (!is10Won(v.jejuFee) || !is10Won(v.islandFee)) out.push('제주·도서산간 추가 배송비')
  if (!is10Won(v.returnFee) || !is10Won(v.exchangeFee)) out.push('반품·교환 배송비')
  if (!v.outAddr) out.push('출고지')
  if (!v.inAddr) out.push('반품/교환지')
  if (!String(v.asDetail || '').trim()) out.push('A/S 안내')
  if (!String(v.rtngExchDetail || '').trim()) out.push('반품/교환 안내')
  if (!originFor({ kind: v.originKind, code: v.originCode })) out.push('원산지')
  if (!kcFor(v.kc, v.kcCerts).ok) out.push('KC 인증')
  if (noticeItems.value.some(it => !it.name || [...it.name].length > NOTICE_VALUE_MAX)) out.push('상품정보제공고시')
  return out
})
const won = n => (Number.isInteger(n) ? `${n.toLocaleString('ko-KR')}원` : '')
// 요약 = 11번가에 보내는 모양 그대로(합친 옵션명·옵션값)
const optionsSummary = computed(() => {
  const o = optionsOut.value
  if (!o) return '없음 (단일상품)'
  const m = elevenstOptionMerge(o)
  const sample = m.rows.slice(0, 3).map(r => r.value).filter(Boolean)
  return `${m.title} ${m.rows.length}개${sample.length ? ` (${sample.join(', ')}${m.rows.length > 3 ? ' …' : ''})` : ''}`
})
const preview = computed(() => {
  const v = f.value
  return [
    { label: '상품명', value: String(v.productName || '').trim() },
    { label: '브랜드', value: String(v.brand || '').trim() || '알수없음' },
    { label: '카테고리', value: categoryName.value },
    { label: '판매가', value: is10Won(v.price, 10) ? won(v.price) : '' },
    { label: '재고 수량', value: useOptions.value ? `${optionStockTotal.value.toLocaleString('ko-KR')}개 (옵션 재고 합계)` : Number.isInteger(v.stock) && v.stock >= 1 ? `${v.stock.toLocaleString('ko-KR')}개` : '' },
    { label: '옵션', value: optionsSummary.value },
    { label: '대표 이미지', value: v.repImageId ? '대표 이미지 1장' : '' },
    { label: '상세 이미지', value: `상세 이미지 ${props.prepare.export.files.length}장` },
    { label: '배송비', value: v.feeType === '02' ? (is10Won(v.fee, 10) ? `${won(v.fee)} (선결제)` : '')
      : v.feeType === '03' ? (is10Won(v.fee, 10) && is10Won(v.freeOver, 10) ? `${won(v.fee)} · ${won(v.freeOver)} 이상 무료 (선결제)` : '') : '무료' },
    { label: '묶음배송', value: bundleDeliveryYn(v.feeType) === 'N' ? BUNDLE_OFF_NOTE : '가능' }, // 보내는 값(bndlDlvCnYn)과 같은 규칙
    { label: '제주·도서산간', value: is10Won(v.jejuFee) && is10Won(v.islandFee) ? `제주 ${won(v.jejuFee)} · 도서산간 ${won(v.islandFee)}` : '' },
    { label: '반품·교환 배송비', value: is10Won(v.returnFee) && is10Won(v.exchangeFee) ? `반품 ${won(v.returnFee)} · 교환 ${won(v.exchangeFee)}` : '' },
    { label: '출고지', value: addressName(outAddresses.value, v.outAddr) },
    { label: '반품/교환지', value: addressName(inAddresses.value, v.inAddr) },
    { label: '원산지', value: originFor({ kind: v.originKind, code: v.originCode })?.label || '' },
    { label: '상품정보제공고시', value: noticeTypeName.value },
    { label: '판매상태', value: v.testStop && isAdminOrStaff.value ? '등록 후 판매중지 (테스트)' : '판매중' },
  ]
})

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
  const kept = sendCache?.elevenstCategoriesDone
  if (kept) { categories.value = Array.isArray(kept.categories) ? kept.categories : []; return }
  catLoading.value = true
  catError.value = ''
  try {
    const r = await cached('elevenstCategories', listElevenstCategories)
    categories.value = Array.isArray(r.categories) ? r.categories : []
    if (!categories.value.length) catError.value = '카테고리 목록이 비어 있습니다.'
  } catch (e) {
    console.error('[StudioSendElevenst] 카테고리 조회 실패:', e.code, e)
    catError.value = e.message
    catSoft.value = isNotReady(e.code)
  } finally {
    catLoading.value = false
  }
}
/** 처음 골라 둘 주소 — 마지막으로 등록에 성공한 주소(서버 r.last) → 목록 첫째 (api/_elevenstFields.js pickElevenstAddress). 고른 주소가 새 목록에도 있으면 그대로 */
function applyAddresses(r) {
  outAddresses.value = Array.isArray(r.outAddresses) ? r.outAddresses : []
  inAddresses.value = Array.isArray(r.inAddresses) ? r.inAddresses : []
  if (!outAddresses.value.some(a => a.id === f.value.outAddr)) f.value.outAddr = pickElevenstAddress(outAddresses.value, r.last?.out ?? null)
  if (!inAddresses.value.some(a => a.id === f.value.inAddr)) f.value.inAddr = pickElevenstAddress(inAddresses.value, r.last?.in ?? null)
}
async function loadAddresses() {
  const kept = sendCache?.elevenstAddressesDone
  if (kept) { applyAddresses(kept); return }
  addrLoading.value = true
  addrError.value = ''
  try {
    applyAddresses(await cached('elevenstAddresses', listElevenstAddresses))
  } catch (e) {
    console.error('[StudioSendElevenst] 주소록 조회 실패:', e.code, e)
    addrError.value = e.message
    addrSoft.value = isNotReady(e.code)
  } finally {
    addrLoading.value = false
  }
}
/** [주소록 새로고침] — 창이 들고 있는 목록(sendCache)을 버리고 다시 받는다 (11번가 주소록은 읽기만) */
async function refreshAddresses() {
  if (addrRefreshing.value || addrLoading.value) return
  if (sendCache) { delete sendCache.elevenstAddresses; delete sendCache.elevenstAddressesDone }
  addrRefreshing.value = true
  addrError.value = ''
  try {
    applyAddresses(await cached('elevenstAddresses', listElevenstAddresses))
  } catch (e) {
    console.error('[StudioSendElevenst] 주소록 새로고침 실패:', e.code, e)
    addrError.value = e.message
    addrSoft.value = isNotReady(e.code)
  } finally {
    addrRefreshing.value = false
  }
}

// ── 등록 템플릿 (2026-10-01) ──
// 목록은 창의 sendCache를 같이 쓴다(다른 판매처 섹션도 같은 템플릿을 쓰게 될 때 다시 받지 않게). 표가 없으면 ready = false → 칸을 그리지 않는다
const lt = reactive({ ready: false, list: [], picked: { product: '', shipping: '' }, saving: '', name: '', busy: false, message: '', error: false })
const ltList = kind => lt.list.filter(t => t.kind === kind)
/** 고른 템플릿 → 칸. 그 템플릿이 채우는 칸은 처음 값으로 되돌린 뒤 덮는다. "선택 안 함"이면 칸을 그대로 둔다 */
function applyTemplate(kind) {
  const t = lt.list.find(x => x.id === lt.picked[kind] && x.kind === kind)
  if (!t) return
  if (kind === 'product') Object.assign(f.value, productBase(), elevenstFormFromProduct(t.data))
  else Object.assign(f.value, shippingBase(), elevenstFormFromShipping(t.data))
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
    console.error('[StudioSendElevenst] 등록 템플릿 조회 실패 — 직접 입력으로 진행:', e) // 보내기는 막지 않는다
  }
}
function startSaveTemplate(kind) {
  lt.saving = kind
  lt.name = uniqueTemplateName(kind === 'product' ? '11번가 상품정보' : '11번가 배송', lt.list, kind)
  lt.message = ''
}
/** [현재 값으로 새 템플릿 저장] — 지금 칸의 값을 마켓 공용 값으로 바꿔 저장. 그 종류의 첫 템플릿이면 기본으로 */
async function saveTemplate(kind) {
  if (lt.busy) return
  lt.busy = true
  lt.message = ''
  lt.error = false
  try {
    const data = kind === 'product' ? productTemplateFromElevenstForm(f.value) : shippingTemplateFromElevenstForm(f.value)
    const row = await createListingTemplate({ kind, name: lt.name, data, is_default: ltList(kind).length === 0 })
    lt.list = [...lt.list, row]
    if (sendCache) sendCache.listingTemplatesDone = { ready: true, templates: lt.list }
    lt.picked[kind] = row.id
    lt.saving = ''
    lt.message = `"${row.name}" 템플릿을 저장했습니다.${row.is_default ? ' 기본 템플릿으로 지정되었습니다.' : ''}`
  } catch (e) {
    console.error('[StudioSendElevenst] 템플릿 저장 실패:', e)
    lt.message = e.message
    lt.error = true
  } finally {
    lt.busy = false
  }
}

/** 원산지 종류를 바꾸면 지역·국가를 다시 고른다 (해외로 돌아오면 기본 중국) */
function onOriginKind() {
  f.value.originCode = f.value.originKind === ORIGIN_CHINA.orgnTypCd ? ORIGIN_CHINA.orgnTypDtlsCd : ''
}
/** 실패 문구 → 해당 칸 (모르면 섹션 맨 위 사유 줄) */
const FIELD_HINTS = [
  [/옵션/, optionsEl], // "옵션 … 재고"가 판매가·재고 칸으로 가지 않게 맨 앞
  [/상품명|보낼 수 없는 글자/, nameEl], [/카테고리/, catEl], [/판매가|재고/, priceEl], [/대표 이미지|상세 이미지|사진/, imageEl],
  [/배송비|무료배송/, deliveryEl], [/출고지|반품지|반품\/교환지|주소/, addressEl], [/A\/S 안내|반품\/교환 안내/, guideEl], [/원산지/, originEl], [/KC/, kcEl], [/고시/, noticeEl],
]
function scrollToProblem(message) {
  const hit = FIELD_HINTS.find(([re]) => re.test(String(message || '')))
  // 공통 정보를 쓰는 중이면 그 칸이 가려져 있다(v-show) → 가려진 칸 대신 섹션 맨 위 사유 줄로 (2026-10-01)
  const field = hit?.[1]?.value
  const target = field && field.offsetParent !== null ? field : errorEl.value
  nextTick(() => target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }))
}

// ── 여러 상품 한 번에 보내기 (2026-10-02 StudioBulkSendModal) — 카테고리·등록 템플릿을 밖에서 정한다.
//    목록(카테고리·템플릿)이 아직 없으면 기다렸다가 받은 뒤에 고른다. 보낸 뒤(done)는 바꾸지 않는다
const pendingBulk = reactive({ category: null, listing: null })
function setCategoryById(id) {
  const hit = matchCategory(categories.value, id)
  if (!hit) return false
  f.value.categoryId = hit.id
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
const pickedCategory = computed(() => { const c = categories.value.find(x => x.id === f.value.categoryId); return c ? { id: String(c.id), name: c.wholeName || c.name || '' } : null })

/** 창의 [보내기]가 부른다 — 성공하면 결과, 실패하면 null(이유는 이 섹션 안에) */
async function submit() {
  if (busy.value || done.value || missing.value.length) return null
  busy.value = 'send'
  sendError.value = ''
  errorGuide.value = false
  const v = f.value
  try {
    const r = await sendElevenstProduct({
      exportId: props.prepare.export.id, productName: String(v.productName).trim(), brand: String(v.brand || '').trim(),
      categoryId: v.categoryId, categoryName: categoryName.value, price: v.price, stock: optionsOut.value ? optionStockTotal.value : v.stock, repImageId: v.repImageId, fit: v.fit,
      ...(optionsOut.value ? { options: optionsOut.value } : {}), // 옵션을 안 쓰면 보내지 않는다(단일상품 — 예전 그대로)
      vat: v.vat, minorOk: !v.minorBlocked, origin: { kind: v.originKind, code: v.originKind === '03' ? null : v.originCode },
      kc: { ...v.kc }, kcCerts: Object.fromEntries(KC_GROUPS.filter(g => v.kc[g.code] === 'cert').map(g => [g.code, { type: v.kcCerts[g.code].type, key: String(v.kcCerts[g.code].key).trim() }])),
      delivery: { feeType: v.feeType, fee: feeHasBase(v.feeType) ? v.fee : null, ...(v.feeType === '03' ? { freeOver: v.freeOver } : {}), jejuFee: v.jejuFee, islandFee: v.islandFee, returnFee: v.returnFee, exchangeFee: v.exchangeFee, outAddr: v.outAddr, inAddr: v.inAddr },
      asDetail: String(v.asDetail).trim(), rtngExchDetail: String(v.rtngExchDetail).trim(),
      notice: {
        type: v.noticeType, maker: String(v.maker).trim(), country: String(v.country).trim(), phone: String(v.phone).trim(),
        items: Object.fromEntries(restItems.value.map(([code]) => [code, String(v.noticeItems[code] ?? '').trim()]).filter(([, x]) => x)), // 이 유형의 나머지 항목 중 고친 것만
      },
      ...(isAdminOrStaff.value && v.testStop ? { testStop: true } : {}), // 서버도 관리자만 받아들인다
    })
    done.value = r
    // 같은 화면에서 창을 다시 열 때도 방금 보낸 출고지·반품지가 기본 (서버는 다음 조회부터 보내기 기록에서 읽는다)
    const kept = sendCache?.elevenstAddressesDone
    if (kept) sendCache.elevenstAddressesDone = { ...kept, last: { out: v.outAddr, in: v.inAddr } }
    return r
  } catch (e) {
    console.error('[StudioSendElevenst] 11번가 보내기 실패:', e.code, e)
    sendError.value = e.message
    errorGuide.value = ['not_connected', 'bad_key', 'ip_not_allowed', 'not_approved'].includes(e.code)
    scrollToProblem(e.message)
    return null
  } finally {
    busy.value = ''
  }
}

// 창을 다시 열 때 이미 받은 목록은 바로 채운다(깜빡임 없음) — 받지 않은 것만 화면에 붙은 뒤 서버에 묻는다
if (sendCache?.elevenstCategoriesDone) categories.value = Array.isArray(sendCache.elevenstCategoriesDone.categories) ? sendCache.elevenstCategoriesDone.categories : []
if (sendCache?.elevenstAddressesDone) applyAddresses(sendCache.elevenstAddressesDone)
if (sendCache?.listingTemplatesDone) applyTemplateList(sendCache.listingTemplatesDone)
onMounted(() => {
  if (!sendCache?.elevenstCategoriesDone) loadCategories()
  if (!sendCache?.elevenstAddressesDone) loadAddresses()
  if (!sendCache?.listingTemplatesDone) loadTemplates()
})
// 입력값 기억 (2026-10-02 — src/lib/studioSendDraft.js): 창이 [보내기] 때 draftOut()을 받아 두고, 같은 상품을 다시 열면 applyDraft()로 돌려준다
const DRAFT_FORM = ['productName', 'price', 'stock']
function draftOut() { return { category: pickedCategory.value, form: pickFields(f.value, DRAFT_FORM), opts: cloneOptionEditor(opts.value), use: cm.useOut() } }
function applyDraft(d) {
  if (!d || done.value) return
  if (d.category?.id != null) applyPreset({ category: d.category })
  if (props.common) return cm.applyUseDraft(d) // 상품명·판매가·재고·옵션은 공통 정보가 채운다 (창이 공통 값을 따로 되살린다) — [공통 정보 사용]을 풀어 둔 묶음만 이 판매처 값으로
  Object.assign(f.value, pickFields(d.form || {}, DRAFT_FORM))
  if (d.opts && Array.isArray(d.opts.groups)) opts.value = cloneOptionEditor(d.opts)
}
defineExpose({ missing, busy, done, submit, sendError, applyPreset, pickedCategory, draftOut, applyDraft }) // sendError = 창의 결과 표가 실패 사유를 그대로 보인다 (2026-10-01) · applyPreset·pickedCategory = 여러 상품 보내기 (2026-10-02)
</script>

<style scoped>
/* 스마트스토어·쿠팡 섹션의 요약 표와 같은 모양 */
.sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sum-table th { width: 130px; padding: 7px 10px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.sum-table td { padding: 7px 10px; border-bottom: 1px solid var(--st-line); word-break: break-all; }
.sum-table tr:last-child th, .sum-table tr:last-child td { border-bottom: 0; }
</style>
