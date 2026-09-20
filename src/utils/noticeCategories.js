/**
 * 공지사항 카테고리 단일 정의 (Single Source of Truth)
 * - 관리자 공지 등록 폼/필터(AdminNoticesView.vue)와 공개 공지 탭(NoticeView.vue)이 공유
 * - id는 notices.category 컬럼에 저장되는 값, name은 화면 표시 및 notices.category_name에 저장되는 값
 */
export const NOTICE_CATEGORIES = [
  { id: 'schedule', name: '일정' },
  { id: 'event', name: '이벤트' },
  { id: 'logistics', name: '물류/배송' },
  { id: 'customs', name: '통관/세관' },
  { id: 'system', name: '시스템 공지' },
  { id: 'general', name: '기타' }
]
