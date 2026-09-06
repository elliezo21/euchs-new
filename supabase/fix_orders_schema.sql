-- ==============================================================================
-- EUC COMPANY - orders 테이블 누락 컬럼 추가
-- saveNewOrder()가 INSERT 페이로드에 포함하지만 테이블에 없는 컬럼 10개 추가.
-- RLS 정책은 변경하지 않습니다.
--
-- 실행 위치: Supabase Dashboard -> SQL Editor
-- 실행 횟수: 1회 (IF NOT EXISTS로 중복 실행 안전)
-- ==============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_no         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS inbound_no       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_email      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone            TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_info       JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price_krw  NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price_rmb  NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS first_payment    JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_info     JSONB DEFAULT '{}'::jsonb;
