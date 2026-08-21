import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

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
  hero_media_url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm.480p.vp9.webm',
  hero_overlay_opacity: 60, // 30 ~ 90 (%)
  // 4대 핵심 서비스 카드 미디어 배경 설정 (미등록 시 기본 다크 네이비 카드 스타일)
  service_card_media_rocket: '',
  service_card_media_purchasing: '',
  service_card_media_trade: '',
  service_card_media_tour: '',
  updated_at: new Date().toISOString()
}

// 전역 공유 설정 상태
export const currentSettings = ref({ ...DEFAULT_SETTINGS })
export const isSettingsLoading = ref(false)

/**
 * Supabase site_settings 테이블 및 LocalStorage에서 설정값 불러오기
 */
export const fetchSiteSettings = async () => {
  isSettingsLoading.value = true
  try {
    // 1. LocalStorage 캐시 먼저 읽기
    try {
      const cached = localStorage.getItem('euchs_site_settings')
      if (cached) {
        const parsed = JSON.parse(cached)
        currentSettings.value = { ...currentSettings.value, ...parsed }
      }
    } catch (e) {}

    // 2. Supabase DB에서 조회
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (!error && data) {
        currentSettings.value = {
          ...DEFAULT_SETTINGS,
          ...currentSettings.value,
          ...data,
          exchange_rate: Number(data.exchange_rate) || Number(data.custom_exchange_rate) || DEFAULT_SETTINGS.exchange_rate,
          exchange_rate_mode: data.exchange_rate_mode || 'manual',
          agency_fee_rate: Number(data.agency_fee_rate) || DEFAULT_SETTINGS.agency_fee_rate,
          sea_cbm_rate: Number(data.sea_cbm_rate) || DEFAULT_SETTINGS.sea_cbm_rate,
          customs_clearance_fee: Number(data.customs_clearance_fee) || DEFAULT_SETTINGS.customs_clearance_fee,
          fta_co_fee: Number(data.fta_co_fee) || DEFAULT_SETTINGS.fta_co_fee,
          rate_margin: Number(data.rate_margin) || DEFAULT_SETTINGS.rate_margin,
          hero_media_type: data.hero_media_type || DEFAULT_SETTINGS.hero_media_type,
          hero_media_url: data.hero_media_url || DEFAULT_SETTINGS.hero_media_url,
          hero_overlay_opacity: Number(data.hero_overlay_opacity) || DEFAULT_SETTINGS.hero_overlay_opacity,
          service_card_media_rocket: data.service_card_media_rocket !== undefined ? data.service_card_media_rocket : currentSettings.value.service_card_media_rocket,
          service_card_media_purchasing: data.service_card_media_purchasing !== undefined ? data.service_card_media_purchasing : currentSettings.value.service_card_media_purchasing,
          service_card_media_trade: data.service_card_media_trade !== undefined ? data.service_card_media_trade : currentSettings.value.service_card_media_trade,
          service_card_media_tour: data.service_card_media_tour !== undefined ? data.service_card_media_tour : currentSettings.value.service_card_media_tour
        }
        try {
          localStorage.setItem('euchs_site_settings', JSON.stringify(currentSettings.value))
        } catch (e) {}
        return currentSettings.value
      }
    }
  } catch (err) {
    console.warn('Fetch site_settings fallback to default:', err)
  } finally {
    isSettingsLoading.value = false
  }
  return currentSettings.value
}

/**
 * Supabase site_settings 테이블에 설정값 저장 (Upsert)
 */
export const saveSiteSettings = async (settings) => {
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
    hero_media_url: settings.hero_media_url || DEFAULT_SETTINGS.hero_media_url,
    hero_overlay_opacity: Number(settings.hero_overlay_opacity) || 65,
    service_card_media_rocket: settings.service_card_media_rocket || '',
    service_card_media_purchasing: settings.service_card_media_purchasing || '',
    service_card_media_trade: settings.service_card_media_trade || '',
    service_card_media_tour: settings.service_card_media_tour || '',
    updated_at: new Date().toISOString()
  }

  // 1. LocalStorage 즉시 저장
  try {
    localStorage.setItem('euchs_site_settings', JSON.stringify(payload))
  } catch (e) {}

  currentSettings.value = { ...payload }

  // 2. Supabase DB 저장
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .upsert(payload, { onConflict: 'id' })
        .select()

      if (error) {
        console.warn('Supabase site_settings save warning (schema column fallback to local):', error)
      } else {
        return data
      }
    } catch (dbErr) {
      console.warn('Supabase DB save error:', dbErr)
    }
  }

  return payload
}
