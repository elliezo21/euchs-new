/**
 * 스튜디오 서버 API 호출 + 오류 코드별 한국어 문구
 *
 * 서버(api/_studio.js)는 오류를 { code, message }로 통일해 돌려준다. 화면은 code로 분기한다.
 * 아는 코드는 코드마다 문구를 따로 둔다. 모르는 코드는 고객에게 FALLBACK_MESSAGE만 보이고 코드는 console.error에 남긴다.
 */
import { supabase } from '@/lib/supabase'

/**
 * 프로젝트당 최대 이미지 장수 — 프런트에서 이 숫자는 여기에만 둔다.
 * 서버 기준값은 api/_studio.js studioMaxImages()(env STUDIO_MAX_IMAGES, 기본 50). 서버가 image_limit 응답에
 * remaining·max를 주면 그 값을 우선 쓰고, 이 상수는 첫 선택 시점 계산과 안내 문구에만 쓴다.
 */
export const STUDIO_MAX_IMAGES = 50

/**
 * POST /api/{name}. 로그인 세션의 access_token을 Bearer로 붙인다.
 * @returns {Promise<{ ok:boolean, status:number, code?:string, data:any }>}
 */
export async function callStudioApi(name, body) {
  const { data: { session }, error: sErr } = await supabase.auth.getSession()
  if (sErr) console.error('[studioApi] 세션 확인 실패:', sErr.message)
  const token = session?.access_token
  if (!token) return { ok: false, status: 401, code: 'unauthorized', data: null }

  let r
  try {
    r = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error(`[studioApi] /api/${name} 네트워크 오류:`, e)
    return { ok: false, status: 0, code: 'network', data: null }
  }
  let data = null
  try {
    data = await r.json()
  } catch (e) {
    console.error(`[studioApi] /api/${name} 응답이 JSON이 아님 (HTTP ${r.status}):`, e)
    return { ok: false, status: r.status, code: `http_${r.status}`, data: null }
  }
  if (!r.ok) {
    console.error(`[studioApi] /api/${name} 실패 HTTP ${r.status}:`, data)
    return { ok: false, status: r.status, code: data?.code || `http_${r.status}`, data }
  }
  return { ok: true, status: r.status, data }
}

// 표에 없는 코드·우리 쪽 문제일 때 고객에게 보이는 한 줄 — 오류 코드·원인은 console.error(서버는 로그)에만
export const FALLBACK_MESSAGE = '잠시 후 다시 시도해 주세요. 계속되면 고객센터로 문의해 주세요.'

// ── 공통 코드 ──
const COMMON = {
  studio_disabled: '스튜디오가 지금 꺼져 있어요. 잠시 후 다시 시도해 주세요.',
  unauthorized: '로그인이 필요해요. 다시 로그인한 뒤 시도해 주세요.',
  not_admin: '잠시 후 다시 시도해 주세요.',
  no_entitlement: '스튜디오 이용 권한이 없어요. 고객센터로 문의해 주세요.',
  not_customer: '스튜디오는 EUCHS에서 주문하신 고객님께 무료로 열려 있어요.',
  network: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  internal: '처리하다 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
  server_misconfigured: FALLBACK_MESSAGE, // 원인은 서버 로그에만 (고객 화면에 내부 사정을 쓰지 않는다)
  not_found: '대상을 찾을 수 없어요. 목록을 새로고침해 주세요.',
}

/** studio-product (1688 상품 가져오기) */
const PRODUCT = {
  invalid_url: '1688 상품 주소나 상품번호를 확인해 주세요. (예: https://detail.1688.com/offer/123456789012.html)',
  not_found: '1688에서 이 상품을 찾을 수 없어요. 판매가 끝났거나 주소가 잘못됐을 수 있어요.',
  // 하루 상한(1인 user_limit · 전체 global_limit) — 문구는 하나. 상한이 있다는 말·남은 수를 보이지 않는다 (2026-09-28)
  user_limit: '잠시 후 다시 시도해 주세요.',
  global_limit: '잠시 후 다시 시도해 주세요.',
  daily_limit: '잠시 후 다시 시도해 주세요.', // 예전 코드 (이용권 행 상한 — 지금 서버는 보내지 않음)
  onebound_error: '1688 상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
}

/** studio-ingest (1688 이미지 가져오기) */
const INGEST = {
  too_many_images: `프로젝트당 ${STUDIO_MAX_IMAGES}장까지만 가져올 수 있어요.`,
  upload_kind: '직접 올린 사진은 이 방식으로 가져올 수 없어요.',
}

