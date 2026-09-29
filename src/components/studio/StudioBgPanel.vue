<template>
  <div class="flex flex-col h-full overflow-y-auto" data-bg-panel>
    <div class="px-4 pt-4 pb-4 space-y-3 st-border-b">
      <div class="text-[13px] font-extrabold st-ink">배경 지우기</div>

      <p v-if="!row" class="st-desc break-keep" data-bg-empty>페이지나 [사진] 목록에서 사진을 고르세요</p>

      <template v-else>
        <!-- 지금 대상 사진 (review-1): 크게 + 어느 구간·어디서 골랐는지 — 버튼(특히 돈이 드는 [배경 지우기]·[AI 배경])이 이 사진에 적용된다 -->
        <div class="rounded-[12px] p-2 st-card" data-bg-target>
          <div class="text-[11px] font-bold st-muted mb-1.5">지금 대상 사진 · {{ targetSource === 'page' ? '페이지에서 고른 사진' : '사진 목록에서 고른 사진' }}</div>
          <div class="st-bg-thumb st-bg-thumb-lg" :class="bg && bg.mode === 'transparent' ? 'is-checker' : ''" :style="thumbStyle" data-bg-thumb>
            <img v-if="thumbUrl" :src="thumbUrl" alt="" class="w-full h-full object-contain" draggable="false" />
          </div>
          <div class="mt-1.5 text-[13px] font-extrabold st-ink truncate" data-bg-target-label>{{ targetLabel || rowLabel }}</div>
          <div v-if="bg" class="text-[11px] font-bold st-accent-text" data-bg-mark>{{ markText }}</div>
        </div>

        <!-- 결과가 있으면: 원래 배경 / 투명 / 단색 / AI 배경(만든 적 있을 때 — 저장된 그림, 돈 안 듦) (저장된 마스크만 씀 — 다시 부르지 않는다) -->
        <template v-if="bg">
          <div class="st-seg w-full" role="radiogroup" aria-label="배경 보기">
            <button
              v-for="m in modes" :key="m.key" type="button" role="radio" :aria-checked="bg.mode === m.key"
              class="st-seg-item flex-1" :class="bg.mode === m.key ? 'is-active' : ''" :data-bg-mode="m.key"
              @click="$emit('mode', m.key)"
            >{{ m.label }}</button>
          </div>
          <p v-if="bg.mode === 'transparent'" class="st-desc-sm break-keep">지운 배경 자리에 섹션 배경색이 보여요</p>

          <!-- 단색 (17-2): 견본 · 직접 고르기 · 구간 배경색과 같게 -->
          <div v-if="bg.mode === 'color'" class="space-y-2" data-bg-color-box>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="c in BG_COLOR_SWATCHES" :key="c.value" type="button" class="st-swatch" :class="paintColor === c.value ? 'is-active' : ''"
                :style="{ background: c.value }" :title="c.label" :aria-label="c.label" :data-bg-color="c.value"
                @click="$emit('color', c.value, { commit: true })"
              />
              <label class="st-swatch st-swatch-pick" title="색 고르기" data-bg-color-pick>
                <Pipette class="w-3.5 h-3.5" :stroke-width="2" />
                <input
                  type="color" :value="paintColor || '#ffffff'" class="sr-only"
                  @input="$emit('color', $event.target.value, { commit: false })" @change="$emit('color', $event.target.value, { commit: true })"
                />
              </label>
              <span class="ml-1 text-[11px] font-bold st-muted uppercase" data-bg-color-value>{{ paintColor }}</span>
            </div>
            <button
              type="button" class="st-btn w-full" :disabled="!sectionBg" data-bg-color-section
              :title="sectionBgWhere" @click="$emit('color', sectionBg, { commit: true })"
            >
              <span class="st-swatch-mini" :style="sectionBg ? { background: sectionBg } : null" /> 섹션 배경색과 같게
            </button>
            <!-- 검수 2묶음: 어느 구간 색인지 / 잠긴 이유를 글자로 (툴팁에만 두지 않음) -->
            <p v-if="sectionBgReason" class="text-[11px] font-bold st-danger-text break-keep" data-bg-color-section-reason>{{ sectionBgReason }}</p>
            <p v-else-if="sectionBgWhere" class="text-[11px] st-muted break-keep" data-bg-color-section-where>기준: {{ sectionBgWhere }}</p>
          </div>

          <!-- 경계 다듬기 (17-3): 붓으로 AI 결과를 고친다 (외부 AI 없음·무료) -->
          <div class="space-y-1" data-bg-refine-box>
            <button type="button" class="st-btn w-full" data-bg-refine @click="$emit('refine')">
              <Brush class="w-3.5 h-3.5" :stroke-width="2" /> 경계 다듬기
              <span v-if="bg.refined" class="st-badge ml-1" data-bg-refined>다듬음</span>
            </button>
            <p class="st-desc-sm break-keep">
              {{ bg.mode === 'none' ? '다듬은 결과는 [투명]·[단색]에서 보여요' : '지워진 제품은 살리고, 남은 배경은 지워요' }}
            </p>
          </div>

          <button type="button" class="st-btn w-full" data-bg-reset @click="$emit('reset')">
            <RotateCcw class="w-3.5 h-3.5" :stroke-width="2" /> 배경 원래대로
          </button>
        </template>

        <!-- [배경 지우기] 기본 = 흰 배경·단색 배경을 이 브라우저에서 지움 (외부 AI·돈 없음 — 자격 검사 없음) -->
        <template v-else>
          <button type="button" class="st-btn st-btn-primary w-full" :disabled="busy" data-bg-remove @click="$emit('remove')">
            <Loader2 v-if="busy" class="w-3.5 h-3.5 animate-spin" :stroke-width="2" />
            <Eraser v-else class="w-3.5 h-3.5" :stroke-width="2" />
            {{ busy ? '배경 지우는 중…' : '배경 지우기' }}
            <span v-if="!busy" class="st-badge ml-1" data-bg-remove-free>무료</span>
          </button>
          <p class="st-desc-sm break-keep" data-bg-remove-desc>흰색·한 가지 색 배경을 바로 지워요</p>
          <!-- 단색 배경이 아니었던 사진: [AI로 정밀하게 지우기]를 따로 (쓸 수 없으면 한 가지 색 배경 사진을 고르라는 안내만) -->
          <p v-if="localMiss" class="text-[12px] font-bold st-ink-2 break-keep" data-bg-local-miss>
            {{ aiShown ? '배경이 여러 색인 사진은 [AI로 정밀하게 지우기]가 깔끔해요' : '배경이 한 가지 색인 사진을 골라 주세요' }}
          </p>
        </template>

        <!-- [AI로 정밀하게 지우기] — 외부 AI(돈이 드는 곳)는 누를 때만. 단색이 아니었던 사진, 또는 무료로 지운 사진을 더 정밀하게 -->
        <div v-if="aiWanted" class="space-y-1.5" data-bg-ai-remove-box>
          <div v-if="status.loading" class="st-desc-sm" data-bg-status="loading">확인하는 중…</div>
          <template v-else-if="status.reason === 'not_eligible'">
            <button type="button" class="st-btn w-full" disabled data-bg-locked>
              <Lock class="w-3.5 h-3.5" :stroke-width="2" /> AI로 정밀하게 지우기
            </button>
            <p class="st-desc-sm break-keep" data-bg-status="not_eligible">이유씨로 주문한 고객에게 열리는 기능이에요</p>
          </template>
          <template v-else-if="status.reason === 'error'">
            <p class="st-desc-sm break-keep" data-bg-status="error">{{ status.message || '상태를 확인하지 못했어요.' }}</p>
            <button type="button" class="st-btn w-full" data-bg-status-retry @click="$emit('retry-status')">다시 확인</button>
          </template>
          <!-- 쓸 수 없는 상태(no_key·no_table)면 버튼·안내를 보이지 않는다 -->
          <template v-else-if="status.reason === 'no_key' || status.reason === 'no_table'" />
          <template v-else-if="status.ready">
            <button
              type="button" class="st-btn w-full" :class="bg ? '' : 'st-btn-primary'" :disabled="busy" data-bg-remove-ai
              @click="$emit('remove-ai')"
            >
              <Sparkles class="w-3.5 h-3.5" :stroke-width="2" /> AI로 정밀하게 지우기
            </button>
            <p v-if="bg" class="st-desc-sm break-keep">경계가 복잡한 사진은 AI가 더 정밀하게 지워요</p>
            <p class="st-desc-sm break-keep" data-bg-notice>사진은 배경을 지우기 위해 외부 AI 서비스로 보내져요.</p>
          </template>
        </div>

        <p v-if="error" class="text-[12px] font-bold st-danger-text break-keep" data-bg-error>{{ error }}</p>
      </template>
    </div>

    <!-- 단색 배경 (17-2) · AI 배경 자리 -->
    <div class="px-4 py-4 space-y-2">
      <div class="flex items-center gap-2" data-bg-solid-row>
        <span class="text-[13px] font-bold st-ink-2">단색 배경</span>
        <button
          v-if="row && !bg" type="button" class="st-btn ml-auto" disabled data-bg-solid-locked
        ><Lock class="w-3.5 h-3.5" :stroke-width="2" /> 단색</button>
      </div>
      <!-- 경계 다듬기 (17-3): 배경을 지운 사진에만 — 없으면 잠금 -->
      <div v-if="row && !bg" class="flex items-center gap-2" data-bg-refine-row>
        <span class="text-[13px] font-bold st-ink-2">경계 다듬기</span>
        <button type="button" class="st-btn ml-auto" disabled data-bg-refine-locked><Lock class="w-3.5 h-3.5" :stroke-width="2" /> 다듬기</button>
      </div>
      <p v-if="row && !bg" class="st-desc-sm break-keep" data-bg-solid-need>먼저 [배경 지우기]를 해 주세요</p>
      <p v-else-if="row && bg && bg.mode !== 'color'" class="st-desc-sm break-keep">위에서 [단색]을 고르면 배경을 한 가지 색으로 채워요</p>
    </div>

    <!-- 라이브러리 배경: 준비된 그림(에셋 이미지 — 연출 배경·배경)을 골라 사진 배경으로. AI 없음·무료·횟수를 쓰지 않는다 -->
    <div v-if="row" class="px-4 pb-4 space-y-2 st-border-t pt-4" data-bg-lib-box>
      <div class="flex items-center gap-2">
        <span class="text-[13px] font-extrabold st-ink">라이브러리 배경</span>
        <span class="ml-auto st-badge" data-bg-lib-free>무료</span>
      </div>
      <template v-if="!bg">
        <button type="button" class="st-btn w-full" disabled data-bg-lib-locked><Lock class="w-3.5 h-3.5" :stroke-width="2" /> 라이브러리 배경</button>
        <p class="st-desc-sm break-keep" data-bg-lib-need>먼저 [배경 지우기]를 해 주세요</p>
      </template>
      <template v-else>
        <p v-if="libState === 'loading'" class="st-desc-sm">그림 목록을 불러오는 중…</p>
        <template v-else-if="libState === 'error'">
          <p class="st-desc-sm break-keep">그림 목록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p>
          <button type="button" class="st-btn w-full" data-bg-lib-retry @click="loadLibrary">다시 시도</button>
        </template>
        <template v-else>
          <div class="flex flex-wrap gap-1" role="tablist" aria-label="그림 종류" data-bg-lib-kinds>
            <button
              v-for="c in libKinds" :key="c.key" type="button" role="tab" class="st-chip" :class="libKind === c.key ? 'is-active' : ''"
              :aria-selected="libKind === c.key" :data-bg-lib-kind="c.key" @click="libKind = c.key"
            >{{ c.label }}</button>
          </div>
          <div class="flex flex-wrap gap-1" role="tablist" aria-label="상품 묶음" data-bg-lib-groups>
            <button
              v-for="g in libGroups" :key="g.key" type="button" role="tab" class="st-chip" :class="libGroup === g.key ? 'is-active' : ''"
              :aria-selected="libGroup === g.key" :data-bg-lib-group="g.key" @click="libGroup = g.key"
            >{{ g.label }}</button>
          </div>
          <div class="grid grid-cols-3 gap-1.5" data-bg-lib-list>
            <button
              v-for="a in libShown" :key="a.id" type="button" class="st-lib-card" :class="bg.mode === 'library' && bg.lib?.asset === a.file ? 'is-active' : ''"
              :title="a.label" :aria-label="a.label" :data-bg-lib="a.id" @click="$emit('library', a)"
            >
              <img :src="assetThumbUrl(a)" alt="" draggable="false" loading="lazy" decoding="async" />
            </button>
          </div>
          <p v-if="libShown.length === 0" class="st-desc-sm break-keep" data-bg-lib-none>이 조건에 맞는 그림이 없어요</p>
          <p class="st-desc-sm break-keep">제품은 원본 그대로 두고 배경만 바꿔요. 횟수를 쓰지 않아요.</p>
        </template>
        <p v-if="bg.lib" class="st-desc-sm break-keep" data-bg-lib-current>
          고른 배경: {{ bg.lib.label || '라이브러리 그림' }}<span v-if="bg.mode !== 'library'"> · 위 [라이브러리]를 누르면 다시 써요</span>
        </p>
      </template>
    </div>

    <!-- AI 배경 (17-4): 장면을 골라 [만들기] — 1회 사용, 1인 하루 무료 3회(서버 값). 제품은 원본 그대로 위에 덮는다 -->
    <div v-if="row" class="px-4 pb-4 space-y-2 st-border-t pt-4" data-bg-ai-box>
      <div class="flex items-center gap-2">
        <span class="text-[13px] font-extrabold st-ink">AI 배경</span>
        <span v-if="bg && leftText" class="ml-auto text-[11px] font-bold st-muted" data-bg-gen-left>{{ leftText }}</span>
      </div>
      <template v-if="!bg">
        <button type="button" class="st-btn w-full" disabled data-bg-gen-locked><Lock class="w-3.5 h-3.5" :stroke-width="2" /> AI 배경 만들기</button>
        <p class="st-desc-sm break-keep" data-bg-gen-need>먼저 [배경 지우기]를 해 주세요</p>
      </template>
      <template v-else>
        <div v-if="genStatus.loading" class="st-desc-sm" data-bg-gen-status="loading">확인하는 중…</div>
        <template v-else-if="genStatus.reason === 'not_eligible'">
          <button type="button" class="st-btn w-full" disabled data-bg-gen-locked><Lock class="w-3.5 h-3.5" :stroke-width="2" /> AI 배경 만들기</button>
          <p class="st-desc-sm break-keep" data-bg-gen-status="not_eligible">이유씨로 주문한 고객에게 열리는 기능이에요</p>
        </template>
        <!-- 쓸 수 없는 상태(no_key·no_table)면 버튼·안내를 보이지 않는다 -->
        <template v-else-if="genStatus.reason === 'no_key' || genStatus.reason === 'no_table'" />
        <template v-else-if="genStatus.reason === 'error'">
          <p class="st-desc-sm break-keep" data-bg-gen-status="error">{{ genStatus.message || '상태를 확인하지 못했어요.' }}</p>
          <button type="button" class="st-btn w-full" data-bg-gen-status-retry @click="$emit('retry-gen-status')">다시 확인</button>
        </template>
        <template v-else>
          <div class="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="장면" data-bg-gen-presets>
            <button
              v-for="p in BG_GEN_PRESETS" :key="p.key" type="button" role="radio" :aria-checked="preset === p.key"
              class="st-chip" :class="preset === p.key ? 'is-active' : ''" :data-bg-gen-preset="p.key" :disabled="genBusy"
              @click="preset = p.key"
            >{{ p.label }}</button>
          </div>
          <button
            type="button" class="st-btn st-btn-primary w-full" :disabled="genBusy || !canGenerate" data-bg-generate
            @click="$emit('generate', preset)"
          >
            <Loader2 v-if="genBusy" class="w-3.5 h-3.5 animate-spin" :stroke-width="2" />
            <Sparkles v-else class="w-3.5 h-3.5" :stroke-width="2" />
            {{ genBusy ? '만드는 중…' : 'AI 배경 만들기' }}
            <span v-if="!genBusy" class="st-badge ml-1" data-bg-gen-cost>1회 사용</span>
          </button>
          <p v-if="blockText" class="text-[12px] font-bold st-ink-2 break-keep" data-bg-gen-block>{{ blockText }}</p>
          <p class="st-desc-sm break-keep">제품은 원본 그대로 두고 배경만 새로 만들어요</p>
          <p class="st-desc-sm break-keep" data-bg-gen-notice>사진은 배경을 만들기 위해 외부 AI 서비스로 보내져요.</p>
        </template>
        <p v-if="bg.ai" class="st-desc-sm break-keep" data-bg-gen-current>
          만든 AI 배경: {{ presetLabel(bg.ai.preset) || '장면' }}<span v-if="bg.mode !== 'ai'"> · 위 [AI 배경]을 누르면 다시 써요 (횟수 안 씀)</span>
        </p>
        <p v-if="genError" class="text-[12px] font-bold st-danger-text break-keep" data-bg-gen-error>{{ genError }}</p>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * [배경합성] 패널 (17-1·17-2) — 고른 사진의 [배경 지우기] · 원래 배경/투명/단색 · [배경 원래대로]. AI 배경은 자리만.
 * [배경 지우기] 기본 = 흰 배경·단색 배경을 브라우저에서 지움('remove' — studioBgLocal, 돈 없음·자격 검사 없음).
 * [AI로 정밀하게 지우기]('remove-ai')만 외부 AI — 자격(주문 고객)·준비 상태는 서버(bg_status)가 알려 준 status로만 잠근다. 돈이 드는 요청은 이 버튼을 누를 때 한 번.
 * 단색(17-2)은 AI 없음·무료·자격 검사 없음 — 배경을 지운(마스크가 있는) 사진이면 누구나. 없으면 잠그고 "먼저 [배경 지우기]를 해 주세요".
 *   색 이벤트: ('color', 값, { commit }) — commit false = 색 고르기 칸을 끄는 중(이력 없음), true = 놓음·견본·구간 색(이력 한 칸)
 * 경계 다듬기(17-3)도 마스크가 있는 사진에만 — ('refine')이면 편집기가 다듬기 화면을 연다. 없으면 잠그고 같은 안내 문구.
 * 라이브러리 배경: 준비된 그림(에셋 이미지 목록 manifest.json의 use 'bg') → ('library', 목록 항목). AI·서버·횟수 없음 — 마스크가 있는 사진이면 누구나.
 *   목록은 작은 그림(thumb)만 받는다. 원본은 고른 뒤에 합성할 때만.
 * AI 배경(17-4): 장면 프리셋 → ('generate', preset). 자격·남은 횟수는 서버(bg_gen_status)가 알려 준 genStatus로만.
 *   한 번 만든 AI 배경(bg.ai)은 [AI 배경] 모드로 다시 고를 수 있다(저장된 그림 — 돈 안 듦).
 */
