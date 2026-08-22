import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * 미디어 URL의 비디오 여부 판별 공통 헬퍼 (mp4, webm, mov, ogg, avi, mkv 등)
 * .gif, .png, .jpg, .webp 등 이미지는 확실하게 false 반환
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
  // 4대 핵심 서비스 카드 배경 설정
  service_card_media_rocket: '',
  service_card_media_purchasing: '',
  service_card_media_trade: '',
  service_card_media_tour: '',
  service_media_urls: {
    "1": "",
    "2": "",
    "3": "",
    "4": ""
  },
  updated_at: new Date().toISOString()
}

// 전역 공유 설정 상태
export const currentSettings = ref({ ...DEFAULT_SETTINGS })
export const isSettingsLoading = ref(false)

/**
 * Supabase DB(site_settings, notices system backup), Storage 및 LocalStorage에서 최신 설정값 조회
 */
export const fetchSiteSettings = async () => {
  isSettingsLoading.value = true
  try {
    // 1. 기존 캐시/메모리 상태 유지
    let cached = {}
    try {
      const raw = localStorage.getItem('euchs_site_settings')
      if (raw) cached = JSON.parse(raw)
    } catch (e) {}

    let merged = { ...DEFAULT_SETTINGS, ...cached, ...currentSettings.value }

    // 2. Supabase DB 조회
    if (isSupabaseConfigured()) {
      let dbData = null
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 'default')
          .maybeSingle()

        if (!error && data) {
          dbData = data
        }
      } catch (err) {
        console.warn('[SiteSettings] site_settings query exception:', err)
      }

      // notices 백업 레코드 조회 (1. __SITE_SETTINGS_BACKUP__, 2. __SERVICE_MEDIA_URLS__)
      let backupData = null
      try {
        const { data: backupNotice } = await supabase
          .from('notices')
          .select('content')
          .eq('category', 'system_config')
          .eq('title', '__SITE_SETTINGS_BACKUP__')
          .maybeSingle()

        if (backupNotice && backupNotice.content) {
          backupData = JSON.parse(backupNotice.content)
        }
      } catch (e) {}

      let mediaNoticeData = null
      try {
        const { data: mediaNotice } = await supabase
          .from('notices')
          .select('content')
          .eq('category', 'system_config')
          .eq('title', '__SERVICE_MEDIA_URLS__')
          .maybeSingle()

        if (mediaNotice && mediaNotice.content) {
          mediaNoticeData = JSON.parse(mediaNotice.content)
        }
      } catch (e) {}

      if (backupData) {
        merged = { ...merged, ...backupData }
      }

      if (dbData) {
        if (dbData.exchange_rate !== undefined && dbData.exchange_rate !== null) merged.exchange_rate = Number(dbData.exchange_rate)
        if (dbData.exchange_rate_mode) merged.exchange_rate_mode = dbData.exchange_rate_mode
        if (dbData.rate_margin !== undefined && dbData.rate_margin !== null) merged.rate_margin = Number(dbData.rate_margin)
        if (dbData.agency_fee_rate !== undefined && dbData.agency_fee_rate !== null) merged.agency_fee_rate = Number(dbData.agency_fee_rate)
        if (dbData.sea_cbm_rate !== undefined && dbData.sea_cbm_rate !== null) merged.sea_cbm_rate = Number(dbData.sea_cbm_rate)
        if (dbData.customs_clearance_fee !== undefined && dbData.customs_clearance_fee !== null) merged.customs_clearance_fee = Number(dbData.customs_clearance_fee)
        if (dbData.fta_co_fee !== undefined && dbData.fta_co_fee !== null) merged.fta_co_fee = Number(dbData.fta_co_fee)
        if (dbData.hero_media_type) merged.hero_media_type = dbData.hero_media_type
        if (dbData.hero_media_url !== undefined && dbData.hero_media_url !== null) merged.hero_media_url = dbData.hero_media_url
        if (dbData.hero_overlay_opacity !== undefined && dbData.hero_overlay_opacity !== null) merged.hero_overlay_opacity = Number(dbData.hero_overlay_opacity)

        // 4대 서비스 카드 미디어: 개별 컬럼 우선 -> service_media_urls JSON -> 백업 데이터
        const jsonUrls = dbData.service_media_urls || dbData.hero_cards_media || dbData.service_media || mediaNoticeData || {}
        
        merged.service_card_media_rocket = dbData.service_card_media_rocket || jsonUrls["1"] || jsonUrls.rocket || jsonUrls.card1 || merged.service_card_media_rocket || ''
        merged.service_card_media_purchasing = dbData.service_card_media_purchasing || jsonUrls["2"] || jsonUrls.purchasing || jsonUrls.card2 || merged.service_card_media_purchasing || ''
        merged.service_card_media_trade = dbData.service_card_media_trade || jsonUrls["3"] || jsonUrls.trade || jsonUrls.card3 || merged.service_card_media_trade || ''
        merged.service_card_media_tour = dbData.service_card_media_tour || jsonUrls["4"] || jsonUrls.tour || jsonUrls.card4 || merged.service_card_media_tour || ''

        merged.service_media_urls = {
          "1": merged.service_card_media_rocket,
          "2": merged.service_card_media_purchasing,
          "3": merged.service_card_media_trade,
          "4": merged.service_card_media_tour
        }
      } else if (mediaNoticeData) {
        merged.service_card_media_rocket = mediaNoticeData["1"] || mediaNoticeData.rocket || merged.service_card_media_rocket || ''
        merged.service_card_media_purchasing = mediaNoticeData["2"] || mediaNoticeData.purchasing || merged.service_card_media_purchasing || ''
        merged.service_card_media_trade = mediaNoticeData["3"] || mediaNoticeData.trade || merged.service_card_media_trade || ''
        merged.service_card_media_tour = mediaNoticeData["4"] || mediaNoticeData.tour || merged.service_card_media_tour || ''
        merged.service_media_urls = {
          "1": merged.service_card_media_rocket,
          "2": merged.service_card_media_purchasing,
          "3": merged.service_card_media_trade,
          "4": merged.service_card_media_tour
        }
      }

      currentSettings.value = { ...merged }
      try {
        localStorage.setItem('euchs_site_settings', JSON.stringify(merged))
      } catch (e) {}

      return currentSettings.value
    }

    currentSettings.value = { ...merged }
    return currentSettings.value
  } catch (err) {
    console.error('[SiteSettings] Fetch site_settings fallback:', err)
  } finally {
    isSettingsLoading.value = false
  }
  return currentSettings.value
}

