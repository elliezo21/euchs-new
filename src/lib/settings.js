import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * 미디어 URL의 비디오 여부 판별 공통 헬퍼 (mp4, webm, mov, ogg, avi, mkv 등)
 */
export const isVideoMedia = (url) => {
  if (!url || typeof url !== 'string') return false
  const clean = url.toLowerCase().split('?')[0].split('#')[0].trim()
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
  // 4대 핵심 서비스 카드 배경 설정 (Supabase DB 등록 값)
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
 * Supabase DB(site_settings, notices system backup), Storage 및 LocalStorage에서 최신 설정값 조회
 */
export const fetchSiteSettings = async () => {
  isSettingsLoading.value = true
  try {
    let settings = { ...DEFAULT_SETTINGS }

    // 1. Supabase DB 조회 (site_settings 테이블 및 notices 백업)
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
        } else if (error) {
          console.warn('[SiteSettings] Supabase site_settings select notice:', error.message)
        }
      } catch (err) {
        console.warn('[SiteSettings] Supabase site_settings select exception:', err)
      }

      // notices 테이블 시스템 백업도 조회하여 최신 누락값 보완
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

      // 최신 데이터 병합: DB 컬럼 우선 -> 백업 데이터 -> 기본값
      const source = { ...DEFAULT_SETTINGS, ...(backupData || {}), ...(dbData || {}) }

      settings = {
        id: 'default',
        exchange_rate_mode: source.exchange_rate_mode || 'manual',
        exchange_rate: Number(source.exchange_rate) || DEFAULT_SETTINGS.exchange_rate,
        rate_margin: Number(source.rate_margin) || DEFAULT_SETTINGS.rate_margin,
        agency_fee_rate: Number(source.agency_fee_rate) || DEFAULT_SETTINGS.agency_fee_rate,
        sea_cbm_rate: Number(source.sea_cbm_rate) || DEFAULT_SETTINGS.sea_cbm_rate,
        customs_clearance_fee: Number(source.customs_clearance_fee) || DEFAULT_SETTINGS.customs_clearance_fee,
        fta_co_fee: Number(source.fta_co_fee) || DEFAULT_SETTINGS.fta_co_fee,
        hero_media_type: source.hero_media_type || DEFAULT_SETTINGS.hero_media_type,
        hero_media_url: source.hero_media_url || '',
        hero_overlay_opacity: Number(source.hero_overlay_opacity) || 60,
        service_card_media_rocket: source.service_card_media_rocket || '',
        service_card_media_purchasing: source.service_card_media_purchasing || '',
        service_card_media_trade: source.service_card_media_trade || '',
        service_card_media_tour: source.service_card_media_tour || '',
        updated_at: source.updated_at || new Date().toISOString()
      }

      currentSettings.value = { ...settings }
      try {
        localStorage.setItem('euchs_site_settings', JSON.stringify(settings))
      } catch (e) {}

      console.info('[SiteSettings] Successfully fetched live settings from Supabase:', settings)
      return currentSettings.value
    }

    // 2. Supabase 미연결 시 LocalStorage 캐시 fallback
    try {
      const cached = localStorage.getItem('euchs_site_settings')
      if (cached) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(cached) }
      }
    } catch (e) {}

    currentSettings.value = { ...settings }
    return currentSettings.value
  } catch (err) {
    console.error('[SiteSettings] Fetch site_settings fallback:', err)
  } finally {
    isSettingsLoading.value = false
  }
  return currentSettings.value
}

/**
 * Supabase site_settings 테이블 및 시스템 백업에 설정값 강제 저장 (Multi-Tier Upsert)
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
    hero_media_url: settings.hero_media_url || '',
    hero_overlay_opacity: Number(settings.hero_overlay_opacity) || 60,
    service_card_media_rocket: settings.service_card_media_rocket !== undefined ? settings.service_card_media_rocket : '',
    service_card_media_purchasing: settings.service_card_media_purchasing !== undefined ? settings.service_card_media_purchasing : '',
    service_card_media_trade: settings.service_card_media_trade !== undefined ? settings.service_card_media_trade : '',
    service_card_media_tour: settings.service_card_media_tour !== undefined ? settings.service_card_media_tour : '',
    updated_at: new Date().toISOString()
  }

  // 1. Supabase DB 저장
  if (isSupabaseConfigured()) {
    let dbSaved = false
    try {
      const { data, error: upsertError } = await supabase
        .from('site_settings')
        .upsert(payload, { onConflict: 'id' })
        .select()

      if (!upsertError) {
        dbSaved = true
        console.info('[SiteSettings] site_settings table upsert success:', data)
      } else {
        console.warn('[SiteSettings] site_settings full upsert notice, trying basic payload:', upsertError.message)
        const basicPayload = {
          id: 'default',
          exchange_rate_mode: payload.exchange_rate_mode,
          exchange_rate: payload.exchange_rate,
          rate_margin: payload.rate_margin,
          agency_fee_rate: payload.agency_fee_rate,
          sea_cbm_rate: payload.sea_cbm_rate,
          customs_clearance_fee: payload.customs_clearance_fee,
          fta_co_fee: payload.fta_co_fee,
          hero_media_type: payload.hero_media_type,
          hero_media_url: payload.hero_media_url,
          hero_overlay_opacity: payload.hero_overlay_opacity,
          updated_at: payload.updated_at
        }
        await supabase.from('site_settings').upsert(basicPayload, { onConflict: 'id' })
      }
    } catch (e) {
      console.warn('[SiteSettings] site_settings save exception:', e)
    }

    // 2. DB notices 테이블 시스템 설정 JSON 백업 저장
    try {
      const backupNoticePayload = {
        title: '__SITE_SETTINGS_BACKUP__',
        category: 'system_config',
        category_name: '시스템설정',
        badge: '시스템',
        is_pinned: false,
        summary: 'Global Site Settings JSON Backup for Cross-Device Sync',
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
      console.warn('[SiteSettings] Notices system backup save notice:', noticeErr)
    }

    // 3. Supabase Public Storage에 site_settings.json 저장 (모바일 직접 접근용)
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
      console.warn('[SiteSettings] Storage settings backup save notice:', storageErr)
    }
  }

  // 3. LocalStorage 및 전역 상태 즉시 갱신
  try {
    localStorage.setItem('euchs_site_settings', JSON.stringify(payload))
  } catch (e) {}

  currentSettings.value = { ...payload }

  // 4. 실시간 이벤트 전파
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('euchs-settings-updated', { detail: payload }))
    } catch (e) {}
  }

  return payload
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
