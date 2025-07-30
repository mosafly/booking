/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Environment variables (should be set in Supabase Function settings)
const LOMI_API_KEY = Deno.env.get("LOMI_API_KEY");
const LOMI_API_BASE_URL = "https://api.lomi.africa/v1";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:5173";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Request Body Parameters ---
    // Destructure the expected JSON body from the request.
    const { 
      // --- Required Fields ---
      amount, // Base amount (e.g., 8000 for 8000 XOF).
      currencyCode, // 3-letter ISO currency code (e.g., "XOF").
      reservationId, // Your internal reservation ID (UUID or string).

      // --- Optional Fields (with defaults or null if not provided) ---
      userEmail = null, // Customer's email, pre-fills lomi.checkout.
      userName = null, // Customer's name, pre-fills lomi.checkout.
      successUrlPath = "/payment/success", // Relative path for success redirect (e.g., /payment/success).
      cancelUrlPath = "/payment/cancel", // Relative path for cancel redirect (e.g., /payment/cancel).

      // --- All Optional lomi Parameters (provide in request body to override defaults) ---
      // See lomi. API docs: https://api.lomi.africa/v1/docs#tag/CheckoutSessions/operation/CheckoutSessionsController_create
      title = `Padel Reservation ${reservationId}`, // Title displayed on lomi. checkout page.
      public_description = `Payment for padel court reservation ${reservationId}`, // Description on lomi. checkout page.
      customer_phone = null, // Customer's phone number.
      product_id = "efab2600-3b2a-4263-9b66-832f344460fe", // Product ID (UUID) to associate with the payment.
      subscription_id = null, // Subscription ID (UUID) to associate.
      plan_id = null, // Plan ID (UUID) to associate.
      metadata = { reservation_id: reservationId, source: "padel_app" }, // Custom key-value pairs (values must be strings).
      expiration_minutes = 30, // How long the checkout link is valid.
      allow_coupon_code = null, // Set to true/false to explicitly allow/disallow coupons.
    } = await req.json();

    // --- API Key Validation ---
    if (!LOMI_API_KEY) {
      console.error("LOMI_API_KEY is not set.");
      return new Response(
        JSON.stringify({ error: "LOMI API key not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // --- Input Validation ---
    if (!amount || !currencyCode || !reservationId) {
      console.error("Missing required fields:", { amount, currencyCode, reservationId });
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, currencyCode, or reservationId" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // --- Prepare lomi. Payload ---

    // Define payload structure matching lomi. API
    type LomiPayload = {
      success_url: string;
      cancel_url: string;
      allowed_providers: string[];
      amount: number;
      currency_code: string;
      title?: string | null;
      public_description?: string | null;
      customer_email?: string | null;
      customer_name?: string | null;
      metadata?: Record<string, string> | null;
      expiration_minutes?: number | null;
      customer_phone?: string | null;
      product_id?: string | null;
      subscription_id?: string | null;
      plan_id?: string | null;
      allow_coupon_code?: boolean | null;
    };

    // Base payload sent to lomi.
    const payload: LomiPayload = {
      success_url: `${APP_BASE_URL}${successUrlPath}?reservation_id=${reservationId}`,
      cancel_url: `${APP_BASE_URL}${cancelUrlPath}?reservation_id=${reservationId}`,
      allowed_providers: ["WAVE"],
      amount: amount, 
      currency_code: currencyCode,
      metadata: metadata,
      expiration_minutes: expiration_minutes,
    };

    // Conditionally add optional fields to the payload if they were provided in the request
    if (title) payload.title = title; 
    if (public_description) payload.public_description = public_description; 
    if (userEmail) payload.customer_email = userEmail;
    if (userName) payload.customer_name = userName;
    if (product_id) payload.product_id = product_id;
    if (subscription_id) payload.subscription_id = subscription_id;
    if (plan_id) payload.plan_id = plan_id;
    if (customer_phone) payload.customer_phone = customer_phone;
    if (typeof allow_coupon_code === 'boolean') {
      payload.allow_coupon_code = allow_coupon_code;
    }

    // --- Call lomi. API ---
    const response = await fetch(`${LOMI_API_BASE_URL}/checkout-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LOMI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // --- Handle lomi. Response ---
    if (!response.ok || !responseData.data || !responseData.data.url) {
      console.error("lomi. error:", responseData);
      return new Response(
        JSON.stringify({
          error: "Failed to create lomi. checkout session",
          details: responseData.error || responseData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: responseData.error?.status || 500,
        },
      );
    }

    // --- Success Response --- 
    // Return the lomi. checkout URL to the client
    return new Response(
      JSON.stringify({ checkout_url: responseData.data.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // --- Error Handling ---
    console.error("!!!!!!!!!! CAUGHT ERROR in main try/catch !!!!!!!!!:", error);
    console.error("Error details:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 