/** studio-upload (내 사진 올리기) — extra: { remaining, max, width, height } */
const UPLOAD = {
  daily_limit: '오늘 만들 수 있는 사진 프로젝트 수를 모두 썼어요. 내일 다시 시도해 주세요.',
  project_expired: '보관 기간이 끝난 프로젝트라 사진을 더 올릴 수 없어요.',
  sign_failed: '업로드 준비에 실패했어요. 다시 시도해 주세요.',
  invalid_type: 'JPG·PNG·WebP 사진만 올릴 수 있어요.',
  invalid_size: '사진 크기는 20MB 이하여야 해요.',
  too_many: '한 번에 10장까지 올릴 수 있어요.',
  type_mismatch: '확장자와 실제 파일 형식이 달라요.',
  unreadable: '이미지를 읽을 수 없어요. 다른 프로그램으로 다시 저장해 보세요.',
  not_uploaded: '업로드가 끝나지 않았어요. 다시 시도해 주세요.',
  too_large: '파일이 너무 커요. 20MB 이하로 줄여서 올려주세요.',
  storage_error: '저장소에서 파일을 확인하지 못했어요. 다시 시도해 주세요.',
  upload_failed: '파일을 올리지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
  // AI 지우기 결과 조각 (patch_prepare / patch_confirm)
  patch_limit: '이 사진에 저장할 수 있는 AI 결과 수(120개)를 넘었어요. 결과는 화면에만 보이고, 다시 열면 새로 계산해요.',
  patch_too_large: '지운 범위가 너무 넓어서 저장하지 못했어요. 칠한 곳을 두세 번에 나눠서 지워 주세요.',
  patch_invalid: 'AI 결과 파일이 올바르지 않아 저장하지 않았어요. 다시 계산해 주세요.',
  // 지운 사진 굽기 (final_prepare / final_confirm, 브라우저 studioBake)
  final_too_large: '적용한 사진이 20MB를 넘어 저장하지 못했어요.',
  final_invalid: '적용한 사진 파일이 올바르지 않아 저장하지 않았어요. [다시 시도]를 눌러 주세요.',
  final_stale: '그 사이 지우기가 바뀌었어요. 최신 내용으로 다시 적용할게요.',
  final_canvas_too_big: '사진이 너무 커서 이 브라우저에서 적용할 수 없어요.',
  final_encode_failed: '사진을 JPG로 만들지 못했어요. [다시 시도]를 눌러 주세요.',
  invalid_input: '요청 값이 올바르지 않아요. 새로고침 후 다시 시도해 주세요.',
}

/** studio-upload project_copy (16단계 작업 복사본) */
const COPY = {
  project_expired: '보관 기간이 끝난 작업이라 복사할 수 없어요.',
  copy_failed: '복사본을 만들지 못했어요. 원래 작업은 그대로예요. 잠시 후 다시 시도해 주세요.',
  copy_bad_path: '사진 저장 위치가 예상과 달라 복사하지 않았어요. 원래 작업은 그대로예요. 계속되면 고객센터로 문의해 주세요.',
  invalid_input: '요청 값이 올바르지 않아요. 새로고침 후 다시 시도해 주세요.',
}

/** studio-upload bg_status / bg_remove (17-1 배경 지우기) */
const BG = {
  bg_not_eligible: '이유씨로 주문한 고객에게 열리는 기능이에요.',
  bg_not_ready: '잠시 후 다시 시도해 주세요.',
  bg_busy: '이 사진의 배경을 지우는 중이에요. 잠시만 기다려 주세요.',
  bg_daily_limit: '오늘은 더 할 수 없어요. 내일 다시 시도해 주세요.',
  bg_too_large: '사진이 너무 커서 배경을 지울 수 없어요 (긴 변 4096px 이하).',
  bg_failed: '배경을 지우지 못했어요. 잠시 후 다시 눌러 주세요.',
  bg_timeout: '배경 지우기가 오래 걸려 멈췄어요. 잠시 후 다시 눌러 주세요.',
  project_expired: '보관 기간이 끝난 작업이라 배경을 지울 수 없어요.',
  storage_error: '저장소를 확인하지 못했어요. 잠시 후 다시 눌러 주세요.',
  invalid_input: '요청 값이 올바르지 않아요. 새로고침 후 다시 시도해 주세요.',
  // 경계 다듬기 (17-3 bg_refine_prepare / bg_refine_confirm)
  bg_refine_limit: '이 사진에 저장할 수 있는 다듬기 결과 수를 넘었어요. 고객센터로 문의해 주세요.',
  bg_refine_invalid: '다듬은 결과 파일이 올바르지 않아 저장하지 않았어요. [적용]을 다시 눌러 주세요.',
  bg_refine_too_large: '다듬은 결과가 20MB를 넘어 저장하지 못했어요.',
  sign_failed: '저장 준비에 실패했어요. [적용]을 다시 눌러 주세요.',
  not_uploaded: '저장이 끝나지 않았어요. [적용]을 다시 눌러 주세요.',
  upload_failed: '파일을 올리지 못했어요. 인터넷 연결을 확인하고 [적용]을 다시 눌러 주세요.',
  // AI 배경 (17-4 bg_gen_status / bg_generate) — 실패는 횟수에서 빠지지 않는다
  bg_gen_user_limit: '오늘 무료 3회를 모두 썼어요. 내일 다시 쓸 수 있어요.',
  bg_gen_global_limit: '지금은 AI 배경을 만들 수 없어요. 잠시 후 다시 시도해 주세요.', // 전체 한도는 안전장치 — 한도가 있다는 말을 하지 않는다 (review-1)
  bg_gen_failed: 'AI 배경을 만들지 못했어요. 횟수는 줄지 않았어요. 잠시 후 다시 눌러 주세요.',
  bg_gen_timeout: 'AI 배경이 오래 걸려 멈췄어요. 횟수는 줄지 않았어요. 잠시 후 다시 눌러 주세요.',
  bg_gen_need_mask: '먼저 [배경 지우기]를 해 주세요.',
  bg_gen_sql_missing: '잠시 후 다시 시도해 주세요.',
}

