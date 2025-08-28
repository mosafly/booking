/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { hashEmail, hashPhone } from '../_shared/hash.ts'

// Env vars to configure in Supabase Function settings
const META_CAPI_PIXEL_ID = Deno.env.get('META_CAPI_PIXEL_ID') || ''
const META_CAPI_ACCESS_TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN') || ''
const META_CAPI_TEST_EVENT_CODE = Deno.env.get('META_CAPI_TEST_EVENT_CODE') || ''
const META_CAPI_API_VERSION = Deno.env.get('META_CAPI_API_VERSION') || 'v18.0'

if (!META_CAPI_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
  console.warn('[meta-capi] Missing META_CAPI_PIXEL_ID or META_CAPI_ACCESS_TOKEN in environment')
}

function getClientIp(req: Request): string | undefined {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    undefined
  )
}

function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Not Found', { status: 404, headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Expected payload from client
    // Minimal fields: event_name, event_id, custom_data
    const {
      event_name,
      event_id,
      event_time, // optional, seconds timestamp
      event_source_url, // optional
      action_source = 'website',
      custom_data = {},
      // user_data (client-provided pieces)
      fbp,
      fbc,
      external_id,
      email, // plain text from client (will be hashed here)
      phone, // plain text (will be normalized and hashed here)
      // privacy/processing options (optional)
      data_processing_options,
      data_processing_options_country,
      data_processing_options_state,
      // attribution/testing (optional)
      attribution_data,
      original_event_data,
      test_event_code,
    } = body || {}

    if (!event_name) {
      return new Response(
        JSON.stringify({ error: 'event_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!event_id) {
      return new Response(
        JSON.stringify({ error: 'event_id is required for deduplication' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const ip = getClientIp(req)
    const ua = getUserAgent(req)

    const emHashed = await hashEmail(email)
    const phHashed = await hashPhone(phone)

    const user_data: Record<string, unknown> = {
      ...(ip ? { client_ip_address: ip } : {}),
      ...(ua ? { client_user_agent: ua } : {}),
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(external_id ? { external_id } : {}),
      ...(emHashed ? { em: [emHashed] } : {}),
      ...(phHashed ? { ph: [phHashed] } : {}),
    }

    const nowSeconds = Math.floor(Date.now() / 1000)

    const data: Record<string, unknown> = {
      event_name,
      event_time: Number.isFinite(event_time) ? event_time : nowSeconds,
      action_source,
      event_id,
      ...(event_source_url ? { event_source_url } : {}),
      user_data,
      ...(custom_data ? { custom_data } : {}),
      ...(attribution_data ? { attribution_data } : {}),
      ...(original_event_data ? { original_event_data } : {}),
    }

    if (data_processing_options) {
      (data as any).data_processing_options = data_processing_options
      if (typeof data_processing_options_country !== 'undefined') {
        ;(data as any).data_processing_options_country = data_processing_options_country
      }
      if (typeof data_processing_options_state !== 'undefined') {
        ;(data as any).data_processing_options_state = data_processing_options_state
      }
    }

    const payload = {
      data: [data],
      // Prefer request test code; fallback to env test code when present
      ...(test_event_code || META_CAPI_TEST_EVENT_CODE
        ? { test_event_code: test_event_code || META_CAPI_TEST_EVENT_CODE }
        : {}),
    }

    const url = `https://graph.facebook.com/${META_CAPI_API_VERSION}/${META_CAPI_PIXEL_ID}/events?access_token=${META_CAPI_ACCESS_TOKEN}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const fb = await res.json()

    if (!res.ok) {
      console.error('[meta-capi] Error from Facebook:', fb)
      return new Response(
        JSON.stringify({ error: 'Facebook API error', details: fb }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, fb }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[meta-capi] Handler error:', e)
    return new Response(
      JSON.stringify({ error: e?.message || 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
