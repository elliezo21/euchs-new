/**
 * 1688 DataHub API & DeepL Translation Service Module with Intelligent Mock Fallback
 * 이유씨컴퍼니 (EUCHS) - 1688 실시간 검색 & DeepL 번역 연동 및 429 Quota 초과 무결점 Mock 자동 전환
 */

import { getMockSearchResults, getMockProductDetail } from './mock1688Data'

// ========================================================
// 🔗 이미지 URL 정규화 — 모듈 최상단 전역 유틸 (TDZ 방지)
// ========================================================
/**
 * 이미지 URL을 https:// 로 정규화. 모든 파서에서 공유.
 * - //cdn.com/... → https://cdn.com/...
 * - http://... → https://...
 * - 빈 문자열 / data: / 짧은 URL → '' 반환
 */
function normalizeImg(u) {
  if (!u || typeof u !== 'string') return ''
  let url = u.trim()
  if (url.startsWith('//')) url = 'https:' + url
  if (url.startsWith('http://')) url = url.replace('http://', 'https://')
  if (!url.startsWith('https://')) return ''
  if (url.length < 20 || url.startsWith('data:')) return ''
  return url
}

// 환경 변수 기본값 로드
const getEnv = (key, fallback = '') => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[`VITE_${key}`] || import.meta.env[key] || fallback
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[`VITE_${key}`] || process.env[key] || fallback
  }
  return fallback
}

export const CONFIG = {
  ONEBOUND_KEY: getEnv('ONEBOUND_KEY', 't_821093731214'),
  ONEBOUND_SECRET: getEnv('ONEBOUND_SECRET', '121412a0'),
  DEEPL_API_KEY: getEnv('DEEPL_API_KEY', 'a2f4e6d2-ed34-4c8c-8ed3-beb80e473d71:fx'),
}


// ========================================================
// 🇷🇺 러시아어 및 다국어 ➔ 한국어 매핑 사전 & 정제 엔진
// ========================================================
export const RU_KO_DICT = {
  // 속성명 및 스펙 레이블 (용량, 사이즈, 색상, 중량, 소재 등)
  'емкость(объем)': '용량',
  'емкость/объем': '용량',
  'емкость': '용량',
  'объем': '용량',
  'размер': '사이즈',
  'размеры': '사이즈',
  'цвет': '색상',
  'цвета': '색상',
  'вес': '중량',
  'масса': '중량',
  'материал': '소재',
  'ткань': '원단/소재',
  'спецификация': '규격',
  'характеристика': '특성/규격',
  'модель': '모델',
  'стиль': '스타일',
  'тип': '타입',
  'вид': '종류',
  'форма': '형태',
  'узор': '패턴',
  'принт': '프린트/패턴',
  'количество': '수량',
  'цена': '가격',
  'высота': '높이',
  'длина': '길이',
  'ширина': '너비',
  'color': '색상',
  'size': '사이즈',
  'spec': '규격',
  'capacity': '용량',
  'weight': '중량',
  'material': '소재',

  // 용도 및 카테고리
  'для домашнего использования': '가정용',
  'для дома': '가정용',
  'домашний': '가정용',
  'домашняя': '가정용',
  'детский': '아동용',
  'детская': '아동용',
  'детское': '아동용',
  'детские': '아동용',
  'взрослый': '성인용',
  'взрослая': '성인용',
  'взрослые': '성인용',
  'мужской': '남성용',
  'мужская': '남성용',
  'мужские': '남성용',
  'женский': '여성용',
  'женская': '여성용',
  'женские': '여성용',
  'термос': '보온병/텀블러',
  'термокружка': '보온 텀블러',
  'бутылка': '보틀/물병',
  'кружка': '머그잔/컵',
  'нержавеющая сталь': '스테인리스 스틸',
  'пластик': '플라스틱',
  'стекло': '유리',
  'керамика': '세라믹/도자기',
  'хлопок': '면/코튼',
  'лен': '린넨',
  'кожа': '가죽',
  'силикон': '실리콘',

  // 기본 색상
  'белый': '화이트',
  'черный': '블랙',
  'серый': '그레이',
  'красный': '레드',
  'синий': '블루',
  'голубой': '스카이블루',
  'зеленый': '그린',
  'желтый': '옐로우',
  'розовый': '핑크',
  'фиолетовый': '퍼플',
  'бежевый': '베이지',
  'коричневый': '브라운',
  'оранжевый': '오렌지',
  'хаки': '카키',
  'темно-серый': '차콜/다크그레이',
  'темно-синий': '네이비',
  'золотой': '골드',
  'серебряный': '실버',
  'кофейный': '커피/브라운',
  'кремовый': '크림/아이보리',
  'молочный': '밀키 화이트',
  'абрикосовый': '살구/애프리콧',
  'мятный': '민트',
  'бордовый': '와인/버건디',

  // 모델 / 규격 수식어
  'стандарт': '기본형(표준)',
  'стандартный': '기본형(표준)',
  'удлиненный': '롱(길이추가)',
  'длинный': '롱',
  'короткий': '숏',
  'с молнией': '지퍼형',
  'без молнии': '기본형',
  'большой размер': '빅사이즈',
  'маленький': '소형',
  'средний': '중형',
  'большой': '대형',
  'плю스': '플러스',
  'набор': '세트',
  'пара': '켤레',
  'штука': '개',
  'летняя': '여름용',
  'зимняя': '겨울용',
  'осенняя': '가을용',
  'весенняя': '봄용'
}

/**
 * 러시아어 / 다국어 텍스트 사전 기반 1차 치환 및 정제 함수
 */
export function cleanForeignText(str) {
  if (!str || typeof str !== 'string') return ''
  let cleaned = str.trim()

  // 1. 중국어 원문 + 러시아어 혼합 패턴에서 중국어 원문만 추출
  // 예: "拉链卡其-加长款 Цвет : Молния..." -> "拉链卡其-加长款"
  if (/[\u4e00-\u9fff]/.test(cleaned) && /[\u0400-\u04ff]/i.test(cleaned)) {
    const colonSplit = cleaned.split(/(?:Цвет|Размер|Емкость|Объем|Стиль|Модель|Материал|Характеристика)\s*:/i)
    if (colonSplit[0] && /[\u4e00-\u9fff]/.test(colonSplit[0])) {
      cleaned = colonSplit[0].trim()
    } else {
      // 키릴 문자 블록만 제거
      cleaned = cleaned.replace(/[\u0400-\u04ff]+/g, '').replace(/[:：\s-]+$/, '').trim()
    }
  }

  // 2. 콜론 뒤 러시아어 병기 분리 (중국어가 없는 경우라도 분리)
  if (/[:：]/.test(cleaned) && /[\u0400-\u04ff]/i.test(cleaned)) {
    const parts = cleaned.split(/(?:Цвет|Размер|Емкость|Объем|Стиль|Модель|Материал|Характеристика)\s*[:：]/i)
    if (parts[0] && parts[0].trim()) {
      cleaned = parts[0].trim()
    }
  }

  // 3. 단독 속성명 표준화 (공백/특수문자 무시)
  const normKey = cleaned.toLowerCase().replace(/[\s\-_/()（）:：]+/g, '')
  if (normKey === 'цвет' || normKey === 'цвета' || normKey === 'color' || normKey === '색상') return '색상'
  if (normKey === 'размер' || normKey === 'размеры' || normKey === 'size' || normKey === '사이즈') return '사이즈'
  if (normKey === 'спецификация' || normKey === 'характеристика' || normKey === 'spec' || normKey === '규격') return '규격'
  if (normKey === 'емкость' || normKey === 'объем' || normKey.includes('емкость') || normKey.includes('объем') || normKey === 'capacity' || normKey === '용량') return '용량'
  if (normKey === 'вес' || normKey === 'масса' || normKey === 'weight' || normKey === '중량') return '중량'
  if (normKey === 'материал' || normKey === 'ткань' || normKey === 'material' || normKey === '소재') return '소재'

  // 4. 사전 기반 단어/어미 치환 (긴 구문부터 순차 치환)
  if (/[\u0400-\u04ff]/i.test(cleaned)) {
    for (const [ru, ko] of Object.entries(RU_KO_DICT)) {
      if (cleaned.toLowerCase() === ru) return ko
      const reg = new RegExp(ru.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      cleaned = cleaned.replace(reg, ko)
    }

    // 러시아어 단위 정규화
    cleaned = cleaned
      .replace(/(\d+)\s*мл\b/gi, '$1ml')
      .replace(/(\d+)\s*л\b/gi, '$1L')
      .replace(/(\d+)\s*г\b/gi, '$1g')
      .replace(/(\d+)\s*кг\b/gi, '$1kg')
      .replace(/(\d+)\s*см\b/gi, '$1cm')
      .replace(/(\d+)\s*мм\b/gi, '$1mm')
      .replace(/(\d+)\s*шт\b/gi, '$1개')
  }

  // 5. 불필요한 러시아어 속성 태그 및 잔여 기호 정제
  cleaned = cleaned
    .replace(/\s*Цвет\s*/gi, '')
    .replace(/\s*Размер\s*/gi, '')
    .replace(/\s*Емкость\s*/gi, '')
    .replace(/\s*Объем\s*/gi, '')
    .replace(/^[:：\s-]+|[:：\s-]+$/g, '')
    .trim()

  return cleaned
}

// ========================================================
// Quota Defense: Memory & SessionStorage Cache Layer
// ========================================================
const CACHE_TTL = 30 * 60 * 1000 // 30분 캐시 유지
const CACHE_VERSION = 'ob_v3'     // OneBound 전환 후 캐시 버전 (변경 시 구형 캐시 자동 무효화)
const memorySearchCache = new Map()
const memoryDetailCache = new Map()
const memoryTranslationCache = new Map()

// ── 구형 Mock/Otapi 캐시 자동 플러시 ─────────────────────────────────────
// 배포 후 브라우저에 남아있는 구형 sessionStorage 캐시 항목 제거
;(function flushLegacyCache() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    const versionKey = '__euchs_cache_version'
    const storedVersion = window.sessionStorage.getItem(versionKey)
    if (storedVersion !== CACHE_VERSION) {
      // 버전 불일치: 검색/상세 캐시 전체 삭제
      const keysToDelete = []
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i)
        if (k && (k.startsWith('euchs_search') || k.startsWith('euchs_detail') || k.startsWith('euchs_product'))) {
          keysToDelete.push(k)
        }
      }
      keysToDelete.forEach(k => window.sessionStorage.removeItem(k))
      window.sessionStorage.setItem(versionKey, CACHE_VERSION)
      console.log(`[EUCHS Cache] Flushed ${keysToDelete.length} legacy cache entries (→ ${CACHE_VERSION})`)
    }
  } catch (e) {}
})()

