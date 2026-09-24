/**
 * 스튜디오 프로젝트·이미지 조회 (브라우저, RLS: 본인 행 SELECT)
 *
 * ★ studio_projects / studio_images RLS는 관리자에게 전체 SELECT를 허용한다.
 *   .eq('user_id', uid)를 절대 생략하지 말 것 (생략하면 관리자 화면에 남의 프로젝트가 섞인다 — orderedProducts.js와 같은 이유)
 * ★ 준비 여부는 status가 아니라 done 이미지 수로 판단한다.
 *   1688 프로젝트는 ingest가 status를 갱신하지 않아 전부 'ingesting'으로 남아 있다(실측).
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'

export const SIGNED_URL_TTL = 600 // 보기용 서명 URL 10분

// 표시 순서: 대표 사진(gallery) → 상세(desc) → 직접 올린 사진(upload), 각각 sort_order 순.
// studio-product는 kind별로 sort_order를 0부터 따로 매기므로 kind 순위를 먼저 본다. DB의 sort_order는 바꾸지 않는다.
const KIND_RANK = { gallery: 0, desc: 1, upload: 2 }

export function sortStudioImages(list) {
  return [...list].sort((a, b) =>
    (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9) || a.sort_order - b.sort_order)
}

export const KIND_LABEL = { gallery: '대표 사진', desc: '상세 이미지', upload: '내 사진' }

function requireUid() {
  const uid = currentUser.value?.id
  if (!uid) throw new Error('로그인이 필요해요.')
  return uid
}

/** 내 프로젝트 (삭제 안 된 것, 최신순) */
export async function listMyProjects() {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_projects')
    .select('id, title, title_zh, source_type, offer_id, expires_at, created_at')
    .eq('user_id', uid)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[studioProjects] 프로젝트 목록 조회 실패:', error.message)
    throw new Error(`프로젝트 목록을 불러오지 못했어요: ${error.message}`)
  }
  return data || []
}

/** 같은 1688 상품으로 만든 내 프로젝트 (삭제 안 된 것, 최신순) */
export async function findProjectsByOffer(offerId) {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_projects')
    .select('id, title, title_zh, created_at')
    .eq('user_id', uid)
    .eq('offer_id', String(offerId))
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[studioProjects] 기존 프로젝트 조회 실패:', error.message)
    throw new Error(`기존 작업을 확인하지 못했어요: ${error.message}`)
  }
  return data || []
}

export async function loadMyProject(projectId) {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_projects')
    .select('id, title, title_zh, source_type, offer_id, expires_at, created_at')
    .eq('user_id', uid)
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[studioProjects] 프로젝트 조회 실패:', error.message)
    throw new Error(`프로젝트를 불러오지 못했어요: ${error.message}`)
  }
  return data
}

/** 여러 프로젝트의 이미지 (정렬 전) */
export async function listImagesOf(projectIds) {
  const uid = requireUid()
  if (projectIds.length === 0) return []
  const { data, error } = await supabase
    .from('studio_images')
    .select('id, project_id, kind, sort_order, ingest_status, ingest_error, original_path, upload_name, width, height')
    .eq('user_id', uid)
    .in('project_id', projectIds)
  if (error) {
    console.error('[studioProjects] 이미지 조회 실패:', error.message)
    throw new Error(`이미지 목록을 불러오지 못했어요: ${error.message}`)
  }
  return data || []
}

/** 보기용 서명 URL을 한 번에. path → url (실패한 path는 빠지고 로그를 남긴다) */
export async function signViewUrls(paths) {
  const map = new Map()
  if (paths.length === 0) return map
  const { data, error } = await supabase.storage.from('studio').createSignedUrls(paths, SIGNED_URL_TTL)
  if (error) {
    console.error('[studioProjects] 서명 URL 발급 실패:', error.message)
    throw new Error(`사진 미리보기를 불러오지 못했어요: ${error.message}`)
  }
  for (const s of data || []) {
    if (s.error || !s.signedUrl) console.error('[studioProjects] 서명 URL 실패:', s.path, s.error)
    else map.set(s.path, s.signedUrl)
  }
  return map
}

/** 제목 바꾸기 (브라우저에 허용된 컬럼: title) */
export async function renameProject(projectId, title) {
  const uid = requireUid()
  const t = String(title || '').trim()
  if (t.length > 100) throw new Error('제목은 100자까지 쓸 수 있어요.')
  const { data, error } = await supabase
    .from('studio_projects')
    .update({ title: t || null })
    .eq('id', projectId)
    .eq('user_id', uid)
    .select('id')
  if (error) {
    console.error('[studioProjects] 제목 변경 실패:', error.message)
    throw new Error(`제목을 바꾸지 못했어요: ${error.message}`)
  }
  if (!data || data.length === 0) throw new Error('제목 변경이 반영되지 않았어요 (반영 0건).')
}

/** 삭제 = deleted_at 기록 (브라우저에 허용된 컬럼) */
export async function softDeleteProject(projectId) {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', uid)
    .select('id')
  if (error) {
    console.error('[studioProjects] 삭제 실패:', error.message)
    throw new Error(`삭제하지 못했어요: ${error.message}`)
  }
  if (!data || data.length === 0) throw new Error('삭제가 반영되지 않았어요 (반영 0건).')
}

export function projectDisplayTitle(p) {
  return p.title || p.title_zh || '제목 없음'
}

/** 만료 D-day 문구 */
export function expiryLabel(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return '만료됨'
  const days = Math.floor(ms / 86400000) // 남은 시간이 하루 미만이면 D-day
  return days === 0 ? 'D-day' : `D-${days}`
}
