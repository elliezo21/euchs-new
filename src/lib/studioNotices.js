/**
 * 스튜디오 대문 "새 소식" (공지·업데이트)
 *
 * 지금은 고정 배열이다. 나중에 studio_notices 테이블로 바꿀 때 이 함수 안만 바꾸면 되도록
 * 화면은 getStudioNotices()만 부른다.
 *
 * type: 'update'(업데이트) | 'notice'(공지) | 'soon'(예정)
 * date: 'YYYY-MM-DD' 또는 null(예정 — 날짜 칸에 "예정")
 */
const NOTICES = [
  { date: '2026-09-25', type: 'update', title: '내 사진 올리기 · 폴더째 올리기를 지원해요' },
  { date: '2026-09-25', type: 'notice', title: '스튜디오 베타를 시작했어요 — 이유씨 고객은 무료' },
  { date: null, type: 'soon', title: '중국어 지우기 편집기가 곧 나와요' },
]

/** @returns {Promise<Array<{ date: string|null, type: 'update'|'notice'|'soon', title: string }>>} */
export async function getStudioNotices() {
  return NOTICES.map(n => ({ ...n }))
}