import { ref, computed, watch } from 'vue'
import { Eraser, Lock, Loader2, RotateCcw, Pipette, Brush, Sparkles } from 'lucide-vue-next'
import { BG_COLOR_SWATCHES, bgPaintColor, bgMark } from '@/lib/studioBg'
import { LOCAL_BG_MODEL } from '@/lib/studioBgLocal'
import { BG_GEN_PRESETS, presetLabel } from '@/lib/studioBgGen'
import { assetThumbUrl, filterAssets, ASSET_GROUP_ALL } from '@/lib/studioAsset'
import { loadAssetManifest } from '@/lib/studioAssetLoad'

const props = defineProps({
  row: { type: Object, default: null },           // 고른 사진 행 (done)
  thumbUrl: { type: String, default: null },       // 화면 작은 사진 (배경 마스크 적용된 것 — 단색은 아래 색으로)
  bg: { type: Object, default: null },             // { mask, mode, color? } | null
  sectionBg: { type: String, default: null },      // [구간 배경색과 같게] 색 (studioBg.sectionBgChoice — 없으면 잠금)
  sectionBgWhere: { type: String, default: '' },   // 기준 구간 설명 (검수 2묶음)
  sectionBgReason: { type: String, default: '' },  // 잠긴 이유 (옛 형식 색 등)
  status: { type: Object, required: true },        // { loading, ready, reason, message }
  busy: { type: Boolean, default: false },         // 이 사진을 처리 중
  localMiss: { type: Boolean, default: false },    // 무료 [배경 지우기]가 단색 배경이 아니라고 판정한 사진 → [AI로 정밀하게 지우기]
  error: { type: String, default: '' },
  thumbUnder: { type: String, default: null },     // AI 배경 아래 그림 (17-4 — 화면 작은 사진과 같은 크기)
  genStatus: { type: Object, required: true },     // AI 배경 { loading, ready, reason, staff, left, perDay, globalLeft, message }
  genBusy: { type: Boolean, default: false },      // 이 사진의 AI 배경을 만드는 중
  genError: { type: String, default: '' },
  targetLabel: { type: String, default: '' },      // review-1: "03 상세 이미지 · 02번 사진" — 대상 사진이 어느 구간인지
  targetSource: { type: String, default: 'page' }, // 'page' 페이지에서 고른 사진 | 'list' 사진 목록에서 고른 사진
})
defineEmits(['remove', 'remove-ai', 'mode', 'color', 'reset', 'retry-status', 'refine', 'generate', 'retry-gen-status', 'library'])

