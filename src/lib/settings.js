import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * 미디어 URL이 동영상인지 판별 (mp4, webm 등)
 * 이미지 (.gif, .png, .jpg, .jpeg, .webp 등)는 반드시 false
 */
export const isVideoMedia = (url) => {
  if (!url || typeof url !== 'string') return false
  const clean = url.toLowerCase().split('?')[0].split('#')[0].trim()
  
  const imageExtensions = ['.gif', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.bmp', '.ico', '.avif']
  if (imageExtensions.some(ext => clean.endsWith(ext))) return false

  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.avi', '.mkv']
  if (videoExtensions.some(ext => clean.endsWith(ext))) return true

  if (clean.includes('/video/') || clean.includes('video_') || clean.includes('format=mp4') || clean.includes('format=webm')) return true
  return false
}

export const DEFAULT_SETTINGS = {
  id: 'default',
  exchange_rate_mode: 'manual', // 'manual' | 'auto_margin'
  exchange_rate: 230.0,
  rate_margin: 1.5,
  agency_fee_rate: 8.0,
  sea_cbm_rate: 98000,
  customs_clearance_fee: 33000,
  fta_co_fee: 33000,
  // 메인 히어로 미디어 배경 설정
  hero_media_type: 'video_mp4', // 'video_mp4' | 'youtube' | 'image'
  hero_media_url: '',
  hero_overlay_opacity: 60, // 30 ~ 90 (%)
  // 4대 핵심 서비스 카드 미디어 JSONB ({ card1, card2, card3, card4 })
  service_media: {
    card1: '',
    card2: '',
    card3: '',
    card4: ''
  },
  updated_at: new Date().toISOString()
}

// 전역 공유 설정 상태
export const currentSettings = ref({ ...DEFAULT_SETTINGS })
export const isSettingsLoading = ref(false)

/**
 * Supabase DB site_settings 테이블에서 최신 설정값 조회
 */
export const fetchSiteSettings = async () => {
  isSettingsLoading.value = true
  try {
    let settings = { ...DEFAULT_SETTINGS }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        // service_media JSONB 필드 안전하게 파싱 및 바인딩
        const rawMedia = data.service_media || {}
        const normalizedMedia = {
          card1: rawMedia.card1 || rawMedia["1"] || rawMedia.rocket || data.service_card_media_rocket || '',
          card2: rawMedia.card2 || rawMedia["2"] || rawMedia.purchasing || data.service_card_media_purchasing || '',
          card3: rawMedia.card3 || rawMedia["3"] || rawMedia.trade || data.service_card_media_trade || '',
          card4: rawMedia.card4 || rawMedia["4"] || rawMedia.tour || data.service_card_media_tour || ''
        }

        settings = {
          ...DEFAULT_SETTINGS,
          ...data,
          id: data.id || 'default',
          exchange_rate: Number(data.exchange_rate) || 230.0,
          rate_margin: Number(data.rate_margin) || 1.5,
          agency_fee_rate: Number(data.agency_fee_rate) || 8.0,
          sea_cbm_rate: Number(data.sea_cbm_rate) || 98000,
          customs_clearance_fee: Number(data.customs_clearance_fee) || 33000,
          fta_co_fee: Number(data.fta_co_fee) || 33000,
          hero_media_type: data.hero_media_type || 'video_mp4',
          hero_media_url: data.hero_media_url || '',
          hero_overlay_opacity: Number(data.hero_overlay_opacity) || 60,
          service_media: normalizedMedia,
          service_card_media_rocket: normalizedMedia.card1,
          service_card_media_purchasing: normalizedMedia.card2,
          service_card_media_trade: normalizedMedia.card3,
          service_card_media_tour: normalizedMedia.card4,
          updated_at: data.updated_at || new Date().toISOString()
        }

        currentSettings.value = { ...settings }
        try {
          localStorage.setItem('euchs_site_settings', JSON.stringify(settings))
        } catch (e) {}

        return currentSettings.value
      } else if (error) {
        console.warn('[SiteSettings] Fetch site_settings notice:', error.message)
      }
    }

    // 로컬스토리지 fallback
    try {
      const cached = localStorage.getItem('euchs_site_settings')
      if (cached) {
        const parsed = JSON.parse(cached)
        settings = { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (e) {}

    currentSettings.value = { ...settings }
    return currentSettings.value
  } catch (err) {
    console.error('[SiteSettings] Fetch site_settings error:', err)
  } finally {
    isSettingsLoading.value = false
  }
  return currentSettings.value
}

/**
 * 4대 핵심 서비스 카드 미디어 JSONB 전용 즉시 저장
 * site_settings 테이블의 service_media (JSONB) 컬럼을 직접 UPDATE/UPSERT
 */
export const updateServiceMedia = async (mediaObj) => {
  const normalized = {
    card1: (mediaObj.card1 || mediaObj.rocket || mediaObj["1"] || '').trim(),
    card2: (mediaObj.card2 || mediaObj.purchasing || mediaObj["2"] || '').trim(),
    card3: (mediaObj.card3 || mediaObj.trade || mediaObj["3"] || '').trim(),
    card4: (mediaObj.card4 || mediaObj.tour || mediaObj["4"] || '').trim()
  }

  // 1. 메모리 & LocalStorage 즉시 갱신
  if (!currentSettings.value.service_media) {
    currentSettings.value.service_media = {}
  }
  currentSettings.value.service_media = { ...normalized }
  currentSettings.value.service_card_media_rocket = normalized.card1
  currentSettings.value.service_card_media_purchasing = normalized.card2
  currentSettings.value.service_card_media_trade = normalized.card3
  currentSettings.value.service_card_media_tour = normalized.card4

  try {
    localStorage.setItem('euchs_site_settings', JSON.stringify(currentSettings.value))
  } catch (e) {}

  // 2. 실시간 이벤트 전파 (HomeView 등 즉각 반영)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('euchs-settings-updated', { detail: currentSettings.value }))
  }

  // 3. Supabase DB 영구 저장 (service_media JSONB 단일 컬럼 UPDATE)
  if (isSupabaseConfigured()) {
    const rowId = currentSettings.value.id || 'default'

    // First try update on existing row
    const { data: updatedRows, error: updateErr } = await supabase
      .from('site_settings')
      .update({
        service_media: normalized,
        updated_at: new Date().toISOString()
      })
      .eq('id', rowId)
      .select()

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      // If row not found by id, try upsert
      const { error: upsertErr } = await supabase
        .from('site_settings')
        .upsert({
          id: rowId,
          service_media: normalized,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (upsertErr) {
        console.error('[SiteSettings] Supabase service_media save error:', upsertErr)
        throw new Error(upsertErr.message || 'Supabase DB service_media 업데이트 실패')
      }
    }
  }

  return normalized
}

/**
 * 전체 사이트 설정 저장
 */
export const saveSiteSettings = async (settings) => {
  const serviceMedia = settings.service_media || {
    card1: settings.service_card_media_rocket || '',
    card2: settings.service_card_media_purchasing || '',
    card3: settings.service_card_media_trade || '',
    card4: settings.service_card_media_tour || ''
  }

  const payload = {
    id: settings.id || 'default',
    exchange_rate_mode: settings.exchange_rate_mode || 'manual',
    exchange_rate: Number(settings.exchange_rate) || 230.0,
    rate_margin: Number(settings.rate_margin) || 1.5,
    agency_fee_rate: Number(settings.agency_fee_rate) || 8.0,
    sea_cbm_rate: Number(settings.sea_cbm_rate) || 98000,
    customs_clearance_fee: Number(settings.customs_clearance_fee) || 33000,
    fta_co_fee: Number(settings.fta_co_fee) || 33000,
    hero_media_type: settings.hero_media_type || 'video_mp4',
    hero_media_url: settings.hero_media_url || '',
    hero_overlay_opacity: Number(settings.hero_overlay_opacity) || 60,
    service_media: serviceMedia,
    updated_at: new Date().toISOString()
  }

  currentSettings.value = { ...currentSettings.value, ...payload }
  try {
    localStorage.setItem('euchs_site_settings', JSON.stringify(currentSettings.value))
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('euchs-settings-updated', { detail: currentSettings.value }))
  }

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('site_settings')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error('[SiteSettings] Supabase saveSiteSettings error:', error)
      throw new Error(error.message || '설정 저장 실패')
    }
  }

  return currentSettings.value
}

// 브라우저 탭 간 실시간 동기화
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'euchs_site_settings' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue)
        currentSettings.value = { ...currentSettings.value, ...parsed }
        window.dispatchEvent(new CustomEvent('euchs-settings-updated', { detail: parsed }))
      } catch (e) {}
    }
  })
}
