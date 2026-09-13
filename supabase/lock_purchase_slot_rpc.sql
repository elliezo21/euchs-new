-- ============================================================
-- EUCHS B2B ERP: claim/release_purchase_slot 권한 잠금
-- RPC를 service_role 전용으로 변경 (anon/authenticated 차단)
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 붙여넣기 → RUN
-- ============================================================

-- claim_purchase_slot
REVOKE EXECUTE ON FUNCTION claim_purchase_slot(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_purchase_slot(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION claim_purchase_slot(UUID, INTEGER) FROM authenticated;
GRANT  EXECUTE ON FUNCTION claim_purchase_slot(UUID, INTEGER) TO service_role;

-- release_purchase_slot
REVOKE EXECUTE ON FUNCTION release_purchase_slot(UUID, INTEGER, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_purchase_slot(UUID, INTEGER, BOOLEAN, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION release_purchase_slot(UUID, INTEGER, BOOLEAN, TEXT, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION release_purchase_slot(UUID, INTEGER, BOOLEAN, TEXT, TEXT) TO service_role;

-- 적용 확인 쿼리 (anon/authenticated 행이 없으면 정상)
SELECT grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE specific_name IN (
  'claim_purchase_slot',
  'release_purchase_slot'
)
ORDER BY specific_name, grantee;
