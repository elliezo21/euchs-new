/**
 * 1688 DataHub API & DeepL Translation Service Module with Intelligent Mock Fallback
 * 이유씨컴퍼니 (EUCHS) - 1688 실시간 검색 & DeepL 번역 연동 및 429 Quota 초과 무결점 Mock 자동 전환
 */

import { getMockSearchResults, getMockProductDetail } from './mock1688Data'

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
  RAPIDAPI_KEY: getEnv('RAPIDAPI_KEY', '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'),
  RAPIDAPI_HOST: getEnv('RAPIDAPI_HOST', 'otapi-1688.p.rapidapi.com'),
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
const memorySearchCache = new Map()
const memoryDetailCache = new Map()
const memoryTranslationCache = new Map()

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
 * 1688 DataHub 실시간 상품 검색 (API 에러/429 발생 시 고품질 Mock 데이터셋 자동 반환)
 * @param {string} queryZh - 중국어/한국어 검색 키워드
 * @param {number|string} page - 페이지 번호 (기본 1)
 * @param {object} [options] - 추가 옵션 { sort, price_min, price_max }
 * @returns {Promise<object>} 정규화된 1688 검색 결과 (한국어 번역 포함)
 */
export async function search1688(queryZh, page = 1, options = {}) {
  const query = String(queryZh || '').trim()
  if (!query) {
    const mockRes = getMockSearchResults('', page, options)
    await translateItemsBatch(mockRes.items)
    return mockRes
  }

  const { sort = 'default', price_min = '', price_max = '' } = options
  const cacheKey = `${query}_p${page}_s${sort}_min${price_min}_max${price_max}`

  // 1. Quota Defense: 캐시 확인
  const cached = getFromCache(memorySearchCache, 'euchs_search', cacheKey)
  if (cached) {
    return cached
  }

  const rapidKey = CONFIG.RAPIDAPI_KEY
  const rapidHost = CONFIG.RAPIDAPI_HOST

  let data = null
  let isApiError = false

  // 2. Vercel Serverless / Vite Dev Server 프록시 우선 시도 (/api/1688-search)
  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      ...(sort && sort !== 'default' ? { sort } : {}),
      ...(price_min ? { price_min } : {}),
      ...(price_max ? { price_max } : {})
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃
    const proxyRes = await fetch(`/api/1688-search?${params.toString()}`, { signal: controller.signal })
    clearTimeout(timeout)

    if (proxyRes.ok) {
      const result = await proxyRes.json()
      if (result.success) {
        // Otapi 응답: result.data 에 원본이 들어있음 (Result.Items.Items.Content[])
        data = result.data || result.result || result
        console.log('[1688 Search] Proxy success. Otapi keys:', Object.keys(data || {}).slice(0, 5))
      } else if (result.status === 429 || String(result.data?.message || '').includes('exceeded')) {
        isApiError = true
        console.warn('[1688 Search] Proxy quota exceeded')
      } else {
        data = result.data || result
        console.log('[1688 Search] Proxy response received')
      }
    } else {
      const errBody = await proxyRes.json().catch(() => ({}))
      console.warn(`[1688 Search] Proxy HTTP ${proxyRes.status}:`, errBody)
      // non-200이어도 isApiError = true 설정하지 않음 → Direct API 폴백 허용
    }
  } catch (err) {
    console.debug('[1688 Search] Proxy notice:', err.name === 'AbortError' ? 'Timeout(10s)' : err.message)
  }

  // 3. Direct RapidAPI Fallback (프록시 실패 시, 쿼터 초과는 제외)
  if (!data && !isApiError && rapidKey) {
    try {
      const targetUrl = new URL(`https://${rapidHost}/item_search`)
      targetUrl.searchParams.set('q', query)
      targetUrl.searchParams.set('page', String(page))
      if (sort && sort !== 'default') targetUrl.searchParams.set('sort', sort)
      if (price_min) targetUrl.searchParams.set('price_min', price_min)
      if (price_max) targetUrl.searchParams.set('price_max', price_max)

      console.log('[1688 Search] Direct RapidAPI:', targetUrl.toString())
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃
      const directRes = await fetch(targetUrl.toString(), {
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': rapidHost
        },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (directRes.ok) {
        data = await directRes.json()
        console.log('[1688 Search] Direct API success:', Object.keys(data || {}).slice(0, 5))
      } else {
        isApiError = true
        console.warn(`[1688 API] RapidAPI status: ${directRes.status} (Fallback to Mock)`)
      }
    } catch (err) {
      isApiError = true
      console.warn('[1688 API] Direct search error:', err.name === 'AbortError' ? 'Timeout(10s)' : err.message)
    }
  }

  // API 응답 데이터가 없는 경우
  if (!data) {
    console.warn(`[1688 API] No response received for "${query}"`)
    return { items: [], page: Number(page), pageSize: 40, totalResults: '0', hasMore: false, queryZh: query }
  }

  // 응답 데이터 파싱 및 정규화 (Otapi 1688 실시간 파서)
  try {
    const resData = data || {}

    // Otapi 응답 구조: resData.Result.Items.Items.Content[]
    // 프록시 경유 시: resData.Result.Items.Items.Content[] 또는 resData.result.resultList[]
    const rawList =
      resData?.Result?.Items?.Items?.Content ||
      resData?.Result?.Items?.Content ||
      resData?.result?.resultList ||
      resData?.resultList ||
      resData?.data?.Result?.Items?.Items?.Content ||
      []

    if (!Array.isArray(rawList) || rawList.length === 0) {
      console.warn(`[1688 API] Empty rawList for "${query}"`)
      return { items: [], page: Number(page), pageSize: 40, totalResults: '0', hasMore: false, queryZh: query }
    }

    const items = rawList.map((entry, idx) => {
      // Otapi 필드 매핑
      const it = entry.item || entry

      // Otapi 이미지: MainPictureUrl
      let rawImage = it.MainPictureUrl || it.imageUrl || it.image || it.picUrl ||
                     it.pic_url || it.img || it.imgUrl || it.pic || it.thumbnail ||
                     (Array.isArray(it.PictureList) && it.PictureList[0]) || ''

      let imageUrl = String(rawImage || '').trim()
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://')
      }

      // Otapi 상품 ID: it.Id 또는 it.ItemId
      const itemId = String(it.Id || it.ItemId || it.itemId || it.offerId || it.id || `item-${Date.now()}-${idx}`)

      let detailUrl = it.ItemUrl || it.itemUrl || it.detailUrl ||
        (itemId ? `https://detail.1688.com/offer/${itemId}.html` : '')
      if (detailUrl.startsWith('//')) {
        detailUrl = 'https:' + detailUrl
      }

      // Otapi 가격: QuantityRanges[0].Price.OriginalPrice (위안화)
      const priceRange = Array.isArray(it.QuantityRanges) ? it.QuantityRanges[0] : null
      const priceNum = parseFloat(
        priceRange?.Price?.OriginalPrice ||
        priceRange?.Price?.ConvertedPriceWithoutSign ||
        it.Price?.OriginalPrice ||
        it.Price?.ConvertedPriceWithoutSign ||
        it.price || '0'
      ) || 0

      // Otapi MOQ: QuantityRanges[0].MinQuantity 또는 MasterQuantity
      const minOrder = parseInt(
        priceRange?.MinQuantity || it.MasterQuantity || it.minOrder || '2', 10
      ) || 2

      // Otapi 판매량: OrderCount 또는 SalesCount
      const sales = parseInt(it.OrderCount || it.SalesCount || it.sales || 0, 10)

      // Otapi 중국어 제목: it.Title
      const titleZh = it.Title || it.title || it.subject || ''

      // 공급사: VendorInfo 또는 company
      const company = it.VendorInfo?.VendorName || it.company?.name || it.shopName || '1688 공식 인증 공급사'

      return {
        id: itemId,
        itemId,
        titleZh,
        titleEn: it.titleEn || '',
        titleKo: it.titleKo || titleZh,
        title: titleZh,
        price: priceNum,
        priceNum: priceNum,
        priceCny: priceNum,
        priceFormatted: priceNum.toFixed(2),
        moq: minOrder,
        minOrder,
        sales,
        repurchaseRate: it.rePurchaseRate || it.repurchaseRate || 85,
        imageUrl,
        detailUrl,
        itemUrl: detailUrl,
        productUrl: detailUrl,
        company,
        starLevel: it.company?.starLevel || it.VendorInfo?.StarLevel || 5.0,
        raw: it
      }
    }).filter(item => item.id && (item.title || item.titleZh))

    // 일괄 한국어 번역 수행
    await translateItemsBatch(items)

    const totalCount = resData?.Result?.Items?.TotalCount || String(rawList.length)
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
 * 한글 검색어 ➔ 중국어 번역 ➔ 1688 검색 ➔ 결과 일괄 한글 번역 (DeepL)
 */
export async function search1688WithTranslation(koreanQuery, page = 1, options = {}, onProgress = null) {
  const query = String(koreanQuery || '').trim()
  if (!query) {
    const mockRes = getMockSearchResults('', page, options)
    await translateItemsBatch(mockRes.items)
    return {
      success: true,
      queryKo: '',
      queryZh: '',
      page: mockRes.page,
      pageSize: mockRes.pageSize,
      totalResults: mockRes.totalResults,
      hasMore: mockRes.hasMore,
      items: mockRes.items
    }
  }

  // Step 1: 한글 검색어 ➔ 중국어 번역
  let queryZh = query
  const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query)

  if (isKorean) {
    if (onProgress) {
      onProgress({
        step: 1,
        message: `한글 키워드 분석 및 번역 중: "${query}"...`
      })
    }

    try {
      const translated = await translateText(query, 'ZH', 'KO')
      queryZh = typeof translated === 'string' ? translated : (translated[0] || query)
    } catch (err) {
      queryZh = query
    }
  }

  if (onProgress) {
    onProgress({
      step: 2,
      message: `1688 실시간 상품 소싱 검색 중: "${query}"...`,
      queryZh
    })
  }

  // Step 2: 1688 상품 검색 (내부에서 search1688 실행 및 일괄 한국어 번역 완료)
  let searchResult
  try {
    searchResult = await search1688(queryZh, page, options)
  } catch (err) {
    console.warn('[1688 Search] Fallback to Mock dataset:', err.message)
    searchResult = getMockSearchResults(query, page, options)
    await translateItemsBatch(searchResult.items)
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
 * 1688 이미지(사진) 검색
 * 공개 접근 가능한 이미지 URL → /api/1688-image-search → resultList 표준 포맷 반환
 * @param {string} imageUrl - 공개 접근 가능한 이미지 URL (JPEG/PNG/WEBP)
 * @returns {Promise<{ success: boolean, items: Array, totalResults: string }>}
 */
export async function search1688ByImageUrl(imageUrl) {
  const url = String(imageUrl || '').trim()
  if (!url) {
    console.warn('[1688 ImageSearch] imageUrl is empty')
    return { success: false, items: [], totalResults: '0' }
  }

  console.log('[1688 ImageSearch] Calling proxy with imgUrl:', url.slice(0, 80))

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃 (이미지 CDN 지연 대응)

    const proxyRes = await fetch(`/api/1688-image-search?imgUrl=${encodeURIComponent(url)}&page=1`, {
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!proxyRes.ok) {
      const errBody = await proxyRes.json().catch(() => ({}))
      console.warn('[1688 ImageSearch] Proxy HTTP error:', proxyRes.status, errBody)
      return { success: false, items: [], totalResults: '0', error: errBody }
    }

    const result = await proxyRes.json()
    if (!result.success || !result.data) {
      console.warn('[1688 ImageSearch] Proxy returned success=false:', result)
      return { success: false, items: [], totalResults: '0', error: result }
    }

    const rawList = result.data?.result?.resultList || []
    console.log('[1688 ImageSearch] Raw result count:', rawList.length)

    if (rawList.length === 0) {
      return { success: true, items: [], totalResults: '0' }
    }

    // search1688() 와 동일한 아이템 포맷팅 패턴 재사용
    const items = rawList.map((entry, idx) => {
      const it = entry.item || entry

      let rawImage = it.imageUrl || it.image || it.picUrl || it.pic_url || it.img || it.imgUrl || it.pic || it.thumbnail ||
                     entry.imageUrl || entry.image || entry.picUrl || entry.pic_url || entry.img || entry.imgUrl || entry.pic ||
                     it.sku?.def?.imageUrl || it.sku?.def?.image || (Array.isArray(it.images) && it.images[0]) || ''

      let imageUrl = String(rawImage || '').trim()
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://')
      }

      let detailUrl = it.itemUrl || it.detailUrl || ''
      if (detailUrl.startsWith('//')) {
        detailUrl = 'https:' + detailUrl
      } else if (!detailUrl && it.itemId) {
        detailUrl = `https://detail.1688.com/offer/${it.itemId}.html`
      }

      const priceStr = it.sku?.def?.price || it.price || '0'
      const priceNum = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0

      const minOrderStr = it.sku?.def?.minOrder || it.minOrder || '1'
      const minOrder = parseInt(String(minOrderStr).replace(/[^0-9]/g, ''), 10) || 1

      const titleZh = it.title || it.subject || ''

      return {
        id: String(it.itemId || `imgitem-${Date.now()}-${idx}`),
        titleZh,
        titleEn: it.titleEn || '',
        titleKo: '',       // translateItemsBatch로 채워짐
        title: titleZh,
        price: priceNum,
        priceFormatted: priceNum.toFixed(2),
        minOrder,
        sales: it.sales || '0',
        imageUrl,
        detailUrl,
        repurchaseRate: it.rePurchaseRate || it.repurchaseRate || '90%',
        starLevel: parseFloat(it.averageStarRate || '5') || 5.0,
        company: it.company?.name || it.shopName || '1688 공식 인증 공급사',
        raw: it
      }
    })

    // 기존 번역 파이프라인 그대로 재사용
    await translateItemsBatch(items)

    return {
      success: true,
      items,
      totalResults: String(rawList.length)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[1688 ImageSearch] Request timed out after 15s')
      return { success: false, items: [], totalResults: '0', error: 'timeout' }
    }
    console.error('[1688 ImageSearch] Unexpected error:', err)
    return { success: false, items: [], totalResults: '0', error: err.message }
  }
}

/**
 * 1688 상품 상세 정보 Raw 조회
 * @param {string|number} itemId - 1688 상품 고유 ID
 * @returns {Promise<object>}
 */
export async function getItemDetail1688(itemId) {
  const idStr = String(itemId || '').trim()
  // 빈값, "undefined", "null" 문자열 방어
  if (!idStr || idStr === 'undefined' || idStr === 'null') {
    console.warn('[1688 Detail] Invalid itemId provided:', itemId, '→ using Mock fallback')
    return getMockProductDetail('804895839701')
  }

  // Quota Defense: 상세 조회 캐시 확인
  const cached = getFromCache(memoryDetailCache, 'euchs_detail_raw', idStr)
  if (cached) {
    console.debug('[1688 Detail] Cache HIT for:', idStr)
    return cached
  }

  // Otapi ID 보정
  const otapiId = /^\d+$/.test(idStr) ? `abb-${idStr}` : idStr

  const rapidKey = CONFIG.RAPIDAPI_KEY
  const rapidHost = 'otapi-1688.p.rapidapi.com'

  let data = null

  // 1. Vercel / Vite Serverless 프록시 우선 시도 (/api/1688-item-detail & /api/1688-detail)
  const proxyEndpoints = ['/api/1688-item-detail', '/api/1688-detail']
  for (const ep of proxyEndpoints) {
    if (data) break
    try {
      const proxyRes = await fetch(`${ep}?itemId=${encodeURIComponent(otapiId)}`)
      if (proxyRes.ok) {
        const resJson = await proxyRes.json()
        if (resJson.success && resJson.data) {
          data = resJson.data
          console.log(`[1688 Item Detail Response] (via ${ep}):`, data)
        }
      }
    } catch (err) {
      console.debug(`[1688 Detail] ${ep} notice:`, err.message)
    }
  }

  // 2. Direct Otapi RapidAPI Fallback
  if (!data && rapidKey) {
    try {
      const targetUrl = `https://${rapidHost}/BatchGetItemFullInfo?language=zh&itemId=${encodeURIComponent(otapiId)}`
      console.log(`[1688 Detail] Trying direct Otapi API: ${targetUrl}`)
      const directRes = await fetch(targetUrl, {
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': rapidHost
        }
      })
      if (directRes.ok) {
        const raw = await directRes.json()
        const itemData = raw?.Result?.Item || raw?.Result?.ItemFullInfo || raw?.Result || raw
        if (itemData && !raw.ErrorCode?.includes?.('Error')) {
          data = itemData
          console.log('[1688 Item Detail Direct Response]:', data)
        }
      }
    } catch (err) {
      console.warn('[1688 Detail] Direct fetch failed:', err.message)
    }
  }

  if (!data) {
    console.warn('[1688 Detail] API failed, using Mock for id:', idStr)
    const mockDetail = getMockProductDetail(idStr)
    saveToCache(memoryDetailCache, 'euchs_detail_raw', idStr, mockDetail)
    return mockDetail
  }

  saveToCache(memoryDetailCache, 'euchs_detail_raw', idStr, data)
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
    return getMockProductDetail('804895839701')
  }

  const cachedProduct = getFromCache(memoryDetailCache, 'euchs_product_parsed', idStr)
  if (cachedProduct) {
    return cachedProduct
  }

  try {
    const rawData = await getItemDetail1688(idStr)

    // ─── 1. 다계층 래퍼 구조 완전 탐색 ───────────────────────────────────
    // 1688 DataHub + Vercel 프록시 { success, data: <RapidAPI raw> } 조합
    // RapidAPI 원본 가능 구조:
    //   rawData.result.item
    //   rawData.result.data.item
    //   rawData.result.data
    //   rawData.data.item
    //   rawData.data.result.item
    //   rawData.data
    //   rawData.item
    //   rawData  (Mock 등)
    const it = (
      rawData?.result?.item ||
      rawData?.result?.data?.item ||
      rawData?.result?.data ||
      rawData?.data?.item ||
      rawData?.data?.result?.item ||
      rawData?.data?.result ||
      rawData?.data ||
      rawData?.item ||
      rawData || {}
    )

    console.log('[1688 fetch1688ProductById] parsed item keys:', Object.keys(it).slice(0, 20))

    // ─── 2. rawSku: sku 서브객체 (없으면 it 자체에 직접 skuProps 가 있을 수 있음) ───
    const rawSku = it.sku || {}

    // ─── 3. rawSkuProps: 모든 가능한 키 순서대로 탐색 ─────────────────────
    let rawSkuProps = (
      rawSku.skuProps ||        // it.sku.skuProps
      rawSku.sku_props ||       // it.sku.sku_props
      rawSku.properties ||      // it.sku.properties
      rawSku.props ||           // it.sku.props
      it.skuProps ||            // it.skuProps
      it.sku_props ||           // it.sku_props
      it.props ||               // it.props
      it.properties ||          // it.properties
      rawSku.skuList?.length && (() => {
        // skuList에서 역생성 시도는 아래 rawSkus 파싱 후 처리
        return null
      })() ||
      null
    )

    // JSON 문자열인 경우 파싱
    if (typeof rawSkuProps === 'string') {
      try { rawSkuProps = JSON.parse(rawSkuProps) } catch (e) { rawSkuProps = null }
    }
    // 배열이 아닌 경우 null 처리
    if (!Array.isArray(rawSkuProps)) rawSkuProps = null

    console.log('[1688 fetch1688ProductById] rawSkuProps:', rawSkuProps?.length ?? 'null', rawSkuProps)

    // ─── 4. rawSkus 탐색 ────────────────────────────────────────────────
    let rawSkus = (
      it.skus ||
      it.skuList ||
      rawSku.skuList ||
      rawSku.sku_list ||
      it.sku_list ||
      it.raw?.skus ||
      it.raw?.skuList ||
      []
    )
    if (typeof rawSkus === 'string') {
      try { rawSkus = JSON.parse(rawSkus) } catch (e) { rawSkus = [] }
    }
    if (!Array.isArray(rawSkus)) rawSkus = []

    // rawSkuProps가 없고 rawSkus가 있는 경우, rawSkus에서 역추출 시도
    if (!rawSkuProps && rawSkus.length > 0) {
      console.log('[1688 fetch1688ProductById] Deriving skuProps from rawSkus:', rawSkus.slice(0, 2))
      // skuList의 각 항목에서 specAttrs/propPath/attributes 파싱
      const colorSet = new Map() // name -> imageUrl
      const sizeSet = new Set()

      rawSkus.forEach(s => {
        // 예: specAttrs = "颜色:卡其色;尺码:240" or specId = "1627207:1232324;20509:2325"
        const specStr = s.specAttrs || s.specId || s.propPath || s.attributes || ''
        const parts = String(specStr).split(';')

        let colorName = s.color || s.colorName || s.prop || ''
        let sizeName = s.size || s.sizeName || s.spec || s.subPropName || ''

        if (!colorName && !sizeName && parts.length >= 1) {
          // "키:값" 형식 파싱
          const kv0 = parts[0]?.split(':')
          const kv1 = parts[1]?.split(':')
          colorName = kv0 ? (kv0.length >= 2 ? kv0[kv0.length - 1] : kv0[0]) : ''
          sizeName = kv1 ? (kv1.length >= 2 ? kv1[kv1.length - 1] : kv1[0]) : ''
        }
        if (colorName) colorSet.set(colorName, s.imageUrl || s.image || '')
        if (sizeName) sizeSet.add(sizeName)
      })

      rawSkuProps = []
      if (colorSet.size > 0) {
        rawSkuProps.push({
          prop: '색상/모델',
          values: [...colorSet.entries()].map(([name, img]) => ({ name, imageUrl: img }))
        })
      }
      if (sizeSet.size > 0) {
        rawSkuProps.push({
          prop: '사이즈/규격',
          values: [...sizeSet].map(name => ({ name, imageUrl: '' }))
        })
      }

      if (rawSkuProps.length === 0) rawSkuProps = null
      console.log('[1688 fetch1688ProductById] Derived rawSkuProps from skuList:', rawSkuProps)
    }

    // 이 시점에 rawSkuProps이 여전히 null이면 빈 배열
    if (!rawSkuProps) rawSkuProps = []

    // ─── 2. Otapi / 1688 기본 상품 정보 추출 ───────────────────────────
    // OriginalTitle(중국어 원문) 및 Title(한국어 또는 원문) 추출
    const rawZhTitle = it.OriginalTitle || it.Title || it.title || it.subject || ''
    const titleZh = rawZhTitle

    // 메인 이미지 및 갤러리 이미지
    let rawImage = (
      it.MainPictureUrl || it.imageUrl || it.image || it.picUrl || it.pic_url ||
      it.img || it.imgUrl || it.pic || it.thumbnail ||
      rawSku.def?.imageUrl || rawSku.def?.image ||
      (Array.isArray(it.images) && it.images[0]) || ''
    )
    let imageUrl = String(rawImage || '').trim()
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
    else if (imageUrl.startsWith('http://')) imageUrl = imageUrl.replace('http://', 'https://')

    // ─── 다중 이미지 배열 파싱 (Otapi 필드 우선 순위 다중 탐색) ───────────────
    let images = []
    const normalizeImg = (u) => {
      const s = String(u || '').trim()
      if (!s) return ''
      if (s.startsWith('//')) return 'https:' + s
      if (s.startsWith('http://')) return s.replace('http://', 'https://')
      return s.startsWith('http') ? s : ''
    }

    // 1순위: Otapi PictureList (배열 내 객체 또는 문자열)
    if (Array.isArray(it.PictureList) && it.PictureList.length > 0) {
      images = it.PictureList.map(p =>
        typeof p === 'string' ? normalizeImg(p) : normalizeImg(p.Url || p.url || p.Large || p.src || '')
      ).filter(Boolean)
    }
    // 2순위: Otapi Pictures
    if (images.length === 0 && Array.isArray(it.Pictures) && it.Pictures.length > 0) {
      images = it.Pictures.map(p =>
        typeof p === 'string' ? normalizeImg(p) : normalizeImg(p.Url || p.url || p.Large || p.Medium || p.src || '')
      ).filter(Boolean)
    }
    // 3순위: it.images (1688 DataHub)
    if (images.length === 0 && Array.isArray(it.images) && it.images.length > 0) {
      images = it.images.map(img =>
        typeof img === 'string' ? normalizeImg(img) : normalizeImg(img.url || img.src || img.Url || '')
      ).filter(Boolean)
    }
    // 4순위: it.pic_urls / it.picUrls / it.itemImages (다른 API 포맷)
    const altImgField = it.pic_urls || it.picUrls || it.itemImages || it.imgList || null
    if (images.length === 0 && Array.isArray(altImgField) && altImgField.length > 0) {
      images = altImgField.map(img =>
        typeof img === 'string' ? normalizeImg(img) : normalizeImg(img.url || img.src || img.Url || '')
      ).filter(Boolean)
    }
    // 5순위: skuList 내 유니크 이미지 수집
    if (images.length === 0) {
      const skuImgs = []
      const skuListSrc = it.skuList || rawSku.skuList || []
      if (Array.isArray(skuListSrc)) {
        skuListSrc.forEach(s => {
          const u = normalizeImg(s.imageUrl || s.image || s.picUrl || '')
          if (u && !skuImgs.includes(u)) skuImgs.push(u)
        })
      }
      images = skuImgs
    }
    // 최종 Fallback: 메인 이미지 1장
    if (images.length === 0 && imageUrl) {
      images = [imageUrl]
    }
    // 중복 제거
    images = [...new Set(images)]

    // 기본 단가 및 MOQ (MasterQuantity는 총 재고량이므로 MOQ로 취급하지 않음)
    const priceRange = Array.isArray(it.QuantityRanges) && it.QuantityRanges.length > 0 ? it.QuantityRanges[0] : null
    const priceNum = parseFloat(
      priceRange?.Price?.OriginalPrice ||
      priceRange?.Price?.ConvertedPriceWithoutSign ||
      it.Price?.OriginalPrice ||
      it.Price?.ConvertedPriceWithoutSign ||
      rawSku.def?.price || it.price || '0'
    ) || 0

    const minOrder = parseInt(
      priceRange?.MinQuantity || rawSku.def?.minOrder || it.minOrder || '1', 10
    ) || 1

    // ─── 3. Otapi Attributes ➔ skuProps 파싱 (Original/Vid/Pid 1순위 사용) ───
    let parsedSkuProps = []
    let parsedSkus = []

    if (Array.isArray(it.Attributes) && it.Attributes.length > 0) {
      const propMap = new Map() // propName -> Map(valName -> imageUrl)

      it.Attributes.forEach(attr => {
        // 1순위: 한국어 번역 PropertyName / Value (language=ko 일 때), 없으면 OriginalPropertyName / OriginalValue / Pid / Vid
        let rawPropName = String(attr.PropertyName || attr.OriginalPropertyName || attr.Pid || '').trim()
        let rawValName = String(attr.Value || attr.OriginalValue || attr.Vid || '').trim()

        // 만약 러시아어가 섞여 있으면 Original(중국어 원문)으로 대체
        if (/[\u0400-\u04ff]/i.test(rawPropName) && attr.OriginalPropertyName) {
          rawPropName = String(attr.OriginalPropertyName || attr.Pid || '').trim()
        }
        if (/[\u0400-\u04ff]/i.test(rawValName) && (attr.OriginalValue || attr.Vid)) {
          rawValName = String(attr.OriginalValue || attr.Vid || '').trim()
        }

        if (!rawPropName || !rawValName) return

        const propName = cleanForeignText(rawPropName) || rawPropName
        const valName = cleanForeignText(rawValName) || rawValName

        const isConfig = attr.IsConfigurator ||
          rawPropName.includes('色') || rawPropName.includes('尺') ||
          rawPropName.includes('规') || rawPropName.includes('码') ||
          rawPropName.includes('款') || rawPropName.includes('型') ||
          rawPropName.includes('容') || rawPropName.includes('量') ||
          /색상|사이즈|규격|용량|Color|Size/i.test(propName)

        if (isConfig) {
          if (!propMap.has(propName)) {
            propMap.set(propName, new Map())
          }
          const valMap = propMap.get(propName)
          const img = attr.ImageUrl || attr.MiniImageUrl || attr.SmallImageUrl || ''
          if (!valMap.has(valName) || (!valMap.get(valName) && img)) {
            valMap.set(valName, img)
          }
        }
      })

      propMap.forEach((valMap, propName) => {
        parsedSkuProps.push({
          prop: propName,
          propKo: propName,
          values: [...valMap.entries()].map(([name, img]) => ({
            name,
            nameKo: name,
            imageUrl: img
          }))
        })
      })
    }

    // ─── 4. Otapi ConfiguredItems ➔ skus 파싱 ────────────────────────────
    if (Array.isArray(it.ConfiguredItems) && it.ConfiguredItems.length > 0) {
      parsedSkus = it.ConfiguredItems.map((c, cIdx) => {
        const configs = Array.isArray(c.Configurators) ? c.Configurators : []
        const colorCfg = configs.find(cfg => String(cfg.Pid || '').includes('色') || /Цвет|Color|색상/i.test(cfg.Pid || '')) || configs[0]
        const sizeCfg = configs.find(cfg => cfg !== colorCfg) || (configs.length > 1 ? configs[1] : null)

        let rawColorName = colorCfg?.Value || colorCfg?.OriginalValue || colorCfg?.Vid || ''
        let rawSizeName = sizeCfg?.Value || sizeCfg?.OriginalValue || sizeCfg?.Vid || ''

        if (/[\u0400-\u04ff]/i.test(rawColorName) && (colorCfg?.OriginalValue || colorCfg?.Vid)) {
          rawColorName = colorCfg.OriginalValue || colorCfg.Vid || ''
        }
        if (/[\u0400-\u04ff]/i.test(rawSizeName) && (sizeCfg?.OriginalValue || sizeCfg?.Vid)) {
          rawSizeName = sizeCfg.OriginalValue || sizeCfg.Vid || ''
        }

        const colorName = cleanForeignText(rawColorName) || rawColorName
        const sizeName = cleanForeignText(rawSizeName) || rawSizeName

        const attrMatch = Array.isArray(it.Attributes) ? it.Attributes.find(a => (a.OriginalValue === rawColorName || a.Vid === rawColorName || a.Value === rawColorName) && a.ImageUrl) : null
        const skuImg = attrMatch?.ImageUrl || imageUrl

        const skuPrice = parseFloat(
          c.Price?.OriginalPrice ||
          c.Price?.ConvertedPriceWithoutSign ||
          priceNum
        ) || priceNum

        return {
          skuId: String(c.Id || `sku-${cIdx}`),
          color: colorName,
          size: sizeName,
          price: skuPrice,
          imageUrl: skuImg,
          stock: parseInt(c.Quantity ?? '999', 10)
        }
      })
    }

    // 기존 1688 DataHub skuProps / rawSkus 폴백 (Otapi에서 안 나온 경우)
    if (parsedSkuProps.length === 0 && Array.isArray(rawSkuProps) && rawSkuProps.length > 0) {
      parsedSkuProps = rawSkuProps.map(p => {
        const propName = cleanForeignText(p.prop || p.propKo || p.propName || p.name || '')
        const rawVals = Array.isArray(p.values) ? p.values : []
        const values = rawVals.map(v => {
          const valName = cleanForeignText(typeof v === 'string' ? v : (v.name || v.value || ''))
          return {
            name: valName,
            nameKo: valName,
            imageUrl: typeof v === 'object' ? (v.imageUrl || '') : ''
          }
        }).filter(v => v.name)
        return { prop: propName, propKo: propName, values }
      }).filter(p => p.values.length > 0)
    }

    if (parsedSkus.length === 0 && Array.isArray(rawSkus) && rawSkus.length > 0) {
      parsedSkus = rawSkus.map(s => ({
        skuId: s.skuId || s.id || '',
        color: cleanForeignText(s.color || s.propName || ''),
        size: cleanForeignText(s.size || s.spec || ''),
        price: parseFloat(s.price || priceNum),
        imageUrl: s.imageUrl || imageUrl,
        stock: parseInt(s.stock || s.quantity || '999', 10)
      }))
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
    // it.Title에 러시아어(키릴문자)가 전혀 없으면 한국어 번역문으로 즉시 사용
    if (it.Title && !/[\u0400-\u04ff]/i.test(it.Title)) {
      titleKo = it.Title
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

    const normalizedProduct = {
      id: idStr,
      titleZh,
      titleKo: cleanedTitleKo,
      title: cleanedTitleKo,
      price: priceNum,
      priceFormatted: priceNum.toFixed(2),
      minOrder,
      sales: it.sales || '1.5만+',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      images,
      detailUrl: `https://detail.1688.com/offer/${idStr}.html`,
      repurchaseRate: it.repurchaseRate || '94%',
      company: it.company?.name || it.shopName || '1688 인증 직영 제조공장',
      skuProps: parsedSkuProps,
      skus: parsedSkus.length > 0 ? parsedSkus : (it.skus || []),
      descImgs: it.descImgs || it.descriptionImages || [],
      raw: it
    }

    saveToCache(memoryDetailCache, 'euchs_product_parsed', idStr, normalizedProduct)
    return normalizedProduct
  } catch (err) {
    console.warn('[1688 Product Fetch] Fallback to Mock product:', err.message)
    const mockDetail = getMockProductDetail(idStr)
    saveToCache(memoryDetailCache, 'euchs_product_parsed', idStr, mockDetail)
    return mockDetail
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
            let rawImg = it.MainPictureUrl || it.imageUrl || it.image || it.picUrl || it.pic_url || ''
            let imgUrl = String(rawImg).trim()
            if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
            else if (imgUrl.startsWith('http://')) imgUrl = imgUrl.replace('http://', 'https://')

            const itemId = String(it.Id || it.ItemId || it.itemId || it.id || `sp-${Date.now()}-${idx}`)
            const priceRange = Array.isArray(it.QuantityRanges) ? it.QuantityRanges[0] : null
            const price = parseFloat(
              priceRange?.Price?.OriginalPrice || it.Price?.OriginalPrice || it.price || '0'
            ) || 0
            const minOrderVal = parseInt(priceRange?.MinQuantity || it.MasterQuantity || it.minOrder || '1', 10) || 1
            const titleZh = it.Title || it.title || it.subject || ''

            return {
              id: itemId,
              itemId,
              titleZh,
              titleKo: titleZh,
              title: titleZh,
              price,
              priceNum: price,
              priceCny: price,
              priceFormatted: price.toFixed(2),
              moq: minOrderVal,
              minOrder: minOrderVal,
              sales: parseInt(it.OrderCount || it.SalesCount || 0, 10),
              imageUrl: imgUrl,
              detailUrl: itemId ? `https://detail.1688.com/offer/${itemId}.html` : '',
              company: it.VendorInfo?.VendorName || it.company?.name || it.shopName || options.company || '1688 공급사',
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