/**
 * Supabase site_settings 테이블 및 시스템 백업에 설정값 영구 저장
 */
export const saveSiteSettings = async (settings) => {
  const url1 = settings.service_card_media_rocket !== undefined ? settings.service_card_media_rocket : (settings.service_media_urls?.['1'] || '')
  const url2 = settings.service_card_media_purchasing !== undefined ? settings.service_card_media_purchasing : (settings.service_media_urls?.['2'] || '')
  const url3 = settings.service_card_media_trade !== undefined ? settings.service_card_media_trade : (settings.service_media_urls?.['3'] || '')
  const url4 = settings.service_card_media_tour !== undefined ? settings.service_card_media_tour : (settings.service_media_urls?.['4'] || '')

  const mediaUrlsJson = {
    "1": url1,
    "2": url2,
    "3": url3,
    "4": url4,
    "rocket": url1,
    "purchasing": url2,
    "trade": url3,
    "tour": url4
  }

  const payload = {
    id: 'default',
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
    service_card_media_rocket: url1,
    service_card_media_purchasing: url2,
    service_card_media_trade: url3,
    service_card_media_tour: url4,
    service_media_urls: mediaUrlsJson,
    updated_at: new Date().toISOString()
  }

  // 1. 메모리 및 LocalStorage 즉시 갱신
  currentSettings.value = { ...currentSettings.value, ...payload }
  try {
    localStorage.setItem('euchs_site_settings', JSON.stringify(currentSettings.value))
  } catch (e) {}

  // 2. 실시간 이벤트 전파 (HomeView 등 즉시 반응)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('euchs-settings-updated', { detail: currentSettings.value }))
    } catch (e) {}
  }

  // 3. Supabase DB 영구 저장
  if (isSupabaseConfigured()) {
    let lastError = null

    // 3-1. site_settings 테이블 upsert
    try {
      const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert(payload, { onConflict: 'id' })

      if (upsertError) {
        console.warn('[SiteSettings] site_settings full upsert notice:', upsertError.message)
        // 컬럼이 일부 없을 경우를 대비하여 service_media_urls만으로 또는 기본 컬럼으로 UPDATE 시도
        const { error: updateJsonError } = await supabase
          .from('site_settings')
          .update({
            service_media_urls: mediaUrlsJson,
            updated_at: payload.updated_at
          })
          .eq('id', 'default')

        if (updateJsonError) {
          lastError = updateJsonError
        }
      }
    } catch (e) {
      console.warn('[SiteSettings] site_settings save exception:', e)
      lastError = e
    }

    // 3-2. DB notices 시스템 설정 JSON 백업 저장 (__SITE_SETTINGS_BACKUP__ 및 __SERVICE_MEDIA_URLS__)
    try {
      const backupNoticePayload = {
        title: '__SITE_SETTINGS_BACKUP__',
        category: 'system_config',
        category_name: '시스템설정',
        badge: '시스템',
        is_pinned: false,
        summary: 'Global Site Settings JSON Backup',
        content: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      }

      const { data: existingBackup } = await supabase
        .from('notices')
        .select('id')
        .eq('category', 'system_config')
        .eq('title', '__SITE_SETTINGS_BACKUP__')
        .maybeSingle()

      if (existingBackup && existingBackup.id) {
        await supabase.from('notices').update(backupNoticePayload).eq('id', existingBackup.id)
      } else {
        await supabase.from('notices').insert(backupNoticePayload)
      }
    } catch (noticeErr) {
      console.warn('[SiteSettings] Notices system backup notice:', noticeErr)
    }

    try {
      const mediaNoticePayload = {
        title: '__SERVICE_MEDIA_URLS__',
        category: 'system_config',
        category_name: '시스템설정',
        badge: '미디어',
        is_pinned: false,
        summary: '4 Core Service Cards Media JSON Backup',
        content: JSON.stringify(mediaUrlsJson),
        updated_at: new Date().toISOString()
      }

      const { data: existingMediaNotice } = await supabase
        .from('notices')
        .select('id')
        .eq('category', 'system_config')
        .eq('title', '__SERVICE_MEDIA_URLS__')
        .maybeSingle()

      if (existingMediaNotice && existingMediaNotice.id) {
        await supabase.from('notices').update(mediaNoticePayload).eq('id', existingMediaNotice.id)
      } else {
        await supabase.from('notices').insert(mediaNoticePayload)
      }
    } catch (e) {}

    // 3-3. Supabase Public Storage에 site_settings.json 저장 (CDN 백업)
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      await supabase.storage
        .from('notices')
        .upload('site_config/site_settings.json', blob, {
          cacheControl: '0',
          upsert: true,
          contentType: 'application/json'
        })
    } catch (storageErr) {
      console.warn('[SiteSettings] Storage settings backup notice:', storageErr)
    }
  }

  return currentSettings.value
}

// 브라우저 탭 간 실시간 동기화 리스너 등록
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
