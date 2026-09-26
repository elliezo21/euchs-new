// 사진 필터·조정(look) 테스트 (6-2) — node scripts/test-studio-look.mjs
import {
  defaultLook, normalizeLook, isDefaultLook, readLook, withLook, lookValues, lookCss, needsSvgFilter, svgFilterParams, LOOK_FILTERS,
} from '../src/lib/studioLook.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

// 지우기 결과가 들어 있는 실제 모양의 edit (붓 레이어·AI 결과 조각 경로 포함)
const ERASED = {
  v: 2,
  layers: [
    { id: 'f_aaaaaa', type: 'fill', x: 10, y: 20, w: 100, h: 40, method: 'solid', pad: 4 },
    { id: 'f_bbbbbb', type: 'fill', x: 200, y: 50, w: 80, h: 80, method: 'ai', pad: 4, shape: 'brush', brush: { strokes: [{ size: 30, points: [[210, 60], [260, 110]] }] },
      ai: { key: '0123456789abcdef', model: 'lama_fp32@1faef530', engine: 'webgpu', patch: { path: 'uid/p/patches/img/f_bbbbbb_0123456789abcdef.png', x: 180, y: 30, w: 120, h: 120 } } },
  ],
  somethingNext: { keep: true },
}
const snap = JSON.stringify(ERASED)

// ── 1. 기본값·읽기 ──
eq('기본 look', defaultLook(), { filter: 'none', brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0 })
eq('예전 사진(look 없음) → 기본값', readLook(ERASED), defaultLook())
eq('모르는 필터·범위 밖 값 → 고쳐 읽음', normalizeLook({ filter: 'xyz', brightness: 250, contrast: -300, saturation: '12' }),
  { filter: 'none', brightness: 100, contrast: -100, saturation: 12, warmth: 0, sharpness: 0 })
eq('기본값인지', [isDefaultLook(null), isDefaultLook({ brightness: 1 }), isDefaultLook({ filter: 'mono' })], [true, false, false])

// ── 2. 저장: 지우기 데이터를 안 건드림 ──
{
  const e = withLook(ERASED, { filter: 'sunny', brightness: 10 })
  eq('필터 저장 → layers(AI 조각 경로 포함) 그대로', JSON.stringify(e.layers) === JSON.stringify(ERASED.layers), true)
  eq('…다른 칸(v·앞으로 생길 칸)도 그대로', [e.v, e.somethingNext], [2, { keep: true }])
  eq('…look 칸만 생김', e.look, { filter: 'sunny', brightness: 10, contrast: 0, saturation: 0, warmth: 0, sharpness: 0 })
  eq('입력 edit는 바뀌지 않음', JSON.stringify(ERASED) === snap, true)
  const reset = withLook(e, null)
  eq('초기화 → look 칸이 빠지고 지우기는 그대로', ['look' in reset, JSON.stringify(reset.layers) === JSON.stringify(ERASED.layers)], [false, true])
  eq('다시 읽으면 같은 값', readLook(e).filter, 'sunny')
}

// ── 3. 값 계산·화면 표시 ──
{
  eq('필터 + 조정을 더함 (햇살 온도 30 + 조정 10)', lookValues({ filter: 'sunny', warmth: 10 }).warmth, 40)
  eq('더한 값도 ±100 안', lookValues({ filter: 'vivid', saturation: 100 }).saturation, 100)
  eq('필터 8개, 이름 겹침 없음', [LOOK_FILTERS.length, new Set(LOOK_FILTERS.map(f => f.label)).size], [8, 8])
  eq('기본값 → CSS 없음', lookCss(defaultLook()), '')
  eq('밝기·대비 → CSS brightness·contrast', lookCss({ brightness: 20, contrast: -10 }), 'brightness(1.200) contrast(0.900)')
  eq('흑백 필터 → grayscale', lookCss({ filter: 'mono' }).includes('grayscale(1.000)'), true)
  eq('온도가 있으면 SVG 필터가 앞에', lookCss({ warmth: 20 }, 'lk-a').startsWith('url(#lk-a)'), true)
  eq('온도·선명도 없으면 SVG 필요 없음', needsSvgFilter({ brightness: 30 }), false)
  const sv = svgFilterParams({ warmth: 100, sharpness: 50 })
  eq('온도 +100 → 빨강 1.12 · 파랑 0.88', sv.matrix.split(/\s+/).filter(Boolean).map(Number).filter((_, i) => i === 0 || i === 12), [1.12, 0.88])
  eq('선명도 +50 → 가운데 2.2 커널', sv.kernel.split(' ').map(Number)[4], 2.2)
  eq('선명도 음수 → 커널 없음(흐리게는 CSS blur)', [svgFilterParams({ sharpness: -40 }).kernel, lookCss({ sharpness: -40 }).includes('blur(')], [null, true])
}

console.log(`\n${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
