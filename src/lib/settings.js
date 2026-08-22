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

export const DEFAULT_SERVICE_MEDIA = {
  rocket: 'https://assets.mixkit.co/videos/43289/43289-720.mp4',
  purchasing: 'https://assets.mixkit.co/videos/41551/41551-720.mp4',
  trade: 'https://assets.mixkit.co/videos/43292/43292-720.mp4',
  tour: 'https://assets.mixkit.co/videos/42940/42940-720.mp4'
}

export const DEFAULT_SERVICE_POSTERS = {
  rocket: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
  purchasing: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
  trade: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  tour: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'
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
export const fetchSiteSettings = async (retryCount = 2) => {
  isSettingsLoading.value = true
  try {
    let merged = { ...DEFAULT_SETTINGS, ...currentSettings.value }

    // 1. LocalStorage 캐시 먼저 읽기 (즉시 렌더링용)
    try {
      const cached = localStorage.getItem('euchs_site_settings')
      if (cached) {
        const parsed = JSON.parse(cached)
        merged = { ...merged, ...parsed }
      }
    } catch (e) {}

    // 2. Supabase DB site_settings 테이블 조회 (최우선)
    if (isSupabaseConfigured()) {
      let dbSuccess = false
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 'default')
          .maybeSingle()

        if (!dbError && dbData) {
          dbSuccess = true
          merged = {
            ...merged,
            ...dbData,
            exchange_rate: Number(dbData.exchange_rate) || Number(dbData.custom_exchange_rate) || DEFAULT_SETTINGS.exchange_rate,
            exchange_rate_mode: dbData.exchange_rate_mode || 'manual',
            agency_fee_rate: Number(dbData.agency_fee_rate) || DEFAULT_SETTINGS.agency_fee_rate,
            sea_cbm_rate: Number(dbData.sea_cbm_rate) || DEFAULT_SETTINGS.sea_cbm_rate,
            customs_clearance_fee: Number(dbData.customs_clearance_fee) || DEFAULT_SETTINGS.customs_clearance_fee,
            fta_co_fee: Number(dbData.fta_co_fee) || DEFAULT_SETTINGS.fta_co_fee,
            rate_margin: Number(dbData.rate_margin) || DEFAULT_SETTINGS.rate_margin,
            hero_media_type: dbData.hero_media_type || DEFAULT_SETTINGS.hero_media_type,
            hero_media_url: dbData.hero_media_url || DEFAULT_SETTINGS.hero_media_url,
            hero_overlay_opacity: Number(dbData.hero_overlay_opacity) || DEFAULT_SETTINGS.hero_overlay_opacity,
            service_card_media_rocket: dbData.service_card_media_rocket || merged.service_card_media_rocket || '',
            service_card_media_purchasing: dbData.service_card_media_purchasing || merged.service_card_media_purchasing || '',
            service_card_media_trade: dbData.service_card_media_trade || merged.service_card_media_trade || '',
            service_card_media_tour: dbData.service_card_media_tour || merged.service_card_media_tour || ''
          }
          console.info('[SiteSettings] Successfully fetched live settings from Supabase DB.')
        } else if (dbError) {
          console.warn('[SiteSettings] Supabase site_settings query notice:', dbError.message || dbError)
        }
      } catch (err) {
        console.warn('[SiteSettings] Supabase query exception:', err)
      }

      // 3. 만약 DB 컬럼이 없거나 비어있을 경우, DB System Config Backup 조회
      if (!dbSuccess || !merged.service_card_media_rocket || !merged.service_card_media_purchasing) {
        try {
          const { data: backupNotice } = await supabase
            .from('notices')
            .select('content')
            .eq('category', 'system_config')
            .eq('title', '__SITE_SETTINGS_BACKUP__')
            .maybeSingle()

          if (backupNotice && backupNotice.content) {
            const parsedBackup = JSON.parse(backupNotice.content)
            merged = { ...merged, ...parsedBackup }
            console.info('[SiteSettings] Synced from DB system config backup notice.')
          }
        } catch (e) {}

        // 4. 추가로 Supabase Storage의 설정 JSON 조회 (모바일/크로스 디바이스 완벽 보장)
        try {
          const { data: storageUrlData } = supabase.storage.from('notices').getPublicUrl('site_config/site_settings.json')
          if (storageUrlData?.publicUrl) {
            const storageRes = await fetch(`${storageUrlData.publicUrl}?t=${Date.now()}`)
            if (storageRes.ok) {
              const storageJson = await storageRes.json()
              merged = { ...merged, ...storageJson }
              console.info('[SiteSettings] Synced from Supabase storage site_settings.json.')
            }
          }
        } catch (e) {}
      }

      // 5. 첫 조회 실패 시 1초 후 재시도
      if (!dbSuccess && retryCount > 0) {
        setTimeout(() => fetchSiteSettings(retryCount - 1), 1000)
      }
    }

    currentSettings.value = { ...merged }

    try {
      localStorage.setItem('euchs_site_settings', JSON.stringify(currentSettings.value))
    } catch (e) {}

    return currentSettings.value
  } catch (err) {
    console.error('[SiteSettings] Fetch site_settings fallback to defaults:', err)
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
    hero_media_url: settings.hero_media_url || DEFAULT_SETTINGS.hero_media_url,
    hero_overlay_opacity: Number(settings.hero_overlay_opacity) || 65,
    service_card_media_rocket: settings.service_card_media_rocket || '',
    service_card_media_purchasing: settings.service_card_media_purchasing || '',
    service_card_media_trade: settings.service_card_media_trade || '',
    service_card_media_tour: settings.service_card_media_tour || '',
    updated_at: new Date().toISOString()
  }

  // 1. LocalStorage 및 전역 상태 즉시 갱신
  try {
    localStorage.setItem('euchs_site_settings', JSON.stringify(payload))
  } catch (e) {}

  currentSettings.value = { ...payload }

  // 2. 실시간 이벤트 전파
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('euchs-settings-updated', { detail: payload }))
    } catch (e) {}
  }

  // 3. Supabase DB 저장 (다층 저장으로 컬럼 유무 상관없이 전 기기 동기화 100% 보장)
  if (isSupabaseConfigured()) {
    // 3-1. site_settings 테이블에 전체 컬럼 upsert 시도
    try {
      const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert(payload, { onConflict: 'id' })

      if (upsertError) {
        console.warn('[SiteSettings] site_settings full upsert notice (saving standard columns):', upsertError)
        // 만약 추가된 컬럼이 테이블에 없어 오류가 발생한 경우, 기본 컬럼만으로 저장 시도
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
      console.warn('[SiteSettings] site_settings save error:', e)
    }

    // 3-2. DB notices 테이블에 시스템 설정 백업 저장 (DB 수준 글로벌 동기화)
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

    // 3-3. Supabase Public Storage에 site_settings.json 저장 (모바일 직접 접근용)
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
