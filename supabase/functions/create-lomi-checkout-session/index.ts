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

// lomi. API Config
const LOMI_API_KEY = Deno.env.get('LOMI_API_KEY')
const LOMI_API_BASE_URL =
  Deno.env.get('LOMI_API_URL') || 'https://api.lomi.africa'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'

serve(async (req: Request) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({
        error:
          'Supabase environment variables not configured for the function.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
  if (!LOMI_API_KEY) {
    console.error('LOMI_API_KEY is not set for the function.')
    return new Response(
      JSON.stringify({
        error: 'LOMI API key not configured for the function.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }

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
      reservationId, // Your internal reservation ID (UUID or string). OPTIONAL now
      courtId, // Court ID to get product_id from (NEW)
      useDynamicPricing = false, // Override to force dynamic pricing (NEW)

      // --- Optional Fields (with defaults or null if not provided) ---
      userEmail = null, // Customer's email, pre-fills lomi.checkout.
      userName = null, // Customer's name, pre-fills lomi.checkout.
      userPhone = null, // Customer's phone number, pre-fills lomi.checkout.
      gymBookingId = null, // Gym booking ID for fitness classes
      // Slot timing (for webhook reconstruction if no reservation yet)
      slotStartIso = null,
      slotEndIso = null,
      successUrlPath = '/payment/success', // Relative path for success redirect (e.g., /payment/success).
      cancelUrlPath = '/payment/cancel', // Relative path for cancel redirect (e.g., /payment/cancel).

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
      // --- Tracking ---
      eventId = null, // Meta Pixel/CAPI event_id for deduplication
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
    if (!currencyCode) {
      console.error('Missing required fields:', { currencyCode })
      return new Response(
        JSON.stringify({
          error: 'Missing required field: currencyCode',
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

        // PRIORITY: If court has a product_id, use product-based pricing
        if (courtData?.lomi_product_id && courtData.lomi_product_id.trim() !== '') {
          finalProductId = courtData.lomi_product_id
          useDynamic = false
          console.log(`Court ${courtId} has product_id: ${finalProductId}, using product-based pricing`)
        } else {
          // No product_id for this court, check global settings
          const { data: settingsData, error: settingsError } = await supabase
            .from('pricing_settings')
            .select('use_dynamic_pricing')
            .single()

          if (settingsError) throw settingsError

          if (settingsData?.use_dynamic_pricing) {
            useDynamic = true
            console.log('No product_id found for court, using dynamic pricing per global settings')
          } else {
            console.log('No product_id found for court and dynamic pricing disabled, falling back to amount-based')
            useDynamic = true
          }
        }
      } catch (error) {
        console.warn(
          'Failed to fetch court/pricing data, falling back to amount-based:',
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

    // --- Fetch Booking Details for Smart Titles ---
    let bookingDetails = { title: 'terrain', description_prefix: 'terrain' }
    try {
      const { data: detailsData, error: detailsError } = await supabase.rpc(
        'get_booking_details_for_payment',
        {
          p_reservation_id: reservationId,
          p_court_id: courtId,
          p_gym_booking_id: gymBookingId,
        },
      )

      if (detailsError) {
        console.warn('Failed to fetch booking details:', detailsError)
      } else if (detailsData && detailsData.length > 0) {
        bookingDetails = detailsData[0]
        console.log('Booking details fetched:', bookingDetails)
      }
    } catch (error) {
      console.warn('Error fetching booking details:', error)
    }

    // Generate default metadata if not provided
    const defaultMetadata = {
      reservation_id: reservationId || 'none',
      source: 'padel_app',
      is_product_based: String(isProductBased),
      court_id: courtId || 'unknown',
      gym_booking_id: gymBookingId || 'none',
      ...(eventId ? { event_id: eventId } : {}),
      // Enrich for webhook creation if no reservation yet
      slot_start_iso: slotStartIso,
      slot_end_iso: slotEndIso,
      amount: typeof amount === 'number' ? String(amount) : amount,
      currency: currencyCode,
      user_name: userName,
      user_email: userEmail,
      user_phone: userPhone,
    }
    const finalMetadata = metadata || defaultMetadata

    // Generate default title and description if not provided
    const finalTitle = title || `Réservation ${bookingDetails.title}`
    const finalDescription = public_description || `Paiement pour une réservation de ${bookingDetails.description_prefix}`

    // Base payload sent to lomi.
    const baseLomiPayload = {
      success_url: `${APP_BASE_URL}${successUrlPath}?${reservationId ? `reservation_id=${reservationId}&` : ''}status=success${eventId ? `&event_id=${eventId}` : ''}&amount=${encodeURIComponent(String(finalAmount ?? amount ?? ''))}&currency=${encodeURIComponent(currencyCode)}`,
      cancel_url: `${APP_BASE_URL}${cancelUrlPath}?${reservationId ? `reservation_id=${reservationId}&` : ''}status=cancelled${eventId ? `&event_id=${eventId}` : ''}&amount=${encodeURIComponent(String(finalAmount ?? amount ?? ''))}&currency=${encodeURIComponent(currencyCode)}`,
      currency_code: currencyCode,
      // Only include quantity if it's more than 1 or explicitly allowed
      ...(quantity > 1 || allowQuantity ? { quantity: quantity } : {}),
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
    const lomiResponse = await fetch(`${LOMI_API_BASE_URL}/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LOMI_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    console.log('lomi. API response status:', lomiResponse.status)
    console.log(
      'lomi. API response headers:',
      Object.fromEntries(lomiResponse.headers.entries()),
    )

    // Get response text first to handle both JSON and HTML responses
    const lomiResponseText = await lomiResponse.text()
    console.log('lomi. API response body:', lomiResponseText)

    let lomiResponseData
    try {
      lomiResponseData = JSON.parse(lomiResponseText)
    } catch (parseError) {
      console.error('Failed to parse lomi. API response as JSON:', parseError)
      console.error('Response was:', lomiResponseText)

      return new Response(
        JSON.stringify({
          error: 'Invalid response from payment provider',
          details:
            'The payment provider returned an invalid response. Please try again later.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        },
      )
    }

    if (!lomiResponse.ok || !lomiResponseData.checkout_session_id) {
      console.error('lomi. API error:', lomiResponseData)

      return new Response(
        JSON.stringify({
          error: 'Failed to create lomi. checkout session',
          details: lomiResponseData.error || lomiResponseData,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: lomiResponseData.error?.status || 500,
        },
      )
    }

    // --- Use checkout URL directly from lomi. API response ---
    const checkoutUrl = lomiResponseData.checkout_url

    console.log(
      'Successfully created checkout session:',
      lomiResponseData.checkout_session_id,
    )

    // --- Success Response ---
    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      '!!!!!!!!!! CAUGHT ERROR in main try/catch !!!!!!!!!:',
      error,
    )
    let message = 'An unexpected error occurred.'
    if (error instanceof Error) {
      message = error.message
    }
    return new Response(
      JSON.stringify({ error: message, details: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
