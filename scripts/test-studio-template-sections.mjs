// 아래 섹션 모양 테스트 — node scripts/test-studio-template-sections.mjs
// 종류마다 모양 수 · 모든 모양을 여러 색으로 그려도 자리 밖·글자 넘침·겹침 없음 · 60개 템플릿 모든 구간 같은 검사
// · 바로 옆·바로 위 카드끼리 같은 종류면 다른 모양 · 아래 섹션 모양 조합이 서로 모두 다름 · 표 칸 내용 그대로 · 색은 첫 화면을 따름 · 제목 글자 대비
import crypto from 'node:crypto'
import {
  STUDIO_TEMPLATES, GALLERY_COLUMNS, SECTION_STYLE_PLAN, buildTemplatePage, templateFontList, templateSlots,
} from '../src/lib/studioTemplates.js'
import { SECTION_VARIANTS, SECTION_KINDS, section, lowerTheme, wrapText, SHIP, RETURN, lum, mix } from '../src/lib/studioTemplateSections.js'
import { HERO_SPECS } from '../src/lib/studioTemplateHeroes.js'
import { textLinesOf, itemBounds, isValidImageItem, readPage, PAGE_WIDTH } from '../src/lib/studioPage.js'
import { isValidTextItem } from '../src/lib/studioText.js'
import { isValidAssetItem } from '../src/lib/studioAsset.js'
import { isFontKey, fontByKey } from '../src/lib/studioFonts.js'
import { isSampleItem } from '../src/lib/studioSamples.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
// 넉넉한 글자 폭 (test-studio-template-heroes.mjs와 같은 값)
const FACTOR = {
  pretendard: [0.95, 0.62], 'noto-sans-kr': [0.95, 0.62], 'gowun-batang': [0.96, 0.62], 'noto-serif-kr': [0.96, 0.62], 'nanum-myeongjo': [0.96, 0.62],
  'gasoek-one': [1.1, 0.78], 'east-sea-dokdo': [0.82, 0.52], cinzel: [1.0, 0.84], 'black-han-sans': [1.0, 0.66], 'do-hyeon': [1.0, 0.62],
}
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힣一-鿿　-〿＀-￯]/
function measure(s, style) {
  const [k, l] = FACTOR[style.fontFamily] ?? [1, 0.68]
  let w = 0
  for (const ch of s) w += (ch === ' ' ? 0.3 : WIDE.test(ch) ? k : l) * style.fontSize
  return w
}
function inkBox(it) {
  const lines = textLinesOf(it, measure)
  const ls = (it.letterSpacing ?? 0) * it.fontSize
  const w = Math.max(...lines.map(l => measure(l, it) + ls * [...l].length), 1)
  const x = it.align === 'left' ? it.x : it.align === 'right' ? it.x + it.w - w : it.x + (it.w - w) / 2
  return itemBounds({ ...it, x, w })
}
const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5
const isPhoto = it => isValidImageItem(it) || isSampleItem(it)

/** 구간 문제 — 자리 밖 · 글자 넘침 · 글자·사진·그림 겹침 (같은 묶음 · 도형 위 배지 글자와 사진 · 구간을 채운 바탕 사진은 봐줌) */
function problems(s, width, tag) {
  const out = []
  const withShape = new Set(s.items.filter(it => it.type === 'shape' && it.groupId).map(it => it.groupId))
  const solid = []
  for (const it of s.items) {
    const b = itemBounds(it)
    if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > width + 0.5 || b.y + b.h > s.height + 0.5) out.push(`${tag}: 자리 밖 ${it.type} ${it.text ?? it.asset ?? it.shape ?? ''}`)
    if (isValidTextItem(it)) {
      if (!/\S/.test(it.text)) out.push(`${tag}: 빈 글자`)
      if (textLinesOf(it, measure).length !== it.text.split('\n').length) out.push(`${tag}: 글자 넘침 "${it.text}"`)
      solid.push({ kind: 'text', g: it.groupId, b: inkBox(it), it, badge: withShape.has(it.groupId) })
    } else if (isPhoto(it)) {
      if (it.w * it.h < width * s.height * 0.95) solid.push({ kind: 'photo', g: it.groupId, b, it })
    } else if (isValidAssetItem(it)) solid.push({ kind: 'asset', g: it.groupId, b, it })
  }
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const p = solid[i], q = solid[j]
    if (p.g && p.g === q.g) continue
    if ((p.badge && q.kind === 'photo') || (q.badge && p.kind === 'photo')) continue
    if (hit(p.b, q.b)) out.push(`${tag}: ${p.kind}·${q.kind} 겹침 ${p.it.text ?? p.it.asset ?? p.it.slot ?? ''} / ${q.it.text ?? q.it.asset ?? q.it.slot ?? ''}`)
  }
  return out
}
/** 대비 (WCAG) */
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

