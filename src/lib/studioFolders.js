/**
 * 스튜디오 작업 폴더 (브라우저, RLS: 본인 행) — 표 studio_folders + studio_projects.folder_id
 * SQL: docs/sql/2026-09-28-studio-folders.sql (해성이 실행). 실행 전에는 표·칸이 없다 → foldersReady = false, 화면이 폴더 자리를 보이지 않는다.
 * 폴더는 스튜디오 전용 — 몰 카테고리·내상품리스트 카테고리와 연결하지 않는다.
 * ★ .eq('user_id', uid)를 생략하지 않는다 (관리자 계정은 RLS로 남의 행도 읽힌다 — studioProjects.js와 같은 이유)
 */
import { supabase } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'

function requireUid() {
  const uid = currentUser.value?.id
  if (!uid) throw new Error('로그인이 필요해요.')
  return uid
}
const RETRY = '잠시 후 다시 시도해 주세요.'

/** 표·칸이 아직 없음 (SQL 실행 전) — PostgREST: 42P01 표 없음 · 42703 칸 없음 · PGRST205/PGRST204 스키마 캐시에 없음 */
export function isFolderSchemaMissing(error) {
  const code = String(error?.code || '')
  return ['42P01', '42703', 'PGRST205', 'PGRST204'].includes(code)
}

/** @returns {Promise<{ ready:boolean, folders:[{ id, name, sort, created_at }] }>} ready=false = SQL 실행 전 */
export async function listFolders() {
  const uid = requireUid()
  const { data, error } = await supabase
    .from('studio_folders')
    .select('id, name, sort, created_at')
    .eq('user_id', uid)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    if (isFolderSchemaMissing(error)) {
      console.error('[studioFolders] studio_folders를 쓸 수 없음 — docs/sql/2026-09-28-studio-folders.sql 실행 필요:', error.code, error.message)
      return { ready: false, folders: [] }
    }
    console.error('[studioFolders] 폴더 목록 조회 실패:', error.code, error.message)
    throw new Error(RETRY)
  }
  return { ready: true, folders: data || [] }
}

export async function createFolder(name, sort = 0) {
  const uid = requireUid()
  const { data, error } = await supabase.from('studio_folders').insert({ user_id: uid, name, sort }).select('id, name, sort, created_at')
  if (error) {
    console.error('[studioFolders] 폴더 만들기 실패:', error.code, error.message)
    throw new Error(error.code === '23505' ? '같은 이름의 폴더가 있어요.' : RETRY)
  }
  if (!data || !data[0]) {
    console.error('[studioFolders] 폴더 만들기: 응답에 행이 없음')
    throw new Error(RETRY)
  }
  return data[0]
}

export async function renameFolder(id, name) {
  const uid = requireUid()
  const { data, error } = await supabase.from('studio_folders').update({ name }).eq('id', id).eq('user_id', uid).select('id')
  if (error) {
    console.error('[studioFolders] 폴더 이름 바꾸기 실패:', id, error.code, error.message)
    throw new Error(error.code === '23505' ? '같은 이름의 폴더가 있어요.' : RETRY)
  }
  if (!data || data.length === 0) {
    console.error('[studioFolders] 폴더 이름 바꾸기: 바뀐 행 없음 (없는 폴더·다른 계정):', id)
    throw new Error('폴더를 찾을 수 없어요. 목록을 새로고침해 주세요.')
  }
}

/** 비어 있을 때만 — 화면이 먼저 막고(canDeleteFolder), 여기서 DB로 한 번 더 센다(다른 창에서 넣었을 수 있다) */
export async function deleteFolder(id) {
  const uid = requireUid()
  const { count, error: cErr } = await supabase
    .from('studio_projects').select('id', { count: 'exact', head: true })
    .eq('user_id', uid).eq('folder_id', id).is('deleted_at', null)
  if (cErr) {
    console.error('[studioFolders] 폴더 안 작업 수 확인 실패:', id, cErr.code, cErr.message)
    throw new Error(RETRY)
  }
  if ((count || 0) > 0) throw new Error(`폴더에 작업이 ${count}개 있어요. 작업을 다른 폴더로 옮긴 뒤 지워 주세요.`)
  const { data, error } = await supabase.from('studio_folders').delete().eq('id', id).eq('user_id', uid).select('id')
  if (error) {
    console.error('[studioFolders] 폴더 삭제 실패:', id, error.code, error.message)
    throw new Error(RETRY)
  }
  if (!data || data.length === 0) {
    console.error('[studioFolders] 폴더 삭제: 지워진 행 없음:', id)
    throw new Error('폴더를 찾을 수 없어요. 목록을 새로고침해 주세요.')
  }
}

/**
 * 작업을 폴더로 옮긴다 (여러 개 한 번에). folderId = null이면 폴더 없음으로.
 * @returns {Promise<number>} 옮긴 수
 */
export async function moveProjects(projectIds, folderId) {
  const uid = requireUid()
  const ids = [...new Set(Array.isArray(projectIds) ? projectIds : [])]
  if (!ids.length) return 0
  const { data, error } = await supabase
    .from('studio_projects').update({ folder_id: folderId || null })
    .eq('user_id', uid).in('id', ids).select('id')
  if (error) {
    console.error('[studioFolders] 폴더로 옮기기 실패:', ids.length, folderId, error.code, error.message)
    throw new Error(RETRY)
  }
  const moved = (data || []).length
  if (moved !== ids.length) console.error(`[studioFolders] 폴더로 옮기기: ${ids.length}개 중 ${moved}개만 반영됨`)
  if (moved === 0) throw new Error('옮기지 못했어요. 목록을 새로고침해 주세요.')
  return moved
}