const getFromCache = (cacheMap, storageKey, key) => {
  // 1. 메모리 캐시 조회
  if (cacheMap.has(key)) {
    const entry = cacheMap.get(key)
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data
    }
    cacheMap.delete(key)
  }

  // 2. SessionStorage 조회
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(`${storageKey}_${key}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          cacheMap.set(key, parsed) // 메모리에 복원
          return parsed.data
        }
        window.sessionStorage.removeItem(`${storageKey}_${key}`)
      }
    }
  } catch (e) {}

  return null
}

const saveToCache = (cacheMap, storageKey, key, data) => {
  const entry = { data, timestamp: Date.now() }
  cacheMap.set(key, entry)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`${storageKey}_${key}`, JSON.stringify(entry))
    }
  } catch (e) {}
}

/**
 * DeepL 텍스트 번역 함수 (개별 캐시 확인 ➔ 미번역 텍스트 일괄 번역 ➔ 캐시 저장)
 * @param {string|string[]} text - 번역할 텍스트 또는 텍스트 배열
 * @param {string} targetLang - 대상 언어 ('KO' | 'ZH' | 'EN' 등)
 * @param {string} [sourceLang] - 출발 언어 (선택 사항)
 * @returns {Promise<string|string[]>} 번역된 결과
 */
export async function translateText(text, targetLang = 'KO', sourceLang = null) {
  if (!text || (Array.isArray(text) && text.length === 0)) {
    return text
  }

  const isArray = Array.isArray(text)
  const textArray = isArray ? text : [text]
  const cleanTexts = textArray.map(t => (t ? String(t).trim() : ''))

  if (cleanTexts.every(t => !t)) {
    return text
  }

  // 1. 캐시 조회: 이미 번역된 텍스트와 새로 번역할 텍스트 분리
  const results = new Array(cleanTexts.length)
  const missingIndices = []
  const missingTexts = []

  cleanTexts.forEach((txt, idx) => {
    if (!txt) {
      results[idx] = ''
      return
    }
    const singleKey = `${targetLang}_${sourceLang || 'auto'}_${txt}`
    const cached = getFromCache(memoryTranslationCache, 'euchs_trans', singleKey)
    if (cached) {
      results[idx] = cached
    } else {
      missingIndices.push(idx)
      missingTexts.push(txt)
    }
  })

  // 모든 텍스트가 캐시에 존재하면 즉시 반환
  if (missingTexts.length === 0) {
    return isArray ? results : results[0]
  }

  // 2. 미번역 텍스트 일괄 DeepL 번역 실행
  let translatedBatch = null

  // 2-1. Vercel Serverless / Vite Dev Server 프록시 우선 시도 (/api/deepl-translate)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8초 타임아웃
    const proxyRes = await fetch('/api/deepl-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: missingTexts,
        target_lang: targetLang,
        ...(sourceLang ? { source_lang: sourceLang } : {})
      }),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (proxyRes.ok) {
      const result = await proxyRes.json()
      if (result.success && result.data?.translations) {
        translatedBatch = result.data.translations.map((item, idx) => item.text || missingTexts[idx])
      }
    }
  } catch (err) {
    console.debug('[DeepL] Proxy notice:', err.message)
  }

  // 2-2. Direct DeepL API Fallback
  if (!translatedBatch && CONFIG.DEEPL_API_KEY) {
    try {
      const apiKey = CONFIG.DEEPL_API_KEY
      const isFreeKey = apiKey.endsWith(':fx')
      const endpoint = isFreeKey
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate'

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000) // 8초 타임아웃
      const directRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: missingTexts,
          target_lang: targetLang,
          ...(sourceLang ? { source_lang: sourceLang } : {})
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (directRes.ok) {
        const data = await directRes.json()
        if (data.translations && Array.isArray(data.translations)) {
          translatedBatch = data.translations.map((item, idx) => item.text || missingTexts[idx])
        }
      }
    } catch (err) {
      console.warn('[DeepL] Direct API notice:', err.message)
    }
  }

  // 3. 결과 매핑 및 캐시 저장
  if (translatedBatch && translatedBatch.length === missingTexts.length) {
    missingIndices.forEach((origIdx, batchIdx) => {
      const trans = translatedBatch[batchIdx] || missingTexts[batchIdx]
      results[origIdx] = trans
      const singleKey = `${targetLang}_${sourceLang || 'auto'}_${missingTexts[batchIdx]}`
      saveToCache(memoryTranslationCache, 'euchs_trans', singleKey, trans)
    })
  } else {
    // 번역 실패 시 원문 유지
    missingIndices.forEach((origIdx, batchIdx) => {
      results[origIdx] = missingTexts[batchIdx]
    })
  }

  return isArray ? results : results[0]
}

/**
 * 상품 목록 일괄 한국어 번역 유틸 (중국어 ➔ 한국어)
 * @param {Array} items - 상품 객체 배열
 * @returns {Promise<Array>} 번역이 적용된 상품 목록
 */
export async function translateItemsBatch(items) {
  if (!Array.isArray(items) || items.length === 0) return items

  // 번역이 필요한 원문 제목들 수집
  const titlesToTranslate = items.map(it => it.titleZh || it.title || it.subject || '')

  try {
    const translatedTitles = await translateText(titlesToTranslate, 'KO')
    const titleList = Array.isArray(translatedTitles) ? translatedTitles : [translatedTitles]

    items.forEach((it, idx) => {
      const translated = titleList[idx] || it.titleZh || it.title || ''
      const cleaned = cleanForeignText(translated) || translated
      it.titleKo = cleaned
      it.title = cleaned // MallView 템플릿 호환용
    })
  } catch (err) {
    console.warn('[translateItemsBatch] Notice:', err.message)
    items.forEach(it => {
      const raw = it.titleZh || it.title || '1688 도매 상품'
      const cleaned = cleanForeignText(raw) || raw
      if (!it.titleKo) it.titleKo = cleaned
      if (!it.title) it.title = it.titleKo
    })
  }

  return items
}

/**
 * 1688 OneBound 실시간 상품 검색
 * @param {string} queryZh - 중국어/한국어 검색 키워드
 * @param {number|string} page - 페이지 번호 (기본 1)
 * @param {object} [options] - 추가 옵션
 * @returns {Promise<object>} 정규화된 1688 검색 결과 (한국어 번역 포함)
 */
export async function search1688(queryZh, page = 1, options = {}) {
  const query = String(queryZh || '').trim()
  if (!query) {
    return { items: [], page: Number(page), pageSize: 40, totalResults: '0', hasMore: false, queryZh: '' }
  }

  const cacheKey = `ob_${query}_p${page}`

  // 캐시 확인
  const cached = getFromCache(memorySearchCache, 'euchs_search', cacheKey)
  if (cached) {
    return cached
  }

  let data = null

  // Vercel Serverless / Vite Dev Server 프록시 (/api/1688-search)
  try {
    const params = new URLSearchParams({ q: query, page: String(page) })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    const proxyRes = await fetch(`/api/1688-search?${params.toString()}`, { signal: controller.signal })
    clearTimeout(timeout)

    // HTTP 레벨 에러 여부와 무관하게 본문 파싱 시도
    const result = await proxyRes.json().catch(() => null)
    if (!result) {
      console.warn(`[1688 Search] Proxy returned non-JSON. HTTP ${proxyRes.status}`)
    } else if (result.data) {
      // success=true이든 false이든, data가 있으면 파싱 진행
      data = result.data
      console.log(`[1688 Search] Proxy data received. success=${result.success} gateway=${result.gateway || 'unknown'} keys:`, Object.keys(data || {}).slice(0, 8))
    } else {
      console.warn('[1688 Search] Proxy returned no data:', result.message || JSON.stringify(result).slice(0, 200))
    }
  } catch (err) {
    console.warn('[1688 Search] Proxy fetch error:', err.name === 'AbortError' ? 'Timeout(25s)' : err.message)
  }

  if (!data) {
    console.warn(`[1688 API] No response for "${query}"`)
    return { items: [], page: Number(page), pageSize: 40, totalResults: '0', hasMore: false, queryZh: query }
  }

  // ── OneBound 응답 파싱 ──────────────────────────────────────────────────
  try {
    const resData = data || {}

    // OneBound item_search 응답 다중 구조 탐색:
    // 표준: { items: { item: [...] }, total_results: "40" }
    // 일부 버전: { items: [...] } (items 자체가 배열)
    // 구형: { result: { resultList: [...] } }
    let rawList = null

    // 1순위: OneBound 표준 — items.item 배열
    if (resData?.items?.item && Array.isArray(resData.items.item)) {
      rawList = resData.items.item
    }
    // 2순위: items 자체가 배열
    else if (Array.isArray(resData?.items)) {
      rawList = resData.items
    }
    // 3순위: 최상위 item 배열
    else if (Array.isArray(resData?.item)) {
      rawList = resData.item
    }
    // 4순위: result.resultList
    else if (Array.isArray(resData?.result?.resultList)) {
      rawList = resData.result.resultList
    }
    // 5순위: resultList 직접
    else if (Array.isArray(resData?.resultList)) {
      rawList = resData.resultList
    }
    // 6순위: data.items.item (래퍼가 있는 경우)
    else if (resData?.data?.items?.item && Array.isArray(resData.data.items.item)) {
      rawList = resData.data.items.item
    }
    // 7순위: items.item이 배열이 아닌 경우 Object.values
    else if (resData?.items?.item && typeof resData.items.item === 'object') {
      rawList = Object.values(resData.items.item)
    }
    // 8순위: items가 객체인 경우 Object.values
    else if (resData?.items && typeof resData.items === 'object') {
      const vals = Object.values(resData.items)
      // 첫 번째 값이 배열이면 그게 item 목록
      rawList = vals.length === 1 && Array.isArray(vals[0]) ? vals[0] : vals
    }

    if (!rawList) rawList = []

    if (!Array.isArray(rawList) || rawList.length === 0) {
      console.warn(`[1688 API] Empty rawList for "${query}". Data keys:`, Object.keys(resData).slice(0, 10))
      if (resData.error_code || resData.error || resData.message) {
        console.warn('[1688 API] Error from OneBound:', resData.error_code, resData.error || resData.message)
      }
      return { items: [], page: Number(page), pageSize: 40, totalResults: '0', hasMore: false, queryZh: query }
    }


    const normalizeUrl = (u) => {
      const s = String(u || '').trim()
      if (!s) return ''
      if (s.startsWith('//')) return 'https:' + s
      if (s.startsWith('http://')) return s.replace('http://', 'https://')
      return s.startsWith('http') ? s : ''
    }

    const items = rawList.map((entry, idx) => {
      const it = entry.item || entry

      const imageUrl = normalizeUrl(it.pic_url || it.picUrl || it.imageUrl || it.image || '')
      const itemId = String(it.num_iid || it.itemId || it.id || `item-${Date.now()}-${idx}`)
      const cleanId = itemId.replace(/[^0-9]/g, '')
      const detailUrl = cleanId ? `https://detail.1688.com/offer/${cleanId}.html` : ''

      const priceNum = parseFloat(String(it.price || it.priceCent || '0').replace(/[^0-9.]/g, '')) || 0
      const minOrder = parseInt(it.min_num || it.minOrder || it.min_order || '1', 10) || 1
      const sales = parseInt(it.sold_count || it.volume || it.sales || 0, 10)
      const titleZh = it.title || it.subject || ''
      const company = it.nick || it.shop_name || it.shopName || it.sellerName || '1688 공급사'
      const sellerId = String(it.seller_id || it.sellerId || it.user_num_id || '')

      return {
        id: cleanId || itemId,
        itemId: cleanId || itemId,
        titleZh,
        titleEn: '',
        titleKo: titleZh,
        title: titleZh,
        price: priceNum,
        priceNum,
        priceCny: priceNum,
        priceFormatted: priceNum.toFixed(2),
        moq: minOrder,
        minOrder,
        sales,
        repurchaseRate: it.rePurchaseRate || it.repurchaseRate || 0,
        imageUrl,
        detailUrl,
        itemUrl: detailUrl,
        productUrl: detailUrl,
        company,
        sellerId,
        starLevel: parseFloat(it.score || it.starLevel || '5') || 5.0,
        raw: it
      }
    }).filter(item => item.id && (item.title || item.titleZh))

    // 일괄 한국어 번역
    await translateItemsBatch(items)

    const totalCount = resData?.total_results || resData?.total_count || resData?.total || String(rawList.length)
    const formattedResult = {
      rawResponse: data,
      items,
      page: Number(page),
      pageSize: 40,
      totalResults: String(totalCount),
      hasMore: Number(totalCount) > Number(page) * 40,
      queryZh: query
    }

    saveToCache(memorySearchCache, 'euchs_search', cacheKey, formattedResult)
    return formattedResult
  } catch (parseErr) {
    console.warn('[1688 API] Response parse error:', parseErr)
    return { items: [], page: Number(page), pageSize: 40, totalResults: '0', hasMore: false, queryZh: query }
  }
}




