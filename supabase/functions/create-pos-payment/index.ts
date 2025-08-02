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
    const { 
      // --- Required Fields ---
      amount, // Base amount (e.g., 8000 for 8000 XOF).
      currencyCode, // 3-letter ISO currency code (e.g., "XOF").
      saleId, // Your internal sale ID (UUID or string).

      // --- Optional Fields (with defaults or null if not provided) ---
      userEmail = null, // Customer's email, pre-fills lomi.checkout.
      userName = null, // Customer's name, pre-fills lomi.checkout.
      successUrlPath = "/pos/success", // Relative path for success redirect.
      cancelUrlPath = "/pos/cancel", // Relative path for cancel redirect.

      // --- All Optional lomi Parameters ---
      title = `POS Sale ${saleId}`,
      public_description = `Payment for POS sale ${saleId}`,
      customer_phone = null,
      product_id = "efab2600-3b2a-4263-9b66-832f344460fe", // Product ID for POS sales
      metadata = { sale_id: saleId, source: "pos_app" },
      expiration_minutes = 30,
      allow_coupon_code = null,
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
    if (!amount || !currencyCode || !saleId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: amount, currencyCode, saleId" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount. Must be a positive number (in cents)." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // --- Lomi API Payload Construction ---
    interface LomiPayload {
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
      allow_coupon_code?: boolean | null;
    }

    // Base payload sent to lomi
    const payload: LomiPayload = {
      success_url: `${APP_BASE_URL}${successUrlPath}?sale_id=${saleId}`,
      cancel_url: `${APP_BASE_URL}${cancelUrlPath}?sale_id=${saleId}`,
      allowed_providers: ["WAVE"],
      amount: Math.round(amount), // Ensure amount is an integer (cents)
      currency_code: currencyCode.toUpperCase(),
      title: title,
      public_description: public_description,
      customer_email: userEmail,
      customer_name: userName,
      customer_phone: customer_phone,
      product_id: product_id,
      metadata: metadata,
      expiration_minutes: expiration_minutes,
      allow_coupon_code: allow_coupon_code,
    };

    // --- Call Lomi API ---
    console.log("Calling Lomi API with payload:", JSON.stringify(payload, null, 2));
    const response = await fetch(`${LOMI_API_BASE_URL}/checkout-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LOMI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // --- Handle Lomi Response ---
    if (!response.ok || !responseData.data || !responseData.data.url) {
      console.error("Lomi API error:", responseData);
      return new Response(
        JSON.stringify({
          error: "Failed to create Lomi checkout session",
          details: responseData.error || responseData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: responseData.error?.status || 500,
        },
      );
    }

    // --- Success Response ---
    // Return the Lomi checkout URL to the client
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// To deploy this function:
// supabase functions deploy create-pos-payment
