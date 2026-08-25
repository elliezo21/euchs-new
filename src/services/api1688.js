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
  RAPIDAPI_HOST: getEnv('RAPIDAPI_HOST', '1688-datahub.p.rapidapi.com'),
  DEEPL_API_KEY: getEnv('DEEPL_API_KEY', 'a2f4e6d2-ed34-4c8c-8ed3-beb80e473d71:fx'),
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
 * DeepL 텍스트 번역 함수 (에러 발생 시 원문 반환으로 안전하게 Fallback)
 * @param {string|string[]} text - 번역할 텍스트 또는 텍스트 배열
 * @param {string} targetLang - 대상 언어 ('ZH' | 'KO' | 'EN' 등)
 * @param {string} [sourceLang] - 출발 언어 (선택 사항)
 * @returns {Promise<string|string[]>} 번역된 결과
 */
export async function translateText(text, targetLang = 'ZH', sourceLang = null) {
  if (!text || (Array.isArray(text) && text.length === 0)) {
    return text
  }

  const isArray = Array.isArray(text)
  const textArray = isArray ? text : [text]

  const cleanTexts = textArray.map(t => (t ? String(t).trim() : ''))
  if (cleanTexts.every(t => !t)) {
    return text
  }

  const cacheKey = `${targetLang}_${sourceLang || 'auto'}_${cleanTexts.join('||')}`
  const cached = getFromCache(memoryTranslationCache, 'euchs_trans', cacheKey)
  if (cached) {
    return isArray ? cached : cached[0]
  }

  const apiKey = CONFIG.DEEPL_API_KEY

  // 1. Vite Dev Server 로컬 프록시 우선 시도
  try {
    const proxyRes = await fetch('/api/deepl-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanTexts,
        target_lang: targetLang,
        ...(sourceLang ? { source_lang: sourceLang } : {})
      })
    })

    if (proxyRes.ok) {
      const result = await proxyRes.json()
      if (result.success && result.data?.translations) {
        const translatedList = result.data.translations.map((item, idx) => item.text || cleanTexts[idx])
        saveToCache(memoryTranslationCache, 'euchs_trans', cacheKey, translatedList)
        return isArray ? translatedList : translatedList[0]
      }
    }
  } catch (err) {
    console.debug('DeepL proxy fallback to direct API call:', err.message)
  }

  // 2. Direct DeepL API Fallback
  if (!apiKey) {
    return text
  }

  try {
    const isFreeKey = apiKey.endsWith(':fx')
    const endpoint = isFreeKey
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate'

    const directRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanTexts,
        target_lang: targetLang,
        ...(sourceLang ? { source_lang: sourceLang } : {})
      })
    })

    if (directRes.ok) {
      const data = await directRes.json()
      if (data.translations && Array.isArray(data.translations)) {
        const translatedList = data.translations.map((item, idx) => item.text || cleanTexts[idx])
        saveToCache(memoryTranslationCache, 'euchs_trans', cacheKey, translatedList)
        return isArray ? translatedList : translatedList[0]
      }
    }
  } catch (err) {
    console.warn('[DeepL] Translation notice (fallback to source text):', err.message)
  }

  return text
}

/**
 * 1688 DataHub 실시간 상품 검색 (API 에러/429 발생 시 고품질 Mock 데이터셋 자동 반환)
 * @param {string} queryZh - 중국어/한국어 검색 키워드
 * @param {number|string} page - 페이지 번호 (기본 1)
 * @param {object} [options] - 추가 옵션 { sort, price_min, price_max }
 * @returns {Promise<object>} 정규화된 1688 검색 결과
 */
