/**
 * [판매처로 보내기] — 보관된 완성작(studio_exports 한 줄)을 판매처(스마트스토어·쿠팡 등)에 올린다.
 *
 * ★ 지금은 준비 중이다. 화면(StudioExportList.vue)의 버튼은 이 함수 하나만 부른다.
 *   판매처 API를 연결할 때는 이 함수 안만 바꾼다 — 성공이면 { status: 'sent' }, 실패면 throw(원인 문구 포함).
 *   보관된 파일 주소는 서버 action export_download(studioExportArchive.js downloadArchive와 같은 호출)로 받을 수 있다.
 *
 * @param {string} exportId studio_exports.id
 * @returns {Promise<{ status: 'soon' | 'sent', message: string }>}
 */
export async function sendToMarketplace(exportId) {
  console.info('[studioMarketplace] 판매처로 보내기 — 아직 연결 전:', exportId)
  return { status: 'soon', message: '판매처로 보내기는 곧 열려요' }
}