/**
 * 1688 통합 파이프라인:
 * 한글 검색어 ➔ 중국어 번역 ➔ 1688 OneBound 검색 ➔ 결과 일괄 한글 번역 (DeepL)
 */

// ── 한글→중문 즉시 변환 사전 (DeepL 보조 / 주요 B2B 품목) ──────────────
const KO_ZH_B2B_DICT = {
  '치마': '裙子', '스커트': '裙子', '원피스': '连衣裙', '블라우스': '衬衫',
  '셔츠': '衬衫', '바지': '裤子', '청바지': '牛仔裤', '티셔츠': 'T恤',
  '자켓': '外套', '코트': '大衣', '점퍼': '夹克', '후드': '卫衣',
  '텀블러': '保温杯', '머그': '马克杯', '컵': '杯子', '도자기': '陶瓷',
  '가방': '包包', '핸드백': '手提包', '백팩': '双肩包', '지갑': '钱包',
  '신발': '鞋子', '운동화': '运动鞋', '구두': '皮鞋', '슬리퍼': '拖鞋',
  '화장품': '化妆品', '스킨케어': '护肤品', '마스크': '口罩',
  '인형': '玩具', '장난감': '玩具', '피규어': '手办',
  '주방': '厨房', '냄비': '锅', '프라이팬': '平底锅', '칼': '刀具',
  '전자': '电子', '이어폰': '耳机', '케이블': '数据线', '충전기': '充电器',
  '의자': '椅子', '테이블': '桌子', '선반': '架子', '침구': '床品',
  '스포츠': '运动', '요가': '瑜伽', '헬스': '健身', '수영': '游泳',
  '악세서리': '配饰', '반지': '戒指', '목걸이': '项链', '귀걸이': '耳环',
  '문구': '文具', '노트': '笔记本', '펜': '钢笔', '파우치': '收纳袋'
}

