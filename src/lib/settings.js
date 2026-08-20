import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

export const DEFAULT_SETTINGS = {
  id: 'default',
  exchange_rate_mode: 'manual', // 'manual' | 'auto_margin'
  exchange_rate: 195.0,
  rate_margin: 1.5,
  agency_fee_rate: 8.0,
  sea_cbm_rate: 85000,
  customs_clearance_fee: 33000,
  fta_co_fee: 33000,
  // 메인 히어로 미디어 배경 설정
  hero_media_type: 'video_mp4', // 'video_mp4' | 'youtube' | 'image'
  hero_media_url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm.480p.vp9.webm',
  hero_overlay_opacity: 60, // 30 ~ 90 (%)
  updated_at: new Date().toISOString()
}

// 전역 공유 설정 상태
export const currentSettings = ref({ ...DEFAULT_SETTINGS })
export const isSettingsLoading = ref(false)

/**
 * Supabase site_settings 테이블에서 설정값 불러오기
 */
export const fetchSiteSettings = async () => {
  isSettingsLoading.value = true
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (!error && data) {
        currentSettings.value = {
          ...DEFAULT_SETTINGS,
          ...data,
          exchange_rate: Number(data.exchange_rate) || DEFAULT_SETTINGS.exchange_rate,
          agency_fee_rate: Number(data.agency_fee_rate) || DEFAULT_SETTINGS.agency_fee_rate,
          sea_cbm_rate: Number(data.sea_cbm_rate) || DEFAULT_SETTINGS.sea_cbm_rate,
          customs_clearance_fee: Number(data.customs_clearance_fee) || DEFAULT_SETTINGS.customs_clearance_fee,
          fta_co_fee: Number(data.fta_co_fee) || DEFAULT_SETTINGS.fta_co_fee,
          rate_margin: Number(data.rate_margin) || DEFAULT_SETTINGS.rate_margin,
          hero_media_type: data.hero_media_type || DEFAULT_SETTINGS.hero_media_type,
          hero_media_url: data.hero_media_url || DEFAULT_SETTINGS.hero_media_url,
          hero_overlay_opacity: Number(data.hero_overlay_opacity) || DEFAULT_SETTINGS.hero_overlay_opacity
        }
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
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase가 연결되어 있지 않습니다. .env를 확인하세요.')
  }

  const payload = {
    id: 'default',
    exchange_rate_mode: settings.exchange_rate_mode || 'manual',
    exchange_rate: Number(settings.exchange_rate) || 195.0,
    rate_margin: Number(settings.rate_margin) || 1.5,
    agency_fee_rate: Number(settings.agency_fee_rate) || 8.0,
    sea_cbm_rate: Number(settings.sea_cbm_rate) || 85000,
    customs_clearance_fee: Number(settings.customs_clearance_fee) || 33000,
    fta_co_fee: Number(settings.fta_co_fee) || 33000,
    hero_media_type: settings.hero_media_type || 'video_mp4',
    hero_media_url: settings.hero_media_url || DEFAULT_SETTINGS.hero_media_url,
    hero_overlay_opacity: Number(settings.hero_overlay_opacity) || 65,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('site_settings')
    .upsert(payload, { onConflict: 'id' })
    .select()

  if (error) {
    throw error
  }

  currentSettings.value = { ...payload }
  return data
}
