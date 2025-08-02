import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

// Helper function to convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@updates.padelsociety.ci";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:5173";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let reservationIdFromRequest: string | null = null;

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey) {
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
    const resend = new Resend(resendApiKey);

    const body = await req.json();
    const reservation_id = body.reservation_id;
    reservationIdFromRequest = reservation_id;

    if (!reservationIdFromRequest) {
      console.error("send-booking-confirmation: Missing reservation_id in request");
      return new Response(JSON.stringify({ error: "Missing reservation_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch booking details using the existing RPC
    console.log(`send-booking-confirmation: Fetching booking data for ${reservationIdFromRequest}`);
    const { data: bookingDataArray, error: bookingError } = await supabase.rpc(
      "get_booking_confirmation_email_data",
      { p_reservation_id: reservationIdFromRequest }
    );

    if (bookingError || !bookingDataArray || bookingDataArray.length === 0) {
      console.error(
        `send-booking-confirmation: Error fetching booking ${reservationIdFromRequest}:`,
        bookingError
      );
      return new Response(
        JSON.stringify({ error: "Booking not found or database error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const bookingData = bookingDataArray[0];

    if (!bookingData.user_email || !bookingData.court_name) {
      console.error(
        `send-booking-confirmation: Missing essential booking data for ${reservationIdFromRequest}`
      );
      return new Response(
        JSON.stringify({ error: "Missing essential booking data" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Generate unique verification ID for QR code
    const verificationId = crypto.randomUUID();

    // Store verification ID in database
    const { data: storeResult, error: storeError } = await supabase.rpc(
      "store_verification_id",
      {
        p_reservation_id: reservationIdFromRequest,
        p_verification_id: verificationId,
      }
    );

    if (storeError) {
      console.error(
        `Failed to store verification ID for ${reservationIdFromRequest}:`,
        storeError
      );
      return new Response(
        JSON.stringify({ error: "Failed to store verification data" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Create QR code for booking verification
    const verificationUrl = `${APP_BASE_URL}/verify-booking?id=${encodeURIComponent(verificationId)}&reservation=${encodeURIComponent(reservationIdFromRequest)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(verificationUrl)}`;

    let qrCodeImageBytes: Uint8Array;
    try {
      const qrResponse = await fetch(qrCodeUrl);
      if (!qrResponse.ok) {
        throw new Error(`Failed to fetch QR code (${qrResponse.status})`);
      }
      qrCodeImageBytes = new Uint8Array(await qrResponse.arrayBuffer());
    } catch (qrError) {
      console.error(
        `Failed to generate QR for ${reservationIdFromRequest}:`,
        qrError
      );
      return new Response(
        JSON.stringify({
          error: "Failed to generate QR code",
          details: qrError instanceof Error ? qrError.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate PDF ticket
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const darkGreen = rgb(0.1, 0.4, 0.1);
    const lightGreen = rgb(0.9, 0.95, 0.9);
    const blackColor = rgb(0, 0, 0);
    const greyColor = rgb(0.5, 0.5, 0.5);

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 400,
      height: 600,
      color: lightGreen,
    });

    // Header
    let y = 550;
    page.drawText("PADEL SOCIETY CI", {
      x: 50,
      y: y,
      size: 20,
      font: helveticaBold,
      color: darkGreen,
    });

    y -= 30;
    page.drawText("CONFIRMATION DE RÉSERVATION", {
      x: 50,
      y: y,
      size: 14,
      font: helveticaBold,
      color: blackColor,
    });

    y -= 40;

    // Booking details
    const details = [
      { label: "Court:", value: bookingData.court_name },
      { label: "Date:", value: new Date(bookingData.start_time).toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) },
      { label: "Heure:", value: new Date(bookingData.start_time).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) },
      { label: "Prix total:", value: `${bookingData.total_price} ${bookingData.currency || 'XOF'}` },
      { label: "Réservation ID:", value: reservationIdFromRequest.substring(0, 8) },
    ];

    for (const detail of details) {
      page.drawText(detail.label, {
        x: 50,
        y: y,
        size: 12,
        font: helveticaBold,
        color: blackColor,
      });
      
      page.drawText(detail.value, {
        x: 180,
        y: y,
        size: 12,
        font: helvetica,
        color: blackColor,
      });
      
      y -= 25;
    }

    y -= 20;

    // QR Code
    try {
      const qrImage = await pdfDoc.embedPng(qrCodeImageBytes);
      const qrSize = 120;
      const qrX = (400 - qrSize) / 2;
      
      page.drawImage(qrImage, {
        x: qrX,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
      });

      y -= qrSize + 20;
    } catch (imgError) {
      console.error("Error embedding QR code:", imgError);
      page.drawText("[QR CODE UNAVAILABLE]", {
        x: 120,
        y: y - 50,
        size: 12,
        font: helvetica,
        color: rgb(0.8, 0.2, 0.2),
      });
      y -= 70;
    }

    // Footer
    page.drawText("Présentez ce QR code à l'accueil", {
      x: 80,
      y: y,
      size: 10,
      font: helvetica,
      color: greyColor,
    });

    y -= 20;
    page.drawText("Merci de votre confiance!", {
      x: 120,
      y: y,
      size: 10,
      font: helveticaBold,
      color: darkGreen,
    });

    const pdfBytes = await pdfDoc.save();

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation de réservation - Padel Society CI</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <div style="padding: 30px; text-align: center; background-color: #1a4c1a; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Padel Society CI</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Confirmation de réservation</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Bonjour,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Votre réservation a été confirmée avec succès ! Voici les détails de votre réservation :
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
              <h2 style="color: #333; font-size: 18px; margin-bottom: 15px; margin-top: 0;">Détails de la réservation</h2>
              
              <p style="margin: 8px 0; font-size: 14px;">
                <strong>Court :</strong> ${bookingData.court_name}
              </p>
              
              <p style="margin: 8px 0; font-size: 14px;">
                <strong>Date :</strong> ${new Date(bookingData.start_time).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              
              <p style="margin: 8px 0; font-size: 14px;">
                <strong>Heure :</strong> ${new Date(bookingData.start_time).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              
              <p style="margin: 8px 0; font-size: 14px;">
                <strong>Prix total :</strong> ${bookingData.total_price} ${bookingData.currency || 'XOF'}
              </p>
              
              <p style="margin: 8px 0; font-size: 14px;">
                <strong>ID de réservation :</strong> ${reservationIdFromRequest.substring(0, 8)}
              </p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Votre ticket PDF avec QR code est en pièce jointe. Présentez-le à l'accueil le jour de votre réservation.
            </p>

            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Pour toute question, n'hésitez pas à nous contacter.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              À très bientôt sur nos courts !
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Padel Society CI • Abidjan, Côte d'Ivoire
            </p>
          </div>
        </div>
      </body>
      </html>`;

    // Send email with PDF attachment
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Padel Society CI <${fromEmail}>`,
      to: bookingData.user_email,
      subject: `Confirmation de réservation - ${bookingData.court_name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Reservation-${reservationIdFromRequest.substring(0, 8)}.pdf`,
          content: uint8ArrayToBase64(pdfBytes),
        },
      ],
    });

    if (emailError) {
      console.error(
        `Resend error for reservation ${reservationIdFromRequest}:`,
        emailError
      );
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: emailError instanceof Error ? emailError.message : JSON.stringify(emailError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `send-booking-confirmation: Email sent successfully for reservation ${reservationIdFromRequest}. Email ID: ${emailData?.id}`
    );

    return new Response(
      JSON.stringify({
        message: "Booking confirmation email sent successfully!",
        email_id: emailData?.id,
        verification_id: verificationId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error(
      `Unexpected error for ${reservationIdFromRequest || "unknown"}:`,
      e
    );
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});