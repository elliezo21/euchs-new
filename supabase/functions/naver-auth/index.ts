// Supabase Edge Function: naver-auth
// Deploy Command: supabase functions deploy naver-auth --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { code, state, redirectUri } = await req.json()

    if (!code || !state) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing code or state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Read Environment Variables
    const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID") || Deno.env.get("VITE_NAVER_CLIENT_ID")
    const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY")

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not configured on Edge Function environment.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Supabase service role configuration is missing on Edge Function environment.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Exchange Code for Naver Access Token
    const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token")
    tokenUrl.searchParams.set("grant_type", "authorization_code")
    tokenUrl.searchParams.set("client_id", NAVER_CLIENT_ID)
    tokenUrl.searchParams.set("client_secret", NAVER_CLIENT_SECRET)
    tokenUrl.searchParams.set("code", code)
    tokenUrl.searchParams.set("state", state)

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" })
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      console.error("Naver token exchange error:", tokenData)
      return new Response(
        JSON.stringify({
          success: false,
          message: tokenData.error_description || "Failed to exchange Naver token",
          details: tokenData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 4. Fetch User Profile from Naver
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const profileData = await profileRes.json()

    if (profileData.resultcode !== "00" || !profileData.response) {
      console.error("Naver profile fetch error:", profileData)
      return new Response(
        JSON.stringify({
          success: false,
          message: profileData.message || "Failed to fetch Naver profile",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const naverUser = profileData.response
    const naverId = naverUser.id
    const email = naverUser.email || `naver_${naverId}@naver.user`
    const displayName = naverUser.nickname || naverUser.name || "네이버 회원"
    const avatarUrl = naverUser.profile_image || ""
    const mobile = naverUser.mobile || ""

    // 5. Initialize Supabase Admin & Public Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Deterministic secure password using SHA-256 HMAC for seamless session creation
    const encoder = new TextEncoder()
    const keyData = encoder.encode(NAVER_CLIENT_SECRET)
    const msgData = encoder.encode(`naver_auth_${naverId}`)
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
    const authPassword = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 32) + "!Nv9"

    // 6. Check if user already exists
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    let existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase() || u.user_metadata?.naver_id === naverId
    )

    let userId = existingUser?.id

    if (!existingUser) {
      // Create new user in Supabase
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: authPassword,
        user_metadata: {
          full_name: displayName,
          name: displayName,
          avatar_url: avatarUrl,
          mobile,
          provider: "naver",
          naver_id: naverId,
        },
      })

      if (createError) {
        console.error("Supabase create user error:", createError)
        return new Response(
          JSON.stringify({ success: false, message: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      userId = createData.user?.id
    } else {
      // Update existing user metadata and sync password
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: authPassword,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: displayName || existingUser.user_metadata?.full_name,
          name: displayName || existingUser.user_metadata?.name,
          avatar_url: avatarUrl || existingUser.user_metadata?.avatar_url,
          mobile: mobile || existingUser.user_metadata?.mobile,
          provider: "naver",
          naver_id: naverId,
        },
      })
    }

    // 7. Generate Standard Supabase JWT Session
    const { data: sessionData, error: sessionError } = await supabaseAuthClient.auth.signInWithPassword({
      email,
      password: authPassword,
    })

    if (sessionError) {
      console.error("Sign in with password error:", sessionError)
      return new Response(
        JSON.stringify({ success: false, message: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 8. Return Session to Client
    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData.session,
        user: sessionData.user,
        message: "Naver login authenticated successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Edge function uncaught error:", err)
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