export async function search1688WithTranslation(koreanQuery, page = 1, options = {}, onProgress = null) {
  const query = String(koreanQuery || '').trim()
  if (!query) {
    return {
      success: true,
      queryKo: '',
      queryZh: '',
      page: Number(page),
      pageSize: 40,
      totalResults: '0',
      hasMore: false,
      items: []
    }
  }

  // Step 1: 한글 검색어 ➔ 중국어 번역
  let queryZh = query
  const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query)

  if (isKorean) {
    if (onProgress) onProgress({ step: 1, message: `한글 키워드 분석 및 번역 중: "${query}"...` })

    // 1순위: 내장 사전 즉시 조회 (타임아웃 없음, 정확도 보장)
    const dictResult = KO_ZH_B2B_DICT[query]
    if (dictResult) {
      queryZh = dictResult
      console.log(`[1688 Search] Dict hit: "${query}" → "${queryZh}"`)
    } else {
      // 2순위: DeepL 번역 (주요 품목 외 자유 텍스트)
      try {
        const translated = await translateText(query, 'ZH', 'KO')
        const translatedStr = typeof translated === 'string' ? translated : (Array.isArray(translated) ? translated[0] : '')
        if (translatedStr && translatedStr !== query) {
          queryZh = translatedStr
          console.log(`[1688 Search] DeepL: "${query}" → "${queryZh}"`)
        }
      } catch (err) {
        console.warn('[1688 Search] DeepL failed, using original query:', err.message)
        queryZh = query
      }
    }
  }

  if (onProgress) onProgress({ step: 2, message: `1688 실시간 상품 소싱 검색 중: "${queryZh}"...`, queryZh })

  // Step 2: 1688 OneBound 상품 검색
  let searchResult
  try {
    searchResult = await search1688(queryZh, page, options)
  } catch (err) {
    console.warn('[1688 Search] search1688 error:', err.message)
    return {
      success: false,
      queryKo: query,
      queryZh,
      page: Number(page),
      pageSize: 40,
      totalResults: '0',
      hasMore: false,
      items: []
    }
  }


  const items = searchResult.items || []

  // Step 3: 미번역 잔여 항목 최종 점검
  const untranslated = items.filter(it => !it.titleKo || it.titleKo === it.titleZh)
  if (untranslated.length > 0) {
    if (onProgress) {
      onProgress({
        step: 3,
        message: `소싱 상품 ${untranslated.length}개 한국어 번역 완료 중...`,
        itemsCount: items.length
      })
    }
    await translateItemsBatch(untranslated)
  }

  if (onProgress) {
    onProgress({
      step: 4,
      message: `검색 완료 (${items.length}개 상품)`,
      itemsCount: items.length
    })
  }

  return {
    success: true,
    queryKo: query,
    queryZh,
    page: searchResult.page,
    pageSize: searchResult.pageSize,
    totalResults: searchResult.totalResults,
    hasMore: searchResult.hasMore,
    items
  }
}

/**
 * 1688 이미지(사진) 검색 — OneBound item_search_img
 * @param {string} imageUrl - 공개 접근 가능한 이미지 URL
 * @returns {Promise<{ success: boolean, items: Array, totalResults: string }>}
 */
export async function search1688ByImageUrl(imageUrl) {
  const url = String(imageUrl || '').trim()
  if (!url) {
    console.warn('[1688 ImageSearch] imageUrl is empty')
    return { success: false, items: [], totalResults: '0' }
  }

  console.log('[1688 ImageSearch] Calling OneBound proxy with imgUrl:', url.slice(0, 80))

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    const proxyRes = await fetch(`/api/1688-image-search?imgUrl=${encodeURIComponent(url)}`, {
      signal: controller.signal
    })
    clearTimeout(timeout)

    const result = await proxyRes.json().catch(() => null)
    if (!result) {
      console.warn('[1688 ImageSearch] Proxy returned non-JSON. HTTP', proxyRes.status)
      return { success: false, items: [], totalResults: '0', error: 'non-json response' }
    }

    // success=true이든 false이든 data가 있으면 파싱 진행
    if (!result.data) {
      console.warn('[1688 ImageSearch] Proxy returned no data:', result.message || JSON.stringify(result).slice(0, 200))
      return { success: false, items: [], totalResults: '0', error: result.message || 'no data' }
    }

    const resData = result.data

    // OneBound item_search_img 응답 다중 구조 탐색
    let rawList =
      resData?.items?.item ||     // 표준 OneBound
      resData?.item ||             // 최상위 item 배열
      resData?.items ||            // items 자체가 배열
      resData?.result?.resultList ||
      resData?.resultList ||
      []

    if (rawList && !Array.isArray(rawList) && typeof rawList === 'object') {
      rawList = Object.values(rawList)
    }

    console.log('[1688 ImageSearch] Raw result count:', Array.isArray(rawList) ? rawList.length : 0)

    if (!Array.isArray(rawList) || rawList.length === 0) {
      if (resData?.error_code || resData?.error) {
        console.warn('[1688 ImageSearch] OneBound error:', resData.error_code, resData.error)
      }
      return { success: true, items: [], totalResults: '0' }
    }

    const normalizeUrl = (u) => {
      const s = String(u || '').trim()
      if (!s) return ''
      if (s.startsWith('//')) return 'https:' + s
      if (s.startsWith('http://')) return s.replace('http://', 'https://')
      return s.startsWith('http') ? s : ''
    }

    const items = rawList.map((entry, idx) => {
      const it = entry.item || entry

      const imageUrl = normalizeUrl(it.pic_url || it.picUrl || it.imageUrl || it.image || '')
      const itemId = String(it.num_iid || it.itemId || it.id || `imgitem-${Date.now()}-${idx}`)
      const cleanId = itemId.replace(/[^0-9]/g, '')
      const detailUrl = cleanId ? `https://detail.1688.com/offer/${cleanId}.html` : ''

      const priceNum = parseFloat(String(it.price || '0').replace(/[^0-9.]/g, '')) || 0
      const minOrder = parseInt(it.min_num || it.minOrder || '1', 10) || 1
      const titleZh = it.title || it.subject || ''
      const sellerId = String(it.seller_id || it.sellerId || it.user_num_id || '')

      return {
        id: cleanId || itemId,
        itemId: cleanId || itemId,
        titleZh,
        titleEn: '',
        titleKo: '',
        title: titleZh,
        price: priceNum,
        priceFormatted: priceNum.toFixed(2),
        minOrder,
        sales: parseInt(it.sold_count || it.volume || '0', 10),
        imageUrl,
        detailUrl,
        sellerId,
        repurchaseRate: '0',
        starLevel: 5.0,
        company: it.nick || it.shop_name || it.shopName || '1688 공급사',
        raw: it
      }
    }).filter(i => i.id && i.titleZh)


    await translateItemsBatch(items)

    return {
      success: true,
      items,
      totalResults: String(rawList.length)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[1688 ImageSearch] Request timed out after 20s')
      return { success: false, items: [], totalResults: '0', error: 'timeout' }
    }
    console.error('[1688 ImageSearch] Unexpected error:', err)
    return { success: false, items: [], totalResults: '0', error: err.message }
  }
}


