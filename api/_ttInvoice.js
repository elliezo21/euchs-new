/**
 * T/T 해외송금 인보이스(PROFORMA INVOICE) 발행 계산 헬퍼 — /api/tt-invoice 전용
 *
 * 파일명이 '_'로 시작하므로 Vercel 라우트로 노출되지 않는다.
 *
 * 1) 환율: 마이뱅크 은행별 환율 페이지(https://exchange.mibank.me/bank)의 KEB하나은행 "미국 USD" 기준환율(매매기준율)
 * 2) 금액: usdTotal = ceil(krwTotal / rate, 센트) — 정수 센트로 계산
 * 3) 품목 줄: 상품명 키워드 표로 영문 품명 분류 → 같은 품명끼리 묶고 최대 4줄 → usdTotal을 상품대금(CNY) 비율로 배분
 *
 * ★ 폴백 금지: 환율을 못 구하거나 품목 수량·단가가 확인되지 않으면 값을 채우지 않고 실패로 돌려준다.
 */

export const MIBANK_BANK_URL = 'https://exchange.mibank.me/bank'
const RATE_TIMEOUT_MS = 8000
const RATE_MIN = 900
const RATE_MAX = 2500
export const MAX_LINES = 4
export const SUNDRY = 'Sundry goods'

/**
 * 영문 품명 키워드 표 — 위에서부터 첫 매칭 우선 (해성 확정 표).
 * ※ "包"·"衣" 단독 키워드는 包邮·洗衣 등 오매칭 때문에 넣지 않는다.
 */
export const TT_ITEM_CATEGORIES = [
  { description: 'Hair accessories', keywords: ['发夹', '发卡', '头饰', '发饰', '发圈', '发绳', '发箍', '抓夹', '边夹', 'BB夹', '鸭嘴夹', '머리핀', '헤어핀', '헤어끈', '헤어밴드', '집게핀'] },
  { description: 'Fashion jewelry', keywords: ['项链', '耳环', '耳钉', '耳夹', '戒指', '手链', '手镯', '首饰', '胸针', '목걸이', '귀걸이', '반지', '팔찌'] },
  { description: 'Phone accessories', keywords: ['手机壳', '数据线', '充电器', '手机支架', '폰케이스', '충전기'] },
  { description: 'Bags', keywords: ['背包', '双肩包', '手提包', '斜挎包', '钱包', '收纳包', '帆布包', '가방', '파우치', '지갑'] },
  { description: 'Footwear', keywords: ['鞋', '拖鞋', '靴', '신발', '슬리퍼'] },
  { description: 'Apparel', keywords: ['T恤', '卫衣', '衬衫', '毛衣', '外套', '上衣', '连衣裙', '半身裙', '裤', '袜', '티셔츠', '바지', '원피스', '양말'] },
  { description: 'Drinkware', keywords: ['杯', '牙缸', '水壶', '保温', '컵', '텀블러'] },
  { description: 'Kitchenware', keywords: ['锅', '碗', '盘', '筷', '勺', '厨房', '냄비', '그릇', '접시'] },
  { description: 'Hand tools', keywords: ['切管刀', '剪刀', '钳', '扳手', '螺丝刀', '工具', '공구', '가위'] },
  { description: 'Stationery', keywords: ['文具', '笔', '本子', '贴纸', '胶带', '문구', '볼펜', '스티커'] },
  { description: 'Toys', keywords: ['玩具', '公仔', '积木', '毛绒', '장난감', '인형'] },
  { description: 'Cosmetic tools', keywords: ['化妆刷', '粉扑', '美妆蛋', '화장솔', '퍼프'] },
]

/** 품목 제목 1개 — titleZh 우선, 없으면 titleKo, 없으면 productName (값이 있는 첫 필드) */
function itemTitle(item) {
  for (const key of ['titleZh', 'titleKo', 'productName']) {
    const v = String(item?.[key] ?? '').trim()
    if (v) return v
  }
  return ''
}

/** 제목 → 영문 품명 (키워드 표 첫 매칭, 없으면 Sundry goods) */
export function classifyItem(item) {
  const title = itemTitle(item)
  for (const cat of TT_ITEM_CATEGORIES) {
    if (cat.keywords.some(k => title.includes(k))) return cat.description
  }
  return SUNDRY
}

