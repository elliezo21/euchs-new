/**
 * EUCHS 1688 B2B 수입 파이프라인 표준 10단계 상태 코드 매핑 & 동기화 유틸리티
 */
import { supabase, isSupabaseConfigured } from './supabase';

export const PIPELINE_STATUSES = [
  { key: 'quote_pending', code: 1, label: '1. 견적 요청/대기', shortLabel: '견적대기', badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200' },
  { key: 'quote_confirmed', code: 2, label: '2. 견적 완료 (고객 결제대기)', shortLabel: '결제대기', badgeClass: 'bg-orange-100 text-orange-800 border border-orange-200' },
  { key: 'payment_verified', code: 3, label: '3. 입금/결제 확인', shortLabel: '결제확인', badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200' },
  { key: 'purchasing', code: 4, label: '4. 1688 공장 구매진행', shortLabel: '구매진행', badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
  { key: 'warehouse_in', code: 5, label: '5. 입고 & 정밀검수', shortLabel: '입고/검수', badgeClass: 'bg-teal-100 text-teal-800 border border-teal-200' },
  { key: 'arrival_checking', code: 5, label: '5-A. 품목별 도착검수 진행중', shortLabel: '도착검수중', badgeClass: 'bg-teal-100 text-teal-700 border border-teal-200' },
  { key: 'arrival_done', code: 5, label: '5-A. 품목별 도착검수 완료', shortLabel: '도착검수완료', badgeClass: 'bg-teal-200 text-teal-800 border border-teal-300' },
  { key: 'inspection_done', code: 5, label: '5-B. 박스포장/실측완료 (2차 결제 대기)', shortLabel: '정밀검수', badgeClass: 'bg-teal-100 text-teal-800 border border-teal-200' },
  { key: 'shipping_ready', code: 6, label: '6. 한국행 선적/출고대기', shortLabel: '선적대기', badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200' },
  { key: 'customs_clearance', code: 7, label: '7. 세관 수입통관 진행', shortLabel: '수입통관', badgeClass: 'bg-violet-100 text-violet-800 border border-violet-200' },
  { key: 'domestic_shipping', code: 8, label: '8. 국내 화물/택배 배송중', shortLabel: '국내배송', badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200' },
  { key: 'delivered', code: 8, label: '8. 배송완료 (수령완료)', shortLabel: '배송완료', badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  { key: 'cancelled', code: 0, label: '주문 취소 / 환불', shortLabel: '주문취소', badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200' }
];

export const STATUS_ALIAS_MAP = {
  // Legacy / Application default mappings
  pending: 'quote_pending',
  quote_request: 'quote_pending',
  quote_pending: 'quote_pending',
  consulting: 'quote_confirmed',
  pending_payment: 'quote_confirmed',
  quoted: 'quote_confirmed',
  quote_confirmed: 'quote_confirmed',
  payment_verified: 'payment_verified',
  paid: 'payment_verified',
  first_payment_done: 'payment_verified',
  purchasing: 'purchasing',
  purchasing_agent: 'purchasing',
  in_warehouse: 'warehouse_in',
  warehouse_in: 'warehouse_in',
  inbound_weighed: 'warehouse_in',
  // 5-A 품목별 도착검수 substatus
  arrival_checking: 'warehouse_in',   // 검수 진행중 → 배송중 그룹
  arrival_done: 'arrival_done',        // 검수 완료 → 입고완료 그룹 (독립 status)
  // 검수 완료/이슈 상태
  inspection_done: 'inspection_done',
  inspecting: 'inspection_done',
  inspected: 'inspection_done',
  passed: 'inspection_done',
  // 이슈 발견: defect_found → inspection_done 단계로 집계 (이슈 트래킹은 issueStatus로 별도 관리)
  defect_found: 'inspection_done',
  shipping_ready: 'shipping_ready',
  ready_to_ship: 'shipping_ready',
  customs: 'customs_clearance',
  customs_clearance: 'customs_clearance',
  domestic_delivery: 'domestic_shipping',
  domestic_shipping: 'domestic_shipping',
  completed: 'delivered',
  delivered: 'delivered',
  cancelled: 'cancelled',
  // step_ 레거시 형식 대응
  step_1: 'quote_pending',
  step_2: 'quote_confirmed',
  step_3: 'payment_verified',
  step_4: 'purchasing',
  step_5: 'warehouse_in',
  step_6: 'shipping_ready',
  step_7: 'customs_clearance',
  step_8: 'domestic_shipping',
};

export function normalizeOrderStatus(status) {
  if (!status) return 'quote_pending';
  return STATUS_ALIAS_MAP[status] || status;
}

export function getOrderStatusItem(status) {
  const normalized = normalizeOrderStatus(status);
  return PIPELINE_STATUSES.find(s => s.key === normalized) || {
    key: normalized,
    label: normalized,
    shortLabel: normalized,
    badgeClass: 'bg-gray-100 text-gray-700'
  };
}

export function getOrderStatusLabel(status) {
  return getOrderStatusItem(status).label;
}

export function getOrderStatusShortLabel(status) {
  return getOrderStatusItem(status).shortLabel;
}

export function getOrderStatusBadgeClass(status) {
  return getOrderStatusItem(status).badgeClass;
}

/**
 * 관리자/바이어 공통 주문 상태 갱신 함수 (Supabase + LocalStorage + Event)
 */
export async function updateApplicationOrderStatus(appId, newStatus) {
  const normalized = normalizeOrderStatus(newStatus);

  // 1. Supabase update
  if (appId && isSupabaseConfigured()) {
    try {
      await supabase
        .from('applications')
        .update({
          status: normalized,
          updated_at: new Date().toISOString()
        })
        .eq('id', appId);
    } catch (e) {
      console.warn('[orderPipeline] Supabase status update error:', e);
    }
  }

  // 2. LocalStorage submitted orders sync
  try {
    const raw = localStorage.getItem('euchs_erp_submitted_orders');
    if (raw) {
      const orders = JSON.parse(raw);
      if (Array.isArray(orders)) {
        const target = orders.find(o => String(o.id) === String(appId) || String(o.orderId) === String(appId));
        if (target) {
          target.status = normalized;
          localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(orders));
        }
      }
    }
  } catch (e) {
    console.warn('[orderPipeline] LocalStorage sync error:', e);
  }

  // 3. Dispatch global update event
  window.dispatchEvent(new CustomEvent('euchs-order-status-update', {
    detail: { appId, status: normalized }
  }));

  return normalized;
}