/**
 * 1688 OneBound 상품 상세 Raw 조회
 * @param {string|number} itemId - 1688 순수 숫자 상품 ID (num_iid)
 * @returns {Promise<object>}
 */
export async function getItemDetail1688(itemId) {
  const idStr = String(itemId || '').trim()
  if (!idStr || idStr === 'undefined' || idStr === 'null') {
    console.warn('[1688 Detail] Invalid itemId:', itemId)
    return null
  }

  // 순수 숫자 ID 추출 (abb- 접두사 등 레거시 처리)
  const cleanId = idStr.replace(/[^0-9]/g, '') || idStr

  // 캐시 확인
  const cached = getFromCache(memoryDetailCache, 'euchs_detail_raw', cleanId)
  if (cached) {
    console.debug('[1688 Detail] Cache HIT for:', cleanId)
    return cached
  }

  let data = null

  // OneBound 프록시 (/api/1688-item-detail)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    const proxyRes = await fetch(`/api/1688-item-detail?itemId=${encodeURIComponent(cleanId)}`, {
      signal: controller.signal
    })
    clearTimeout(timeout)

    const resJson = await proxyRes.json().catch(() => null)
    if (!resJson) {
      console.warn(`[1688 Detail] Proxy returned non-JSON. HTTP ${proxyRes.status}`)
    } else if (resJson.data) {
      data = resJson.data
      console.log(`[1688 Detail] Proxy data received. success=${resJson.success} gateway=${resJson.gateway || 'unknown'} keys:`, Object.keys(data || {}).slice(0, 10))
    } else {
      console.warn(`[1688 Detail] Proxy no data for id=${cleanId}:`, resJson.message || JSON.stringify(resJson).slice(0, 200))
    }
  } catch (err) {
    console.warn('[1688 Detail] Proxy fetch error:', err.name === 'AbortError' ? 'Timeout(25s)' : err.message)
  }

  if (!data) {
    console.warn('[1688 Detail] API failed for id:', cleanId)
    return null
  }

  saveToCache(memoryDetailCache, 'euchs_detail_raw', cleanId, data)
  return data
}



/**
 * 1688 단건 상품 ID/URL로 상세 데이터 조회 및 한국어 번역
 * @param {string|number} offerId - 1688 상품 고유 ID
 * @returns {Promise<object>} 정규화 및 번역된 상품 상세 객체
 */
