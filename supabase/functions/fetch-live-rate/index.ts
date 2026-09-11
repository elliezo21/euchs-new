// Supabase Edge Function: fetch-live-rate
// Deploy: supabase functions deploy fetch-live-rate --no-verify-jwt
//
// 환경변수 (Edge Function Secrets에 설정 필요):
//   SUPABASE_URL              - 자동 주입
//   SUPABASE_SERVICE_ROLE_KEY - Dashboard > Edge Functions > Secrets 에 추가

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const ER_API_URL = "https://open.er-api.com/v6/latest/CNY"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Authorization 검증: supabase.functions.invoke() 또는 pg_cron 호출만 허용
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[fetch-live-rate] Missing env vars")
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. open.er-api.com 에서 CNY->KRW 국제 환율 조회
    console.log("[fetch-live-rate] Fetching from open.er-api.com...")
    const erRes = await fetch(ER_API_URL)
    if (!erRes.ok) {
      return new Response(
        JSON.stringify({ success: false, message: `ER API returned ${erRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    const erData = await erRes.json()
    const liveMarketRate = erData?.rates?.KRW
    if (!liveMarketRate || isNaN(liveMarketRate)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid KRW rate in ER API response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    const roundedLiveRate = Math.round(liveMarketRate * 100) / 100
    console.log("[fetch-live-rate] Live KRW rate:", roundedLiveRate)

    // 2. Supabase Admin 클라이언트 (RLS 우회)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3. 현재 site_settings 읽기
    const { data: settings, error: fetchErr } = await supabase
      .from("site_settings")
      .select("id, exchange_rate_mode, rate_margin, exchange_rate")
      .limit(1)
      .maybeSingle()

    if (fetchErr) {
      console.error("[fetch-live-rate] Failed to fetch site_settings:", fetchErr)
      return new Response(
        JSON.stringify({ success: false, message: "Failed to read site_settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const settingsId = settings?.id || "default"
    const rateMode = settings?.exchange_rate_mode || "manual"
    const rateMargin = Number(settings?.rate_margin) || 0

    // 4. 업데이트 페이로드 구성 (KST 기준 갱신 시각)
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const updatePayload = {
      live_market_rate: roundedLiveRate,
      rate_last_updated_at: nowKst.toISOString(),
    }

    // auto_margin: exchange_rate 자동 계산
    // manual: exchange_rate 건드리지 않음 (관리자 수동값 유지)
    let newExchangeRate = settings?.exchange_rate
    if (rateMode === "auto_margin") {
      newExchangeRate = Math.round((roundedLiveRate + rateMargin) * 100) / 100
      updatePayload.exchange_rate = newExchangeRate
      console.log(`[fetch-live-rate] auto_margin: ${roundedLiveRate} + ${rateMargin} = ${newExchangeRate}`)
    } else {
      console.log(`[fetch-live-rate] manual mode: exchange_rate unchanged`)
    }

    // 5. site_settings 업데이트
    const { error: updateErr } = await supabase
      .from("site_settings")
      .update(updatePayload)
      .eq("id", settingsId)

    if (updateErr) {
      console.error("[fetch-live-rate] update failed:", updateErr)
      return new Response(
        JSON.stringify({ success: false, message: "Failed to update site_settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("[fetch-live-rate] Done. rate:", roundedLiveRate, "| mode:", rateMode)
    return new Response(
      JSON.stringify({
        success: true,
        live_market_rate: roundedLiveRate,
        exchange_rate: newExchangeRate,
        mode: rateMode,
        updated_at: nowKst.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[fetch-live-rate] Uncaught error:", err)
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
