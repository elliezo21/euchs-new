<template>
  <!-- 해외송금(외화송금) 신청서 작성 예시 — T/T 창 안 오버레이. props: sections / emits: close -->
  <div class="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-black/60" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="px-4 sm:px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
        <h3 class="font-black text-gray-900 text-sm sm:text-base">{{ TT_FORM_EXAMPLE.title }}</h3>
        <div class="flex items-center gap-1.5">
          <button type="button" @click="printForm"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition flex items-center gap-1">
            <Printer class="w-3.5 h-3.5" />{{ TT_FORM_EXAMPLE.printButton }}
          </button>
          <button type="button" @click="$emit('close')"
            class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition">{{ TT_FORM_EXAMPLE.closeButton }}</button>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <!-- 이 영역만 출력된다 -->
        <div ref="printArea" class="tt-form-print space-y-3 text-[13px] text-gray-900">
          <h4 class="tt-form-title font-black text-base text-center">{{ TT_FORM_EXAMPLE.title }}</h4>
          <p class="tt-form-notice p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] font-bold text-amber-800">{{ TT_FORM_EXAMPLE.notice }}</p>
          <section v-for="s in sections" :key="s.title" class="tt-form-section">
            <div class="tt-form-section-title font-black text-sky-900 bg-sky-50 border border-sky-200 border-b-0 rounded-t-lg px-3 py-1.5">{{ s.title }}</div>
            <table class="w-full border-collapse">
              <tbody>
                <tr v-for="r in s.rows" :key="r.label">
                  <th class="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left font-bold text-gray-600 w-[34%] align-top">{{ r.label }}</th>
                  <td class="border border-gray-300 px-3 py-1.5 font-bold break-words" :class="r.missing ? 'text-red-600' : ''">
                    {{ r.value }}
                    <div v-if="r.hint" class="font-normal text-[11px] text-gray-500 mt-0.5">{{ r.hint }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Printer } from 'lucide-vue-next'
import { TT_FORM_EXAMPLE } from '@/data/ttRemittanceGuide'

defineProps({
  /** [{ title, rows: [{ label, value, hint?, missing? }] }] — 값은 부모(TtRemittanceModal)가 주문 데이터로 채운다 */
  sections: { type: Array, required: true },
})
defineEmits(['close'])

const printArea = ref(null)

// 인쇄용 최소 스타일 (Tailwind 클래스는 iframe 안에서 적용되지 않으므로 표 모양만 직접 준다)
const PRINT_CSS = `
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #111; margin: 16mm; font-size: 12px; }
  .tt-form-title { text-align: center; font-size: 17px; font-weight: 800; margin: 0 0 8px; }
  .tt-form-notice { border: 1px solid #f59e0b; background: #fffbeb; padding: 6px 8px; font-weight: 700; margin: 0 0 10px; }
  .tt-form-section { margin: 0 0 10px; page-break-inside: avoid; }
  .tt-form-section-title { font-weight: 800; background: #f0f9ff; border: 1px solid #7dd3fc; border-bottom: 0; padding: 4px 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { width: 34%; background: #f5f5f5; }
  td div { font-weight: 400; font-size: 11px; color: #555; margin-top: 2px; }
`

/**
 * 이 예시 영역만 출력 — 숨은 iframe에 영역 HTML을 넣고 그 iframe만 인쇄한다
 * (화면 전체 window.print()는 모달 뒤 화면까지 찍히므로 쓰지 않는다).
 */
function printForm() {
  const el = printArea.value
  if (!el) {
    console.error('[TtApplicationFormExample] 출력 영역을 찾지 못했습니다.')
    return
  }
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc || !iframe.contentWindow) {
    console.error('[TtApplicationFormExample] 출력용 iframe 문서를 만들지 못했습니다.')
    iframe.remove()
    return
  }
  doc.open()
  doc.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${TT_FORM_EXAMPLE.title}</title><style>${PRINT_CSS}</style></head><body>${el.innerHTML}</body></html>`)
  doc.close()
  const win = iframe.contentWindow
  // 인쇄 대화상자가 닫힌 뒤 iframe 정리
  win.onafterprint = () => setTimeout(() => iframe.remove(), 0)
  setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch (e) {
      console.error('[TtApplicationFormExample] 출력 실패:', e)
      iframe.remove()
    }
  }, 50)
}
</script>