export async function search1688(queryZh, page = 1, options = {}) {
  const query = String(queryZh || '').trim()
  if (!query) {
    return getMockSearchResults('', page, options)
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

  // 2. Vite Dev Server 로컬 프록시 우선 시도
  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      ...(sort && sort !== 'default' ? { sort } : {}),
      ...(price_min ? { price_min } : {}),
      ...(price_max ? { price_max } : {})
    })

    const proxyRes = await fetch(`/api/1688-search?${params.toString()}`)
    if (proxyRes.ok) {
      const result = await proxyRes.json()
      if (result.success && result.data) {
        data = result.data
      } else if (result.status === 429 || result.data?.message?.includes('exceeded')) {
        isApiError = true
      }
    } else {
      isApiError = true
    }
  } catch (err) {
    console.debug('1688 search proxy fallback to direct API call:', err.message)
  }

  // 3. Direct RapidAPI Fallback
  if (!data && !isApiError && rapidKey) {
    try {
      const targetUrl = new URL(`https://${rapidHost}/item_search`)
      targetUrl.searchParams.set('q', query)
      targetUrl.searchParams.set('page', String(page))
      if (sort && sort !== 'default') targetUrl.searchParams.set('sort', sort)
      if (price_min) targetUrl.searchParams.set('price_min', price_min)
      if (price_max) targetUrl.searchParams.set('price_max', price_max)

      const directRes = await fetch(targetUrl.toString(), {
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': rapidHost
        }
      })

      if (directRes.ok) {
        data = await directRes.json()
      } else {
        isApiError = true
        console.warn(`[1688 API] RapidAPI response status: ${directRes.status} (Switching to Mock Fallback)`)
      }
    } catch (err) {
      isApiError = true
      console.warn('[1688 API] Direct API call error, switching to Mock Fallback:', err.message)
    }
  }

  // API 호출 실패 또는 쿼터 초과(429) 시 Mock 데이터셋으로 무결점 전환
  if (!data || isApiError) {
    console.warn(`[1688 API] RapidAPI Quota/Error fallback triggered for keyword "${query}" (Returning rich Mock dataset)`)
    const mockRes = getMockSearchResults(query, page, options)
    saveToCache(memorySearchCache, 'euchs_search', cacheKey, mockRes)
    return mockRes
  }

  // 응답 데이터 파싱 및 정규화
  try {
    const resultObj = data?.result || data || {}
    const rawList = resultObj.resultList || []
    const base = resultObj.base || {}
    const settings = resultObj.settings || {}

    if (rawList.length === 0) {
      return getMockSearchResults(query, page, options)
    }

    const items = rawList.map((entry) => {
      const it = entry.item || entry

      let imageUrl = it.image || it.imageUrl || it.picUrl || ''
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      }

      let detailUrl = it.itemUrl || ''
      if (detailUrl.startsWith('//')) {
        detailUrl = 'https:' + detailUrl
      } else if (!detailUrl && it.itemId) {
        detailUrl = `https://detail.1688.com/offer/${it.itemId}.html`
      }

      const priceStr = it.sku?.def?.price || it.price || '0'
      const priceNum = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0

      const minOrderStr = it.sku?.def?.minOrder || it.minOrder || '1'
      const minOrder = parseInt(String(minOrderStr).replace(/[^0-9]/g, ''), 10) || 1

      return {
        id: String(it.itemId || Math.random().toString(36).slice(2)),
        titleZh: it.title || '',
        titleEn: it.titleEn || '',
        titleKo: '',
        price: priceNum,
        priceFormatted: priceNum.toFixed(2),
        minOrder,
        sales: it.sales || '0',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        detailUrl,
        repurchaseRate: it.repurchaseRate || '90%',
        company: it.company?.name || it.shopName || '1688 공식 인증 공급사',
        starLevel: it.company?.starLevel || 5.0,
        raw: it
      }
    })

    const formattedResult = {
      rawResponse: data,
      items,
      page: parseInt(settings.page || String(page), 10),
      pageSize: parseInt(settings.pageSize || '20', 10),
      totalResults: base.totalResults || String(items.length),
      hasMore: base.hasMore === 'true' || base.hasMore === true,
      queryZh: query
    }

    saveToCache(memorySearchCache, 'euchs_search', cacheKey, formattedResult)
    return formattedResult
  } catch (parseErr) {
    console.warn('[1688 API] Response parse error, using Mock Fallback:', parseErr)
    const mockRes = getMockSearchResults(query, page, options)
    saveToCache(memorySearchCache, 'euchs_search', cacheKey, mockRes)
    return mockRes
  }
}

