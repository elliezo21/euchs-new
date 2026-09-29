<template>
  <div class="st-tcard" :class="large ? 'is-large' : ''" :data-template-card="tpl.key">
    <button type="button" class="st-tcard-main" :title="title" :data-template-open="tpl.key" @click="$emit('open', tpl.key)">
      <!-- 표지 = 템플릿 첫 화면 (studioTemplateThumbs — 적용·내보내기와 같은 엔진으로 한 번 그린 그림) -->
      <span class="st-tcard-thumb" data-template-cover>
        <img v-if="thumb" :src="thumb.cover" alt="" class="st-tcard-img" draggable="false" />
        <span v-else-if="failed" class="st-tcard-fail">
          <span class="st-tcard-retry" role="button" tabindex="0" title="다시 시도" data-template-retry @click.stop="load" @keydown.enter.stop.prevent="load">
            <RotateCw class="w-4 h-4" :stroke-width="2" />
          </span>
        </span>
        <span v-else class="st-tcard-img st-skeleton" />
        <span class="st-tcard-count" data-template-sections>섹션 {{ sections }}개</span>
      </span>
      <span class="st-tcard-title">{{ title }}</span>
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
import { computed, onMounted, ref, watch } from 'vue'
import { Heart, RotateCw } from 'lucide-vue-next'
import { templateCardTitle, templateSectionCount } from '@/lib/studioTemplates'
import { templateThumb, templateThumbNow } from '@/lib/studioTemplateThumbs'

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
const thumb = ref(templateThumbNow(props.tpl.key))
const failed = ref(false)

async function load() {
  const key = props.tpl.key
  failed.value = false
  try {
    const t = await templateThumb(key)
    if (props.tpl.key === key) thumb.value = t
  } catch (e) {
    console.error('[StudioTemplateCard] 표지를 그리지 못함:', key, e)
    if (props.tpl.key === key) failed.value = true
  }
}
watch(() => props.tpl.key, k => { thumb.value = templateThumbNow(k); if (!thumb.value) load() })
onMounted(() => { if (!thumb.value) load() })
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
.st-tcard-fail { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
.st-tcard-retry {
  display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 999px;
  background: #fff; color: #4b5563; box-shadow: 0 1px 3px rgba(0, 0, 0, .2); cursor: pointer;
}
.st-tcard-count {
  position: absolute; left: 6px; bottom: 6px; padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: 800;
  background: rgba(17, 20, 26, .72); color: #fff;
}
.st-tcard-title {
  display: block; margin-top: 7px; font-size: 12px; font-weight: 700; color: var(--st-ink); line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.st-tcard.is-large .st-tcard-title { margin-top: 10px; font-size: 14px; }
.st-tcard.is-large .st-tcard-count { left: 8px; bottom: 8px; font-size: 12px; padding: 3px 9px; }
.st-tcard-heart {
  position: absolute; top: 6px; right: 6px; display: inline-flex; width: 30px; height: 30px; align-items: center; justify-content: center;
  border-radius: 999px; border: 0; background: rgba(255, 255, 255, .92); color: #6b7280; box-shadow: 0 1px 3px rgba(0, 0, 0, .18); cursor: pointer;
}
.st-tcard-heart:hover:not(:disabled) { color: #e5484d; }
.st-tcard-heart.is-on { color: #e5484d; }
.st-tcard-heart:disabled { cursor: default; opacity: .75; }
.st-tcard-heart:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
</style>
