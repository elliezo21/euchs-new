/**
 * 관리자·스태프 "계정" 판정 — 회원 목록·스태프 탭이 함께 쓰는 단일 기준.
 *
 * 규칙은 DB 함수 public.is_admin_or_staff()와 같다:
 *   user_roles(user_id 또는 email)의 role 이 관리자 역할이거나
 *   profiles.role 이 관리자 역할이면 관리자 계정.
 * DB 함수는 auth.uid() 기준(= 로그인한 본인)이라 다른 계정 판정에 쓸 수 없어서
 * 같은 규칙을 여기 한 곳에 옮겨 둔다. 이메일 하드코딩 없이 DB 값만 본다.
 *
 * ※ 규칙을 바꾸면 supabase의 is_admin_or_staff()도 같이 바꿀 것 — 둘이 어긋나면
 *   "DB는 관리자로 보는데 화면은 바이어로 보는" 계정이 생긴다.
 */
import { supabase } from './supabase'

export const ADMIN_ROLES = ['super_admin', 'admin', 'staff']

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(String(role || '').toLowerCase().trim())
}

/**
 * user_roles 에서 관리자 역할 행만 불러온다.
 * 조회 실패는 throw — 판정 근거가 빠진 채로 목록을 만들지 않게 호출측이 처리한다.
 */
export async function fetchAdminRoleRows() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, user_id, email, name, role, created_at, updated_at')
  if (error) throw new Error(`user_roles 조회 실패: ${error.message}`)
  return (data || []).filter(r => isAdminRole(r.role))
}

/** fetchAdminRoleRows 결과를 판정용 색인으로 만든다 */
export function buildAdminIndex(roleRows) {
  const emails = new Set()
  const userIds = new Set()
  for (const r of roleRows || []) {
    const mail = String(r.email || '').toLowerCase().trim()
    if (mail) emails.add(mail)
    if (r.user_id) userIds.add(String(r.user_id))
  }
  return { emails, userIds }
}

/**
 * 임의 계정이 관리자·스태프인지 — is_admin_or_staff()와 같은 규칙.
 * @param {{ id?: string, email?: string, role?: string }} account profiles 행(또는 같은 모양)
 * @param {{ emails: Set<string>, userIds: Set<string> }} index buildAdminIndex 결과
 */
export function isAdminAccount(account, index) {
  if (isAdminRole(account?.role)) return true
  const mail = String(account?.email || '').toLowerCase().trim()
  if (mail && index.emails.has(mail)) return true
  const id = String(account?.id || '')
  return Boolean(id) && index.userIds.has(id)
}
