/**
 * 현지 검수원 종합 소견 선택지 (라디오 버튼 옵션)
 *
 * 구조:
 *   - id   : 고정 식별 키 (DB 저장 기준, 절대 변경하지 말 것)
 *   - text : 바이어 화면에 표시될 한국어 문구
 *
 * 다국어 대응:
 *   나중에 언어팩을 붙일 때 id를 키로 사용해 번역 맵을 만들면 됨.
 *   예: { ko: '이우 센터 현지 입고 및 품목별 도착검수 완료.', zh: '义乌中心入库及逐项到货检验完成。', ... }
 *
 * 항목 추가/변경 규칙:
 *   - 기존 id 절대 변경 금지 (DB에 저장된 text 값이 id 기반으로 표시되므로)
 *   - 새 항목은 맨 끝에 추가
 */

export const INSPECTION_NOTE_OPTIONS = [
  {
    id: 'arrival_done_normal',
    text: '이우 센터 현지 입고 및 품목별 도착검수 완료.',
  },
  {
    id: 'warehouse_in_normal',
    text: '이우 센터 입고 및 계근 완료.',
  },
  {
    id: 'inspection_done_normal',
    text: '이우 센터 실측 계근 및 100% 정밀 검수 완료. 2차 정산 결제 대기중.',
  },
  {
    id: 'shipping_ready',
    text: '한국행 정기선적 적재 대기.',
  },
  {
    id: 'defect_found',
    text: '이우 센터 정밀 검수 중 이슈 상품 발견. 상세 내용은 이슈 현황을 확인해 주세요.',
  },
];

/**
 * 텍스트 값으로 매칭되는 option id를 반환 (초기값 복원용)
 * 저장된 text가 선택지 중 하나와 일치하면 해당 id, 아니면 null
 */
export function findOptionIdByText(text) {
  if (!text) return null;
  const match = INSPECTION_NOTE_OPTIONS.find(o => o.text === text);
  return match ? match.id : null;
}
