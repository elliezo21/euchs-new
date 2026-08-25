/**
 * EUCHS B2B ERP - 예치금(Balance) 반응형 상태 스토어
 *
 * Supabase profiles.balance 와 localStorage('euchs_user_balance') 를 동기화합니다.
 * Supabase 연결 불가 시 localStorage 값을 폴백으로 사용합니다.
 */
import { ref } from 'vue';
import { supabase, isSupabaseConfigured } from './supabase';
import { currentUser } from './auth';

const STORAGE_KEY = 'euchs_user_balance';
const DEFAULT_BALANCE = 15420000; // 데모 기본값 (원)

// ----------------------------------------------------------------
// 반응형 예치금 잔액 상태
// ----------------------------------------------------------------
export const userBalance = ref(_loadFromStorage());
export const isBalanceLoading = ref(false);

/** localStorage에서 잔액 로드 */
function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_BALANCE;
}

/** localStorage에 잔액 저장 및 갱신 이벤트 발생 */
function _saveToStorage(balance) {
  try {
    localStorage.setItem(STORAGE_KEY, String(balance));
    window.dispatchEvent(new CustomEvent('euchs-balance-update', {
      detail: { balance }
    }));
  } catch (e) {
    console.warn('[balanceStore] localStorage 저장 실패:', e);
  }
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Supabase profiles.balance 조회 → 실패 시 localStorage 폴백
 */
export async function loadBalance() {
  isBalanceLoading.value = true;
  try {
    if (isSupabaseConfigured() && currentUser.value?.id && currentUser.value.id !== 'demo-buyer-01') {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.value.id)
        .maybeSingle();

      if (!error && data?.balance !== undefined && data.balance !== null) {
        userBalance.value = Number(data.balance);
        _saveToStorage(userBalance.value);
        return userBalance.value;
      }
    }
  } catch (e) {
    console.warn('[balanceStore] Supabase 잔액 조회 실패, localStorage 폴백 사용:', e);
  } finally {
    isBalanceLoading.value = false;
  }

  // 폴백: localStorage 값 사용
  userBalance.value = _loadFromStorage();
  return userBalance.value;
}

/**
 * 예치금 충전/결제/차감 트랜잭션 적용 및 Supabase DB (profiles + transactions) 영구 동기화
 * @param {number} amount 변동 금액 (충전: +양수, 결제/차감: -음수)
 * @param {object} txInfo { type, title, description, orderId, orderNumber }
 */
export async function applyBalanceTransaction(amount, txInfo = {}) {
  const delta = Number(amount) || 0;
  const nextBalance = Math.max(0, (userBalance.value || 0) + delta);
  
  // 1. 반응형 상태 및 로컬 스토리지 즉시 반영
  userBalance.value = nextBalance;
  _saveToStorage(nextBalance);

  const txId = `tx-${Date.now()}`;
  const transactionRecord = {
    id: txId,
    created_at: new Date().toISOString(),
    user_id: currentUser.value?.id || null,
    buyer_email: currentUser.value?.email || 'buyer@euchs.com',
    order_id: txInfo.orderId || null,
    order_number: txInfo.orderNumber || null,
    type: txInfo.type || (delta >= 0 ? 'deposit' : 'order_payment'),
    amount: delta,
    balance_after: nextBalance,
    title: txInfo.title || (delta >= 0 ? '예치금 충전' : '발주 대금 결제'),
    description: txInfo.description || ''
  };

  // 2. 로컬 트랜잭션 로그 캐시
  try {
    const rawLogs = localStorage.getItem('euchs_settlement_logs');
    let logs = rawLogs ? JSON.parse(rawLogs) : [];
    if (!Array.isArray(logs)) logs = [];
    logs.unshift(transactionRecord);
    localStorage.setItem('euchs_settlement_logs', JSON.stringify(logs));
  } catch (e) {}

  // 3. Supabase DB 영구 동기화 (profiles.balance + transactions.insert)
  if (isSupabaseConfigured() && currentUser.value?.id && currentUser.value.id !== 'demo-buyer-01') {
    try {
      // 3-1. profiles 테이블 balance 업데이트
      await supabase
        .from('profiles')
        .update({
          balance: nextBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.value.id);

      // 3-2. transactions 테이블 insert
      await supabase
        .from('transactions')
        .insert(transactionRecord);
    } catch (err) {
      console.warn('[balanceStore] Supabase DB 트랜잭션 저장 notice:', err);
    }
  }

  return nextBalance;
}

/**
 * 잔액 즉시 차감 (로컬 + DB 동기화)
 * @param {number} amount 차감할 금액 (양수)
 * @param {object} txInfo 트랜잭션 정보
 * @returns {number} 차감 후 잔액
 */
export function deductBalance(amount, txInfo = {}) {
  const delta = -Math.abs(Number(amount) || 0);
  applyBalanceTransaction(delta, {
    type: txInfo.type || 'order_payment',
    title: txInfo.title || '1688 발주 대금 결제',
    ...txInfo
  });
  return userBalance.value;
}

/**
 * 잔액 직접 설정 (Supabase / 관리자 수동 조정 시 사용)
 * @param {number} balance 새 잔액
 */
export function setBalance(balance) {
  userBalance.value = Number(balance);
  _saveToStorage(userBalance.value);
  
  if (isSupabaseConfigured() && currentUser.value?.id && currentUser.value.id !== 'demo-buyer-01') {
    supabase
      .from('profiles')
      .update({ balance: userBalance.value, updated_at: new Date().toISOString() })
      .eq('id', currentUser.value.id)
      .then(() => {})
      .catch(err => console.warn('setBalance Supabase sync notice:', err));
  }
}

/**
 * 잔액 포맷팅 (₩ 통화 형식)
 * @param {number} amount
 * @returns {string}
 */
export function formatBalance(amount) {
  return `₩${Number(amount).toLocaleString('ko-KR')}원`;
}

/**
 * 잔액 부족 여부 확인
 * @param {number} required 필요 금액
 * @returns {boolean}
 */
export function isBalanceInsufficient(required) {
  return userBalance.value < required;
}