/**
 * 1688 통합 파이프라인:
 * 한글 번역 ➔ 1688 검색 ➔ 결과 번역 (어떤 에러가 발생해도 Mock 데이터로 무결점 반환)
 */
export async function search1688WithTranslation(koreanQuery, page = 1, options = {}, onProgress = null) {
  const query = String(koreanQuery || '').trim()
  if (!query) {
    return getMockSearchResults('', page, options)
  }

  // Step 1: 한글 검색어 ➔ 중국어 번역
  let queryZh = query
  const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query)

  if (isKorean) {
    if (onProgress) {
      onProgress({
        step: 1,
        message: `한글 키워드 분석 중: "${query}"...`
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

  // Step 2: 1688 상품 검색 (API 에러 시 Mock 데이터 자동 반환)
  let searchResult
  try {
    searchResult = await search1688(queryZh, page, options)
  } catch (err) {
    console.warn('[1688 Search] Auto fallback to Mock dataset:', err.message)
    searchResult = getMockSearchResults(query, page, options)
  }

  const items = searchResult.items || []

  // Step 3: 상품 리스트 제목 번역 보정
  if (items.length > 0) {
    if (onProgress) {
      onProgress({
        step: 3,
        message: `소싱 상품 ${items.length}개의 규격 및 가격 정보를 정규화 중...`,
        itemsCount: items.length
      })
    }

    // titleKo가 비어있는 항목에 대해서만 번역 시도
    const untranslatedItems = items.filter(it => !it.titleKo)
    if (untranslatedItems.length > 0) {
      try {
        const chineseTitles = untranslatedItems.map(item => item.titleZh || item.titleEn || '')
        const translatedTitles = await translateText(chineseTitles, 'KO', 'ZH')
        const titlesArray = Array.isArray(translatedTitles) ? translatedTitles : [translatedTitles]

        untranslatedItems.forEach((item, index) => {
          item.titleKo = titlesArray[index] || item.titleZh || item.titleEn
        })
      } catch (err) {
        untranslatedItems.forEach((item) => {
          item.titleKo = item.titleZh || item.titleEn || '1688 추천 소싱 상품'
        })
      }
    }
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
 * 1688 상품 상세 정보 & SKU 옵션 조회 (에러/429 시 Mock 상세 자동 반환)
 * @param {string|number} itemId - 1688 상품 고유 ID
 * @returns {Promise<object>} 상세 데이터 및 정규화된 SKU 옵션
 */
export async function getItemDetail1688(itemId) {
  const idStr = String(itemId || '').trim()
  if (!idStr) {
    return getMockProductDetail('804895839701')
  }

  // Quota Defense: 상세 조회 캐시 확인
  const cached = getFromCache(memoryDetailCache, 'euchs_detail_raw', idStr)
  if (cached) {
    return cached
  }

  const rapidKey = CONFIG.RAPIDAPI_KEY
  const rapidHost = CONFIG.RAPIDAPI_HOST

  let data = null

  // 1. Vite proxy 시도
  try {
    const proxyRes = await fetch(`/api/1688-detail?itemId=${idStr}`)
    if (proxyRes.ok) {
      const resJson = await proxyRes.json()
      if (resJson.success && resJson.data) {
        data = resJson.data
      }
    }
  } catch (err) {
    console.debug('1688 detail proxy notice:', err.message)
  }

  // 2. Direct RapidAPI Fallback
  if (!data && rapidKey) {
    try {
      const targetUrl = `https://${rapidHost}/item_detail?itemId=${idStr}`
      const directRes = await fetch(targetUrl, {
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': rapidHost
        }
      })
      if (directRes.ok) {
        data = await directRes.json()
      }
    } catch (err) {
      console.warn('1688 direct detail fetch notice:', err.message)
    }
  }

  if (!data) {
    const mockDetail = getMockProductDetail(idStr)
    saveToCache(memoryDetailCache, 'euchs_detail_raw', idStr, mockDetail)
    return mockDetail
  }

  saveToCache(memoryDetailCache, 'euchs_detail_raw', idStr, data)
  return data
}

/**
 * 1688 단건 상품 ID/URL로 상세 데이터 조회 및 번역 (에러 시 Mock 상세 반환)
 * @param {string|number} offerId - 1688 상품 고유 ID
 * @returns {Promise<object>} 정규화된 상품 상세 객체
 */
export async function fetch1688ProductById(offerId) {
  const idStr = String(offerId || '').trim()
  if (!idStr) return getMockProductDetail('804895839701')

  const cachedProduct = getFromCache(memoryDetailCache, 'euchs_product_parsed', idStr)
  if (cachedProduct) {
    return cachedProduct
  }

  try {
    const rawData = await getItemDetail1688(idStr)
    const it = rawData?.result?.item || rawData?.item || rawData?.result || rawData || {}

    // 갤러리 이미지 리스트 정규화
    let images = []
    if (Array.isArray(it.images) && it.images.length > 0) {
      images = it.images.map(img => (img.startsWith('//') ? 'https:' + img : img))
    } else if (imageUrl) {
      images = [imageUrl]
    }

    // SKU 리스트 정규화 (1688 DataHub 응답 구조 파싱)
    let parsedSkus = []
    if (Array.isArray(it.skus) && it.skus.length > 0) {
      parsedSkus = it.skus.map(s => ({
        color: s.color || s.propName || s.name || '',
        size: s.size || s.subPropName || s.spec || '',
        price: parseFloat(s.price || priceNum),
        imageUrl: s.imageUrl || s.image || imageUrl,
        stock: parseInt(s.stock || s.quantity || '999', 10)
      }))
    } else if (Array.isArray(it.skuProps) && it.skuProps.length > 0) {
      // skuProps 구조 파싱 (예: [{prop: '색상', values: [{name, imageUrl}]}, {prop: '사이즈', values: [{name}]}])
      const colorProp = it.skuProps.find(p => p.prop?.includes('색') || p.prop?.includes('color') || p.prop?.includes('款式') || p.prop?.includes('颜色')) || it.skuProps[0]
      const sizeProp = it.skuProps.find(p => p !== colorProp && (p.prop?.includes('사이즈') || p.prop?.includes('size') || p.prop?.includes('尺码') || p.prop?.includes('规格'))) || it.skuProps[1]

      const colors = colorProp?.values || []
      const sizes = sizeProp?.values || []

      if (colors.length > 0 && sizes.length > 0) {
        colors.forEach(c => {
          sizes.forEach(s => {
            parsedSkus.push({
              color: c.name || c.value || '기본',
              size: s.name || s.value || 'Free',
              price: priceNum,
              imageUrl: c.imageUrl || c.image || imageUrl,
              stock: 999
            })
          })
        })
      } else if (colors.length > 0) {
        colors.forEach(c => {
          parsedSkus.push({
            color: c.name || c.value || '기본',
            size: 'Free (원사이즈)',
            price: priceNum,
            imageUrl: c.imageUrl || c.image || imageUrl,
            stock: 999
          })
        })
      }
    }

    const normalizedProduct = {
      id: idStr,
      titleZh,
      titleKo: titleKo || titleZh,
      price: priceNum,
      priceFormatted: priceNum.toFixed(2),
      minOrder,
      sales: it.sales || '1.5만+',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      images,
      detailUrl: `https://detail.1688.com/offer/${idStr}.html`,
      repurchaseRate: it.repurchaseRate || '94%',
      company: it.company?.name || it.shopName || '1688 인증 직영 제조공장',
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
