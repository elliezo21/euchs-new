<template>
  <div class="st-tcard" :class="large ? 'is-large' : ''" :data-template-card="tpl.key">
    <button type="button" class="st-tcard-main" :title="title" :data-template-open="tpl.key" @click="$emit('open', tpl.key)">
      <!-- 표지 = 템플릿 첫 화면. 기본 템플릿 = 미리 만든 그림(studioTemplateCovers — npm run studio:covers)만,
           그 밖(내 템플릿 등) = studioTemplateThumbs.templateCover로 화면 가까이 올 때 그림 -->
      <span ref="coverEl" class="st-tcard-thumb" data-template-cover>
        <template v-if="builtIn && !failed">
          <span v-if="!ready" class="st-tcard-img st-tcard-layer st-skeleton" />
          <img
            :key="retry" :src="builtInSrc" :width="COVER_W" :height="COVER_H" alt="" class="st-tcard-img st-tcard-layer" :class="ready ? '' : 'is-loading'"
            draggable="false" loading="lazy" decoding="async" data-template-cover-img @load="ready = true" @error="onImgError"
          />
        </template>
        <img v-else-if="thumb" :src="thumb.cover" alt="" class="st-tcard-img" draggable="false" loading="lazy" decoding="async" />
        <span v-else-if="failed" class="st-tcard-fail">
          <span class="st-tcard-retry" role="button" tabindex="0" title="다시 시도" data-template-retry @click.stop="load" @keydown.enter.stop.prevent="load">
            <RotateCw class="w-4 h-4" :stroke-width="2" />
          </span>
        </span>
        <span v-else class="st-tcard-img st-skeleton" />
      </span>
      <!-- 섹션 수는 그림 밖 (그림 위에 두면 첫 화면 아래쪽 배지·부제를 가린다) -->
      <span class="st-tcard-caption">
        <span v-if="isNew" class="st-tcard-new" data-template-new>NEW</span>
        <span class="st-tcard-title">{{ title }}</span>
        <span class="st-tcard-count" data-template-sections>섹션 {{ sections }}개</span>
      </span>
    </button>
    <button
      type="button" class="st-tcard-heart" :class="favorite ? 'is-on' : ''" :disabled="favReady !== true || favBusy"
      :aria-pressed="favorite" :aria-label="favorite ? '내 보관함에서 빼기' : '내 보관함에 담기'" :title="favorite ? '내 보관함에서 빼기' : '내 보관함에 담기'"
      :data-template-fav="tpl.key" @click="$emit('fav', tpl.key)"
    >
      <Heart class="w-4 h-4" :stroke-width="2.2" :fill="favorite ? 'currentColor' : 'none'" />
    </button>
  </div>
</template>

<script setup>
// 템플릿 카드 (템플릿 갤러리·편집기 [템플릿] 패널) — 표지 + "카테고리 | 이름" + 섹션 수 + 하트.
// 누르면 open(key)만 보낸다 (미리보기 칸은 부모가 연다). 하트는 fav(key) — 저장은 studioTemplateFavorites.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Heart, RotateCw } from 'lucide-vue-next'
import { templateByKey, templateCardTitle, templateSectionCount } from '@/lib/studioTemplates'
import { templateCover, templateCoverNow } from '@/lib/studioTemplateThumbs'
import { COVER_W, COVER_H, builtInCoverUrl } from '@/lib/studioTemplateCovers'
import { isNewTemplate } from '@/lib/studioTemplateSort'

const props = defineProps({
  tpl: { type: Object, required: true },
  favorite: { type: Boolean, default: false },
  favReady: { type: Boolean, default: null }, // true = 하트를 누를 수 있음
  favBusy: { type: Boolean, default: false },
  large: { type: Boolean, default: false },   // 갤러리 큰 카드
})
defineEmits(['open', 'fav'])

const title = computed(() => templateCardTitle(props.tpl))
const sections = computed(() => templateSectionCount(props.tpl))
const isNew = computed(() => isNewTemplate(props.tpl))

// 기본 템플릿 — 미리 만든 그림 (목록에 없으면 실패 표시 + 원인 로그. 대신 그리지 않는다 — 테스트가 빠진 표지를 막는다)
const builtIn = computed(() => !!templateByKey(props.tpl.key))
const ready = ref(false) // 그림을 다 받음 (그 전에는 회색 자리표시)
const retry = ref(0)
const builtInSrc = computed(() => {
  const url = builtInCoverUrl(props.tpl.key)
  return url && retry.value ? `${url}?r=${retry.value}` : url
})
function checkBuiltIn() {
  if (builtIn.value && !builtInCoverUrl(props.tpl.key)) {
    console.error('[StudioTemplateCard] 기본 템플릿 표지가 없음 — npm run studio:covers 필요:', props.tpl.key)
    failed.value = true
  }
}
function onImgError() {
  console.error('[StudioTemplateCard] 표지 그림을 받지 못함:', props.tpl.key, builtInSrc.value)
  failed.value = true
}

