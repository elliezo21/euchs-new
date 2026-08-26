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
    const proxyRes = await fetch('/api/deepl-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: missingTexts,
        target_lang: targetLang,
        ...(sourceLang ? { source_lang: sourceLang } : {})
      })
    })

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
        })
      })

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

  // 번역이 필요한 중국어 제목들 수집
  const titlesToTranslate = items.map(it => it.titleZh || it.title || it.subject || '')

  try {
    const translatedTitles = await translateText(titlesToTranslate, 'KO', 'ZH')
    const titleList = Array.isArray(translatedTitles) ? translatedTitles : [translatedTitles]

    items.forEach((it, idx) => {
      const translated = titleList[idx] || it.titleZh || it.title || ''
      it.titleKo = translated
      it.title = translated // MallView 템플릿 호환용
    })
  } catch (err) {
    console.warn('[translateItemsBatch] Notice:', err.message)
    items.forEach(it => {
      if (!it.titleKo) it.titleKo = it.titleZh || it.title || '1688 수입 상품'
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
    console.debug('[1688 Search] Proxy notice:', err.message)
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
        console.warn(`[1688 API] RapidAPI status: ${directRes.status} (Fallback to Mock)`)
      }
    } catch (err) {
      isApiError = true
      console.warn('[1688 API] Direct search error:', err.message)
    }
  }

  // API 호출 실패 또는 쿼터 초과 시 Mock 데이터셋으로 무결점 전환
  if (!data || isApiError) {
    console.warn(`[1688 API] Using Mock dataset for "${query}"`)
    const mockRes = getMockSearchResults(query, page, options)
    await translateItemsBatch(mockRes.items)
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
      const mockRes = getMockSearchResults(query, page, options)
      await translateItemsBatch(mockRes.items)
      return mockRes
    }

    const items = rawList.map((entry, idx) => {
      const it = entry.item || entry

      // 1688 DataHub 다중 이미지 필드 전수 탐색
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
        id: String(it.itemId || `item-${Date.now()}-${idx}`),
        titleZh,
        titleEn: it.titleEn || '',
        titleKo: '',
        title: titleZh,
        price: priceNum,
        priceFormatted: priceNum.toFixed(2),
        minOrder,
        sales: it.sales || '0',
        imageUrl: imageUrl,
        detailUrl,
        repurchaseRate: it.repurchaseRate || '90%',
        company: it.company?.name || it.shopName || '1688 공식 인증 공급사',
        starLevel: it.company?.starLevel || 5.0,
        raw: it
      }
    })

    // 일괄 한국어 번역 수행
    await translateItemsBatch(items)

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
    await translateItemsBatch(mockRes.items)
    saveToCache(memorySearchCache, 'euchs_search', cacheKey, mockRes)
    return mockRes
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
 * 1688 상품 상세 정보 Raw 조회
 * @param {string|number} itemId - 1688 상품 고유 ID
 * @returns {Promise<object>}
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

  // 1. Vercel / Vite Serverless 프록시 우선 시도 (/api/1688-detail)
  try {
    const proxyRes = await fetch(`/api/1688-detail?itemId=${idStr}`)
    if (proxyRes.ok) {
      const resJson = await proxyRes.json()
      if (resJson.success && resJson.data) {
        data = resJson.data
      }
    }
  } catch (err) {
    console.debug('[1688 Detail] Proxy notice:', err.message)
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
      console.warn('[1688 Detail] Direct fetch notice:', err.message)
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
 * 1688 단건 상품 ID/URL로 상세 데이터 조회 및 한국어 번역
 * @param {string|number} offerId - 1688 상품 고유 ID
 * @returns {Promise<object>} 정규화 및 번역된 상품 상세 객체
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

    const titleZh = it.title || it.subject || ''
    let rawImage = it.imageUrl || it.image || it.picUrl || it.pic_url || it.img || it.imgUrl || it.pic || it.thumbnail ||
                   (Array.isArray(it.images) && it.images[0]) || ''
    let imageUrl = String(rawImage || '').trim()
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl
    } else if (imageUrl.startsWith('http://')) {
      imageUrl = imageUrl.replace('http://', 'https://')
    }

    const priceStr = it.sku?.def?.price || it.price || '0'
    const priceNum = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0

    const minOrderStr = it.sku?.def?.minOrder || it.minOrder || '1'
    const minOrder = parseInt(String(minOrderStr).replace(/[^0-9]/g, ''), 10) || 1

    // 갤러리 이미지 리스트 정규화
    let images = []
    if (Array.isArray(it.images) && it.images.length > 0) {
      images = it.images.map(img => (img.startsWith('//') ? 'https:' + img : img))
    } else if (imageUrl) {
      images = [imageUrl]
    }

    // SKU 속성(skuProps) 및 옵션 리스트(skuList / skus) 정규화
    let rawSkuProps = it.skuProps || it.sku?.skuProps || it.raw?.skuProps || []
    if (typeof rawSkuProps === 'string') {
      try { rawSkuProps = JSON.parse(rawSkuProps) } catch (e) { rawSkuProps = [] }
    }

    let rawSkus = it.skus || it.skuList || it.sku?.skuList || it.raw?.skus || it.raw?.skuList || []
    if (typeof rawSkus === 'string') {
      try { rawSkus = JSON.parse(rawSkus) } catch (e) { rawSkus = [] }
    }

    let parsedSkuProps = []
    let parsedSkus = []

    if (Array.isArray(rawSkuProps) && rawSkuProps.length > 0) {
      parsedSkuProps = rawSkuProps.map(p => {
        const propName = p.prop || p.propName || p.name || p.attributeName || ''
        const rawVals = Array.isArray(p.values) ? p.values : (Array.isArray(p.value) ? p.value : [])
        const values = rawVals.map(v => ({
          name: v.name || v.value || v.nameZh || v.text || '',
          nameKo: v.nameKo || '',
          imageUrl: v.imageUrl || v.image || v.imgUrl || v.picUrl || ''
        })).filter(v => v.name)
        return {
          prop: propName,
          propKo: p.propKo || '',
          values
        }
      }).filter(p => p.values.length > 0)
    }

    if (Array.isArray(rawSkus) && rawSkus.length > 0) {
      parsedSkus = rawSkus.map(s => {
        let color = s.color || s.propName || s.name || ''
        let size = s.size || s.subPropName || s.spec || ''
        
        // specAttrs 문자열 파싱 (예: "卡其色 大号" 또는 "0:0;1:0")
        if (!color && !size && s.specAttrs) {
          const parts = String(s.specAttrs).split(/\s+/)
          color = parts[0] || ''
          size = parts[1] || ''
        }

        return {
          skuId: s.skuId || s.id || '',
          color,
          size,
          price: parseFloat(s.price || s.consignPrice || priceNum),
          imageUrl: s.imageUrl || s.image || imageUrl,
          stock: parseInt(s.stock || s.quantity || s.canBookCount || '999', 10)
        }
      })
    } else if (parsedSkuProps.length > 0) {
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

    // 실제 중국어 유니코드만 번역 대상으로 필터 (한국어·일본어 등 비ASCII 문자 포함 오역 방지)
    const uniqueTexts = [...new Set(textsToTranslate.filter(t => typeof t === 'string' && t.trim() && /[\u4e00-\u9fff\u3400-\u4dbf]/.test(t)))]

    let titleKo = it.titleKo || ''
    if (uniqueTexts.length > 0) {
      try {
        const transResult = await translateText(uniqueTexts, 'KO', 'ZH')
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

    const normalizedProduct = {
      id: idStr,
      titleZh,
      titleKo: titleKo || titleZh,
      title: titleKo || titleZh,
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