/** studio-upload export_* (내 상품 보관 2026-09-28) — 받기(다운로드)는 이와 상관없이 된다 */
const EXPORT = {
  export_sql_missing: '잠시 후 다시 시도해 주세요.',
  export_too_large: '20MB가 넘는 파일은 보관하지 못해요. 받은 파일은 그대로 있어요.',
  export_invalid: '보관할 파일이 올바르지 않아 저장하지 않았어요.',
  not_uploaded: '보관이 끝나지 않았어요. 다시 받기로 한 번 더 시도해 주세요.',
  upload_failed: '보관 파일을 올리지 못했어요. 인터넷 연결을 확인해 주세요.',
  sign_failed: '보관 준비에 실패했어요. 잠시 후 다시 시도해 주세요.',
  storage_error: '저장소에서 파일을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
  not_found: '보관된 내 상품을 찾을 수 없어요. 목록을 새로고침해 주세요.',
  invalid_input: '요청 값이 올바르지 않아요. 새로고침 후 다시 시도해 주세요.',
}

/** marketplace (스튜디오 → 쿠팡 연동 2026-09-28) — 서버가 문구를 주는 코드(coupang_*·template_invalid·required_missing 등)는 서버 문구를 그대로 쓴다(studioMarketplace.marketplaceError) */
const MARKETPLACE = {
  // 우리 쪽 준비 문제 5개는 같은 문구 — 원인은 서버 로그에만 (고객 화면에 내부 사정을 쓰지 않는다)
  marketplace_sql_missing: '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  enc_not_ready: '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  relay_not_configured: '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  relay_unreachable: '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  relay_denied: '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  not_connected: '먼저 쿠팡을 연결해 주세요.',
  key_expired: '키 유효기간이 지났어요. Wing에서 재발급한 키로 다시 연결해 주세요.',
  decrypt_failed: '저장된 키를 읽지 못했어요. 연결을 해제하고 다시 연결해 주세요.',
  storage_error: '저장소에서 파일을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
  invalid_input: '입력값을 확인해 주세요.',
}

const TABLES = { product: PRODUCT, ingest: INGEST, upload: UPLOAD, copy: COPY, bg: BG, export: EXPORT, marketplace: MARKETPLACE }

/**
 * @param {'product'|'ingest'|'upload'|'copy'|'bg'|'export'|'marketplace'} context
 * @param {string} code
 * @param {{ remaining?:number, width?:number, height?:number }} [extra]
 */
export function studioErrorMessage(context, code, extra = {}) {
  if (context === 'upload' && code === 'image_limit') {
    const n = Number.isFinite(extra.remaining) ? extra.remaining : null
    const max = Number.isFinite(extra.max) ? extra.max : STUDIO_MAX_IMAGES
    return n === null ? `이 프로젝트에 올릴 수 있는 장수를 넘었어요 (최대 ${max}장).` : `이 프로젝트에 ${n}장 더 올릴 수 있어요 (최대 ${max}장).`
  }
  if (context === 'upload' && code === 'too_large_pixels') {
    const size = extra.width && extra.height ? ` (${extra.width.toLocaleString()}×${extra.height.toLocaleString()})` : ''
    return `사진 해상도가 너무 커요${size}. 한 변 16,384px 이하로 줄여주세요.`
  }
  const base = String(code || '').split('+')[0]
  const msg = TABLES[context]?.[base] || COMMON[base]
  if (msg) return msg
  console.error(`[studioApi] 문구 표에 없는 오류 코드 — context: ${context}, code: ${code}`)
  return FALLBACK_MESSAGE
}
