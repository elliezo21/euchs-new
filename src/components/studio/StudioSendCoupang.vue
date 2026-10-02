<template>
    <div class="space-y-5" data-mk-send-coupang>
      <div class="flex items-center gap-2 pt-1">
        <h3 class="st-h-section">쿠팡</h3>
        <span class="st-desc-sm break-keep">상품 등록 후 승인 요청까지 진행합니다.</span>
      </div>

      <!-- 공통 정보를 쓰는 중 (2026-10-02) — 이 판매처만 다르게 할 묶음을 켜면 아래에 그 칸이 다시 보인다 (판매가·재고·옵션 중 하나를 켜면 옵션 표 전체를 이 칸에서 넣는다) -->
      <div v-if="common" class="st-surface st-border rounded-[10px] p-3 space-y-1.5" data-mk-s-common>
        <p class="text-[13px] st-ink break-keep">상품명·판매가·재고·옵션·대표 이미지는 위 공통 정보 값을 사용합니다.</p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] st-ink">
          <span class="st-desc-sm">이 판매처만 다르게:</span>
          <label v-for="g in COMMON_GROUPS" :key="g.key" class="flex items-center gap-1.5"><input v-model="own[g.key]" type="checkbox" :disabled="!!done" :data-mk-s-own="g.key" /> {{ g.label }}</label>
        </div>
      </div>

      <!-- 1. 판매 방식 (기본값 없음) -->
      <section class="space-y-2" data-mk-s-mode>
        <h4 class="st-h-card">판매 방식 *</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="(m, key) in SALE_MODES" :key="key" type="button" class="mode-card" :class="{ 'is-on': f.saleMode === key, 'is-sub': key !== DEFAULT_SALE_MODE }"
            :aria-pressed="f.saleMode === key" :data-mk-s-mode-pick="key" @click="pickMode(key)"
          >
            <span class="text-[14px] font-bold st-ink">{{ m.label }}</span>
            <span class="st-desc-sm break-keep">{{ MODE_DESC[key] }}</span>
          </button>
        </div>
        <p v-if="f.saleMode === 'agent'" class="st-desc-sm break-keep" data-mk-s-agent-note>해외구매대행은 Wing에 등록한 해외 출고지만 사용할 수 있습니다. 템플릿의 출고지를 확인하세요.</p>
        <label v-if="f.saleMode" class="block max-w-[220px]"><span class="st-label">출고 소요일 *</span><input v-model.number="f.outboundDays" type="number" :min="OUTBOUND_DAYS_MIN" :max="OUTBOUND_DAYS_MAX" class="st-input w-full" data-mk-s-days /><span class="st-desc-sm block mt-1">{{ OUTBOUND_DAYS_MIN }}~{{ OUTBOUND_DAYS_MAX }}일</span></label>
      </section>

      <!-- 2. 상품 정보 -->
      <section class="space-y-2">
        <h4 class="st-h-card">상품 정보</h4>
        <label v-show="showOwn('name')" class="block"><span class="st-label">등록상품명 *</span><input v-model.trim="f.productName" class="st-input w-full" :maxlength="NAME_MAX" :placeholder="NAME_HINT" data-mk-s-name /><span class="st-desc-sm block mt-1">발주서에 사용하는 이름 · {{ NAME_MAX }}자 이내</span></label>
        <p v-if="namesBad" class="text-[12px] font-bold st-danger-text break-keep" data-mk-s-name-korean>상품명은 한글로 입력하세요.</p>
        <!-- 브랜드 (선택) — 기본은 "브랜드 없음". 브랜드를 쓰려면 쿠팡에 등록된 브랜드여야 한다(brandId) -->
        <div class="space-y-1.5" data-mk-s-brand-box>
          <label class="flex items-center gap-2 text-[13px] st-ink font-bold"><input v-model="f.noBrand" type="checkbox" data-mk-s-no-brand @change="onNoBrand" /> 브랜드 없음</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <span class="st-label">브랜드</span>
              <div class="flex gap-2">
                <input v-model.trim="f.brand" class="st-input flex-1 min-w-0" :maxlength="BRAND_MAX" :disabled="f.noBrand" placeholder="브랜드 이름" data-mk-s-brand @input="onBrandInput" @keydown.enter.prevent="findBrand" />
                <button type="button" class="st-btn shrink-0" :disabled="f.noBrand || !f.brand || !!busy" data-mk-s-brand-find @click="findBrand">{{ busy === 'brand' ? '검색 중…' : '브랜드 검색' }}</button>
              </div>
              <span class="st-desc-sm block mt-1">쿠팡에 등록된 브랜드만 사용할 수 있습니다.</span>
            </label>
            <label class="block"><span class="st-label">제조사</span><input v-model.trim="f.manufacture" class="st-input w-full" maxlength="50" data-mk-s-manufacture /><span class="st-desc-sm block mt-1">비우면 전송하지 않습니다.</span></label>
          </div>
          <select v-if="!f.noBrand && brandChoices.length > 1" v-model="f.brandId" class="st-input w-full sm:w-[360px]" data-mk-s-brand-pick @change="onBrandPick">
            <option value="">브랜드 선택</option>
            <option v-for="b in brandChoices" :key="b.brandId" :value="b.brandId">{{ b.brandName }} ({{ b.brandId }})</option>
          </select>
          <p v-if="!f.noBrand && f.brandId" class="text-[12px] st-success-text font-bold" data-mk-s-brand-ok>쿠팡 브랜드 {{ f.brand }} ({{ f.brandId }})</p>
          <p v-if="!f.noBrand && brandNote" class="text-[12px] font-bold st-danger-text break-keep" data-mk-s-brand-note>{{ brandNote }}</p>
          <p v-if="f.noBrand" class="st-desc-sm break-keep" :class="brandInName ? 'st-danger-text font-bold' : ''" data-mk-s-brand-warn>{{ brandInName ? `상품명에 브랜드명(${brandInName})이 포함되어 있습니다. ` : '' }}상품명에 브랜드명이 포함된 경우 "브랜드 없음"을 해제하고 브랜드를 입력하세요.</p>
        </div>
        <label class="block"><span class="st-label">제품명</span><input v-model.trim="f.generalName" class="st-input w-full" :maxlength="NAME_MAX" placeholder="예: 도트 헤어핀" data-mk-s-general /><span class="st-desc-sm block mt-1">색상·사이즈 등 옵션을 제외한 이름</span></label>
        <label class="block">
          <span class="st-label">노출상품명</span>
          <div class="flex gap-2">
            <input v-model.trim="f.displayName" class="st-input flex-1 min-w-0" :maxlength="NAME_MAX" placeholder="예: 이유씨 도트 헤어핀" data-mk-s-display />
            <button type="button" class="st-btn shrink-0" :disabled="!nameSeed" data-mk-s-name-suggest @click="suggestNames">이름 추천</button>
          </div>
          <span class="st-desc-sm block mt-1">판매 화면에 표시되는 이름 · {{ NAME_MAX }}자 이내 · 비우면 등록상품명 사용</span>
        </label>
        <label class="block max-w-[320px]"><span class="st-label">모델번호</span><input v-model.trim="f.modelNo" class="st-input w-full" maxlength="50" data-mk-s-model /></label>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="st-btn" :disabled="!f.productName || !!busy" data-mk-s-predict @click="predict">{{ busy === 'predict' ? '추천 중…' : '카테고리 추천' }}</button>
          <span v-if="f.categoryCode" class="text-[13px] st-ink font-bold" data-mk-s-category>{{ f.categoryName || '카테고리' }} <span class="st-muted font-mono font-normal">#{{ f.categoryCode }}</span></span>
          <label class="flex items-center gap-1 text-[12px] st-muted ml-auto">직접 입력 <input v-model.trim="f.categoryCode" class="st-input w-[120px] font-mono" placeholder="카테고리 코드" @change="f.categoryName = ''; loadMeta()" /></label>
        </div>
        <p v-if="predictNote" class="text-[12px] break-keep" :class="predictError ? 'st-danger-text font-bold' : 'st-muted'" data-mk-s-predict-note>{{ predictNote }}</p>
      </section>

      <!-- 3. 검색태그 -->
      <section class="space-y-2">
        <h4 class="st-h-card">검색태그</h4>
        <p class="st-desc-sm break-keep">최대 {{ TAG_MAX }}개 · 태그당 {{ TAG_LEN }}자 · 타사 상표 사용 불가</p>
        <StudioTagChips ref="tagChips" v-model="f.tags" :brand="brandOut">
          <button type="button" class="st-btn" :disabled="!nameSeed" data-mk-s-tag-suggest @click="suggestTags">태그 추천</button>
        </StudioTagChips>
      </section>

      <!-- 4. 옵션 -->
      <section class="space-y-2">
        <h4 class="st-h-card">옵션·가격·재고</h4>
        <p class="st-desc-sm break-keep">품번(판매자 상품코드) 필수 · GTIN(바코드 8~14자리) 선택 · 옵션 이름은 옵션 값으로 자동 생성 · 상품식별정보·필수 구매옵션이 비면 쿠팡 노출 제한</p>
        <p v-if="commonItems" class="text-[13px] st-ink break-keep" data-mk-s-common-items>{{ COMMON_ITEMS_NOTE }}</p>
        <p v-else-if="sourceNote" class="st-desc-sm break-keep" data-mk-s-source-note>{{ sourceNote }}</p>

        <!-- 쿠팡 옵션 연결 — 옵션 종류(공통 정보 또는 가져온 옵션) → 쿠팡 구매옵션 이름. 같은 이름·같은 뜻이면 자동 연결 (studioCoupangLink) -->
        <div v-if="f.optionTypes.length || linkTable.length" class="st-surface st-border rounded-[10px] p-3 space-y-2" data-mk-s-option-types>
          <div class="st-label">{{ COUPANG_LINK_TITLE }}</div>
          <div v-for="t in f.optionTypes" :key="t.key" class="flex flex-wrap items-center gap-2 text-[13px]">
            <span class="st-ink font-bold min-w-[80px]">{{ t.label }}</span>
            <span class="st-muted">→</span>
            <select v-if="buyAttrs.length" v-model="t.mapped" class="st-input w-[200px]" :data-mk-s-option-map="t.key">
              <option value="">쿠팡 옵션 선택</option>
              <option v-for="a in buyAttrs" :key="a.name" :value="a.name">{{ a.name }}{{ a.required ? ' *' : '' }}</option>
            </select>
            <input v-else v-model.trim="t.mapped" class="st-input w-[200px]" :maxlength="ATTR_NAME_MAX" placeholder="옵션 종류 (예: 색상)" :data-mk-s-option-map="t.key" />
            <span v-if="!t.mapped" class="text-[12px] font-bold st-danger-text" :data-mk-s-option-unlinked="t.key">{{ LINK_EMPTY }}</span>
          </div>
          <!-- 이 카테고리의 쿠팡 구매옵션 — 필수인데 비면 빨간색(보내기 막힘). 연결 안 한 옵션은 아래 옵션 표에서 옵션별로 넣는다 -->
          <ul v-if="linkTable.length" class="pt-1 space-y-1" data-mk-s-link-rows>
            <li v-for="r in linkTable" :key="r.name" class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]" :data-mk-s-link-row="r.name" :data-mk-s-link-state="r.state">
              <span class="font-bold" :class="r.state === 'empty' ? 'st-danger-text' : 'st-ink'">쿠팡 {{ r.name }}{{ r.required ? ' *' : '' }}</span>
              <span :class="r.state === 'empty' ? 'st-danger-text font-bold' : 'st-muted'">{{ r.state === 'linked' ? `← ${r.from}` : r.state === 'fill' ? LINK_FILL : LINK_EMPTY }}</span>
              <span v-if="r.hint" class="st-muted">· {{ r.hint }}</span>
            </li>
          </ul>
        </div>

        <!-- 한꺼번에 넣기 -->
        <div v-if="f.items.length > 1" class="flex flex-wrap items-end gap-2" data-mk-s-bulk>
          <label class="block"><span class="st-desc-sm">정가(원)</span><input v-model.number="bulk.originalPrice" type="number" min="1" class="st-input w-[120px]" /></label>
          <label v-if="!commonItems" class="block"><span class="st-desc-sm">판매가(원)</span><input v-model.number="bulk.salePrice" type="number" min="1" class="st-input w-[120px]" /></label>
          <label v-if="!commonItems" class="block"><span class="st-desc-sm">재고 수량</span><input v-model.number="bulk.stock" type="number" min="0" :max="STOCK_MAX" class="st-input w-[100px]" data-mk-s-bulk-stock /></label>
          <button type="button" class="st-btn" :disabled="!bulkReady" data-mk-s-bulk-apply @click="applyBulk">전체 적용</button>
        </div>

        <!-- 넓으면 표, 자리가 모자라거나 폰이면 카드(옵션 1개 = 카드 1장) — 가로 스크롤 없이 모든 칸이 보인다 (규칙: optionTableMode) -->
        <div ref="optWrap" class="opt-wrap st-border rounded-[10px]" :class="{ 'is-cards': optMode === 'cards' }" :data-mk-s-items-mode="optMode">
          <table class="opt-table" data-mk-s-items>
            <thead>
              <tr>
                <th class="c-img">사진</th>
                <th v-if="f.manualNames">옵션 이름 *</th>
                <th v-for="t in f.optionTypes" :key="t.key">{{ t.mapped || t.label }}</th>
                <th v-for="a in extraAttrs" :key="a.name">{{ attrLabel(a) }}</th>
                <th v-if="!f.optionTypes.length && !extraAttrs.length">구매옵션 *</th>
                <th v-if="hasCny" class="c-cny">1688 가격</th>
                <th class="c-price">정가(원) *</th>
                <th class="c-price">판매가(원) *</th>
                <th class="c-rate">할인</th>
                <th class="c-stock">재고 수량 *</th>
                <th class="c-sku">품번 *</th>
                <th class="c-gtin">GTIN</th>
                <th class="c-del"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, i) in f.items" :key="it.uid" :data-mk-s-item="i">
                <td class="c-img" data-label="사진">
                  <button type="button" class="opt-img" :class="{ 'is-picking': pickFor === i }" :title="it.imageId ? '옵션 이미지 변경' : '옵션 이미지 선택 · 비우면 대표 이미지'" :data-mk-s-item-image="i" @click="pickFor = pickFor === i ? -1 : i">
                    <img v-if="imageOf(it.imageId)" :src="imageOf(it.imageId).url" alt="" loading="lazy" />
                    <span v-else class="st-muted text-[11px]">대표</span>
                  </button>
                </td>
                <td v-if="f.manualNames" class="c-name" data-label="옵션 이름 *">
                  <input v-model.trim="it.name" class="st-input opt-in" :maxlength="ITEM_NAME_MAX" :placeholder="autoNames[i] || '예: 블랙 / M'" :data-mk-s-item-name="i" />
                </td>
                <td v-for="(t, ti) in f.optionTypes" :key="t.key" :data-label="t.mapped || t.label">
                  <span v-if="commonItems" class="text-[13px] break-all" :class="it.opt[t.key] ? 'st-ink' : 'st-danger-text font-bold'" :data-mk-s-opt="t.key">{{ it.opt[t.key] || '값 입력 필요' }}</span>
                  <input v-else v-model.trim="it.opt[t.key]" class="st-input opt-in" :maxlength="ATTR_VALUE_MAX" :placeholder="it.originals[t.key] || (t.isColor ? '예: 블랙' : '')" :title="it.originals[t.key] || ''" :data-mk-s-opt="t.key" />
                  <span v-if="it.originals[t.key] && needsHand(it, t)" class="opt-origin" :data-mk-s-origin="`${i}:${ti}`">가져온 옵션: {{ it.originals[t.key] }}</span>
                </td>
                <td v-for="a in extraAttrs" :key="a.name" :data-label="attrLabel(a)"><input v-model.trim="it.attributes[a.name]" class="st-input opt-in" :maxlength="ATTR_VALUE_MAX" :placeholder="unitPlaceholder(a)" :title="unitHint(a)" :data-mk-s-attr="a.name" /></td>
                <td v-if="!f.optionTypes.length && !extraAttrs.length" data-label="구매옵션 *">
                  <div class="flex gap-1"><input v-model.trim="it.freeAttrName" class="st-input opt-in" placeholder="종류" :maxlength="ATTR_NAME_MAX" /><input v-model.trim="it.freeAttrValue" class="st-input opt-in" placeholder="값" :maxlength="ATTR_VALUE_MAX" /></div>
                </td>
                <td v-if="hasCny" class="c-cny st-muted whitespace-nowrap" data-label="1688 가격" :data-mk-s-cny="i">{{ it.priceCny ? `${it.priceCny}위안` : '확인 필요' }}</td>
                <td class="c-price" data-label="정가(원) *"><input v-model.number="it.originalPrice" type="number" min="1" class="st-input opt-in" /></td>
                <td class="c-price" data-label="판매가(원) *">
                  <span v-if="commonItems" class="text-[13px] whitespace-nowrap" :class="it.salePrice > 0 ? 'st-ink' : 'st-danger-text font-bold'" :data-mk-s-price="i">{{ it.salePrice > 0 ? it.salePrice.toLocaleString('ko-KR') : '확인 필요' }}</span>
                  <input v-else v-model.number="it.salePrice" type="number" min="1" class="st-input opt-in" :data-mk-s-price="i" />
                </td>
                <td class="c-rate whitespace-nowrap st-ink" data-label="할인" :data-mk-s-rate="i">{{ rateText(it) }}</td>
                <td class="c-stock" data-label="재고 수량 *">
                  <span v-if="commonItems" class="text-[13px]" :class="Number.isInteger(it.stock) ? 'st-ink' : 'st-danger-text font-bold'" :data-mk-s-stock="i">{{ Number.isInteger(it.stock) ? it.stock.toLocaleString('ko-KR') : '입력 필요' }}</span>
                  <input v-else v-model.number="it.stock" type="number" min="0" :max="STOCK_MAX" class="st-input opt-in" :title="it.stock1688 === null ? '' : `1688 재고 ${it.stock1688}`" :data-mk-s-stock="i" />
                </td>
                <td class="c-sku" data-label="품번 *"><input v-model.trim="it.sku" class="st-input opt-in font-mono" maxlength="50" :data-mk-s-sku="i" /></td>
                <td class="c-gtin" data-label="GTIN"><input v-model.trim="it.gtin" class="st-input opt-in font-mono" maxlength="14" placeholder="8~14자리" /></td>
                <td class="c-del"><button v-if="f.items.length > 1 && !commonItems" type="button" class="st-link-muted text-[12px] whitespace-nowrap" @click="removeItem(i)">삭제</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="pickFor >= 0 && f.items[pickFor]" class="st-surface st-border rounded-[10px] p-3 space-y-2" data-mk-s-item-picker>
          <div class="flex items-center gap-2 text-[13px]"><b class="st-ink">{{ itemNames[pickFor] || `옵션 ${pickFor + 1}` }}</b><span class="st-muted">옵션 이미지</span><button type="button" class="st-link-muted text-[12px] ml-auto" @click="setItemImage(null)">대표 이미지 사용</button></div>
          <div class="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            <button v-for="im in prepare.images" :key="im.id" type="button" class="aspect-square rounded-[6px] overflow-hidden st-border" :class="f.items[pickFor].imageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" @click="setItemImage(im.id)"><img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" /></button>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button v-if="!commonItems" type="button" class="st-btn" :disabled="f.items.length >= ITEMS_MAX" data-mk-s-item-add @click="addItem">옵션 추가</button>
          <span class="text-[12px] st-muted">{{ f.items.length }} / {{ ITEMS_MAX }}</span>
          <button type="button" class="st-link-muted text-[12px] ml-auto" data-mk-s-names-toggle @click="toggleManualNames">{{ f.manualNames ? '옵션 이름 자동 생성' : '옵션 이름 직접 입력' }}</button>
        </div>
        <p v-if="!f.manualNames && itemNames.some(Boolean)" class="st-desc-sm break-keep" data-mk-s-names-auto>옵션 이름: {{ itemNames.filter(Boolean).slice(0, 3).join(', ') }}{{ itemNames.length > 3 ? ' …' : '' }}</p>
      </section>

      <!-- 5. 상품정보고시 -->
      <section v-if="meta && meta.notices.length" class="space-y-2" data-mk-s-meta>
        <h4 class="st-h-card">상품정보고시</h4>
        <div class="flex flex-wrap items-center gap-2">
          <select v-if="meta.notices.length > 1" v-model="f.noticeCategory" class="st-input w-full sm:w-auto" data-mk-s-notice-category @change="fillNoticeDefaults">
            <option v-for="n in meta.notices" :key="n.category" :value="n.category">{{ n.category }}</option>
          </select>
          <span v-else class="text-[13px] font-bold st-ink">{{ f.noticeCategory }}</span>
          <button type="button" class="st-btn ml-auto" data-mk-s-notice-fill @click="fillSeeDetail">빈 항목 "{{ NOTICE_SEE_DETAIL }}"로 입력</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label v-for="n in noticeItems" :key="n.name" class="block"><span class="st-desc-sm">{{ n.name }}{{ n.required ? ' *' : '' }}</span><input v-model.trim="f.notices[n.name]" class="st-input w-full" :maxlength="NOTICE_LEN" :data-mk-s-notice="n.name" /></label>
        </div>
      </section>

      <!-- 6. 인증·구비서류 (필요한 카테고리만) -->
      <section v-if="meta && (certList.length || docList.length)" class="space-y-2" data-mk-s-cert>
        <h4 class="st-h-card">인증정보·구비서류</h4>
        <div v-if="certList.length" class="space-y-1.5">
          <div v-for="c in certList" :key="c.type" class="flex flex-wrap items-center gap-2 text-[13px]" :data-mk-s-cert-row="c.type">
            <label class="flex items-center gap-2 min-w-[220px]"><input v-model="f.certs[c.type].on" type="checkbox" /> <span class="st-ink">{{ c.name || c.type }}{{ c.required ? ' *' : '' }}</span></label>
            <input v-if="c.needsCode && f.certs[c.type].on" v-model.trim="f.certs[c.type].code" class="st-input w-[220px] font-mono" maxlength="100" placeholder="인증번호" />
          </div>
        </div>
        <div v-if="docList.length" class="space-y-1.5">
          <div v-for="d in docList" :key="d.templateName" class="flex flex-wrap items-center gap-2 text-[13px]" :data-mk-s-doc-row="d.templateName">
            <span class="st-ink min-w-[220px]">{{ d.templateName }}{{ d.needed ? ' *' : '' }}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="text-[12px] st-muted" @change="onDoc(d.templateName, $event)" />
            <span v-if="f.docs[d.templateName]" class="st-muted">{{ f.docs[d.templateName].name }}</span>
          </div>
          <p class="st-desc-sm">PDF·JPG·PNG · 파일당 3MB 이내</p>
          <p v-if="docError" class="text-[12px] font-bold st-danger-text" data-mk-s-doc-error>{{ docError }}</p>
        </div>
      </section>

      <!-- 7. 대표 이미지 -->
      <section v-show="showOwn('image')" class="space-y-2">
        <h4 class="st-h-card">대표 이미지 *</h4>
        <div v-if="!repImages.length" class="st-desc">{{ REP_IMAGE_EMPTY }}</div>
        <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-s-images>
          <button v-for="im in repImages" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :data-mk-s-image="im.id" @click="f.repImageId = im.id">
            <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
          </button>
        </div>
        <label class="flex items-center gap-2 text-[12px] st-muted"><input v-model="f.fit" type="radio" value="contain" /> 여백 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" /> 중앙 자르기</label>
        <p class="st-desc-sm break-keep">{{ REP_SIZE }}×{{ REP_SIZE }}으로 자동 변환됩니다. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 사용합니다.</p>
      </section>

      <!-- 8. 배송 템플릿 -->
      <section class="space-y-2">
        <h4 class="st-h-card">배송·반품 템플릿 *</h4>
        <p v-if="!prepare.templates.length" class="text-[13px] font-bold st-danger-text break-keep" data-mk-s-no-template>템플릿이 없습니다. <router-link :to="{ name: 'studio-channels-defaults' }" class="st-link">판매처 &gt; 기본 설정</router-link>에서 먼저 등록하세요.</p>
        <select v-else v-model="f.templateId" class="st-input w-full" data-mk-s-template @change="onTemplate">
          <option v-for="t in prepare.templates" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
        </select>
      </section>

      <!-- 고급 설정 -->
      <section class="st-border rounded-[10px]" data-mk-s-advanced>
        <button type="button" class="w-full flex items-center gap-2 px-3 py-2.5 text-left" :aria-expanded="advancedOpen" data-mk-s-advanced-toggle @click="advancedOpen = !advancedOpen">
          <span class="st-h-card">고급 설정</span>
          <span class="st-desc-sm truncate">{{ advancedSummary }}</span>
          <span class="ml-auto st-muted text-[12px]">{{ advancedOpen ? '접기' : '펼치기' }}</span>
        </button>
        <div v-if="advancedOpen" class="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label v-for="k in ADV_KEYS" :key="k.key" class="block"><span class="st-label">{{ k.label }}</span>
            <select v-model="f.advanced[k.key]" class="st-input w-full" :data-mk-s-adv="k.key">
              <option v-for="v in advOptions(k.key)" :key="v" :value="v">{{ ENUM_LABEL[v] }}</option>
            </select>
          </label>
          <label class="block"><span class="st-label">1인 구매 제한 수량 (0 = 제한 없음)</span><input v-model.number="f.advanced.maxPerPerson" type="number" min="0" max="99999" class="st-input w-full" data-mk-s-adv="maxPerPerson" /></label>
          <label v-if="f.advanced.maxPerPerson > 0" class="block"><span class="st-label">제한 기간 (일)</span><input v-model.number="f.advanced.maxPerPersonDays" type="number" min="1" max="365" class="st-input w-full" data-mk-s-adv="maxPerPersonDays" /></label>
          <p class="st-desc-sm sm:col-span-2 break-keep">상품 상태는 등록 후 변경할 수 없습니다. 정가와 판매가가 다르면 할인율이 표시됩니다.</p>
        </div>
      </section>

      <!-- 보내기 전 요약 -->
      <section class="space-y-2" data-mk-s-preview>
        <h4 class="st-h-card">등록 정보 확인</h4>
        <div class="st-border rounded-[10px] overflow-hidden">
          <table class="sum-table">
            <tbody>
              <tr v-for="r in preview" :key="r.label" :data-mk-s-preview-row="r.label">
                <th>{{ r.label }}</th>
                <td :class="r.value ? 'st-ink' : 'st-muted'">{{ r.value || '미입력' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 쿠팡에 이미 있는 상품의 옵션 구성이 바뀜 — 확인해야 보낸다 -->
      <label v-if="optionChange && !done" class="flex items-start gap-2 st-surface st-border rounded-[10px] p-3 text-[13px] cursor-pointer" data-mk-s-option-change>
        <input v-model="optionChangeOk" type="checkbox" class="mt-0.5" data-mk-s-option-change-ok />
        <span class="break-keep"><b class="st-danger-text">{{ OPTION_CHANGE_NOTE }}</b><span class="block st-desc-sm mt-0.5">{{ OPTION_CHANGE_CONFIRM }}</span></span>
      </label>

      <p v-if="sendError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-s-error>등록에 실패했습니다. (사유: {{ sendError }})</p>
      <p v-if="done && done.resend" class="text-[13px] font-bold st-success-text break-keep" data-mk-s-done>수정 후 승인 요청되었습니다. 상품번호 {{ done.sellerProductId }} · 진행 상태는 [내 상품]에서 확인합니다.</p>
      <!-- 판매처에 있는 상품 수정 (2026-10-02) — 서버 way: modify(수정 + 다시 승인 요청) · price_stock(승인 완료 상품의 가격·재고만 — 승인 없음) · none(바뀐 것 없음) -->
      <p v-else-if="done && done.updated && done.way === 'price_stock'" class="text-[13px] font-bold st-success-text break-keep" data-mk-s-done data-mk-s-done-way="price_stock">판매처에 있는 상품의 가격·재고를 변경했습니다. 상품번호 {{ done.sellerProductId }} · 승인 없이 반영됩니다.</p>
      <p v-else-if="done && done.updated && done.way === 'none'" class="text-[13px] font-bold st-success-text break-keep" data-mk-s-done data-mk-s-done-way="none">변경된 내용이 없어 판매처에 전송하지 않았습니다. 상품번호 {{ done.sellerProductId }}</p>
      <p v-else-if="done && done.updated" class="text-[13px] font-bold st-success-text break-keep" data-mk-s-done data-mk-s-done-way="modify">판매처에 있는 상품을 수정하고 승인 요청했습니다. 상품번호 {{ done.sellerProductId }} · 진행 상태는 [내 상품]에서 확인합니다.</p>
      <p v-if="done?.priceStockError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-s-price-error>{{ done.priceStockError }}</p>
      <p v-else-if="done && !done.updated && !done.resend" class="text-[13px] font-bold st-success-text break-keep" data-mk-s-done>등록 및 승인 요청되었습니다.{{ done.sellerProductId ? ` 상품번호 ${done.sellerProductId}` : '' }} · 진행 상태는 [내 상품]에서 확인합니다.</p>
    </div>
</template>

<script setup>
// 보내기 창의 쿠팡 섹션 — 내 상품 한 줄(prepare = send_prepare 응답)을 쿠팡 상품으로. 창(StudioSendModal)이 쿠팡을 체크했을 때만 이 섹션을 띄운다.
// 판매처마다 섹션 컴포넌트 하나 — 밖으로 내놓는 것은 같다: missing(빠진 것)·busy·done·submit(). 다른 판매처가 열리면 같은 모양으로 하나 더 만든다.
// 필수값은 화면에서 먼저 막고(missing) 서버가 다시 검사한다. 항목 규칙은 api/_coupangFields.js — 서버와 같은 파일
import { ref, reactive, computed, watch, inject, onMounted, onBeforeUnmount } from 'vue'
import StudioTagChips from '@/components/studio/StudioTagChips.vue'
import { optionTableMode, SEND_CACHE_KEY, repImageCandidates, defaultRepImageId, REP_IMAGE_EMPTY } from '@/lib/studioMarketplaceRules'
import { COMMON_GROUPS } from '@/lib/studioSendCommon'
import {
  COUPANG_LINK_TITLE, COMMON_ITEMS_NOTE, OPTION_CHANGE_NOTE, OPTION_CHANGE_CONFIRM, OPTION_CHANGE_MISSING, LINK_EMPTY, LINK_FILL,
  commonCoupangRows, autoLinks, linkRows, linkProblems, linksPayload, linksFromSaved, unitValueOk, unitHint, optionSetChanged,
} from '@/lib/studioCoupangLink'
import { predictCategory, searchBrand, getCategoryMeta, sendProduct, REP_SIZE, readSaleMode, rememberSaleMode, fileToBase64, SEND_BODY_MAX } from '@/lib/studioMarketplace'
import {
  SALE_MODES, isSaleMode, defaultOutboundDays, OUTBOUND_DAYS_MIN, OUTBOUND_DAYS_MAX, ENUMS, ENUM_LABEL, advancedDefaults, discountRate,
  TAG_MAX, TAG_LEN, suggestSearchTags, NAME_MAX, suggestGeneralName, suggestDisplayName, ITEMS_MAX, STOCK_MAX, mapOptionName, matchOptionImage,
  hasUntranslated, NOTICE_LEN, NOTICE_SEE_DETAIL, noticeDefaults, docRequired, realCerts, previewRows,
  courierRule, TEMPLATE_COURIER_FIX, isColorOption, initialSaleMode, DEFAULT_SALE_MODE,
  pickKoreanName, namesNeedKorean, koreanizeSkus, autoItemNames, ITEM_NAME_MAX, BRAND_MAX, BRAND_NOT_FOUND, pickBrand, brandWordIn,
} from '../../../api/_coupangFields.js'

// common = 창의 공통 정보(2026-10-02) — 스마트스토어·11번가와 함께 보낼 때만 온다. null이면 예전 그대로(이 섹션 칸에 직접 넣는다)
const props = defineProps({ prepare: { type: Object, required: true }, common: { type: Object, default: null } })
const repImages = computed(() => repImageCandidates(props.prepare?.images)) // 대표 이미지 후보 = 1688 대표 사진 + 내 사진 (studioMarketplaceRules)

const ATTR_NAME_MAX = 25
const ATTR_VALUE_MAX = 30
const NAME_HINT = '상품명을 입력하세요'
const MODE_DESC = { domestic: '국내 재고를 직접 발송합니다.', agent: '주문 후 해외에서 구매하여 발송합니다. 구매자 개인통관고유부호를 수집합니다.' }
const ADV_KEYS = [
  { key: 'taxType', label: '과세' }, { key: 'adultOnly', label: '구매 대상' }, { key: 'offerCondition', label: '상품 상태' },
  { key: 'parallelImported', label: '병행수입' }, { key: 'unionDeliveryType', label: '묶음배송' },
]

const busy = ref('')
const meta = ref(null)
const predictNote = ref('')
const predictError = ref(false)
const sendError = ref('')
const docError = ref('')
const done = ref(null)
const advancedOpen = ref(false)
const pickFor = ref(-1)
const tagChips = ref(null)
const brandChoices = ref([]) // 쿠팡 브랜드 검색 결과
const brandNote = ref('')
const bulk = ref({ originalPrice: null, salePrice: null, stock: null })
// ★ uid는 f보다 먼저 선언한다 — f = ref(blank())가 곧바로 blankItem()을 불러 ++uid를 쓴다.
//   뒤에 두면 "Cannot access 'uid' before initialization"으로 setup이 죽어 섹션이 통째로 안 그려진다 (2026-09-28 운영 버그)
let uid = 0
const f = ref(blank())

function blankItem() { return { uid: ++uid, name: '', original: '', originals: {}, originalPrice: null, salePrice: null, stock: null, stock1688: null, sku: '', gtin: '', opt: {}, attributes: {}, freeAttrName: '', freeAttrValue: '', imageId: null, priceCny: null } }
function blank() {
  return {
    saleMode: '', outboundDays: null, productName: '', displayName: '', generalName: '', noBrand: true, brand: '', brandId: '', manufacture: '', manualNames: false, modelNo: '', categoryCode: '', categoryName: '',
    tags: [], noticeCategory: '', notices: {}, certs: {}, docs: {}, advanced: advancedDefaults(), optionTypes: [], items: [blankItem()], repImageId: null, fit: 'contain', templateId: '',
  }
}
const source = computed(() => props.prepare?.source || null)
const resend = computed(() => props.prepare?.resend || null)
const template = computed(() => (props.prepare?.templates || []).find(t => t.id === f.value.templateId) || null)
const hasCny = computed(() => !!source.value && f.value.items.some(it => it.fromSource))
const sourceNote = computed(() => {
  const s = source.value
  if (!s || !s.skus?.length) return ''
  const more = s.skuTotal > s.skus.length ? ` (전체 ${s.skuTotal}개 중 ${s.skus.length}개)` : ''
  return `가져온 상품의 옵션 ${s.skus.length}개를 불러왔습니다${more}. 1688 가격은 참고용이며 판매가는 직접 입력합니다.`
})

// 처음 값 — 창이 열릴 때마다 이 섹션이 새로 만들어진다(StudioSendModal이 key로 다시 띄움). 맨 아래에서 한 번 부른다
function init() {
  const p = props.prepare
  // 상품명 기본값은 한글만 — 작업 이름(지금 이름 → 내 상품을 만들 때 이름) → 가져온 상품 제목의 한글(번역 캐시). 없으면 빈칸 + placeholder
  f.value.productName = pickKoreanName([p?.export?.projectTitle, p?.export?.title, source.value?.title?.ko])
  f.value.templateId = (p?.templates || []).find(t => t.is_default)?.id || p?.templates?.[0]?.id || ''
  f.value.repImageId = defaultRepImageId(p?.images)
  // 고쳐서 다시 보내기 — 그 전송에서 보냈던 값으로 채운다 (템플릿·대표 이미지·옵션 사진은 지금 것에서 다시 고른다)
  if (resend.value?.form) return fillFromResend(resend.value.form)
  fillFromSource()
  applyRememberedMode()
  if (nameSeed.value) { f.value.generalName = suggestGeneralName({ title: nameSeed.value, optionValues: optionValueList() }); suggestTags() }
}
function fillFromResend(r) {
  const v = f.value
  Object.assign(v, {
    saleMode: isSaleMode(r.saleMode) ? r.saleMode : '', outboundDays: r.outboundDays, productName: r.productName, displayName: r.displayName, generalName: r.generalName,
    noBrand: r.noBrand, brand: r.brand, brandId: r.brandId, manufacture: r.manufacture, modelNo: r.modelNo,
    categoryCode: r.categoryCode, categoryName: resend.value.categoryName || '', tags: [...r.tags], advanced: { ...advancedDefaults(), ...r.advanced },
    manualNames: true, // 보냈던 옵션 이름을 그대로 둔다 (쿠팡에 있는 옵션과 이름으로 맞춘다)
  })
  if (r.brandId) brandChoices.value = [{ brandId: r.brandId, brandName: r.brand }]
  v.optionTypes = r.optionTypes.map(n => ({ key: n, label: n, names: [n], isColor: isColorOption([n]), mapped: n }))
  v.items = r.items.map(x => {
    const it = blankItem()
    Object.assign(it, { name: x.name, originalPrice: x.originalPrice, salePrice: x.salePrice, stock: x.stock, sku: x.sku, gtin: x.gtin })
    for (const n of r.optionTypes) it.opt[n] = x.attributes[n] || ''
    return it
  })
  loadMeta({ keep: { noticeCategory: r.noticeCategory, notices: r.notices, certifications: r.certifications, mapped: true } })
}

/** 가져온 상품(1688)의 옵션 줄 → 옵션 표. 가격(원)은 비워 둔다 — 임의 숫자로 채우지 않는다 */
function fillFromSource() {
  const s = source.value
  if (!s?.skus?.length) return
  // 옵션 이름·값은 한글만 넣는다(규칙: koreanizeSkus) — 못 옮긴 값은 비워 두고 가져온 글자를 칸 아래에 보여 준다
  const kr = koreanizeSkus(s.skus, { valueMax: ATTR_VALUE_MAX, nameMax: 150 })
  f.value.optionTypes = kr.types.map(t => ({ ...t, mapped: '' }))
  f.value.items = s.skus.map((row, i) => {
    const it = blankItem()
    it.fromSource = true
    it.opt = { ...kr.rows[i].opt }
    it.name = kr.rows[i].name
    it.original = kr.rows[i].original
    for (const v of row.values) { const key = v?.name?.zh || v?.name?.ko; if (key) it.originals[key] = v?.value?.zh || '' }
    it.priceCny = row.priceCny
    if (row.priceCny === null) console.error('[StudioSendCoupang] 1688 옵션 가격을 읽지 못함 — "확인 필요"로 표시:', s.offerId, row.skuId)
    it.stock1688 = row.stock // 참고용 — 재고 수량 칸은 비워 둔다(1688 판매자 재고는 내 재고가 아니다). 고객이 직접 넣는다
    it.sku = `${s.offerId}-${row.skuId || String(i + 1).padStart(3, '0')}`.slice(0, 50)
    it.imageId = matchOptionImage(row.imageUrl, props.prepare.images)
    return it
  })
}
const optionValueList = () => f.value.items.flatMap(it => Object.values(it.opt || {})).filter(Boolean)

// ── 판매 방식 ──
function pickMode(key) {
  f.value.saleMode = key
  f.value.outboundDays = defaultOutboundDays(key, template.value?.outbound_shipping_time_day)
  if (f.value.templateId) rememberSaleMode(f.value.templateId, key)
}
function applyRememberedMode() {
  // 이 브라우저에 기억한 값이 있으면 그것, 없으면 국내 재고 판매 (initialSaleMode)
  f.value.saleMode = initialSaleMode(f.value.templateId ? readSaleMode(f.value.templateId) : '')
  f.value.outboundDays = defaultOutboundDays(f.value.saleMode, template.value?.outbound_shipping_time_day)
}
function onTemplate() { applyRememberedMode() }

// ── 이름·태그 추천 (규칙 기반 — 외부 호출 없음) ──
const nameSeed = computed(() => pickKoreanName([source.value?.title?.ko, f.value.generalName, f.value.productName]))
const namesBad = computed(() => namesNeedKorean(f.value))
// ── 브랜드 (선택) — "브랜드 없음"이면 brand·brandId를 보내지 않는다. 브랜드를 쓰려면 쿠팡 브랜드 검색으로 brandId를 받는다 ──
const brandOut = computed(() => (f.value.noBrand ? '' : f.value.brand))
const brandInName = computed(() => (f.value.noBrand ? brandWordIn(f.value.productName, f.value.displayName, f.value.generalName) : ''))
function clearBrandPick() { f.value.brandId = ''; brandChoices.value = []; brandNote.value = '' }
function onNoBrand() { clearBrandPick() }
function onBrandInput() { clearBrandPick() }
function onBrandPick() {
  const b = brandChoices.value.find(x => x.brandId === f.value.brandId)
  if (b) f.value.brand = b.brandName
}
async function findBrand() {
  if (f.value.noBrand || !f.value.brand || busy.value) return
  busy.value = 'brand'
  clearBrandPick()
  try {
    const { brands } = await searchBrand(f.value.brand)
    const pick = pickBrand(brands, f.value.brand)
    if (pick.state === 'none') brandNote.value = BRAND_NOT_FOUND
    else if (pick.state === 'one') { brandChoices.value = [pick.brand]; f.value.brandId = pick.brand.brandId; f.value.brand = pick.brand.brandName }
    else brandChoices.value = pick.brands
  } catch (e) {
    console.error('[StudioSendCoupang] 브랜드 찾기 실패:', e.code, e)
    brandNote.value = e.message
  } finally {
    busy.value = ''
  }
}
function suggestNames() {
  f.value.generalName = suggestGeneralName({ title: nameSeed.value, categoryName: f.value.categoryName, optionValues: optionValueList() })
  f.value.displayName = suggestDisplayName({ brand: brandOut.value, generalName: f.value.generalName })
}
function suggestTags() {
  // 재료 = 상품명·카테고리·옵션 값 (가져온 상품의 속성은 쓰지 않는다 — 산지·판매 플랫폼 이름이 딸려 온다)
  const list = suggestSearchTags({ title: nameSeed.value, categoryName: f.value.categoryName, options: [...new Set(optionValueList())], brand: brandOut.value })
  if (tagChips.value) tagChips.value.addMany(list)
  else f.value.tags = list
}

// ── 카테고리 메타 ──
const buyAttrs = computed(() => (meta.value?.attributes || []).filter(a => a.exposed))
const mappedNames = computed(() => f.value.optionTypes.map(t => t.mapped).filter(Boolean))
// 옵션 종류로 맞춘 것 말고 따로 채울 속성 — 필수는 전부, 그 밖의 구매옵션은 표가 너무 넓어지지 않게 4칸까지
const extraAttrs = computed(() => {
  const all = (meta.value?.attributes || []).filter(a => !mappedNames.value.includes(a.name))
  const req = all.filter(a => a.required)
  return [...req, ...all.filter(a => !a.required && a.exposed).slice(0, Math.max(0, 4 - req.length))]
})
const noticeItems = computed(() => (meta.value?.notices || []).find(n => n.category === f.value.noticeCategory)?.items || [])
const certList = computed(() => realCerts(meta.value?.certifications))
const docList = computed(() => (meta.value?.documents || []).map(d => ({ ...d, needed: docRequired(d.rule, { saleMode: f.value.saleMode, parallelImported: f.value.advanced.parallelImported }) })))
const advOptions = key => (key === 'offerCondition' && meta.value?.offerConditions?.length ? ENUMS[key].filter(v => meta.value.offerConditions.includes(v)) : ENUMS[key])
const advancedSummary = computed(() => {
  const a = f.value.advanced
  return [ENUM_LABEL[a.taxType], ENUM_LABEL[a.adultOnly], ENUM_LABEL[a.offerCondition], ENUM_LABEL[a.parallelImported], ENUM_LABEL[a.unionDeliveryType], a.maxPerPerson > 0 ? `1인 ${a.maxPerPerson}개` : '구매 제한 없음'].join(' · ')
})

function fillNoticeDefaults() {
  const d = noticeDefaults(noticeItems.value, { is1688: source.value?.from === '1688' })
  const next = {}
  for (const n of noticeItems.value) next[n.name] = f.value.notices[n.name] || d[n.name] || ''
  f.value.notices = next
}
function fillSeeDetail() {
  for (const n of noticeItems.value) if (!String(f.value.notices[n.name] || '').trim()) f.value.notices[n.name] = NOTICE_SEE_DETAIL
}

const attributesOf = it => {
  const out = {}
  for (const t of f.value.optionTypes) if (t.mapped && String(it.opt[t.key] || '').trim()) out[t.mapped] = it.opt[t.key]
  for (const a of extraAttrs.value) if (String(it.attributes[a.name] || '').trim()) out[a.name] = it.attributes[a.name]
  if (!f.value.optionTypes.length && !extraAttrs.value.length && it.freeAttrName && it.freeAttrValue) out[it.freeAttrName] = it.freeAttrValue
  return out
}
const certsOut = computed(() => certList.value.filter(c => f.value.certs[c.type]?.on).map(c => ({ type: c.type, name: c.name, code: c.needsCode ? f.value.certs[c.type].code : '' })))
const docsOut = computed(() => docList.value.filter(d => f.value.docs[d.templateName]).map(d => ({ templateName: d.templateName, dataBase64: f.value.docs[d.templateName].dataBase64 })))
const optionImageIds = computed(() => [...new Set(f.value.items.map(it => it.imageId).filter(id => id && id !== f.value.repImageId))])
const rateText = it => { const r = discountRate(it.originalPrice || it.salePrice, it.salePrice); return r === null ? '' : r === 0 ? '쿠팡가' : `${r}%` }

const missing = computed(() => {
  const out = []
  const v = f.value
  if (!isSaleMode(v.saleMode)) out.push('판매 방식 (국내 재고 판매 / 해외구매대행)')
  else if (!(Number.isInteger(v.outboundDays) && v.outboundDays >= OUTBOUND_DAYS_MIN && v.outboundDays <= OUTBOUND_DAYS_MAX)) out.push(`출고 소요일 (${OUTBOUND_DAYS_MIN}~${OUTBOUND_DAYS_MAX}일)`)
  if (!v.productName) out.push('등록상품명')
  if (namesBad.value) out.push('상품명 한글')
  if (!v.noBrand) {
    if (!v.brand) out.push('브랜드명 (없으면 "브랜드 없음" 선택)')
    else if (brandNote.value === BRAND_NOT_FOUND) out.push('쿠팡에 등록된 브랜드')
    else if (!v.brandId) out.push(brandChoices.value.length > 1 ? '브랜드 선택' : '[브랜드 검색] 실행')
  }
  if (!/^\d+$/.test(v.categoryCode)) out.push('카테고리')
  if (!v.templateId) out.push('배송/반품 템플릿')
  else if (!templateCourierOk.value) out.push('배송/반품 템플릿의 택배사 (판매처 > 기본 설정에서 다시 저장)')
  if (!v.repImageId) out.push('대표 이미지')
  if (commonItems.value) {
    // 공통 정보 옵션 → 쿠팡 옵션 이름 연결 (studioCoupangLink.linkProblems) · 옵션을 켰는데 조합이 없으면 보낼 옵션이 없다
    out.push(...linkProblems(v.optionTypes.map(t => t.label), Object.fromEntries(v.optionTypes.map(t => [t.label, t.mapped])), meta.value?.attributes || []))
    if (!v.items.length) out.push('판매할 옵션 (공통 정보 옵션 목록)')
  } else {
    for (const t of v.optionTypes) if (!t.mapped) out.push(`옵션 종류 "${t.label}"에 맞는 쿠팡 옵션`)
    const dupMap = v.optionTypes.map(t => t.mapped).filter(Boolean)
    if (new Set(dupMap).size !== dupMap.length) out.push('옵션 종류별 서로 다른 쿠팡 옵션')
  }
  const names = new Set()
  const groupsDone = new Set()
  v.items.forEach((it, i) => {
    const tag = v.items.length > 1 ? `옵션 ${i + 1} ` : ''
    // 옵션 이름 — 기본은 자동(구매옵션 값으로 만든다 → 값이 비면 아래 "색상" 같은 빠짐으로 나온다). 직접 쓸 때만 이름을 검사한다
    const name = itemNames.value[i]
    if (v.manualNames) {
      if (!name) out.push(`${tag}옵션 이름`)
      else if (names.has(name)) out.push(`${tag}옵션 이름 중복`)
    }
    names.add(name)
    if (hasUntranslated(name) || Object.values(it.opt).some(hasUntranslated)) out.push(`${tag}옵션 값 한글 입력`)
    if (!(it.salePrice > 0)) out.push(commonItems.value ? `${tag}판매가 (공통 판매가·추가금액)` : `${tag}판매가`)
    else if (it.originalPrice > 0 && it.salePrice > it.originalPrice) out.push(`${tag}판매가가 정가 초과`)
    if (it.stock === null || it.stock === '' || it.stock === undefined) out.push(`${tag}재고 수량`)
    else if (!(Number.isInteger(it.stock) && it.stock >= 0 && it.stock <= STOCK_MAX)) out.push(`${tag}재고 수량은 0~${STOCK_MAX}`)
    if (!it.sku) out.push(`${tag}품번`)
    if (it.gtin && !/^\d{8,14}$/.test(it.gtin)) out.push(`${tag}GTIN은 숫자 8~14자리`)
    const attrs = attributesOf(it)
    for (const t of v.optionTypes) if (t.mapped && !String(it.opt[t.key] || '').trim()) out.push(`${tag}${t.mapped}`)
    // 단위형(NUMBER) — 숫자 또는 숫자+허용 단위만 (studioCoupangLink.unitValueOk)
    for (const [n, val] of Object.entries(attrs)) { const am = attrMeta(n); if (am && !unitValueOk(val, am)) out.push(`${tag}${n}: ${unitHint(am)}`) }
    groupsDone.clear()
    for (const a of (meta.value?.attributes || []).filter(x => x.required)) {
      if (a.group) {
        if (groupsDone.has(a.group)) continue
        groupsDone.add(a.group)
        const members = meta.value.attributes.filter(x => x.required && x.group === a.group)
        if (!members.some(x => String(attrs[x.name] || '').trim())) out.push(`${tag}${members.map(x => x.name).join(' 또는 ')}`)
      } else if (!String(attrs[a.name] || '').trim() && !mappedNames.value.includes(a.name)) out.push(`${tag}${a.name}`)
    }
    if (!Object.keys(attrs).length && !v.optionTypes.length) out.push(`${tag}구매옵션`)
  })
  for (const n of noticeItems.value) if (n.required && !String(v.notices[n.name] || '').trim()) out.push(`상품고시 ${n.name}`)
  for (const c of certList.value) {
    const got = v.certs[c.type]
    if (c.required && !got?.on) out.push(`인증정보 ${c.name || c.type}`)
    else if (got?.on && c.needsCode && !got.code) out.push(`인증정보 ${c.name || c.type} 인증번호`)
  }
  for (const d of docList.value) if (d.needed && !v.docs[d.templateName]) out.push(`구비서류 ${d.templateName}`)
  if (optionChange.value && !optionChangeOk.value) out.push(OPTION_CHANGE_MISSING)
  const limit = props.prepare?.limits?.optionImages
  if (Number.isInteger(limit) && optionImageIds.value.length > limit) out.push(`옵션 이미지 ${limit}장 초과 (현재 ${optionImageIds.value.length}장)`)
  return [...new Set(out)]
})

// 템플릿의 택배사가 출고지에 등록된 도서산간 택배사인지 (규칙 courierRule — 템플릿 화면·서버와 같음)
const templateCourierOk = computed(() => {
  const t = template.value
  if (!t) return true
  const place = (props.prepare?.places || []).find(p => p.kind === 'outbound' && p.place_code === t.outbound_place_code)
  return courierRule({ place, remoteOn: !!t.remote_area_deliverable, company: t.delivery_company_code }).ok
})
const preview = computed(() => previewRows({
  ...f.value, detailFiles: props.prepare?.export?.files || [], brand: brandOut.value, items: f.value.items.map((it, i) => ({ ...it, name: itemNames.value[i] })), certifications: certsOut.value, documents: docsOut.value, templateName: template.value?.name || '',
}))

// ── 옵션 표 ──
const attrLabel = a => `${a.name}${a.required ? ' *' : ''}${a.unit ? ` (${a.unit})` : ''}`
/** 가져온 글자를 한글로 못 옮겨 고객이 채워야 하는 줄 — 칸 아래에 가져온 글자를 보여 준다 */
const needsHand = (it, t) => !String(it.opt[t.key] || '').trim() || hasUntranslated(it.opt[t.key])
// 옵션 이름 — 구매옵션 값을 " / "로 이어 자동으로 만든다(Wing과 같게). [옵션 이름 직접 쓰기]를 누르면 열이 나타나 고칠 수 있다
const buyValuesOf = it => {
  const out = f.value.optionTypes.map(t => it.opt[t.key])
  for (const a of extraAttrs.value) if (a.exposed) out.push(it.attributes[a.name])
  if (!f.value.optionTypes.length && !extraAttrs.value.length) out.push(it.freeAttrValue)
  return out
}
const autoNames = computed(() => autoItemNames(f.value.items.map(buyValuesOf)))
const itemNames = computed(() => f.value.items.map((it, i) => (f.value.manualNames ? String(it.name || '').trim() : autoNames.value[i])))
function toggleManualNames() {
  if (!f.value.manualNames) f.value.items.forEach((it, i) => { it.name = autoNames.value[i] }) // 자동으로 만든 이름에서 시작
  f.value.manualNames = !f.value.manualNames
}
// 표 / 카드 — 표 자리 폭을 재서 고른다 (섹션이 가려져 폭이 0이면 화면 폭으로 어림)
const optWrap = ref(null)
const optWidth = ref(0)
const viewport = ref(typeof window !== 'undefined' && Number(window.innerWidth) > 0 ? window.innerWidth : 0)
const flexCols = computed(() => (f.value.manualNames ? 1 : 0) + (f.value.optionTypes.length + extraAttrs.value.length || 1))
const optMode = computed(() => optionTableMode({ width: optWidth.value, viewport: viewport.value, flexCols: flexCols.value, hasCny: hasCny.value }))
let optObserver = null
function measure() {
  viewport.value = window.innerWidth
  optWidth.value = optWrap.value ? optWrap.value.clientWidth : 0
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
  if (typeof ResizeObserver !== 'undefined' && optWrap.value) { optObserver = new ResizeObserver(measure); optObserver.observe(optWrap.value) }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  if (optObserver) optObserver.disconnect()
})
const imageOf = id => (id ? props.prepare.images.find(x => x.id === id) : null)
function setItemImage(id) {
  if (f.value.items[pickFor.value]) f.value.items[pickFor.value].imageId = id
  pickFor.value = -1
}
function addItem() {
  const it = blankItem()
  it.stock = f.value.items[0]?.stock ?? null // 첫 옵션에 넣은 값이 있으면 같은 값으로 (없으면 비움)
  f.value.items.push(it)
}
function removeItem(i) {
  f.value.items.splice(i, 1)
  pickFor.value = -1
}
const bulkReady = computed(() => bulk.value.originalPrice > 0 || bulk.value.salePrice > 0 || (Number.isInteger(bulk.value.stock) && bulk.value.stock >= 0))
function applyBulk() {
  const b = bulk.value
  for (const it of f.value.items) {
    if (b.originalPrice > 0) it.originalPrice = b.originalPrice
    if (b.salePrice > 0) it.salePrice = b.salePrice
    if (Number.isInteger(b.stock) && b.stock >= 0) it.stock = b.stock
  }
}
async function onDoc(templateName, e) {
  docError.value = ''
  const file = e.target.files?.[0]
  if (!file) { delete f.value.docs[templateName]; return }
  const max = props.prepare?.limits?.documentBytes
  if (Number.isInteger(max) && file.size > max) {
    docError.value = `"${file.name}" 파일이 3MB를 초과합니다.`
    e.target.value = ''
    delete f.value.docs[templateName]
    return
  }
  try {
    f.value.docs[templateName] = { name: file.name, dataBase64: await fileToBase64(file) }
  } catch (err) {
    console.error('[StudioSendCoupang] 구비서류 읽기 실패:', file.name, err)
    docError.value = `"${file.name}" 파일을 읽지 못했습니다. 다시 선택하세요.`
    delete f.value.docs[templateName]
  }
}

async function predict() {
  busy.value = 'predict'
  predictError.value = false
  predictNote.value = ''
  try {
    const r = await predictCategory(f.value.productName, brandOut.value)
    if (r.categoryCode) {
      f.value.categoryCode = r.categoryCode
      f.value.categoryName = r.categoryName || ''
      predictNote.value = r.result === 'SUCCESS' ? '추천 카테고리입니다. 다르면 코드를 직접 입력하세요.' : '추천 정확도가 낮습니다. 카테고리를 확인하세요.'
      await loadMeta()
    } else {
      predictError.value = true
      predictNote.value = '카테고리를 추천받지 못했습니다. 상품명을 구체적으로 입력하거나 코드를 직접 입력하세요.'
    }
  } catch (e) {
    console.error('[StudioSendCoupang] 카테고리 추천 실패:', e.code, e)
    predictError.value = true
    predictNote.value = e.message
  } finally {
    busy.value = ''
  }
}
/** @param {{ keep?:{ noticeCategory, notices, certifications, mapped } }} o  keep = 다시 보내기 — 보냈던 고시·인증·옵션 맞춤을 남긴다 */
async function loadMeta({ keep = null } = {}) {
  if (!/^\d+$/.test(f.value.categoryCode)) { meta.value = null; return }
  busy.value = 'meta'
  try {
    meta.value = await categoryMetaOf(f.value.categoryCode)
    for (const it of f.value.items) for (const a of meta.value.attributes) if (!(a.name in it.attributes)) it.attributes[a.name] = ''
    if (commonItems.value) {
      // 공통 정보 옵션 — 고객이 고른 것 → 지난번 이 상품을 쿠팡에 보낼 때의 연결 → 같은 이름·같은 뜻 (studioCoupangLink.autoLinks)
      const links = autoLinks(f.value.optionTypes.map(t => t.label), meta.value.attributes, savedLinks.value, Object.fromEntries(f.value.optionTypes.map(t => [t.label, t.mapped])))
      for (const t of f.value.optionTypes) t.mapped = links[t.label] || ''
    } else for (const t of f.value.optionTypes) {
      const hit = mapOptionName(t.names, meta.value.attributes)
      if (keep?.mapped && meta.value.attributes.some(a => a.name === t.mapped)) continue
      t.mapped = hit && !f.value.optionTypes.some(x => x !== t && x.mapped === hit) ? hit : ''
    }
    f.value.noticeCategory = (keep && meta.value.notices.find(n => n.category === keep.noticeCategory)?.category) || meta.value.notices[0]?.category || ''
    f.value.notices = keep ? { ...keep.notices } : {}
    fillNoticeDefaults()
    const sent = keep?.certifications || []
    f.value.certs = Object.fromEntries(realCerts(meta.value.certifications).map(c => [c.type, { on: sent.some(x => x.type === c.type), code: sent.find(x => x.type === c.type)?.code || '' }]))
    f.value.docs = {}
    if (meta.value.offerConditions?.length && !meta.value.offerConditions.includes(f.value.advanced.offerCondition)) f.value.advanced.offerCondition = advOptions('offerCondition')[0]
  } catch (e) {
    console.error('[StudioSendCoupang] 카테고리 메타 조회 실패:', e.code, e)
    meta.value = null
    predictError.value = true
    predictNote.value = e.message
  } finally {
    busy.value = ''
  }
}
/** @returns {Promise<object|null>} 보낸 결과 (못 보냈으면 null — 이유는 이 섹션 안에 보인다) */
async function submit() {
  if (missing.value.length || done.value) return null
  busy.value = 'send'
  sendError.value = ''
  try {
    const v = f.value
    // 사진은 id만 보낸다 — 서버가 보내는 순간 원본을 읽어 정사각형으로 만든다. 창을 열 때 받은 사진 주소(만료될 수 있음)는 보내는 데 쓰지 않는다
    const optionImages = []
    const keyOf = {}
    for (const id of optionImageIds.value) {
      const key = `r${String(optionImages.length + 1).padStart(2, '0')}`
      optionImages.push({ key, imageId: id })
      keyOf[id] = key
    }
    const notices = noticeItems.value.filter(n => String(v.notices[n.name] || '').trim()).map(n => ({ noticeCategoryName: v.noticeCategory, noticeCategoryDetailName: n.name, content: v.notices[n.name] }))
    const items = v.items.map((it, i) => ({
      name: itemNames.value[i], originalPrice: it.originalPrice || it.salePrice, salePrice: it.salePrice, stock: it.stock, sku: it.sku, gtin: it.gtin,
      attributes: attributesOf(it), imageKey: keyOf[it.imageId] || '',
    }))
    const payload = {
      ...(resend.value ? { resendId: resend.value.sendId } : {}),
      exportId: props.prepare.export.id, templateId: v.templateId, categoryCode: v.categoryCode, categoryName: v.categoryName,
      saleMode: v.saleMode, outboundDays: v.outboundDays,
      productName: v.productName, displayName: v.displayName, generalName: v.generalName, brand: brandOut.value, brandId: v.noBrand ? '' : v.brandId, manufacture: v.manufacture, modelNo: v.modelNo,
      items, notices, certifications: certsOut.value.map(c => ({ type: c.type, code: c.code })), documents: docsOut.value, advanced: { ...v.advanced },
      repImageId: v.repImageId, fit: v.fit, optionImages, searchTags: v.tags,
      // 공통 옵션 종류 → 쿠팡 옵션 이름 연결 — 보내기 기록(request_json.optionLinks)에 남겨 다시 보낼 때 그대로 쓴다
      optionLinks: linksPayload(Object.fromEntries(v.optionTypes.map(t => [t.label, t.mapped]))),
    }
    const size = JSON.stringify(payload).length
    if (size > SEND_BODY_MAX) {
      console.error('[StudioSendCoupang] 요청 본문이 너무 큼:', size, '옵션 사진', optionImages.length, '구비서류', payload.documents.length)
      sendError.value = '이미지와 서류의 합계 용량이 너무 큽니다. 옵션 이미지 수를 줄이거나 서류 파일 용량을 줄이세요.'
      return null
    }
    done.value = await sendProduct(payload)
    return done.value
  } catch (e) {
    console.error('[StudioSendCoupang] 보내기 실패:', e.code, e)
    sendError.value = e.message
    return null
  } finally {
    busy.value = ''
  }
}

// ── 공통 정보 (2026-10-02) — 창이 common을 주면 상품명·대표 이미지·판매가·재고·옵션을 그 값으로 채운다.
//    판매가·재고·옵션 = 공통 옵션 줄마다 쿠팡 옵션 1개, 판매가 = 공통 판매가 + 추가금액(studioCoupangLink.commonCoupangRows).
//    쿠팡 칸에 남는 것: 옵션 이름 연결 · 정가 · 품번 · GTIN · 필수 속성 · 옵션 이미지. [이 판매처만 다르게]에서 판매가나 재고·옵션을 켜면 예전처럼 이 칸에서 직접 넣는다
const own = reactive(Object.fromEntries(COMMON_GROUPS.map(g => [g.key, false])))
const showOwn = key => !props.common || own[key]
const commonItems = computed(() => !!props.common && !own.price && !own.stock)
const existingCoupang = computed(() => props.prepare?.existing?.coupang || null)
const savedLinks = computed(() => linksFromSaved(existingCoupang.value?.optionLinks))
const attrMeta = n => (meta.value?.attributes || []).find(a => a.name === n) || null
// 1688 옵션 사진 — 원문 옵션값 묶음 → 작업 사진 (공통 옵션 줄의 originals로 찾는다)
const sourceImages = new Map()
for (const row of source.value?.skus || []) {
  const key = (row.values || []).map(x => String(x?.value?.zh || x?.value?.ko || '').replace(/\s+/g, ' ').trim()).join('|')
  const id = matchOptionImage(row.imageUrl, props.prepare?.images || [])
  if (key && id && !sourceImages.has(key)) sourceImages.set(key, id)
}
function nextSku(used) {
  const offer = source.value?.offerId
  if (!offer) return ''
  for (let n = 1; n <= ITEMS_MAX + 1; n++) { const sku = `${offer}-${String(n).padStart(3, '0')}`; if (!used.has(sku)) { used.add(sku); return sku } }
  return ''
}
function syncCommon() {
  if (!props.common || done.value) return
  const c = props.common
  if (!own.name) f.value.productName = c.productName
  if (!own.image) { f.value.repImageId = c.repImageId; f.value.fit = c.fit }
  if (!commonItems.value) return
  const { groupNames, rows } = commonCoupangRows(c)
  const links = autoLinks(groupNames, meta.value?.attributes || [], savedLinks.value, Object.fromEntries(f.value.optionTypes.map(t => [t.label, t.mapped])))
  f.value.optionTypes = groupNames.map((g, gi) => ({ key: `g${gi}`, label: g, names: [g], isColor: isColorOption([g]), mapped: links[g] || '' }))
  const before = new Map(f.value.items.filter(it => it.ckey).map(it => [it.ckey, it]))
  const used = new Set([...before.values()].map(it => it.sku).filter(Boolean))
  f.value.items = rows.map(r => {
    let it = before.get(r.key)
    if (!it) {
      it = blankItem()
      it.ckey = r.key
      it.sku = nextSku(used)
      it.imageId = sourceImages.get(r.originals.join('|')) || null
    }
    it.opt = Object.fromEntries(groupNames.map((g, gi) => [`g${gi}`, r.values[gi] || '']))
    it.originals = {}
    it.salePrice = r.salePrice
    it.stock = r.stock
    for (const a of meta.value?.attributes || []) if (!(a.name in it.attributes)) it.attributes[a.name] = ''
    return it
  })
  if (pickFor.value >= f.value.items.length) pickFor.value = -1
}
// 쿠팡 구매옵션마다 연결 상태 (연결 표) — 옵션별로 넣는 필수 속성이 모든 줄에 있으면 'fill'
const linkTable = computed(() => linkRows(meta.value?.attributes || [], Object.fromEntries(f.value.optionTypes.map(t => [t.label, t.mapped])),
  name => f.value.items.length > 0 && f.value.items.every(it => String(attributesOf(it)[name] || '').trim())))
const unitPlaceholder = a => (a?.dataType === 'NUMBER' && (a.unit || a.units?.[0]) ? `예: 1${a.unit || a.units[0]}` : '')
// 쿠팡에 이미 있는 상품의 옵션 구성이 바뀜 — 확인 문구를 보여 주고 체크해야 보낸다 (반려 상품 고치기도 같은 규칙)
const optionChangeOk = ref(false)
const previousItemNames = computed(() => (existingCoupang.value?.mode === 'modify' ? existingCoupang.value.itemNames : resend.value?.form?.items?.map(x => x.name)) || [])
const optionChange = computed(() => optionSetChanged(previousItemNames.value, itemNames.value))

// ── 여러 상품 한 번에 보내기 (2026-10-02 StudioBulkSendModal) — 카테고리·배송 템플릿을 밖에서 정한다 ──
// 카테고리 메타는 창(sendCache)에서 같이 쓴다 — 같은 카테고리를 여러 상품에 적용해도 쿠팡 조회는 한 번 (실패는 기억하지 않는다)
const sendCache = inject(SEND_CACHE_KEY, null)
function categoryMetaOf(code) {
  if (!sendCache) return getCategoryMeta(code)
  const key = `coupangMeta:${code}`
  if (!sendCache[key]) {
    const p = getCategoryMeta(code)
    sendCache[key] = p
    p.catch(() => { if (sendCache[key] === p) delete sendCache[key] }) // 원인은 loadMeta가 console.error로 남긴다
  }
  return sendCache[key]
}
function applyPreset({ category = null, templateId = '' } = {}) {
  if (done.value) return
  if (templateId && (props.prepare?.templates || []).some(t => t.id === templateId) && f.value.templateId !== templateId) { f.value.templateId = templateId; onTemplate() }
  const code = category?.id != null ? String(category.id) : ''
  if (/^\d+$/.test(code) && code !== f.value.categoryCode) {
    f.value.categoryCode = code
    f.value.categoryName = category.name || ''
    loadMeta()
  }
}
const pickedCategory = computed(() => (/^\d+$/.test(f.value.categoryCode) ? { id: f.value.categoryCode, name: f.value.categoryName || '' } : null))

init()
watch(() => props.common, syncCommon, { deep: true, immediate: true })
watch(own, syncCommon)
defineExpose({ missing, busy, done, submit, sendError, applyPreset, pickedCategory }) // sendError = 창의 결과 표가 실패 사유를 그대로 보인다 (2026-10-01)
</script>

<style scoped>
.mode-card { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; text-align: left; border-radius: 10px; border: 1px solid var(--st-line-strong); background: var(--st-surface); }
.mode-card:hover { border-color: var(--st-accent); }
.mode-card.is-sub { padding: 9px 14px; background: var(--st-soft); } /* 보조 카드(해외구매대행) — 기본 카드보다 작고 옅게 */
.mode-card.is-sub > span:first-child { font-size: 13px; }
.mode-card.is-on { border-color: var(--st-accent); box-shadow: 0 0 0 2px var(--st-accent-ring); }
/* 옵션 표 — 고정 칸 폭은 studioMarketplaceRules.js OPTION_FIXED_PX와 같은 숫자. 나머지 칸(옵션 이름·옵션 종류)이 남는 폭을 나눠 갖는다 */
.opt-wrap { overflow: hidden; }
.opt-table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
.opt-table th { padding: 8px 5px; text-align: left; font-weight: 700; color: var(--st-muted); border-bottom: 1px solid var(--st-line); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opt-table td { padding: 6px 5px; vertical-align: middle; border-bottom: 1px solid var(--st-line); }
.opt-table tr:last-child td { border-bottom: 0; }
.opt-table .c-img { width: 52px; }
.opt-table .c-cny { width: 80px; overflow: hidden; text-overflow: ellipsis; }
.opt-table .c-price { width: 96px; }
.opt-table .c-rate { width: 52px; }
.opt-table .c-stock { width: 84px; }
.opt-table .c-sku { width: 164px; }
.opt-table .c-gtin { width: 136px; }
.opt-table .c-sku .opt-in, .opt-table .c-gtin .opt-in { font-size: 12px; } /* 품번 "상품번호-옵션번호" 17자가 다 보이게 */
.opt-table .c-del { width: 44px; }
.opt-in { width: 100%; min-width: 0; padding-left: 8px; padding-right: 8px; }
.opt-origin { display: block; margin-top: 3px; font-size: 11px; color: var(--st-muted); word-break: break-all; }
/* 카드형 — 옵션 1개 = 카드 1장, 칸마다 이름표 */
.opt-wrap.is-cards .opt-table, .opt-wrap.is-cards tbody { display: block; }
.opt-wrap.is-cards thead { display: none; }
.opt-wrap.is-cards tr { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px 10px; padding: 12px; border-bottom: 1px solid var(--st-line); }
.opt-wrap.is-cards tr:last-child { border-bottom: 0; }
.opt-wrap.is-cards td { display: block; width: auto; padding: 0; border: 0; min-width: 0; }
.opt-wrap.is-cards td[data-label]::before { content: attr(data-label); display: block; margin-bottom: 3px; font-size: 11px; font-weight: 700; color: var(--st-muted); }
.opt-wrap.is-cards td.c-name { grid-column: 1 / -1; }
.opt-wrap.is-cards td.c-del { grid-column: 1 / -1; text-align: right; }
.opt-wrap.is-cards td.c-del:empty { display: none; }
.opt-img { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; border: 1px solid var(--st-line-strong); display: flex; align-items: center; justify-content: center; background: var(--st-soft); }
.opt-img img { width: 100%; height: 100%; object-fit: cover; }
.opt-img.is-picking { border-color: var(--st-accent); box-shadow: 0 0 0 2px var(--st-accent-ring); }
.sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sum-table th { width: 130px; padding: 7px 10px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.sum-table td { padding: 7px 10px; border-bottom: 1px solid var(--st-line); word-break: break-all; }
.sum-table tr:last-child th, .sum-table tr:last-child td { border-bottom: 0; }
</style>
