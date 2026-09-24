/**
 * 스튜디오 서버 API 호출 + 오류 코드별 한국어 문구
 *
 * 서버(api/_studio.js)는 오류를 { code, message }로 통일해 돌려준다. 화면은 code로 분기한다.
 * "오류가 발생했습니다" 한 줄로 뭉개지 않고, 모르는 코드는 코드를 그대로 보여준다.
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

// ── 공통 코드 ──
const COMMON = {
  studio_disabled: '스튜디오가 지금 꺼져 있어요. 잠시 후 다시 시도해 주세요.',
  unauthorized: '로그인이 필요해요. 다시 로그인한 뒤 시도해 주세요.',
  not_admin: '지금은 관리자만 스튜디오를 쓸 수 있어요 (베타 준비 중).',
  no_entitlement: '스튜디오 이용 권한이 없어요. 관리자에게 문의해 주세요.',
  network: '인터넷 연결을 확인해 주세요. 서버에 닿지 못했어요.',
  internal: '서버에서 처리하다 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
  server_misconfigured: '서버 설정에 문제가 있어요. 관리자에게 알려주세요.',
  not_found: '대상을 찾을 수 없어요. 목록을 새로고침해 주세요.',
}

/** studio-product (1688 상품 가져오기) */
const PRODUCT = {
  invalid_url: '1688 상품 주소나 상품번호를 확인해 주세요. (예: https://detail.1688.com/offer/123456789012.html)',
  not_found: '1688에서 이 상품을 찾을 수 없어요. 판매가 끝났거나 주소가 잘못됐을 수 있어요.',
  daily_limit: '오늘 가져올 수 있는 상품 수를 모두 썼어요. 내일 다시 시도해 주세요.',
  global_limit: '오늘 스튜디오 전체 상품 조회량이 가득 찼어요. 내일 다시 시도해 주세요.',
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
}

const TABLES = { product: PRODUCT, ingest: INGEST, upload: UPLOAD }

/**
 * @param {'product'|'ingest'|'upload'} context
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
  return msg || `알 수 없는 오류예요 (코드: ${code}). 관리자에게 알려주세요.`
}