/**
 * 품목 수량 — src/utils/orderCostCalculator.js resolveItemQty와 같은 규칙.
 * (그 파일은 '@/lib/...' 별칭 import가 있어 서버 함수에서 직접 import할 수 없어 규칙만 옮긴다 — 바꿀 때 함께 바꿀 것)
 *   skus 배열 합계(quantity || qty) > 0 이면 그 합계, 아니면 quantity → qty → orderQty 중 "값이 있는 첫 필드".
 *   유효하지 않으면 0 (1로 채우지 않는다).
 */
export function resolveItemQty(item) {
  if (Array.isArray(item?.skus) && item.skus.length > 0) {
    const skuSum = item.skus.reduce((s, sk) => s + (Number(sk.quantity || sk.qty) || 0), 0)
    if (skuSum > 0) return skuSum
  }
  const has = v => v !== undefined && v !== null && v !== ''
  const raw = has(item?.quantity) ? item.quantity : has(item?.qty) ? item.qty : has(item?.orderQty) ? item.orderQty : undefined
  const q = Number(raw)
  return Number.isFinite(q) && q > 0 ? q : 0
}

/** 품목 단가(CNY) — calcOrderCost와 같은 규칙: priceCny || price || unitPriceCny */
function itemUnitCny(item) {
  return Number(item?.priceCny || item?.price || item?.unitPriceCny) || 0
}

/**
 * 마이뱅크 은행별 환율 HTML에서 KEB하나은행 USD 기준환율·기준시각을 뽑는다.
 *
 * 실측 구조(2026-09-24 확인):
 *   <strong class="bank_name">KEB하나은행</strong><span class="date">2026.09.23 21:19 기준</span>
 *   <table class="main_table content"> … <tbody>
 *     <tr> <td><img src=".../nation_flag/flag_usd_250102_1.png"></td> <td class="t__left"><span>미국</span></td>
 *          <!--살때--> … <!--팔때--> … <!--송금--> …
 *          <!--기준환율-->
 *          <td class="t__right"><span class="counter">1,367.00</span></td>
 *     </tr>
 *
 * @returns {{ ok: true, rate: number, rateAsOf: string } | { ok: false, error: string }}
 */
export function parseMibankHanaUsd(html) {
  const s = String(html || '')
  const head = s.match(/<strong class="bank_name">([^<]*)<\/strong>\s*<span class="date">\s*(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2})\s*기준\s*<\/span>/)
  if (!head) return { ok: false, error: '은행명·기준시각 블록을 찾지 못함' }
  if (!head[1].includes('하나은행')) return { ok: false, error: `하나은행 페이지가 아님 (bank_name="${head[1]}")` }

  const tableStart = s.indexOf('<table class="main_table content">')
  const tbodyStart = tableStart >= 0 ? s.indexOf('<tbody>', tableStart) : -1
  const tbodyEnd = tbodyStart >= 0 ? s.indexOf('</tbody>', tbodyStart) : -1
  if (tbodyStart < 0 || tbodyEnd < 0) return { ok: false, error: '환율 표(main_table tbody)를 찾지 못함' }

  const rows = s.slice(tbodyStart, tbodyEnd).split('<tr>').slice(1)
  const usdRows = rows.filter(r => r.includes('flag_usd') && r.includes('<span>미국</span>'))
  if (usdRows.length !== 1) return { ok: false, error: `미국 USD 행이 ${usdRows.length}개` }

  const cell = usdRows[0].match(/<!--기준환율-->\s*<td[^>]*>\s*<span[^>]*>\s*([\d,]+(?:\.\d+)?)\s*<\/span>/)
  if (!cell) return { ok: false, error: 'USD 기준환율 칸을 찾지 못함' }
  const rate = Number(cell[1].replace(/,/g, ''))
  if (!Number.isFinite(rate) || rate < RATE_MIN || rate > RATE_MAX) {
    return { ok: false, error: `USD 기준환율 값 이상 ("${cell[1]}")` }
  }
  return { ok: true, rate, rateAsOf: head[2] }
}

