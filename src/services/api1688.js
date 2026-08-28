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

// ========================================================
// 한국어 → 중국어 내장 번역 사전 (DeepL 실패 시 즉시 Fallback)
// 1688 DataHub에서 가장 많이 검색되는 카테고리/키워드 수록
// ========================================================
const KO_ZH_DICT = {
  // ── 패션/의류 ──
  '치마': '裙子', '스커트': '裙子', '원피스': '连衣裙', '블라우스': '衬衫',
  '티셔츠': 'T恤', '티': 'T恤', '반팔': '短袖', '긴팔': '长袖',
  '후드': '卫衣', '후드티': '连帽卫衣', '맨투맨': '卫衣', '스웨터': '毛衣',
  '니트': '针织衫', '가디건': '开衫', '자켓': '夹克', '점퍼': '夹克',
  '코트': '外套', '패딩': '羽绒服', '청바지': '牛仔裤', '반바지': '短裤',
  '레깅스': '打底裤', '슬랙스': '西裤', '면바지': '棉裤', '조거팬츠': '运动裤',
  '여성의류': '女装', '남성의류': '男装', '아동복': '童装', '언더웨어': '内衣',
  '속옷': '内裤', '브라': '文胸', '양말': '袜子', '스타킹': '连裤袜',
  // ── 신발/잡화 ──
  '신발': '鞋子', '운동화': '运动鞋', '슬리퍼': '拖鞋', '샌들': '凉鞋',
  '부츠': '靴子', '구두': '皮鞋', '로퍼': '乐福鞋', '스니커즈': '球鞋',
  '가방': '包包', '핸드백': '手提包', '숄더백': '单肩包', '백팩': '双肩包',
  '크로스백': '斜挎包', '클러치': '手拿包', '지갑': '钱包', '파우치': '化妆包',
  '벨트': '腰带', '모자': '帽子', '야구모자': '棒球帽', '비니': '毛线帽',
  '스카프': '围巾', '선글라스': '太阳镜', '안경': '眼镜', '시계': '手表',
  '목걸이': '项链', '귀걸이': '耳环', '반지': '戒指', '팔찌': '手链',
  // ── 생활/주방 ──
  '밀폐용기': '保鲜盒', '반찬통': '饭盒', '도시락': '便当盒', '물병': '水杯',
  '텀블러': '保温杯', '머그컵': '马克杯', '냄비': '锅', '프라이팬': '平底锅',
  '냄비세트': '锅具套装', '주방용품': '厨房用品', '수저': '餐具', '젓가락': '筷子',
  '그릇': '碗', '접시': '盘子', '컵': '杯子', '소쿠리': '洗菜篮',
  '도마': '砧板', '칼': '刀', '주방칼': '厨刀', '주걱': '铲子',
  '생활용품': '生活用品', '청소용품': '清洁用品', '세제': '洗涤剂', '수납박스': '收纳箱',
  '수납': '收纳', '바구니': '收纳篮', '행거': '晾衣架', '옷걸이': '衣架',
  '이불': '被子', '베개': '枕头', '쿠션': '抱枕', '수건': '毛巾',
  '칫솔': '牙刷', '비누': '香皂', '샴푸': '洗发水',
  // ── 인테리어 ──
  '인테리어': '装饰', '소품': '摆件', '캔들': '蜡烛', '액자': '相框',
  '거울': '镜子', '시계': '时钟', '화분': '花盆', '조명': '灯具',
  '전등': '灯', '카펫': '地毯', '러그': '地毯', '커튼': '窗帘',
  '테이블': '桌子', '의자': '椅子', '선반': '置物架', '책상': '书桌',
  // ── 디지털/가전 ──
  '이어폰': '耳机', '이어버드': '蓝牙耳机', '헤드폰': '头戴耳机',
  '충전기': '充电器', '보조배터리': '移动电源', '케이블': '数据线',
  '스마트폰': '手机', '폰케이스': '手机壳', '스마트워치': '智能手表',
  '노트북': '笔记本电脑', '태블릿': '平板电脑', '마우스': '鼠标', '키보드': '键盘',
  '웹캠': '摄像头', '스피커': '音响', '블루투스': '蓝牙',
  // ── 뷰티/화장품 ──
  '화장품': '化妆品', '스킨케어': '护肤品', '로션': '乳液', '크림': '面霜',
  '세럼': '精华液', '앰플': '安瓶', '마스크팩': '面膜', '선크림': '防晒霜',
  '파운데이션': '粉底液', '쿠션': '气垫', '립스틱': '口红', '아이새도우': '眼影',
  '마스카라': '睫毛膏', '아이라이너': '眼线笔', '클렌징': '卸妆',
  '향수': '香水', '네일': '指甲油', '메이크업': '彩妆',
  // ── 스포츠/레저 ──
  '운동': '运动', '요가': '瑜伽', '헬스': '健身', '덤벨': '哑铃',
  '자전거': '自行车', '등산': '登山', '캠핑': '露营', '텐트': '帐篷',
  '캠핑용품': '露营用品', '낚시': '钓鱼', '수영': '游泳', '수영복': '泳衣',
  '아웃도어': '户外用品', '배드민턴': '羽毛球', '테니스': '网球',
  // ── 펫/유아 ──
  '반려동물': '宠物用品', '강아지': '狗', '고양이': '猫', '펫': '宠物',
  '강아지옷': '宠物衣服', '고양이장난감': '猫玩具', '펫간식': '宠物零食',
  '기저귀': '尿布', '유모차': '婴儿车', '유아용품': '婴儿用品',
  // ── 포장/기업용 ──
  '포장': '包装', '박스': '纸箱', '테이프': '胶带', '비닐': '塑料袋',
  '쇼핑백': '购物袋', '선물포장': '礼品包装', '라벨': '标签',
  // ── 문구/사무 ──
  '노트': '笔记本', '볼펜': '圆珠笔', '연필': '铅笔', '형광펜': '荧光笔',
  '스티커': '贴纸', '다이어리': '手账', '파일': '文件夹',
  // ── 음식/식품 ──
  '과자': '零食', '초콜릿': '巧克力', '커피': '咖啡', '차': '茶叶',
  // ── 복합 키워드 ──
  '베스트셀러': '畅销品', '인기상품': '热销商品', '신상': '新品',
  '도매': '批发', '소싱': '采购', '수입대행': '代购'
}