const thumb = ref(builtIn.value ? null : templateCoverNow(props.tpl.key))
const failed = ref(false)
const coverEl = ref(null)
const seen = ref(false) // 표지 자리가 화면 가까이 온 적이 있음 — 그 뒤에만 그린다

async function load() {
  const key = props.tpl.key
  failed.value = false
  if (builtIn.value) { ready.value = false; retry.value++; checkBuiltIn(); return }
  try {
    const t = await templateCover(key)
    if (props.tpl.key === key) thumb.value = t
  } catch (e) {
    console.error('[StudioTemplateCard] 표지를 그리지 못함:', key, e)
    if (props.tpl.key === key) failed.value = true
  }
}
watch(() => props.tpl.key, k => {
  failed.value = false
  ready.value = false
  if (builtIn.value) { thumb.value = null; checkBuiltIn(); return }
  thumb.value = templateCoverNow(k)
  if (!thumb.value && seen.value) load()
})

let io = null
onMounted(() => {
  if (builtIn.value) { checkBuiltIn(); return } // 브라우저가 loading="lazy"로 화면 가까이 올 때 받는다
  if (thumb.value) { seen.value = true; return }
  if (typeof IntersectionObserver !== 'function') { seen.value = true; load(); return }
  io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return
    io.disconnect()
    io = null
    seen.value = true
    if (!thumb.value) load()
  }, { rootMargin: '300px 0px' })
  if (coverEl.value) io.observe(coverEl.value)
})
onUnmounted(() => { io?.disconnect(); io = null })
</script>

<style scoped>
.st-tcard { position: relative; min-width: 0; }
.st-tcard-main {
  display: flex; flex-direction: column; width: 100%; padding: 0; border: 0; background: none; cursor: pointer; text-align: left; color: inherit;
}
.st-tcard-thumb {
  position: relative; display: block; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 10px;
  background: #f4f5f7; box-shadow: 0 0 0 1px var(--st-line-strong); transition: box-shadow .15s;
}
.st-tcard-main:hover .st-tcard-thumb { box-shadow: 0 0 0 2px var(--st-accent); }
.st-tcard-main:focus-visible { outline: none; }
.st-tcard-main:focus-visible .st-tcard-thumb { box-shadow: 0 0 0 2px var(--st-accent), 0 0 0 4px var(--st-accent-ring, transparent); }
.st-tcard-img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.st-tcard-layer { position: absolute; inset: 0; }
.st-tcard-img.is-loading { opacity: 0; }
.st-tcard-new {
  flex: none; align-self: center; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-weight: 800; line-height: 1.4; letter-spacing: .02em;
  background: var(--st-accent); color: #fff;
}
.st-tcard-fail { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
.st-tcard-retry {
  display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 999px;
  background: #fff; color: #4b5563; box-shadow: 0 1px 3px rgba(0, 0, 0, .2); cursor: pointer;
}
.st-tcard-caption { display: flex; align-items: baseline; gap: 6px; margin-top: 7px; min-width: 0; }
.st-tcard-title {
  display: block; min-width: 0; flex: 1 1 auto; font-size: 12px; font-weight: 700; color: var(--st-ink); line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.st-tcard-count { flex: none; font-size: 11px; font-weight: 700; color: var(--st-muted); white-space: nowrap; }
.st-tcard.is-large .st-tcard-caption { margin-top: 10px; }
.st-tcard.is-large .st-tcard-title { font-size: 14px; }
.st-tcard.is-large .st-tcard-count { font-size: 12px; }
/* 하트 = 반투명 흰 원, 카드 모서리 안쪽 (템플릿 첫 화면은 이 자리에 배지·글자를 두지 않는다 — studioTemplateHeroes.HEART_ZONE) */
.st-tcard-heart {
  position: absolute; top: 10px; right: 10px; display: inline-flex; width: 30px; height: 30px; align-items: center; justify-content: center;
  border-radius: 999px; border: 0; background: rgba(255, 255, 255, .72); color: #4b5563; box-shadow: 0 1px 4px rgba(0, 0, 0, .16); cursor: pointer;
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
}
.st-tcard-heart:hover:not(:disabled) { color: #e5484d; }
.st-tcard-heart.is-on { color: #e5484d; }
.st-tcard-heart:disabled { cursor: default; opacity: .75; }
.st-tcard-heart:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
</style>
