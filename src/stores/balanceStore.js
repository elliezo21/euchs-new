/**
 * EUCHS B2B ERP - 예치금(Balance) 반응형 상태 스토어
 *
 * Supabase profiles.balance 와 transactions 테이블 및 localStorage('euchs_user_balance')를 실시간 동기화합니다.
 * Supabase 연결 불가 시 localStorage 값을 폴백으로 안전하게 사용합니다.
 */
import { ref } from 'vue';
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase';
import { currentUser } from '@/lib/auth';

const STORAGE_KEY = 'euchs_user_balance';
const HELD_STORAGE_KEY = 'euchs_user_held_balance';
const DEFAULT_BALANCE = 0; // 신규/비로그인 기본값 (원)

// ----------------------------------------------------------------
// 반응형 예치금 잔액 상태
// ----------------------------------------------------------------
export const userBalance = ref(_loadFromStorage());
export const heldBalance = ref(_loadHeldFromStorage()); // 출금 신청 동결 금액
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

/** localStorage에서 동결 잔액 로드 */
function _loadHeldFromStorage() {
  try {
    const raw = localStorage.getItem(HELD_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return 0;
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

/** localStorage에 동결 잔액 저장 */
function _saveHeldToStorage(held) {
  try {
    localStorage.setItem(HELD_STORAGE_KEY, String(Math.max(0, held)));
  } catch (e) {
    console.warn('[balanceStore] held_balance localStorage 저장 실패:', e);
  }
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

let isFetchingBalance = false;
let lastFetchTime = 0;

/**
 * Supabase profiles.balance + held_balance 조회 → 실패 시 localStorage 폴백
 * - 무한 폴링 루프 방어: 최소 5초 쿨다운 디바운스 적용
 * - user.id가 UUID일 때 id로 조회, 아닐 경우 email로 안전 조회
 */
export async function loadBalance(force = false) {
  const now = Date.now();
  if (isFetchingBalance) return userBalance.value;
  if (!force && now - lastFetchTime < 5000) return userBalance.value;

  isFetchingBalance = true;
  lastFetchTime = now;
  isBalanceLoading.value = true;

  try {
    const user = currentUser.value;
    if (isSupabaseConfigured() && user && user.id !== 'demo-buyer-01') {
      const isUUID = user.id && isValidUUID(user.id);
      const userMail = user.email ? String(user.email).trim().toLowerCase() : '';

      if (isUUID || userMail) {
        let query = supabase.from('profiles').select('balance, held_balance');

        if (isUUID) {
          query = query.eq('id', user.id);
        } else {
          query = query.eq('email', userMail);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          if (data.balance !== undefined && data.balance !== null) {
            userBalance.value = Number(data.balance);
            _saveToStorage(userBalance.value);
          }
          // held_balance (컬럼이 없는 구버전 DB 호환: undefined면 0으로 처리)
          const held = data.held_balance !== undefined && data.held_balance !== null
            ? Number(data.held_balance)
            : 0;
          heldBalance.value = Math.max(0, held);
          _saveHeldToStorage(heldBalance.value);
          return userBalance.value;
        }
      }
    }
  } catch (e) {
    // 안전한 예외 방어
  } finally {
    isBalanceLoading.value = false;
    isFetchingBalance = false;
  }

  // 폴백: localStorage 값 사용
  userBalance.value = _loadFromStorage();
  heldBalance.value = _loadHeldFromStorage();
  return userBalance.value;
}

/**
 * 특정 사용자 대상 잔액 안전 조회 헬퍼
 */
export async function fetchUserBalance(user) {
  if (!user) return userBalance.value;
  return loadBalance(true);
}

/**
 * 예치금 충전/결제/차감 트랜잭션 적용 및 Supabase DB (profiles + transactions) 영구 동기화
 * @param {number} amount 변동 금액 (충전: +양수, 결제/차감: -음수)
 * @param {object} txInfo { type, title, description, orderId, orderNumber }
 */
export async function applyBalanceTransaction(amount, txInfo = {}) {
  const delta = Number(amount) || 0;
  const nextBalance = Math.max(0, (userBalance.value || 0) + delta);
  
  // 1. 반응형 상태 및 로컬 스토리지 즉시 반영 (선 UI 갱신)
  userBalance.value = nextBalance;
  _saveToStorage(nextBalance);

  const nowIso = new Date().toISOString();
  const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const user = currentUser.value;
  const isUUID = user?.id && isValidUUID(user.id);

  // localStorage 캐시용 레코드 (로컬 전용 — id는 로컬 식별자로만 사용)
  const transactionRecord = {
    id: txId,
    created_at: nowIso,
    user_id: isUUID ? user.id : null,
    user_email: user?.email || null,
    order_no: txInfo.orderNumber || null,
    type: txInfo.type || (delta >= 0 ? 'deposit' : 'order_payment'),
    amount: delta,
    balance_after: nextBalance,
    // title은 DB에 없으므로 로컬 캐시에서만 유지, description에 합쳐서 보관
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
  if (isSupabaseConfigured() && user && user.id !== 'demo-buyer-01') {
    try {
      const userMail = user.email ? String(user.email).trim() : '';

      // 3-1. profiles 테이블 balance 업데이트
      let updateQuery = supabase
        .from('profiles')
        .update({
          balance: nextBalance,
          updated_at: nowIso
        });

      if (isUUID) {
        updateQuery = updateQuery.eq('id', user.id);
      } else if (userMail) {
        updateQuery = updateQuery.eq('email', userMail);
      } else {
        updateQuery = null;
      }

      if (updateQuery) {
        const { error: profileErr } = await updateQuery;
        if (profileErr) {
          console.warn('[balanceStore] Supabase profiles update warning:', profileErr.message);
        }
      }

      // 3-2. transactions 테이블 insert
      // 실제 라이브 스키마(9컬럼): id(uuid 자동생성), user_id, user_email, type, amount,
      //   balance_after, order_no, description, created_at
      // 제거된 필드: id(TEXT코드생성), buyer_email, order_id, order_number, title
      const titleText = txInfo.title || (delta >= 0 ? '예치금 충전' : '발주 대금 결제');
      const descText = txInfo.description
        ? `${titleText} | ${txInfo.description}`
        : titleText;

      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: isUUID ? user.id : null,
          user_email: userMail || null,
          order_no: txInfo.orderNumber || null,
          type: txInfo.type || (delta >= 0 ? 'deposit' : 'order_payment'),
          amount: delta,
          balance_after: nextBalance,
          description: descText,
          created_at: nowIso
        });
      if (txErr) {
        console.warn('[balanceStore] transactions INSERT 경고:', txErr.message, txErr.code);
      }
    } catch (err) {
      console.warn('[balanceStore] Supabase DB 트랜잭션 저장 notice (fallback active):', err);
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
  
  const user = currentUser.value;
  if (isSupabaseConfigured() && user && user.id !== 'demo-buyer-01') {
    const isUUID = isValidUUID(user.id);
    const userMail = user.email ? String(user.email).trim() : '';

    let updateQuery = supabase
      .from('profiles')
      .update({ balance: userBalance.value, updated_at: new Date().toISOString() });

    if (isUUID) {
      updateQuery = updateQuery.eq('id', user.id);
    } else if (userMail) {
      updateQuery = updateQuery.eq('email', userMail);
    } else {
      updateQuery = null;
    }

    if (updateQuery) {
      updateQuery
        .then(() => {})
        .catch(err => console.debug('setBalance Supabase sync notice:', err));
    }
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
 * 가용 잔액 부족 여부 확인
 * — 가용 잔액 = balance - held_balance (출금 신청 동결 금액 제외)
 * — 주문 결제 시 이 함수 기준으로 차단
 * @param {number} required 필요 금액
 * @returns {boolean}
 */
export function isBalanceInsufficient(required) {
  const available = (userBalance.value || 0) - (heldBalance.value || 0);
  return available < required;
}

/**
 * 가용 잔액 반환 헬퍼
 * @returns {number}
 */
export function getAvailableBalance() {
  return Math.max(0, (userBalance.value || 0) - (heldBalance.value || 0));
}

/**
 * Supabase Realtime 예치금 실시간 구독 헬퍼
 */
export function subscribeToBalance(callback) {
  if (!isSupabaseConfigured()) return null;

  try {
    const channel = supabase
      .channel('public:profiles-balance-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const updated = payload?.new;
        const user = currentUser.value;
        if (updated && (updated.id === user?.id || (user?.email && updated.email === user.email))) {
          if (updated.balance !== undefined && updated.balance !== null) {
            userBalance.value = Number(updated.balance);
            _saveToStorage(userBalance.value);
          }
          // held_balance 실시간 갱신
          if (updated.held_balance !== undefined && updated.held_balance !== null) {
            heldBalance.value = Math.max(0, Number(updated.held_balance));
            _saveHeldToStorage(heldBalance.value);
          }
          if (typeof callback === 'function') callback(userBalance.value);
        }
      })
      .subscribe();

    return channel;
  } catch (e) {
    console.warn('[subscribeToBalance] Realtime notice:', e);
    return null;
  }
}

// 브라우저 전역 잔액 갱신 이벤트 수신
if (typeof window !== 'undefined') {
  window.addEventListener('euchs-balance-updated', () => {
    loadBalance();
  });

  // 로그아웃 시 예치금 잔액 ref 즉시 0으로 초기화
  // (localStorage는 signOut()에서 이미 제거되므로, 여기서는 반응형 상태만 리셋)
  window.addEventListener('euchs-auth-changed', (e) => {
    if (!e.detail?.user) {
      userBalance.value = 0;
      heldBalance.value = 0;
    }
  });
}