export async function fetch1688ProductById(offerId) {
  // offerId는 문자열 또는 상품 객체일 수 있음
  let idStr
  if (offerId && typeof offerId === 'object') {
    idStr = String(offerId.id || offerId.offerId || offerId.num_iid || offerId.itemId || '').trim()
  } else {
    idStr = String(offerId || '').trim()
  }
  // 빈값 / "undefined" / "null" 방어
  if (!idStr || idStr === 'undefined' || idStr === 'null') {
    console.warn('[fetch1688ProductById] Invalid offerId:', offerId)
    return null
  }

  const cachedProduct = getFromCache(memoryDetailCache, 'euchs_product_parsed', idStr)
  if (cachedProduct) {
    return cachedProduct
  }

  try {
    const rawData = await getItemDetail1688(idStr)

    // ─── OneBound item_get 응답 구조 탐색 ────────────────────────────────
    // OneBound: { item: { num_iid, title, pic_url, item_imgs, props_list, skus, seller_info, ... } }
    // 프록시가 item 객체를 추출해 반환 → rawData가 이미 item 객체일 수 있음
    let it = null

    // 1순위: rawData 자체가 OneBound item 객체 (num_iid 또는 title이 있는 경우)
    if (rawData && (rawData.num_iid || rawData.title || rawData.pic_url || rawData.item_imgs)) {
      it = rawData
    }
    // 2순위: rawData.item (OneBound 표준 래퍼)
    if (!it) it = rawData?.item || null
    // 3순위: 기타 중첩 래퍼
    if (!it) it = rawData?.result?.item || rawData?.result || null
    if (!it) it = rawData?.data?.item || rawData?.data || null
    if (!it) it = rawData || {}
    if (Array.isArray(it)) it = it[0] || {}

    console.log('[1688 fetch1688ProductById] OneBound item keys:', Object.keys(it || {}).slice(0, 20))

    // ─── SKU Props 및 속성 맵 최상단 선언 (ReferenceError 방지) ─────────────
    // OneBound: props_list = {"0:0":"颜色:米白色","0:1":"颜色:黑色","1:0":"尺码:35-36"}
    //           props_img  = {"0:0":"//cbu01.alicdn.com/..."}
    //           skus       = {sku: [{properties:"0:0;1:0", price:"15.80", ...}]}
    let rawSkuProps = null
    let rawSkus = []
    const colorMap = new Map() // valueName 또는 propId → imageUrl
    const sizeSet = new Set()
    const propValueNameMap = {} // "0:0" → "米白色"

    // ─── OneBound skus 배열 추출 (skus.sku 중첩 구조 우선 탐색) ─────────────
    if (it.skus && Array.isArray(it.skus.sku)) {
      rawSkus = it.skus.sku                        // OneBound 표준: {sku: [...]}
    } else if (Array.isArray(it.skus)) {
      rawSkus = it.skus                            // 배열 직접 반환 형태
    } else if (it.sku && Array.isArray(it.sku.sku)) {
      rawSkus = it.sku.sku
    } else if (it.sku && Array.isArray(it.sku)) {
      rawSkus = it.sku
    }
    console.log('[fetch1688ProductById] rawSkus count:', rawSkus.length)

    // ─── 1순위: OneBound props_list 객체 → skuProps 변환 ────────────────────
    // props_list: {"0:0":"颜色:米白色","0:1":"颜色:黑色","1:0":"尺码:35-36","1:1":"尺码:37-38"}
    // props_img : {"0:0":"//cbu01.alicdn.com/abc.jpg"} (색상 옵션 썸네일)
    const propsList = it.props_list || it.sku_props || null
    const propsImg  = it.props_img  || it.prop_imgs  || {}

    if (propsList && typeof propsList === 'object' && !Array.isArray(propsList)) {
      // 그룹 인덱스 → {propName, values:[{propValueId, name, imageUrl}]}
      const propGroups = new Map()

      Object.entries(propsList).forEach(([key, value]) => {
        // key: "0:0", "0:1", "1:0" ...
        // value: "颜色:米白色", "尺码:35-36" ...
        const keyParts = key.split(':')
        if (keyParts.length < 2) return
        const groupIdx  = keyParts[0]  // "0", "1"
        const valueSep  = String(value || '').indexOf(':')
        if (valueSep < 0) return
        const propName  = value.slice(0, valueSep).trim()   // "颜色"
        const valueName = value.slice(valueSep + 1).trim()  // "米白色"

        propValueNameMap[key] = valueName

        if (!propGroups.has(groupIdx)) {
          propGroups.set(groupIdx, { propName, values: [] })
        }
        const imgRaw  = (propsImg[key] || propsImg[`${groupIdx}_${keyParts[1]}`] || '')
        const imageUrl = normalizeImg(imgRaw)
        if (imageUrl && !colorMap.has(valueName)) {
          colorMap.set(valueName, imageUrl)
        }
        propGroups.get(groupIdx).values.push({ propValueId: key, name: valueName, imageUrl })
      })

      if (propGroups.size > 0) {
        const sorted = [...propGroups.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        rawSkuProps = sorted.map(([, g]) => ({ prop: g.propName, values: g.values }))
        console.log('[fetch1688ProductById] props_list parsed skuProps:', JSON.stringify(rawSkuProps).slice(0, 300))
      }
    }

    // ─── 2순위: item_imgs.properties + skus.properties_name 방식 (props_list 없을 때) ──
    if (!rawSkuProps || rawSkuProps.length === 0) {
      // item_imgs에서 색상 이미지 추출
      if (Array.isArray(it.item_imgs)) {
        it.item_imgs.forEach(img => {
          const imgUrl = normalizeImg(img.url || img.src || img.Url || '')
          const props  = img.properties || img.props || ''
          if (props && imgUrl) {
            // "颜色分类:红色" 형식 → 마지막 콜론 뒤 값
            const colonIdx = String(props).lastIndexOf(':')
            if (colonIdx >= 0) {
              const val = String(props).slice(colonIdx + 1).trim()
              if (val && !colorMap.has(val)) colorMap.set(val, imgUrl)
            }
          }
        })
      }

      // skus.properties_name에서 속성 추출
      // properties_name 형식: "颜色分类:红色;尺码:M" (사람이 읽을 수 있는 형태)
      rawSkus.forEach(sk => {
        const propName = sk.properties_name || sk.spec_id || ''
        if (!propName) return
        const pairs = String(propName).split(';')
        pairs.forEach((pair, pIdx) => {
          const colonIdx = pair.lastIndexOf(':')
          if (colonIdx < 0) return
          const val = pair.slice(colonIdx + 1).trim()
          if (!val) return
          if (pIdx === 0) {
            const skuImg = normalizeImg(sk.img_id || sk.imageUrl || sk.image || sk.pic_url || '')
            if (!colorMap.has(val)) colorMap.set(val, skuImg)
          } else if (pIdx === 1) {
            sizeSet.add(val)
          }
        })
      })

      if (colorMap.size > 0 || sizeSet.size > 0) {
        rawSkuProps = []
        if (colorMap.size > 0) {
          rawSkuProps.push({
            prop: '색상/옵션',
            values: [...colorMap.entries()].map(([name, img]) => ({ name, imageUrl: img || '' }))
          })
        }
        if (sizeSet.size > 0) {
          rawSkuProps.push({
            prop: '사이즈/규격',
            values: [...sizeSet].map(name => ({ name, imageUrl: '' }))
          })
        }
      }
    }

    if (!rawSkuProps) rawSkuProps = []

    // ─── 기본 상품 정보 추출 (OneBound 필드 우선) ──────────────────────────
    // 제목: title (OneBound 표준)
    const titleZh = it.title || it.subject || it.Title || ''

    // 메인 이미지: pic_url (OneBound 표준)
    let imageUrl = normalizeImg(
      it.pic_url || it.picUrl || it.MainPictureUrl || it.imageUrl || it.image || ''
    )


    // ─── 다중 갤러리 이미지 배열 파싱 (OneBound item_imgs 우선) ──────────────
    let images = []

    // 1순위: OneBound item_imgs (배열의 각 객체에서 url 추출)
    if (Array.isArray(it.item_imgs) && it.item_imgs.length > 0) {
      images = it.item_imgs.map(p =>
        normalizeImg(typeof p === 'string' ? p : (p.url || p.src || p.Url || ''))
      ).filter(Boolean)
    }
    // 2순위: OneBound images 배열 (일반 이미지 목록)
    if (images.length === 0 && Array.isArray(it.images) && it.images.length > 0) {
      images = it.images.map(img =>
        normalizeImg(typeof img === 'string' ? img : (img.url || img.src || img.Url || ''))
      ).filter(Boolean)
    }
    // 3순위: Otapi PictureList (폴백)
    if (images.length === 0 && Array.isArray(it.PictureList) && it.PictureList.length > 0) {
      images = it.PictureList.map(p =>
        normalizeImg(typeof p === 'string' ? p : (p.Url || p.url || p.Large || p.src || ''))
      ).filter(Boolean)
    }
    // 4순위: pic_urls / picUrls / itemImages
    const altImgField = it.pic_urls || it.picUrls || it.itemImages || it.imgList || null
    if (images.length === 0 && Array.isArray(altImgField) && altImgField.length > 0) {
      images = altImgField.map(img =>
        normalizeImg(typeof img === 'string' ? img : (img.url || img.src || img.Url || ''))
      ).filter(Boolean)
    }
    // 5순위: SKU 이미지 수집 (colorMap에서 추출)
    if (images.length === 0 && colorMap.size > 0) {
      images = [...colorMap.values()].filter(Boolean)
    }
    // 최종 Fallback: 메인 이미지 1장
    if (images.length === 0 && imageUrl) {
      images = [imageUrl]
    }
    // 중복 제거
    images = [...new Set(images)]



    // ─── 가격 및 MOQ 추출 (OneBound 필드 우선) ──────────────────────────
    // OneBound price: 문자열 "12.5" 또는 숫자
    const priceNum = parseFloat(
      String(it.price || it.Price || it.priceKrw || '0').replace(/[^0-9.]/g, '')
    ) || 0

    const minOrder = parseInt(it.min_num || it.minOrder || it.min_order || '1', 10) || 1

    // ─── parsedSkuProps / parsedSkus 구성 ─────────────────────────────────
    // rawSkuProps (item_imgs + skus에서 추출된 옵션)를 parsedSkuProps로 변환
    let parsedSkuProps = []
    let parsedSkus = []

    if (Array.isArray(rawSkuProps) && rawSkuProps.length > 0) {
      parsedSkuProps = rawSkuProps.map(p => {
        const propName = cleanForeignText(p.prop || p.propKo || p.propName || p.name || '') || (p.prop || '')
        const rawVals = Array.isArray(p.values) ? p.values : []
        const values = rawVals.map(v => {
          const valName = cleanForeignText(typeof v === 'string' ? v : (v.name || v.value || '')) || (v.name || '')
          return {
            name: valName,
            nameKo: valName,
            imageUrl: typeof v === 'object' ? (v.imageUrl || '') : ''
          }
        }).filter(v => v.name)
        return { prop: propName, propKo: propName, values }
      }).filter(p => p.values.length > 0)
    }

    // OneBound skus → parsedSkus
    if (Array.isArray(rawSkus) && rawSkus.length > 0) {
      parsedSkus = rawSkus.map((sk, sIdx) => {
        // properties 형식이 "0:0;1:0" (숫자 ID) 또는 "颜色分类:红色;尺码:M" (사람이 읽는 형태)
        const propIdStr   = sk.properties || ''          // "0:0;1:0"
        const propNameStr = sk.properties_name || sk.spec_id || ''  // "颜色分类:红色;尺码:M"

        let colorName = ''
        let sizeName  = ''

        if (propIdStr && Object.keys(propValueNameMap).length > 0) {
          // props_list 기반 역매핑: "0:0;1:0" → ["米白色", "35-36"]
          const ids = String(propIdStr).split(';')
          ids.forEach((id, pIdx) => {
            const name = propValueNameMap[id.trim()] || ''
            if (pIdx === 0) colorName = name
            else if (pIdx === 1) sizeName = name
          })
        }

        // 역매핑 실패 시 properties_name("颜色分类:红色;尺码:M")에서 추출
        if (!colorName && !sizeName && propNameStr) {
          const pairs = String(propNameStr).split(';')
          pairs.forEach((pair, pIdx) => {
            const colonIdx = pair.lastIndexOf(':')
            if (colonIdx < 0) return
            const val = pair.slice(colonIdx + 1).trim()
            if (pIdx === 0) colorName = val
            else if (pIdx === 1) sizeName = val
          })
        }

        // 색상 이미지: props_img → img_id → imageUrl 순 탐색
        const colorPropId = String(propIdStr).split(';')[0]?.trim() || ''
        const skuImgUrl = normalizeImg(
          (propsImg && propsImg[colorPropId]) || sk.img_id || sk.imageUrl || sk.image || sk.pic_url || ''
        ) || imageUrl

        const skuPrice = parseFloat(String(sk.price || priceNum).replace(/[^0-9.]/g, '')) || priceNum

        return {
          skuId: String(sk.sku_id || sk.skuId || sk.id || `sku-${sIdx}`),
          color: cleanForeignText(colorName) || colorName,
          size:  cleanForeignText(sizeName)  || sizeName,
          price: skuPrice,
          imageUrl: skuImgUrl,
          stock: parseInt(sk.quantity || sk.stock || '999', 10)
        }
      })
    }




    // skuProps만 있고 skus가 없는 경우 교차 조합 생성
    if (parsedSkuProps.length > 0 && parsedSkus.length === 0) {
      const firstProp = parsedSkuProps[0]
      const secondProp = parsedSkuProps.length > 1 ? parsedSkuProps[1] : null
      const colors = firstProp.values || []
      const sizes = secondProp ? (secondProp.values || []) : []

      if (colors.length > 0 && sizes.length > 0) {
        colors.forEach(c => {
          sizes.forEach(s => {
            parsedSkus.push({
              color: c.name,
              size: s.name,
              price: priceNum,
              imageUrl: c.imageUrl || imageUrl,
              stock: 999
            })
          })
        })
      } else if (colors.length > 0) {
        colors.forEach(c => {
          parsedSkus.push({
            color: c.name,
            size: '',
            price: priceNum,
            imageUrl: c.imageUrl || imageUrl,
            stock: 999
          })
        })
      }
    }

    // skuProps가 없는데 parsedSkus만 있는 경우, parsedSkus로부터 skuProps 역생성
    if (parsedSkuProps.length === 0 && parsedSkus.length > 0) {
      const colorValues = [...new Set(parsedSkus.map(s => s.color).filter(Boolean))].map(c => ({
        name: c,
        imageUrl: parsedSkus.find(s => s.color === c)?.imageUrl || imageUrl
      }))
      const sizeValues = [...new Set(parsedSkus.map(s => s.size).filter(Boolean))].map(s => ({
        name: s
      }))

      if (colorValues.length > 0) {
        parsedSkuProps.push({
          prop: '옵션 / 모델',
          values: colorValues
        })
      }
      if (sizeValues.length > 0) {
        parsedSkuProps.push({
          prop: '규격 / 사이즈',
          values: sizeValues
        })
      }
    }

    // 번역 대상 텍스트 수집 (제목, skuProps 속성명/옵션명, SKU 색상/사이즈)
    const textsToTranslate = []
    if (titleZh) textsToTranslate.push(titleZh)

    parsedSkuProps.forEach(p => {
      if (p.prop) textsToTranslate.push(p.prop)
      p.values.forEach(v => {
        if (v.name) textsToTranslate.push(v.name)
      })
    })

    parsedSkus.forEach(s => {
      if (s.color) textsToTranslate.push(s.color)
      if (s.size) textsToTranslate.push(s.size)
    })

    // 중국어(\u4e00-\u9fff), 키릴/러시아어(\u0400-\u04ff), 비한글 외국어 포함 문자열 번역 대상으로 필터
    const uniqueTexts = [...new Set(textsToTranslate.filter(t => {
      if (typeof t !== 'string' || !t.trim()) return false
      // 한글만으로 되어 있는 경우는 제외, 외국어(중국어, 러시아어, 영문 등)가 포함된 경우 번역 대상
      return /[\u4e00-\u9fff\u3400-\u4dbf\u0400-\u04FF]/.test(t) || /[a-zA-Z]{3,}/.test(t)
    }))]

    let titleKo = ''
    // titleZh가 순수 한국어면 바로 사용, 아니면 번역
    if (titleZh && !/[\u4e00-\u9fff\u3400-\u4dbf\u0400-\u04ff]/.test(titleZh)) {
      titleKo = titleZh
    }

    if (uniqueTexts.length > 0) {
      try {
        const transResult = await translateText(uniqueTexts, 'KO')
        const transList = Array.isArray(transResult) ? transResult : [transResult]
        const transMap = {}
        uniqueTexts.forEach((orig, idx) => {
          transMap[orig] = transList[idx] || orig
        })

        if (transMap[titleZh]) {
          titleKo = transMap[titleZh]
        }

        // skuProps 번역 적용
        parsedSkuProps.forEach(p => {
          if (p.prop && transMap[p.prop]) {
            p.propKo = transMap[p.prop]
            p.prop = transMap[p.prop]
          }
          p.values.forEach(v => {
            if (v.name && transMap[v.name]) {
              v.nameKo = transMap[v.name]
              v.name = transMap[v.name]
            }
          })
        })

        // parsedSkus 번역 적용
        parsedSkus.forEach(s => {
          if (s.color && transMap[s.color]) s.color = transMap[s.color]
          if (s.size && transMap[s.size]) s.size = transMap[s.size]
        })
      } catch (e) {
        console.debug('[fetch1688ProductById] Translation notice:', e.message)
      }
    }

    // 2차 잔여 러시아어/외국어 사전 정제 보정
    parsedSkuProps.forEach(p => {
      p.prop = cleanForeignText(p.prop) || p.prop
      p.propKo = cleanForeignText(p.propKo) || p.propKo
      p.values.forEach(v => {
        v.name = cleanForeignText(v.name) || v.name
        v.nameKo = cleanForeignText(v.nameKo) || v.nameKo
      })
    })

    parsedSkus.forEach(s => {
      s.color = cleanForeignText(s.color) || s.color
      s.size = cleanForeignText(s.size) || s.size
    })

    const cleanedTitleKo = cleanForeignText(titleKo || titleZh) || titleKo || titleZh

    // ─── 원본 1688 URL (OneBound num_iid 기반) ─────────────────────────────
    const cleanNumericId = (it.num_iid || idStr).toString().replace(/[^0-9]/g, '')
    const sourceUrl = cleanNumericId
      ? `https://detail.1688.com/offer/${cleanNumericId}.html`
      : 'https://www.1688.com'

    // ─── 공급사 ID / 이름 추출 (OneBound seller_info 우선) ────────────────
    // OneBound: seller_info = { seller_id, user_num_id, seller_name, nick, ... }
    const sellerInfo = it.seller_info || it.sellerInfo || {}
    const extractedSellerId = String(
      sellerInfo.seller_id || sellerInfo.user_num_id || sellerInfo.userId ||
      it.seller_id || it.sellerId || it.user_num_id || ''
    )
    const companyName = (
      sellerInfo.seller_name || sellerInfo.nick || sellerInfo.shopName ||
      it.nick || it.shopName || it.sellerName || it.company?.name ||
      '1688 인증 직영 제조공장'
    )

    // ─── 본문 상세 설명 이미지 파싱 (OneBound desc_img / desc HTML) ──────────
    // OneBound desc_img: 배열, 쉼표 구분 문자열, 단일 URL, 또는 {url} 객체 배열
    const parseDescImgs = (descImg, descHtml) => {
      const result = []
      const seen = new Set()

      const addUrl = (raw) => {
        let u = typeof raw === 'object' ? (raw.url || raw.src || raw.Url || '') : String(raw || '')
        u = u.trim()
        // 프로토콜 없는 // 형태 URL 자동 보완 (alicdn.com 등)
        if (u.startsWith('//')) u = 'https:' + u
        if (u.startsWith('http://')) u = u.replace('http://', 'https://')
        if (!u.startsWith('https://')) return   // 유효한 https URL이 아니면 무시
        if (u.length < 20) return               // 너무 짧은 URL 필터
        if (u.startsWith('data:')) return        // base64 빈 데이터 차단
        if (seen.has(u)) return
        if (u.includes('images.unsplash.com')) return
        seen.add(u)
        result.push(u)
      }

      // 1순위: desc_img 배열 또는 쉼표 구분 문자열
      if (descImg) {
        if (Array.isArray(descImg)) {
          descImg.forEach(addUrl)
        } else if (typeof descImg === 'string') {
          // 쉼표로 구분된 URL 목록 (http:// 또는 // 형태 URL 모두 포함)
          const parts = descImg.split(',').map(s => s.trim()).filter(Boolean)
          if (parts.length > 1) {
            parts.forEach(addUrl)
          } else {
            addUrl(descImg)
          }
        }
      }

      // 2순위: desc HTML에서 <img src="..."> 패턴 전수 추출
      if (descHtml && typeof descHtml === 'string' && descHtml.includes('<img')) {
        const imgMatches = [...descHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
        imgMatches.forEach(m => addUrl(m[1]))
        // data-src (lazy loading) 패턴도 추출
        const dataSrcMatches = [...descHtml.matchAll(/<img[^>]+data-src=["']([^"']+)["']/gi)]
        dataSrcMatches.forEach(m => addUrl(m[1]))
      }

      return result
    }

    const descImgs = parseDescImgs(it.desc_img, it.desc || it.description || it.detail_html || '')

    console.log(`[fetch1688ProductById] descImgs count: ${descImgs.length} | from desc_img:`, Array.isArray(it.desc_img) ? it.desc_img.length : typeof it.desc_img)

    // ─── 수량별 도매 단가 구간 파싱 (OneBound price_range / quantity_prices / step_prices) ─
    // price_range 예: [["1","15.80"],["100","14.80"],["200","13.80"]]
    // quantity_prices 예: [{begin_amount:"1",price:"15.80"},{begin_amount:"100",price:"14.80"}]
    // step_prices 예: [{startQuantity:1,price:15.8},{startQuantity:100,price:14.8}]
    const parsePriceTiers = () => {
      const rawPR = it.price_range || it.quantity_prices || it.step_prices || it.priceRange || null

      if (!rawPR) return []

      let entries = []

      if (Array.isArray(rawPR) && rawPR.length > 0) {
        const first = rawPR[0]

        if (Array.isArray(first)) {
          // [["1","15.80"],["100","14.80"]] 형식
          entries = rawPR.map(pair => ({
            minQty: parseInt(String(pair[0] || '1'), 10) || 1,
            price: parseFloat(String(pair[1] || '0')) || 0
          }))
        } else if (typeof first === 'object') {
          // [{begin_amount:"1",price:"15.80"}, ...] 또는
          // [{startQuantity:1,price:15.8}, ...] 형식
          entries = rawPR.map(obj => ({
            minQty: parseInt(
              String(obj.begin_amount || obj.beginAmount || obj.startQuantity || obj.min_quantity || obj.minQty || obj.min || '1'),
              10
            ) || 1,
            price: parseFloat(
              String(obj.price || obj.unitPrice || obj.unit_price || '0').replace(/[^0-9.]/g, '')
            ) || 0
          }))
        }
      }

      // 유효한 구간만 필터 (price > 0)
      entries = entries.filter(e => e.price > 0)
      if (entries.length === 0) return []

      // minQty 오름차순 정렬
      entries.sort((a, b) => a.minQty - b.minQty)

      // maxQty 계산 (다음 구간의 minQty - 1, 마지막은 null)
      return entries.map((e, idx) => {
        const next = entries[idx + 1]
        const maxQty = next ? next.minQty - 1 : null
        const label = maxQty ? `${e.minQty}~${maxQty}개` : `${e.minQty}개 이상`
        return {
          minQty: e.minQty,
          maxQty,
          price: Number(e.price.toFixed(2)),
          label
        }
      })
    }

    const priceTiers = parsePriceTiers()
    console.log(`[fetch1688ProductById] priceTiers (${priceTiers.length}개):`, JSON.stringify(priceTiers))

    // ─── 현지 운임 추출 ──────────────────────────────────────────────────────
    const freightRaw = it.freight || it.express_fee || it.deliveryFee || it.shipping_fee || null
    const freightValue = freightRaw
      ? (parseFloat(String(freightRaw).replace(/[^0-9.]/g, '')) || null)
      : null

    const normalizedProduct = {
      id: cleanNumericId || idStr,
      titleZh,
      titleKo: cleanedTitleKo,
      title: cleanedTitleKo,
      price: priceNum,
      priceFormatted: priceNum.toFixed(2),
      minOrder,
      sales: it.sold_count || it.volume || it.sales || '0',
      imageUrl: imageUrl || '',
      images,
      sourceUrl,
      detailUrl: sourceUrl,
      repurchaseRate: it.repurchaseRate || '90%',
      company: companyName,
      sellerId: extractedSellerId,
      memberId: extractedSellerId,
      shopId: extractedSellerId,
      skuProps: parsedSkuProps,
      skus: parsedSkus.length > 0 ? parsedSkus : [],
      descImgs,
      priceTiers,          // 1688 원본 수량 티어 (없으면 빈 배열)
      freight: freightValue, // 원본 현지 운임 (없으면 null)
      raw: it
    }


    saveToCache(memoryDetailCache, 'euchs_product_parsed', idStr, normalizedProduct)
    return normalizedProduct
  } catch (err) {
    console.warn('[1688 Product Fetch] Error:', err.message)
    return null
  }
}

/**
 * 공급사 ID 기반 판매자(공장) 다른 인기 상품 조회
 * @param {string|number} sellerId - 공급사 ID (memberId / shopId / userId)
 * @param {string|number} currentItemId - 현재 상품 ID (결과에서 제외)
 * @param {object} [options] - { titleKo, titleZh, company } 키워드 fallback용
 * @returns {Promise<Array>} 정규화된 공급사 인기 상품 배열 (최대 12개)
 */
export async function fetchSellerProducts(sellerId, currentItemId, options = {}) {
  const sellerIdStr = String(sellerId || '').trim()
  const currentIdStr = String(currentItemId || '').trim()

  // 캐시 키: sellerId 기준
  const cacheKey = `seller_${sellerIdStr}`
  const cached = getFromCache(memorySearchCache, 'euchs_seller', cacheKey)
  if (cached) {
    // 현재 상품 제외 후 반환
    return cached.filter(p => String(p.id) !== currentIdStr).slice(0, 12)
  }

  let items = []

  // ─── 1. 공급사 ID 기반 프록시 API 시도 (/api/1688-seller-items) ─────────
  if (sellerIdStr) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const proxyRes = await fetch(
        `/api/1688-seller-items?sellerId=${encodeURIComponent(sellerIdStr)}&page=1`,
        { signal: controller.signal }
      )
      clearTimeout(timeout)

      if (proxyRes.ok) {
        const result = await proxyRes.json()
        if (result.success && Array.isArray(result.data?.items || result.items)) {
          const rawItems = result.data?.items || result.items || []
          items = rawItems.map((entry, idx) => {
            const it = entry.item || entry
            const imgUrl = (() => {
              const raw = it.pic_url || it.picUrl || it.imageUrl || it.image || it.MainPictureUrl || ''
              const s = String(raw).trim()
              if (s.startsWith('//')) return 'https:' + s
              if (s.startsWith('http://')) return s.replace('http://', 'https://')
              return s
            })()

            const itemId = String(it.num_iid || it.itemId || it.id || `sp-${Date.now()}-${idx}`)
            const cleanId = itemId.replace(/[^0-9]/g, '')
            const price = parseFloat(String(it.price || '0').replace(/[^0-9.]/g, '')) || 0
            const minOrderVal = parseInt(it.min_num || it.minOrder || '1', 10) || 1
            const titleZh = it.title || it.subject || ''

            return {
              id: cleanId || itemId,
              itemId: cleanId || itemId,
              titleZh,
              titleKo: titleZh,
              title: titleZh,
              price,
              priceNum: price,
              priceCny: price,
              priceFormatted: price.toFixed(2),
              moq: minOrderVal,
              minOrder: minOrderVal,
              sales: parseInt(it.sold_count || it.volume || 0, 10),
              imageUrl: imgUrl,
              detailUrl: cleanId ? `https://detail.1688.com/offer/${cleanId}.html` : '',
              company: it.nick || it.shop_name || it.shopName || options.company || '1688 공급사',
              raw: it
            }
          }).filter(p => p.id && (p.titleZh || p.title))


          if (items.length > 0) {
            await translateItemsBatch(items)
          }
        }
      }
    } catch (err) {
      console.debug('[fetchSellerProducts] Proxy notice:', err.name === 'AbortError' ? 'Timeout(10s)' : err.message)
    }
  }

  // ─── 2. Fallback: 공급사 이름 또는 상품 제목 키워드 검색 ─────────────────
  if (items.length === 0) {
    try {
      // 공급사 이름이 있으면 공급사 이름으로, 없으면 상품 제목 앞 8자로 검색
      const searchKw = options.company || (options.titleZh ? options.titleZh.slice(0, 10) : '') || (options.titleKo ? options.titleKo.slice(0, 8) : '') || '인기 도매 상품'
      const res = await search1688WithTranslation(searchKw, 1)
      if (res?.items && Array.isArray(res.items)) {
        items = res.items
      }
    } catch (err) {
      console.warn('[fetchSellerProducts] Keyword fallback failed:', err.message)
    }
  }

  // 캐시 저장 (현재 상품 제외 전 전체 저장)
  if (items.length > 0) {
    saveToCache(memorySearchCache, 'euchs_seller', cacheKey, items)
  }

  // 현재 상품 제외 후 최대 12개 반환
  return items.filter(p => String(p.id) !== currentIdStr).slice(0, 12)
}

