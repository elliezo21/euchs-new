-- ========================================================
-- EUCHS B2B ERP: 2차 결제 원자적 트랜잭션 RPC 함수
-- Supabase SQL Editor에서 실행해 주세요.
-- ========================================================

-- --------------------------------------------------------
-- 1. profiles 테이블 (예치금 잔액 포함)
--    이미 존재하는 경우 컬럼만 추가됩니다.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  balance NUMERIC DEFAULT 0,
  memo TEXT
);

-- 기존 테이블에 balance 컬럼이 없는 경우 안전하게 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- --------------------------------------------------------
-- 2. orders 테이블
--    ERP 주문 데이터 (localStorage와 병행 사용)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'quote_pending',
  items JSONB DEFAULT '[]'::jsonb,
  measured_data JSONB DEFAULT '{}'::jsonb,
  inspection_photos JSONB DEFAULT '[]'::jsonb,
  second_payment JSONB DEFAULT '{}'::jsonb,
  vas_applied JSONB DEFAULT '[]'::jsonb,
  barcode_label_url TEXT,
  barcode_label_filename TEXT,
  memo TEXT
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS barcode_label_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS barcode_label_filename TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- --------------------------------------------------------
-- 3. transactions 테이블 (예치금 입출금 내역)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL,         -- 'deposit' | 'payment' | 'refund'
  amount NUMERIC NOT NULL,    -- 차감은 음수 (-133000)
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- --------------------------------------------------------
-- 4. RLS 정책 설정
-- --------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 5. process_second_payment RPC 함수 (원자적 트랜잭션)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION process_second_payment(
  p_order_id  UUID,
  p_amount    NUMERIC,
  p_user_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance       NUMERIC;
  v_new_balance   NUMERIC;
  v_order_status  TEXT;
BEGIN
  -- ① 사용자 프로필 & 잔액 조회 (FOR UPDATE: 동시 요청 방지 행 잠금)
  SELECT balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION '사용자 프로필을 찾을 수 없습니다. (user_id: %)', p_user_id;
  END IF;

  -- ② 잔액 부족 검증
  IF v_balance < p_amount THEN
    RAISE EXCEPTION '잔액 부족: 현재 잔액(%)이 결제 금액(%)보다 적습니다.',
      v_balance::TEXT, p_amount::TEXT;
  END IF;

  -- ③ 주문 상태 확인 (5단계인지 검증)
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION '주문을 찾을 수 없습니다. (order_id: %)', p_order_id;
  END IF;

  IF v_order_status NOT IN ('inspection_done', 'warehouse_in', 'step_5', 'inspecting') THEN
    RAISE EXCEPTION '2차 결제가 불가한 주문 상태입니다. (현재 상태: %)', v_order_status;
  END IF;

  -- ④ profiles.balance 차감
  v_new_balance := v_balance - p_amount;
  UPDATE profiles
  SET
    balance    = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- ⑤ transactions 차감 내역 INSERT
  INSERT INTO transactions (user_id, order_id, type, amount, description)
  VALUES (
    p_user_id,
    p_order_id,
    'payment',
    -p_amount,
    '2차 운임 및 통관비용 결제'
  );

  -- ⑥ orders.status → '6. 한국행 선적대기' 전환
  UPDATE orders
  SET
    status     = 'shipping_ready',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- ⑦ 성공 응답 반환
  RETURN jsonb_build_object(
    'success',      true,
    'new_balance',  v_new_balance,
    'order_id',     p_order_id,
    'amount',       p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 트랜잭션 자동 롤백 후 에러 메시지 반환
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- RPC 실행 권한 부여 (authenticated 사용자)
GRANT EXECUTE ON FUNCTION process_second_payment(UUID, NUMERIC, UUID) TO authenticated;

-- --------------------------------------------------------
-- 완료 안내
-- --------------------------------------------------------
-- process_second_payment(p_order_id, p_amount, p_user_id) RPC 함수가
-- 생성되었습니다. 프론트엔드에서 supabase.rpc('process_second_payment', {...})
-- 형태로 호출하면 원자적으로 실행됩니다.
-- --------------------------------------------------------