/**
 * 한글 키워드 → 중국어 내장 사전 변환
 * DeepL API 실패 시 즉시 사용 가능한 오프라인 Fallback
 */
function koToZhFallback(text) {
  if (!text) return text
  const trimmed = text.trim()

  // 1. 완전 일치 검색
  if (KO_ZH_DICT[trimmed]) return KO_ZH_DICT[trimmed]

  // 2. 부분 일치 검색 (복합 키워드 포함된 경우)
  for (const [ko, zh] of Object.entries(KO_ZH_DICT)) {
    if (trimmed.includes(ko)) {
      return trimmed.replace(ko, zh)
    }
  }

  // 3. 한글 포함 시 encodeURIComponent 인코딩으로 API 전달 가능하게 유지
  return trimmed
}

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
 * 1688 DataHub 실시간 상품 검색
 * @param {string} queryZh - 중국어/한국어 검색 키워드
 * @param {number|string} page - 페이지 번호 (기본 1)
 * @param {object} [options] - 추가 옵션 { sort, price_min, price_max }
 * @returns {Promise<object>} 정규화된 1688 검색 결과 (한국어 번역 포함)
 */
export async function search1688(queryZh, page = 1, options = {}) {
  const query = String(queryZh || '').trim()

  // 빈 쿼리 → 빈 결과 반환 (더미 데이터 없음)
  if (!query) {
    return { items: [], page: 1, pageSize: 20, totalResults: '0', hasMore: false, queryZh: '' }
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
      if (result.success && result.data) {
        data = result.data
        console.log('[1688 Search] Proxy success:', Object.keys(result.data || {}).slice(0, 5))
      } else if (result.isQuotaExceeded) {
        // 프록시에서 code 205 / 429 감지됨
        isApiError = true
        console.warn(`[1688 Search] Proxy quota/no-result (code ${result.apiCode})`)
      } else if (result.status === 429 || String(result.data?.message || '').includes('exceeded')) {
        isApiError = true
        console.warn('[1688 Search] Proxy quota exceeded')
      } else {
        console.warn('[1688 Search] Proxy returned success=false:', result.apiCode || result.status)
      }
    } else {
      const errBody = await proxyRes.json().catch(() => ({}))
      console.warn(`[1688 Search] Proxy HTTP ${proxyRes.status}:`, errBody)
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
        const rawData = await directRes.json()

        // ── 내용 레벨 에러 감지 (HTTP 200 이지만 code 205 등) ──
        const apiStatus = rawData?.result?.status
        if (apiStatus && (apiStatus.data === 'error' || (apiStatus.code && apiStatus.code !== 200))) {
          isApiError = true
          console.warn(`[1688 API] Direct API content error code=${apiStatus.code}:`, apiStatus.msg)
        } else {
          data = rawData
          console.log('[1688 Search] Direct API success:', Object.keys(data || {}).slice(0, 5))
        }
      } else {
        isApiError = true
        console.warn(`[1688 API] RapidAPI status: ${directRes.status}`)
      }
    } catch (err) {
      isApiError = true
      console.warn('[1688 API] Direct search error:', err.name === 'AbortError' ? 'Timeout(10s)' : err.message)
    }
  }

  // API 호출 실패 시 → 빈 결과 반환 (더미 데이터 없음)
  if (!data || isApiError) {
    console.warn(`[1688 API] No result for "${query}" — returning empty (no mock fallback)`)
    return { items: [], page: Number(page), pageSize: 20, totalResults: '0', hasMore: false, queryZh: query }
  }

  // 응답 데이터 파싱 및 정규화 (1688 DataHub v4 공식 구조 기준)
  try {
    // v4 정식: data.result.resultList
    // v4 중첩: data.result.result.resultList (일부 엔드포인트)
    // 구버전: data.resultList, data.data.items
    const resultObj = data?.result || data || {}

    const rawList =
      resultObj?.resultList ||
      resultObj?.result?.resultList ||
      data?.resultList ||
      data?.data?.resultList ||
      data?.data?.items ||
      data?.items ||
      []

    const base = resultObj?.base || data?.result?.base || {}
    const settings = resultObj?.settings || data?.result?.settings || {}

    console.log(`[1688 Parser] rawList type=${Array.isArray(rawList) ? 'Array' : typeof rawList}, length=${Array.isArray(rawList) ? rawList.length : 'N/A'}`)

    // 실제 결과 0건 → 빈 배열 반환 (더미 대체 없음)
    if (!Array.isArray(rawList) || rawList.length === 0) {
      console.warn(`[1688 Parser] No resultList in response for "${query}"`)
      return { items: [], page: Number(page), pageSize: 20, totalResults: '0', hasMore: false, queryZh: query }
    }

    const items = rawList.map((entry, idx) => {
      const it = entry?.item || entry

      // 1688 DataHub v4 다중 이미지 필드 전수 탐색
      let rawImage =
        it.imageUrl || it.image || it.picUrl || it.pic_url || it.img || it.imgUrl || it.pic || it.thumbnail ||
        entry.imageUrl || entry.image || entry.picUrl || entry.pic_url || entry.img ||
        it.sku?.def?.imageUrl || it.sku?.def?.image ||
        (Array.isArray(it.images) && it.images[0]) || ''

      let imageUrl = String(rawImage || '').trim()
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://')
      }

      let detailUrl = it.itemUrl || it.detailUrl || ''
      if (detailUrl.startsWith('//')) detailUrl = 'https:' + detailUrl
      if (!detailUrl && it.itemId) detailUrl = `https://detail.1688.com/offer/${it.itemId}.html`

      const priceStr = it.sku?.def?.price || it.price || it.priceInfo?.price || '0'
      const priceNum = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0

      const minOrderStr = it.sku?.def?.minOrder || it.minOrder || '1'
      const minOrder = parseInt(String(minOrderStr).replace(/[^0-9]/g, ''), 10) || 1

      const titleZh = it.title || it.subject || ''

      return {
        id: String(it.itemId || it.offerId || it.id || `item-${Date.now()}-${idx}`),
        itemId: String(it.itemId || it.offerId || it.id || ''),
        titleZh,
        titleEn: it.titleEn || '',
        titleKo: '',
        title: titleZh,
        price: priceNum,
        priceCny: priceNum,
        priceFormatted: priceNum.toFixed(2),
        minOrder,
        sales: String(it.sales || it.monthSold || '0'),
        imageUrl,
        detailUrl,
        productUrl: detailUrl,
        repurchaseRate: it.repurchaseRate || it.rePurchaseRate || '90%',
        company: it.company?.name || it.shopName || '1688 공식 인증 공급사',
        starLevel: it.company?.starLevel || 5.0,
        raw: it
      }
    }).filter(item => item.id && (item.titleZh || item.title))

    console.log(`[1688 Parser] Parsed ${items.length} items for "${query}"`)

    // 일괄 한국어 번역 수행
    await translateItemsBatch(items)

    const formattedResult = {
      rawResponse: data,
      items,
      page: parseInt(settings?.page || String(page), 10),
      pageSize: parseInt(settings?.pageSize || '20', 10),
      totalResults: base?.totalResults || String(items.length),
      hasMore: base?.hasMore === 'true' || base?.hasMore === true,
      queryZh: query
    }

    saveToCache(memorySearchCache, 'euchs_search', cacheKey, formattedResult)
    return formattedResult
  } catch (parseErr) {
    console.warn('[1688 API] Response parse error:', parseErr)
    return { items: [], page: Number(page), pageSize: 20, totalResults: '0', hasMore: false, queryZh: query }
  }
}