// ── 1. 종류마다 모양 수 ──
const COUNTS = Object.fromEntries(SECTION_KINDS.map(k => [k, SECTION_VARIANTS[k].make.length]))
eq('모양 수: 포인트 6 · 관리법 5 · 표 5 · 안내 5 · 추천 5 · 후기 4 · 상세컷(1장 5·2장 4·3장 3) · 포인트 사진 4 · 정보 줄 4 · 혜택 4 + 촬영 세트용 6종', COUNTS,
  { points: 6, steps: 5, table: 5, notice: 5, recommend: 5, review: 4, detail1: 5, detail2: 4, detail3: 3, pointPhoto: 4, rows: 4, perks: 4, statement: 3, story: 3, zoom: 3, sizeSlot: 3, care: 3, contents: 3 })
eq('모양마다 이름표', SECTION_KINDS.every(k => SECTION_VARIANTS[k].names.length === COUNTS[k]), true)

// ── 2. 모든 모양 × 색 3가지 (밝은 첫 화면 · 짙은 첫 화면 · 노랑 강조) ──
{
  const themes = [
    lowerTheme(HERO_SPECS['apparel-basic'], { body: 'noto-sans-kr' }),
    lowerTheme(HERO_SPECS['bags-mono'], { body: 'pretendard' }),
    lowerTheme(HERO_SPECS['size'], { body: 'noto-sans-kr', font: 'gasoek-one' }),
  ]
  const P3 = [{ title: '편안한 핏', desc: '몸에 닿는 느낌을\n적어 주세요' }, { title: '부드러운 소재', desc: '소재와 두께를\n적어 주세요' }, { title: '쉬운 관리', desc: '세탁 방법을\n적어 주세요' }]
  const DATA = {
    points: { title: '입을수록 좋은 이유', items: P3 },
    steps: { title: '오래 입는 관리법', items: P3 },
    table: { title: '사이즈 안내', cells: [['사이즈', '가슴', '어깨', '총장', '소매'], ['S', '-', '-', '-', '-'], ['M', '-', '-', '-', '-']], note: '단위: cm · 재는 방법에 따라 1~3cm 차이가 날 수 있어요.', w: 640 },
    notice: { title: '구매 전에 확인해 주세요', notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 처음 세탁할 때는 단독 세탁을 권해 드려요.\n· 궁금한 점은 문의를 남겨 주세요.', boxes: [SHIP, RETURN] },
    recommend: { title: '이런 분께 추천해요', lines: ['매일 편하게 입을 옷을 찾는 분', '체형을 자연스럽게 살리고 싶은 분', '계절이 바뀔 때 입기 좋은 옷'] },
    review: { quote: '"편한데 예쁜 옷,\n그 한 벌을 찾았어요."', by: '— 먼저 입어 본 고객의 한마디' },
    detail1: { title: '가까이에서 본 모습', lead: '봉제선, 단추, 안감처럼 눈여겨볼 곳을 알려 주세요.', caption: '사진 아래에 색상 이름이나 착용 사이즈를 적어 주세요.', slot: 0 },
    detail2: { slots: [0, 1], caption: '사진 아래에 색상 이름을 적어 주세요.' },
    detail3: { slots: [0, 1, 2], caption: '사진 아래에 색상 이름을 적어 주세요.' },
    pointPhoto: { i: 1, title: '부드러운 소재', desc: '소재와 두께를\n적어 주세요', slot: 0 },
    rows: { title: '배송 한눈에 보기', rows: [['출고', '[오후 0시] 전 주문은 오늘 출발'], ['택배사', '[택배사 이름]'], ['배송비', '[0,000]원 · [00,000]원 이상 무료']] },
    perks: { title: '기획전 혜택', perks: [{ big: '[00]%', desc: '기획전 상품\n추가 할인' }, { big: '무료', desc: '[00,000]원 이상\n무료 배송' }, { big: '증정', desc: '먼저 주문한\n[00]분께 선물' }] },
    // 촬영 세트용 (studioTemplateShoots) — 긴 문구 기준
    statement: { label: 'DESIGN NOTE', text: '매일 신고 싶은 구두는 발이 먼저 알아봐요', sub: '굽 높이와 앞코 모양처럼 디자인 포인트를 적어 주세요.' },
    story: { slot: 0, label: 'ON THE STREET', title: '출근길부터 저녁 약속까지', desc: '신고 걸었을 때의 느낌을 한두 줄로 적어 주세요.' },
    zoom: { slot: 0, title: '가까이에서 본 가죽', notes: [{ t: '자연스러운 주름', d: '바느질과 마감을 적어 주세요.' }, { t: '매끈한 표면', d: '가죽 표면의 느낌을 적어 주세요.' }, { t: '편한 안쪽', d: '안감 소재를 적어 주세요.' }] },
    sizeSlot: { title: '사이즈 안내', chips: ['단위 mm', '발 길이 기준', '반 치수 차이'], note: '발볼이 넓다면 반 치수 크게 골라 주세요.' },
    care: { title: '세탁·관리 안내', items: [{ k: '마른천', t: '먼지는 마른 천으로\n닦아 주세요' }, { k: '그늘', t: '뒤집어서 그늘에\n말려 주세요' }, { k: '크림', t: '통풍이 잘 되는 곳에\n두세요' }, { k: '30°', t: '미지근한 물에\n세탁해 주세요' }] },
    contents: { title: '구성', items: [['보관 주머니', '1개'], ['[구성품 이름]', '[수량]'], ['목걸이', '1개']] },
  }
  const four = { title: '배송 순서', items: ['주문을 확인해요', '꼼꼼히 포장해요', '택배사에 맡겨요', '문 앞까지 도착해요'].map(title => ({ title })) }
  for (const kind of SECTION_KINDS) {
    for (let v = 0; v < COUNTS[kind]; v++) {
      const bad = []
      themes.forEach((th, ti) => {
        const datas = kind === 'steps' ? [DATA.steps, four] : kind === 'notice' ? [DATA.notice, { ...DATA.notice, boxes: null }] : [DATA[kind]]
        for (const d of datas) {
          const sec = section(kind, v, d, th, { bg: '#ffffff' })
          const tpl = { key: 't', sections: [sec] }
          const page = buildTemplatePage(tpl, templateSlots(tpl).map(n => ({ id: `p${n}`, width: 900, height: 900 })), measure).page
          bad.push(...page.sections.flatMap(s => problems(s, page.width, `색 ${ti}`)))
          const fonts = templateFontList(tpl)
          if (!fonts.every(f => isFontKey(f.style.fontFamily) && fontByKey(f.style.fontFamily).weights.includes(f.style.fontWeight))) bad.push(`색 ${ti}: 글꼴·굵기`)
          const back = readPage(JSON.parse(JSON.stringify(page)), 't')
          if (back.problems.length || JSON.stringify(back.page) !== JSON.stringify(page)) bad.push(`색 ${ti}: readPage`)
        }
      })
      eq(`${kind} ${v} "${SECTION_VARIANTS[kind].names[v]}": 자리 밖·넘침·겹침 없음 (색 3 · 개수 여러 가지)`, bad, [])
    }
  }
  eq('줄 나누기: 폭을 넘는 글은 띄어쓰기에서 나눔', wrapText('매일 편하게 입을 옷을 찾는 분', 20, 120), '매일 편하게\n입을 옷을\n찾는 분')
}

// ── 3. 60개 템플릿 — 모든 구간 ──
for (const tpl of STUDIO_TEMPLATES) {
  const page = buildTemplatePage(tpl, templateSlots(tpl).map(n => ({ id: `p${n}`, width: 900, height: 900 })), measure).page
  eq(`${tpl.key}: 모든 구간 자리 밖·넘침·겹침 없음`, page.sections.flatMap((s, i) => problems(s, page.width, `구간 ${i}`)), [])
  const lowHeads = page.sections.slice(1).filter(s => !s.bgImage).flatMap(s => s.items.filter(it => isValidTextItem(it) && it.fontSize >= 26 && !it.groupId && /^#[0-9a-f]{6}$/i.test(s.bg))
    .filter(it => !s.items.some(o => o !== it && (o.type === 'shape' || isPhoto(o)) && hit(itemBounds(o), inkBox(it))))
    .filter(it => contrast(it.color, s.bg) < 3).map(it => it.text))
  eq(`${tpl.key}: 아래 구간 제목 글자 대비 3 이상`, lowHeads, [])
}

// ── 4. 모양이 서로 다르게 ──
{
  const list = STUDIO_TEMPLATES
  const styleMap = t => new Map(t.sectionStyles.map(s => s.split(':')))
  const same = (a, b) => { const m = styleMap(a); return b.sectionStyles.map(s => s.split(':')).filter(([k, v]) => m.has(k) && m.get(k) === v).map(([k]) => k) }
  eq(`바로 옆 카드(${GALLERY_COLUMNS}열)와 같은 종류인데 같은 모양 0곳`, list.flatMap((t, i) => (i % GALLERY_COLUMNS && same(t, list[i - 1]).length ? [`${list[i - 1].key}/${t.key}:${same(t, list[i - 1])}`] : [])), [])
  eq(`바로 위 카드와 같은 종류인데 같은 모양 0곳`, list.flatMap((t, i) => (i >= GALLERY_COLUMNS && same(t, list[i - GALLERY_COLUMNS]).length ? [`${list[i - GALLERY_COLUMNS].key}/${t.key}`] : [])), [])
  const sigs = list.map(t => t.sectionStyles.join('|'))
  eq('아래 섹션 모양 조합이 완전히 같은 템플릿 0쌍', sigs.filter((s, i) => sigs.indexOf(s) !== i), [])
  eq('섹션 모양을 쓰는 템플릿 69개 (point는 POINT 구간을 예전 모양으로 둠)', list.filter(t => t.sectionStyles.length).length, 69)
  const usedAll = new Set(list.flatMap(t => t.sectionStyles))
  eq('모든 모양이 어느 템플릿엔가 쓰임', SECTION_KINDS.flatMap(k => [...Array(COUNTS[k]).keys()].map(v => `${k}:${v}`)).filter(s => !usedAll.has(s)), [])
  eq('새 섹션 종류가 템플릿에 들어감 — 후기 인용·전·후 비교·구성품 한눈에·이런 분께 추천', ['review', 'detail2:2', 'detail3:2', 'recommend'].map(k => list.some(t => t.sectionStyles.some(s => s === k || s.startsWith(`${k}:`)))), [true, true, true, true])
  eq('모양 번호표가 70개 모두',STUDIO_TEMPLATES.every(t => SECTION_STYLE_PLAN.has(t.key)), true)
}

// ── 5. 내용은 그대로 · 색은 첫 화면을 따름 ──
{
  // 바꾸기 전(HEAD) 표 칸 내용 sha1 앞 12자
  const CELLS = { size: '3677bbe8a5f5', 'apparel-look': '3677bbe8a5f5', 'apparel-basic': '3677bbe8a5f5', 'bags-daily': '23358375f8a4', 'bags-check': '23358375f8a4', 'kitchen-bold': 'fbbea836c3b7', 'kitchen-check': 'fbbea836c3b7', 'living-basic': '9007ff502603', 'living-bold': '9007ff502603', 'beauty-mood': 'ef297a6387f1', 'beauty-check': 'ef297a6387f1', 'electronics-bold': '28ef406f8c8c', 'electronics-spec': '28ef406f8c8c', 'toys-play': '284fcdbb1ecb', 'toys-basic': '284fcdbb1ecb', 'pets-bold': 'efa6bf12d8bd', 'pets-mood': 'efa6bf12d8bd', 'fullset-sample': '5948051d8c7d' }
  const hashOf = t => { const cells = t.sections.flatMap(s => s.items || []).filter(p => p.type === 'table').map(p => p.cells); return cells.length ? crypto.createHash('sha1').update(JSON.stringify(cells)).digest('hex').slice(0, 12) : null }
  eq('표 칸 내용 = 바꾸기 전과 같음 (표가 있던 18개)', Object.keys(CELLS).filter(k => hashOf(STUDIO_TEMPLATES.find(t => t.key === k)) !== CELLS[k]), [])
  eq('표가 없던 템플릿에 표가 생기지 않음', STUDIO_TEMPLATES.filter(t => !CELLS[t.key] && hashOf(t)).map(t => t.key), [])
  // 강조색(첫 화면의 강조·배지 색) 또는 본문색(짙은 첫 화면이면 그 바탕색) + 첫 화면 제목 글꼴
  const follows = STUDIO_TEMPLATES.filter(t => HERO_SPECS[t.key] && t.sectionStyles.length).filter(t => {
    const th = lowerTheme(HERO_SPECS[t.key])
    const low = JSON.stringify(t.sections.slice(1)).toLowerCase()
    return !(low.includes(th.accent.toLowerCase()) || low.includes(th.ink.toLowerCase())) || !low.includes(`"${th.font}"`)
  }).map(t => t.key)
  eq('아래 섹션 = 첫 화면 색(강조색 또는 본문색)·제목 글꼴 사용 (첫 화면이 있는 37개)', follows, [])
  eq('색 섞기·밝기 (mix·lum)', [mix('#000000', '#ffffff', 0.5), lum('#ffffff') > 0.99, lum('#000000')], ['#808080', true, 0])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
