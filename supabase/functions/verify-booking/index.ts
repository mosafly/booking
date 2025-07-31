import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables
const supabaseUrl = Deno.env.get("URL");
const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Handle both GET (for QR code scanning) and POST (for manual verification)
    let verificationId: string;
    let reservationId: string;
    let verifiedBy = "system";

    if (req.method === "GET") {
      const url = new URL(req.url);
      verificationId = url.searchParams.get("id") || "";
      reservationId = url.searchParams.get("reservation") || "";
      verifiedBy = url.searchParams.get("verified_by") || "qr_scan";
    } else if (req.method === "POST") {
      const body = await req.json();
      verificationId = body.verification_id || "";
      reservationId = body.reservation_id || "";
      verifiedBy = body.verified_by || "manual";
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        }
      );
    }

    if (!verificationId || !reservationId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing verification ID or reservation ID",
          success: false 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verify the booking
    console.log(`verify-booking: Verifying reservation ${reservationId} with verification ID ${verificationId}`);
    
    const { data: verificationResult, error: verificationError } = await supabase.rpc(
      "verify_booking_qr",
      {
        p_verification_id: verificationId,
        p_reservation_id: reservationId,
        p_verified_by: verifiedBy,
      }
    );

    if (verificationError) {
      console.error("verify-booking: Database error:", verificationError);
      return new Response(
        JSON.stringify({ 
          error: "Database error during verification",
          success: false 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!verificationResult || verificationResult.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No verification result returned",
          success: false 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const result = verificationResult[0];

    // For GET requests (QR code scanning), return HTML page
    if (req.method === "GET") {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vérification de réservation - Padel Society CI</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              padding: 30px;
              text-align: center;
            }
            .success {
              color: #28a745;
            }
            .warning {
              color: #ffc107;
            }
            .error {
              color: #dc3545;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            .details {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: left;
            }
            .back-button {
              margin-top: 20px;
              padding: 10px 20px;
              background-color: #1a4c1a;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
            }
            .back-button:hover {
              background-color: #2d5a2d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${result.success 
              ? `
                <div class="icon ${result.already_used ? 'warning' : 'success'}">
                  ${result.already_used ? '⚠️' : '✅'}
                </div>
                <h1 class="${result.already_used ? 'warning' : 'success'}">
                  ${result.already_used ? 'QR Code déjà utilisé' : 'Vérification réussie !'}
                </h1>
                <p>${result.message}</p>
                
                <div class="details">
                  <h3>Détails de la réservation</h3>
                  <p><strong>Court :</strong> ${result.court_name}</p>
                  <p><strong>Date :</strong> ${new Date(result.start_time).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                  <p><strong>Heure :</strong> ${new Date(result.start_time).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</p>
                  <p><strong>Prix :</strong> ${result.total_price} XOF</p>
                  <p><strong>Email :</strong> ${result.user_email}</p>
                </div>
                
                ${!result.already_used 
                  ? '<p class="success">Accès autorisé au court !</p>' 
                  : '<p class="warning">Ce QR code a déjà été utilisé.</p>'
                }
              `
              : `
                <div class="icon error">❌</div>
                <h1 class="error">Vérification échouée</h1>
                <p>${result.message}</p>
                <p>Veuillez vérifier le QR code ou contacter l'accueil.</p>
              `
            }
            
            <a href="/" class="back-button">Retour à l'accueil</a>
          </div>
        </body>
        </html>
      `;

      return new Response(htmlContent, {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 200,
      });
    }

    // For POST requests, return JSON
    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        already_used: result.already_used,
        reservation_details: result.success ? {
          reservation_id: result.reservation_id,
          court_name: result.court_name,
          start_time: result.start_time,
          user_email: result.user_email,
          total_price: result.total_price,
        } : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error("verify-booking: Unexpected error:", e);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});