/**
 * 1688 통합 파이프라인:
 * 한글 검색어 ➔ 중국어 번역 ➔ 1688 검색 ➔ 결과 일괄 한글 번역 (DeepL)
 */
export async function search1688WithTranslation(koreanQuery, page = 1, options = {}, onProgress = null) {
  const query = String(koreanQuery || '').trim()

  // 빈 쿼리 → 빈 결과 반환 (더미 없음)
  if (!query) {
    return {
      success: true,
      queryKo: '',
      queryZh: '',
      page: 1,
      pageSize: 20,
      totalResults: '0',
      hasMore: false,
      items: []
    }
  }

  // Step 1: 한글/영문 검색어 ➔ 중국어 번역 (3단계 Fallback 보장)
  let queryZh = query
  const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query)

  if (isKorean) {
    if (onProgress) {
      onProgress({
        step: 1,
        message: `한글 키워드 분석 및 번역 중: "${query}"...`
      })
    }

    // 1-A: 내장 사전 우선 조회 (오프라인 즉시 변환 — 응답속도 최우선)
    const dictResult = koToZhFallback(query)
    const isDictHit = dictResult && !/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(dictResult)

    if (isDictHit) {
      queryZh = dictResult
      console.log(`[1688 KO→ZH] Dict hit: "${query}" → "${queryZh}"`)
    } else {
      // 1-B: DeepL API 번역 시도 (프록시 → Direct 순서)
      try {
        const translated = await translateText(query, 'ZH', 'KO')
        const candidate = typeof translated === 'string' ? translated : (translated[0] || '')

        // 번역 결과가 실제로 한글이 아닌 경우에만 채택
        if (candidate && !/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(candidate)) {
          queryZh = candidate
          console.log(`[1688 KO→ZH] DeepL: "${query}" → "${queryZh}"`)
        } else {
          // DeepL이 한글 원문을 그대로 돌려보낸 경우 → 사전 부분 일치 재시도
          const partialResult = koToZhFallback(query)
          queryZh = (partialResult && partialResult !== query) ? partialResult : query
          console.warn(`[1688 KO→ZH] DeepL returned Korean, dict fallback: "${query}" → "${queryZh}"`)
        }
      } catch (err) {
        // 1-C: 모든 번역 실패 → 사전 부분 일치 마지막 시도
        const fallbackResult = koToZhFallback(query)
        queryZh = (fallbackResult && fallbackResult !== query) ? fallbackResult : query
        console.warn(`[1688 KO→ZH] All translation failed, final fallback: "${query}" → "${queryZh}"`)
      }
    }
  }

  if (onProgress) {
    onProgress({
      step: 2,
      message: `1688 실시간 상품 소싱 검색 중: "${query}"...`,
      queryZh
    })
  }

  // Step 2: 1688 상품 검색
  let searchResult
  try {
    searchResult = await search1688(queryZh, page, options)
  } catch (err) {
    console.warn('[1688 Search] search1688 error:', err.message)
    searchResult = { items: [], page: Number(page), pageSize: 20, totalResults: '0', hasMore: false }
  }

  // Step 2-B: 번역 쿼리로 0건이면 원문 한글로 한 번 더 시도 (사전 미등록 키워드 대비)
  if (isKorean && queryZh !== query && (!searchResult.items || searchResult.items.length === 0)) {
    console.warn(`[1688 Search] 0 results for "${queryZh}", retrying with original: "${query}"`)
    try {
      const retryResult = await search1688(query, page, options)
      if (retryResult.items && retryResult.items.length > 0) {
        searchResult = retryResult
      }
    } catch (retryErr) {
      console.warn('[1688 Search] Retry with original keyword failed:', retryErr.message)
    }
  }

  const items = searchResult.items || []

  // Step 3: 미번역 잔여 항목 최종 점검 (중국어 → 한국어)
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

  const rapidKey = CONFIG.RAPIDAPI_KEY
  const rapidHost = CONFIG.RAPIDAPI_HOST

  let data = null

  // 1. Vercel / Vite Serverless 프록시 우선 시도 (/api/1688-detail)
  try {
    const proxyRes = await fetch(`/api/1688-detail?itemId=${encodeURIComponent(idStr)}`)
    if (proxyRes.ok) {
      const resJson = await proxyRes.json()
      if (resJson.success && resJson.data) {
        data = resJson.data
        console.log('[1688 Item Detail Raw Response] (via proxy):', data)
      } else {
        console.warn('[1688 Detail] Proxy returned success=false or no data:', resJson)
      }
    } else {
      const errJson = await proxyRes.json().catch(() => ({}))
      console.warn(`[1688 Detail] Proxy HTTP ${proxyRes.status}:`, errJson)
    }
  } catch (err) {
    console.debug('[1688 Detail] Proxy notice:', err.message)
  }

  // 2. Direct RapidAPI Fallback (itemId / offerId / num_iid 세 가지 파라미터 순차 시도)
  if (!data && rapidKey) {
    const paramKeys = ['itemId', 'offerId', 'num_iid']
    for (const paramKey of paramKeys) {
      if (data) break
      try {
        const targetUrl = `https://${rapidHost}/item_detail?${paramKey}=${idStr}`
        console.log(`[1688 Detail] Trying direct API: ${targetUrl}`)
        const directRes = await fetch(targetUrl, {
          headers: {
            'x-rapidapi-key': rapidKey,
            'x-rapidapi-host': rapidHost
          }
        })
        if (directRes.ok) {
          const raw = await directRes.json()
          // 응답 성공 여부 확인 (일부 1688 DataHub 응답은 200이지만 에러 필드 포함)
          if (raw && !raw.error && !raw.err_msg) {
            data = raw
            console.log('[1688 Item Detail Raw Response]:', data)
          } else {
            console.debug(`[1688 Detail] API error response with ${paramKey}:`, raw)
          }
        } else {
          console.debug(`[1688 Detail] HTTP ${directRes.status} for ${paramKey}`)
        }
      } catch (err) {
        console.warn(`[1688 Detail] Direct fetch failed with ${paramKey}:`, err.message)
      }
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

    // ─── 5. 기본 상품 정보 추출 ────────────────────────────────────────
    const titleZh = it.title || it.subject || ''

    let rawImage = (
      it.imageUrl || it.image || it.picUrl || it.pic_url ||
      it.img || it.imgUrl || it.pic || it.thumbnail ||
      rawSku.def?.imageUrl || rawSku.def?.image ||
      (Array.isArray(it.images) && it.images[0]) || ''
    )
    let imageUrl = String(rawImage || '').trim()
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
    else if (imageUrl.startsWith('http://')) imageUrl = imageUrl.replace('http://', 'https://')

    const priceStr = rawSku.def?.price || it.price || '0'
    const priceNum = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0

    const minOrderStr = rawSku.def?.minOrder || it.minOrder || '1'
    const minOrder = parseInt(String(minOrderStr).replace(/[^0-9]/g, ''), 10) || 1

    let images = []
    if (Array.isArray(it.images) && it.images.length > 0) {
      images = it.images.map(img => (String(img).startsWith('//') ? 'https:' + img : img))
    } else if (imageUrl) {
      images = [imageUrl]
    }

    // 속성명 및 속성값 다변화 키 1:1 파싱
    let parsedSkuProps = []

    let parsedSkus = []

    if (Array.isArray(rawSkuProps) && rawSkuProps.length > 0) {
      parsedSkuProps = rawSkuProps.map(p => {
        const propName = p.prop || p.propKo || p.propName || p.prop_name || p.name || p.attributeName || ''
        const rawVals = Array.isArray(p.values) ? p.values : (Array.isArray(p.value) ? p.value : (Array.isArray(p.prop_values) ? p.prop_values : []))
        const values = rawVals.map(v => {
          const valName = typeof v === 'string' ? v : (v.name || v.nameKo || v.nameZh || v.value || v.prop_value_name || v.text || '')
          const valImg = typeof v === 'object' ? (v.imageUrl || v.image_url || v.image || v.imgUrl || v.picUrl || v.pic_url || '') : ''
          return {
            name: String(valName).trim(),
            nameKo: typeof v === 'object' ? (v.nameKo || '') : '',
            imageUrl: valImg
          }
        }).filter(v => v.name && v.name !== 'undefined' && v.name !== 'null')
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
