-- ==============================================================================
-- 창고 입고 단계 VAS 신청 데이터 전용 컬럼 추가
-- orders 테이블 기존 vas_applied 컬럼과 완전히 별개 (이름 충돌 없음)
-- 실행: Supabase 대시보드 → SQL Editor → Run
-- ==============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS warehouse_vas_applied JSONB DEFAULT '[]'::jsonb;

-- 인덱스: warehouse_vas_applied가 비어있지 않은 레코드 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_vas_applied
  ON public.orders USING GIN (warehouse_vas_applied);