/** 마이뱅크 페이지를 받아 하나은행 USD 기준환율을 돌려준다 (타임아웃 8초) */
export async function fetchHanaUsdBaseRate() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RATE_TIMEOUT_MS)
  try {
    const r = await fetch(MIBANK_BANK_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EUCHS-TT-Invoice/1.0)', 'Accept': 'text/html' },
      signal: controller.signal,
    })
    if (!r.ok) return { ok: false, error: `마이뱅크 HTTP ${r.status}` }
    return parseMibankHanaUsd(await r.text())
  } catch (e) {
    return { ok: false, error: e?.name === 'AbortError' ? '마이뱅크 응답 시간 초과(8초)' : `마이뱅크 요청 실패: ${e?.message || e}` }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * KRW → USD (센트 단위 올림). 부동소수 오차를 피하려고 환율을 정수(×100)로 바꿔 정수 나눗셈으로 올림한다.
 *   usdCents = ceil(krw × 100 / rate) = ceil(krw × 10000 / (rate × 100))
 * @returns {number|null} 센트 정수, 계산 불가면 null
 */
export function krwToUsdCents(krwTotal, rate) {
  const rateCenti = Math.round(Number(rate) * 100)
  if (!Number.isInteger(krwTotal) || krwTotal <= 0 || !Number.isInteger(rateCenti) || rateCenti <= 0) return null
  const numerator = BigInt(krwTotal) * 10000n
  const denom = BigInt(rateCenti)
  return Number((numerator + denom - 1n) / denom)
}

/**
 * 인보이스 품목 줄 만들기.
 * @param {Array} items - orders.items
 * @param {number} usdCents - 총액(센트)
 * @returns {{ ok: true, lines: Array } | { ok: false, error: string }}
 */
export function buildInvoiceLines(items, usdCents) {
  const active = (Array.isArray(items) ? items : []).filter(i => !i?.excluded)
  if (active.length === 0) return { ok: false, error: '유효 품목 없음' }

  // 1. 품명별 묶음 (수량 합, 상품대금 CNY는 정수 fen으로 합산)
  const groups = new Map()
  for (const item of active) {
    const qty = resolveItemQty(item)
    const unit = itemUnitCny(item)
    if (qty <= 0 || unit <= 0) {
      return { ok: false, error: `품목 수량·단가 확인 필요 (${itemTitle(item).slice(0, 30)} qty=${qty} unit=${unit})` }
    }
    const desc = classifyItem(item)
    const g = groups.get(desc) || { description: desc, quantity: 0, fen: 0 }
    g.quantity += qty
    g.fen += Math.round(unit * qty * 100)
    groups.set(desc, g)
  }

  // 2. 최대 4줄 — 넘으면 상품대금 큰 3줄(Sundry 제외)만 남기고 나머지는 Sundry goods 1줄로
  let lines = [...groups.values()]
  if (lines.length > MAX_LINES) {
    const named = lines.filter(l => l.description !== SUNDRY).sort((a, b) => b.fen - a.fen)
    const keep = named.slice(0, MAX_LINES - 1)
    const rest = lines.filter(l => !keep.includes(l))
    const sundry = rest.reduce((acc, l) => ({ description: SUNDRY, quantity: acc.quantity + l.quantity, fen: acc.fen + l.fen }), { description: SUNDRY, quantity: 0, fen: 0 })
    lines = [...keep, sundry]
  }
  lines.sort((a, b) => b.fen - a.fen)

  // 3. USD 배분 (센트, 내림 후 끝전은 가장 큰 줄에)
  const totalFen = lines.reduce((s, l) => s + l.fen, 0)
  if (totalFen <= 0) return { ok: false, error: '상품대금 합계 0' }
  const cents = lines.map(l => Number((BigInt(usdCents) * BigInt(l.fen)) / BigInt(totalFen)))
  const remainder = usdCents - cents.reduce((s, c) => s + c, 0)
  let maxIdx = 0
  cents.forEach((c, i) => { if (c > cents[maxIdx]) maxIdx = i })
  cents[maxIdx] += remainder

  return {
    ok: true,
    lines: lines.map((l, i) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: Math.round((cents[i] / 100 / l.quantity) * 10000) / 10000,
      amount: cents[i] / 100,
    })),
  }
}

/** 한국시간 기준 YYYY-MM-DD */
export function kstDateStr(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
