/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Supabase URL or Service Role Key is not set. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are defined in Edge Function environment variables.',
  )
}
const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '')

// Environment variables (should be set in Supabase Function settings)
const LOMI_API_KEY = Deno.env.get('LOMI_API_KEY')
const LOMI_API_URL =
  Deno.env.get('LOMI_API_URL') || 'https://api.lomi.africa/v1'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'

// Default allowed providers
const DEFAULT_ALLOWED_PROVIDERS = ['WAVE']

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Request Body Parameters ---
    // Destructure the expected JSON body from the request.
    const {
      // --- Required Fields ---
      amount, // Base amount (e.g., 8000 for 8000 XOF) - used for direct amount checkout.
      currencyCode, // 3-letter ISO currency code (e.g., "XOF").
      reservationId, // Your internal reservation ID (UUID or string).
      courtId, // Court ID to get product_id from (NEW)
      useDynamicPricing = false, // Override to force dynamic pricing (NEW)

      // --- Optional Fields (with defaults or null if not provided) ---
      userEmail = null, // Customer's email, pre-fills lomi.checkout.
      userName = null, // Customer's name, pre-fills lomi.checkout.
      userPhone = null, // Customer's phone number, pre-fills lomi.checkout.
      successUrlPath = '/payment/success', // Relative path for success redirect (e.g., /payment/success).
      cancelUrlPath = '/payment/cancel', // Relative path for cancel redirect (e.g., /payment/cancel).
      allowedProviders = null, // Array of allowed payment providers (e.g., ["WAVE", "ORANGE_MONEY"]).

      // --- Quantity Support ---
      quantity = 1, // Number of items/reservations.
      allowQuantity = false, // Whether to allow quantity changes on checkout page.

      // --- All Optional lomi Parameters (provide in request body to override defaults) ---
      // See lomi. API docs: https://api.lomi.africa/v1/docs#tag/CheckoutSessions/operation/CheckoutSessionsController_create
      title = null, // Title displayed on lomi. checkout page - will be auto-generated if null.
      public_description = null, // Description on lomi. checkout page - will be auto-generated if null.
      // product_id will be determined from court or dynamic pricing
      subscription_id = null, // Subscription ID (UUID) to associate.
      plan_id = null, // Plan ID (UUID) to associate.
      metadata = null, // Custom key-value pairs (values must be strings) - will be auto-generated if null.
      expiration_minutes = 30, // How long the checkout link is valid.
      allow_coupon_code = true, // Set to true/false to explicitly allow/disallow coupons.
    } = await req.json()

    // --- API Key Validation ---
    if (!LOMI_API_KEY) {
      console.error('LOMI_API_KEY is not set.')
      return new Response(
        JSON.stringify({ error: 'LOMI API key not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    // --- Input Validation ---
    if (!currencyCode || !reservationId) {
      console.error('Missing required fields:', { currencyCode, reservationId })
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: currencyCode or reservationId',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // --- Determine Pricing Mode ---
    let finalProductId = null
    const finalAmount = amount
    let useDynamic = useDynamicPricing

    if (courtId && !useDynamicPricing) {
      try {
        const { data: courtData, error: courtError } = await supabase
          .from('courts')
          .select('lomi_product_id')
          .eq('id', courtId)
          .single()

        if (courtError) throw courtError

        const { data: settingsData, error: settingsError } = await supabase
          .from('pricing_settings')
          .select('use_dynamic_pricing')
          .single()

        if (settingsError) throw settingsError

        if (settingsData?.use_dynamic_pricing) {
          useDynamic = true
        } else if (courtData?.lomi_product_id) {
          finalProductId = courtData.lomi_product_id
        }
      } catch (error) {
        console.warn(
          'Failed to fetch pricing settings, falling back to amount-based:',
          error,
        )
        useDynamic = true
      }
    }

    // Final validation - ensure we have either amount or product_id
    if (!finalAmount && !finalProductId) {
      console.error('Either amount or product_id must be available')
      return new Response(
        JSON.stringify({
          error: 'Either amount or product_id must be available',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate quantity
    if (quantity <= 0) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be greater than 0' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // --- Prepare lomi. Payload ---

    // Define payload structure matching lomi. API
    type LomiPayload = {
      success_url: string
      cancel_url: string
      allowed_providers: string[]
      amount?: number
      currency_code: string
      quantity?: number
      title?: string | null
      public_description?: string | null
      customer_email?: string | null
      customer_name?: string | null
      customer_phone?: string | null
      metadata?: Record<string, string> | null
      expiration_minutes?: number | null
      product_id?: string | null
      subscription_id?: string | null
      plan_id?: string | null
      allow_coupon_code?: boolean | null
      allow_quantity?: boolean | null
    }

    // --- Prepare lomi. Payload ---

    // Determine if we're using product-based or amount-based checkout
    const isProductBased = !!finalProductId && !useDynamic
    console.log('Is product-based checkout:', isProductBased)
    console.log('Product ID being used:', finalProductId)
    console.log('Using dynamic pricing:', useDynamic)

    // Generate default metadata if not provided
    const defaultMetadata = {
      reservation_id: reservationId,
      source: 'padel_app',
      is_product_based: String(isProductBased),
      court_id: courtId || 'unknown',
    }
    const finalMetadata = metadata || defaultMetadata

    // Generate default title and description if not provided
    const finalTitle =
      title || `Padel Reservation ${reservationId} (x${quantity})`
    const finalDescription =
      public_description ||
      `Payment for ${quantity} padel court reservation(s) ${reservationId}`

    // Base payload sent to lomi.
    const baseLomiPayload = {
      success_url: `${APP_BASE_URL}${successUrlPath}?reservation_id=${reservationId}&status=success`,
      cancel_url: `${APP_BASE_URL}${cancelUrlPath}?reservation_id=${reservationId}&status=cancelled`,
      allowed_providers: allowedProviders || DEFAULT_ALLOWED_PROVIDERS,
      currency_code: currencyCode,
      quantity: quantity,
      customer_email: userEmail,
      customer_name: userName,
      customer_phone: userPhone,
      allow_coupon_code: allow_coupon_code,
      allow_quantity: allowQuantity,
      metadata: finalMetadata,
      expiration_minutes: expiration_minutes,
    }

    const payload: LomiPayload = isProductBased
      ? {
          ...baseLomiPayload,
          product_id: finalProductId,
          title: finalTitle,
          public_description: finalDescription,
        }
      : {
          ...baseLomiPayload,
          // Amount-based checkout: Use the amount directly
          amount: finalAmount,
          title: finalTitle,
          public_description: finalDescription,
        }

    // Conditionally add optional fields to the payload if they were provided in the request
    if (subscription_id) payload.subscription_id = subscription_id
    if (plan_id) payload.plan_id = plan_id

    console.log(
      'Using',
      isProductBased ? 'product-based' : 'amount-based',
      'checkout',
    )
    console.log('Final lomi payload:', JSON.stringify(payload, null, 2))

    // --- Call lomi. API ---
    const response = await fetch(`${LOMI_API_URL}/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LOMI_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()

    // --- Handle lomi. Response ---
    if (!response.ok || !responseData.data || !responseData.data.url) {
      console.error('lomi. error:', responseData)
      return new Response(
        JSON.stringify({
          error: 'Failed to create lomi. checkout session',
          details: responseData.error || responseData,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: responseData.error?.status || 500,
        },
      )
    }

    // --- Success Response ---
    // Return the lomi. checkout URL to the client
    return new Response(
      JSON.stringify({ checkout_url: responseData.data.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    // --- Error Handling ---
    console.error('!!!!!!!!!! CAUGHT ERROR in main try/catch !!!!!!!!!:', error)
    console.error('Error details:', error.message, error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