// [AI로 정밀하게 지우기] 칸: 단색이 아니었던 사진(아직 안 지움) — 자격·준비 상태를 보여 줌 / 무료로 지운 사진 — 쓸 수 있을 때만 버튼
const aiShown = computed(() => !!props.status.ready)
const aiWanted = computed(() => (!props.bg && props.localMiss) || (props.bg?.mask?.model === LOCAL_BG_MODEL && aiShown.value))

const MODES = [
  { key: 'none', label: '원래 배경' },
  { key: 'transparent', label: '투명' },
  { key: 'color', label: '단색' },
  { key: 'library', label: '라이브러리' },
  { key: 'ai', label: 'AI 배경' },
]
// [AI 배경] 모드는 한 번 만든 뒤에만 (그 전에는 아래 [AI 배경 만들기]), [라이브러리]도 한 번 고른 뒤에만
const modes = computed(() => MODES.filter(m => (m.key !== 'ai' || !!props.bg?.ai) && (m.key !== 'library' || !!props.bg?.lib)))

// ── 라이브러리 배경 목록 (배경을 지운 사진을 골랐을 때 처음 한 번 받는다) ──
const LIB_KINDS = ['scenes', 'backgrounds'] // 연출 배경 먼저
const libState = ref('idle') // idle | loading | ready | error
const libList = ref({ categories: [], groups: [], items: [] })
const libKind = ref(LIB_KINDS[0])
const libGroup = ref(ASSET_GROUP_ALL)
const libKinds = computed(() => LIB_KINDS.map(k => libList.value.categories.find(c => c.key === k)).filter(Boolean).map(c => ({ key: c.key, label: c.label })))
const libItems = computed(() => filterAssets(libList.value.items, { category: libKind.value, use: 'bg' }))
// 묶음 칩 = 지금 종류에 그림이 있는 묶음만
const libGroups = computed(() => [{ key: ASSET_GROUP_ALL, label: '전체' }, ...libList.value.groups.filter(g => libItems.value.some(i => i.group === g.key))])
const libShown = computed(() => filterAssets(libItems.value, { group: libGroup.value }))
watch(libKind, () => { if (!libGroups.value.some(g => g.key === libGroup.value)) libGroup.value = ASSET_GROUP_ALL })
async function loadLibrary() {
  libState.value = 'loading'
  try {
    libList.value = await loadAssetManifest()
    if (!libKinds.value.some(k => k.key === libKind.value) && libKinds.value.length) libKind.value = libKinds.value[0].key
    libState.value = 'ready'
  } catch (e) {
    console.error('[StudioBgPanel] 라이브러리 배경 목록을 받지 못함:', e)
    libState.value = 'error'
  }
}
watch(() => !!props.bg, has => { if (has && libState.value === 'idle') loadLibrary() }, { immediate: true })
const preset = ref(BG_GEN_PRESETS[0].key)
watch(() => props.row?.id, () => {
  const p = props.bg?.ai?.preset
  preset.value = p && BG_GEN_PRESETS.some(x => x.key === p) ? p : BG_GEN_PRESETS[0].key
}, { immediate: true })
const leftText = computed(() => {
  const g = props.genStatus
  if (!g.ready) return ''
  return g.staff ? '관리자 · 1인 횟수 제한 없음' : `오늘 남은 무료 횟수 ${g.left}/${g.perDay}`
})
const canGenerate = computed(() => {
  const g = props.genStatus
  return !!g.ready && (g.staff || g.left > 0) && g.globalLeft > 0
})
const blockText = computed(() => {
  const g = props.genStatus
  if (!g.ready) return ''
  // 1인 무료를 다 쓰면 내일 다시 / 전체 한도는 보이지 않는 안전장치 — 고객에게는 "잠시 후"만
  if (!g.staff && g.left <= 0) return `오늘 무료 ${g.perDay}회를 모두 썼어요. 내일 다시 쓸 수 있어요.`
  if (g.globalLeft <= 0) return '지금은 AI 배경을 만들 수 없어요. 잠시 후 다시 시도해 주세요.'
  return ''
})
const thumbStyle = computed(() => {
  if (props.thumbUnder) return { backgroundImage: `url("${props.thumbUnder}")`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  return paintColor.value ? { background: paintColor.value } : null
})

const paintColor = computed(() => bgPaintColor(props.bg))
const markText = computed(() => bgMark(props.bg) || '배경 지움 · 원래 배경으로 보기')
const rowLabel = computed(() => props.row?.upload_name || (props.row ? `사진 ${Number(props.row.sort_order) + 1}` : ''))
</script>

<style scoped>
.st-bg-thumb {
  width: 64px; height: 64px; flex-shrink: 0; border-radius: 8px; overflow: hidden;
  background: var(--st-card); border: 1px solid var(--st-line);
}
.st-bg-thumb-lg { width: 100%; height: 150px; }
.st-bg-thumb.is-checker {
  background-color: var(--st-card);
  background-image:
    linear-gradient(45deg, var(--st-line) 25%, transparent 25%), linear-gradient(-45deg, var(--st-line) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--st-line) 75%), linear-gradient(-45deg, transparent 75%, var(--st-line) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
}
/* 색 견본 — 어두운 화면에서도 흰색·검정 테두리가 보이게 (구간 패널 견본과 같은 모양) */
.st-swatch {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--st-line-strong); cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.st-swatch.is-active { box-shadow: 0 0 0 2px var(--st-accent); }
.st-swatch-pick { background: var(--st-card); color: var(--st-ink-2); position: relative; }
.st-swatch-pick:focus-within { border-color: var(--st-accent); }
/* 라이브러리 배경 견본 */
.st-lib-card {
  aspect-ratio: 1 / 1; padding: 0; border-radius: 8px; overflow: hidden; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card);
}
.st-lib-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.st-lib-card:hover { border-color: var(--st-accent); }
.st-lib-card.is-active { border-color: var(--st-accent); box-shadow: 0 0 0 2px var(--st-accent); }
[data-bg-lib-box] .st-chip { font-size: 12px; font-weight: 700; }
/* 장면 칩은 스튜디오 공통 .st-chip(studio-tokens.css) — 두 칸 격자에 맞게 가운데 정렬만 */
[data-bg-gen-presets] .st-chip { justify-content: center; font-size: 12px; font-weight: 700; }
.st-chip:disabled { opacity: 0.5; }
.st-border-t { border-top: 1px solid var(--st-line); }
.st-swatch-mini { width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--st-line-strong); display: inline-block; }
</style>
