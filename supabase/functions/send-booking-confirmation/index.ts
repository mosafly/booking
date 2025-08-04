/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  createClient,
  SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

// Define the shape of the data returned by our RPC
interface BookingData {
  user_email: string
  user_name: string
  court_name: string
  start_time: string
  total_price: number
  currency: string
  email_dispatch_status: string
  email_dispatch_attempts: number
  email_last_dispatch_attempt_at: string
  email_dispatch_error: string
}

// Helper function to convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const fromEmail =
  Deno.env.get('FROM_EMAIL') || 'noreply@updates.padelsociety.ci'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'

async function updateEmailDispatchStatus(
  supabase: SupabaseClient,
  reservationId: string,
  status: string,
  error: string | null = null,
) {
  const { error: rpcError } = await supabase.rpc(
    'update_booking_email_dispatch_status',
    {
      p_reservation_id: reservationId,
      p_email_dispatch_status: status,
      p_email_dispatch_error: error,
    },
  )
  if (rpcError) {
    console.error(
      `Failed to update email dispatch status for reservation ${reservationId} to ${status}:`,
      rpcError,
    )
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let reservationIdFromRequest: string | null = null

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const resend = new Resend(resendApiKey)

    const body = await req.json()
    const reservation_id = body.reservation_id
    reservationIdFromRequest = reservation_id

    if (!reservationIdFromRequest) {
      console.error(
        'send-booking-confirmation: Missing reservation_id in request',
      )
      return new Response(JSON.stringify({ error: 'Missing reservation_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // --- 1. Fetch Booking Details & Dispatch Status with Retry ---
    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 1500 // 1.5 seconds
    let bookingData: BookingData | null = null
    let lastError: Error | { message: string } | null = null

    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(
        `Fetching booking data for ${reservationIdFromRequest} (Attempt ${
          i + 1
        }/${MAX_RETRIES})`,
      )
      const { data: bookingDataArray, error: bookingError } = await supabase.rpc(
        'get_booking_confirmation_email_data',
        { p_reservation_id: reservationIdFromRequest },
      )

      if (bookingError) {
        lastError = bookingError
        console.error(
          `Attempt ${
            i + 1
          } failed to fetch booking ${reservationIdFromRequest}:`,
          bookingError,
        )
      } else if (bookingDataArray && bookingDataArray.length > 0) {
        bookingData = bookingDataArray[0]
        break // Success!
      } else {
        lastError = { message: 'Booking not found in this attempt' }
        console.warn(
          `Attempt ${
            i + 1
          }: Booking ${reservationIdFromRequest} not found. Retrying...`,
        )
      }

      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    if (!bookingData) {
      console.error(
        `Failed to fetch booking ${reservationIdFromRequest} after ${MAX_RETRIES} attempts. Last error:`,
        lastError,
      )
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        'Booking not found or DB error after retries',
      )
      return new Response(
        JSON.stringify({ error: 'Booking not found or database error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    // --- 2. Check Dispatch Status to Prevent Duplicates ---
    if (
      bookingData.email_dispatch_status === 'SENT_SUCCESSFULLY' ||
      bookingData.email_dispatch_status === 'DISPATCH_IN_PROGRESS'
    ) {
      console.warn(
        `Email for reservation ${reservationIdFromRequest} already processed or in progress. Status: ${bookingData.email_dispatch_status}. Skipping.`,
      )
      return new Response(
        JSON.stringify({ message: `Email already processed or in progress.` }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // --- 3. Set Status to In Progress ---
    console.log(
      `send-booking-confirmation: Setting reservation ${reservationIdFromRequest} to DISPATCH_IN_PROGRESS`,
    )
    await updateEmailDispatchStatus(
      supabase,
      reservationIdFromRequest,
      'DISPATCH_IN_PROGRESS',
    )

    if (!bookingData.user_email || !bookingData.court_name) {
      console.error(
        `send-booking-confirmation: Missing essential booking data for ${reservationIdFromRequest}`,
      )
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        'Missing essential booking data',
      )
      return new Response(
        JSON.stringify({ error: 'Missing essential booking data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    // --- 4. Generate Verification ID & QR Code ---
    const verificationId = crypto.randomUUID()
    const { error: storeError } = await supabase.rpc('store_verification_id', {
      p_reservation_id: reservationIdFromRequest,
      p_verification_id: verificationId,
    })

    if (storeError) {
      console.error(
        `send-booking-confirmation: Failed to store verification ID for ${reservationIdFromRequest}:`,
        storeError,
      )
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        `Failed to store verification ID: ${storeError.message}`,
      )
      return new Response(
        JSON.stringify({ error: 'Failed to store verification data' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const verificationUrl = `${APP_BASE_URL}/verify-booking?id=${encodeURIComponent(
      verificationId,
    )}&reservation=${encodeURIComponent(reservationIdFromRequest)}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(
      verificationUrl,
    )}`

    let qrCodeImageBytes: Uint8Array
    try {
      const qrResponse = await fetch(qrCodeUrl)
      if (!qrResponse.ok) {
        throw new Error(`Failed to fetch QR code (${qrResponse.status})`)
      }
      qrCodeImageBytes = new Uint8Array(await qrResponse.arrayBuffer())
    } catch (qrError) {
      console.error(
        `send-booking-confirmation: Failed to generate QR for ${reservationIdFromRequest}:`,
        qrError,
      )
      const errorMessage =
        qrError instanceof Error ? qrError.message : 'Unknown QR generation error'
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        `QR generation failed: ${errorMessage}`,
      )
      return new Response(
        JSON.stringify({
          error: 'Failed to generate QR code',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // --- 5. Generate PDF Ticket ---
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([400, 600])
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const darkGreen = rgb(0.1, 0.4, 0.1)
    const lightGreen = rgb(0.9, 0.95, 0.9)
    const blackColor = rgb(0, 0, 0)
    const greyColor = rgb(0.5, 0.5, 0.5)

    page.drawRectangle({
      x: 0,
      y: 0,
      width: 400,
      height: 600,
      color: lightGreen,
    })

    let y = 550
    page.drawText('PADEL SOCIETY CI', {
      x: 50,
      y,
      size: 20,
      font: helveticaBold,
      color: darkGreen,
    })
    y -= 30
    page.drawText('CONFIRMATION DE RÉSERVATION', {
      x: 50,
      y,
      size: 14,
      font: helveticaBold,
      color: blackColor,
    })
    y -= 40

    const details = [
      { label: 'Terrain:', value: bookingData.court_name },
      {
        label: 'Date:',
        value: new Date(bookingData.start_time).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
      {
        label: 'Heure:',
        value: new Date(bookingData.start_time).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      {
        label: 'Prix total:',
        value: `${bookingData.total_price} ${bookingData.currency || 'XOF'}`,
      },
      {
        label: 'Réservation ID:',
        value: reservationIdFromRequest.substring(0, 8),
      },
    ]

    for (const detail of details) {
      page.drawText(detail.label, {
        x: 50,
        y,
        size: 12,
        font: helveticaBold,
        color: blackColor,
      })
      page.drawText(detail.value, {
        x: 180,
        y,
        size: 12,
        font: helvetica,
        color: blackColor,
      })
      y -= 25
    }

    y -= 20

    try {
      const qrImage = await pdfDoc.embedPng(qrCodeImageBytes)
      const qrSize = 120
      const qrX = (400 - qrSize) / 2
      page.drawImage(qrImage, {
        x: qrX,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
      })
      y -= qrSize + 20
    } catch (imgError) {
      console.error('Error embedding QR code:', imgError)
      page.drawText('[QR CODE UNAVAILABLE]', {
        x: 120,
        y: y - 50,
        size: 12,
        font: helvetica,
        color: rgb(0.8, 0.2, 0.2),
      })
      y -= 70
    }

    page.drawText("Présentez ce QR code à l'accueil", {
      x: 80,
      y,
      size: 10,
      font: helvetica,
      color: greyColor,
    })
    y -= 20
    page.drawText('Merci de votre confiance!', {
      x: 120,
      y,
      size: 10,
      font: helveticaBold,
      color: darkGreen,
    })

    const pdfBytes = await pdfDoc.save()

    // --- 6. Send Email ---
    const emailHtml = `
   <!DOCTYPE html>
   <html>
   <head>
       <meta charset="utf-8">
       <title>Confirmation de réservation</title>
   </head>
   <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
       <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
           <div style="text-align: center; margin-bottom: 30px;">
               <h1 style="color: #2d5a27; margin-bottom: 10px;">PADEL SOCIETY CI</h1>
               <h2 style="color: #333; font-size: 24px; margin: 0;">Confirmation de réservation</h2>
           </div>
           
           <div style="margin-bottom: 30px;">
               <h3 style="color: #2d5a27; border-bottom: 2px solid #2d5a27; padding-bottom: 10px;">Détails de votre réservation</h3>
               <table style="width: 100%; border-collapse: collapse;">
                   <tr style="border-bottom: 1px solid #eee;">
                       <td style="padding: 10px 0; font-weight: bold; color: #333;">Terrain:</td>
                       <td style="padding: 10px 0; color: #666;">${
                         bookingData.court_name
                       }</td>
                   </tr>
                   <tr style="border-bottom: 1px solid #eee;">
                       <td style="padding: 10px 0; font-weight: bold; color: #333;">Date:</td>
                       <td style="padding: 10px 0; color: #666;">${new Date(
                         bookingData.start_time,
                       ).toLocaleDateString('fr-FR', {
                         weekday: 'long',
                         year: 'numeric',
                         month: 'long',
                         day: 'numeric',
                       })}</td>
                   </tr>
                   <tr style="border-bottom: 1px solid #eee;">
                       <td style="padding: 10px 0; font-weight: bold; color: #333;">Heure:</td>
                       <td style="padding: 10px 0; color: #666;">${new Date(
                         bookingData.start_time,
                       ).toLocaleTimeString('fr-FR', {
                         hour: '2-digit',
                         minute: '2-digit',
                       })}</td>
                   </tr>
                   <tr style="border-bottom: 1px solid #eee;">
                       <td style="padding: 10px 0; font-weight: bold; color: #333;">Prix total:</td>
                       <td style="padding: 10px 0; color: #666;">${
                         bookingData.total_price
                       } ${bookingData.currency || 'XOF'}</td>
                   </tr>
               </table>
           </div>
           
           <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
               <h3 style="color: #2d5a27; margin-bottom: 15px;">QR Code de vérification</h3>
               <p style="color: #666; margin-bottom: 15px;">Présentez ce QR code à l'accueil pour confirmer votre arrivée</p>
               <div style="margin: 20px 0;">
                   <a href="${verificationUrl}" style="display: inline-block; background-color: #2d5a27; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Voir les détails de réservation</a>
               </div>
           </div>
           
           <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 14px;">
               <p>Merci de votre confiance !</p>
               <p>Padel Society CI - Votre partenaire sport</p>
           </div>
       </div>
   </body>
   </html>
    `

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Padel Palmeraie CI <${fromEmail}>`,
      to: bookingData.user_email,
      subject: `Confirmation de réservation - ${bookingData.court_name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Reservation-${reservationIdFromRequest.substring(0, 8)}.pdf`,
          content: uint8ArrayToBase64(pdfBytes),
        },
      ],
    })

    if (emailError) {
      const resendErrorMsg =
        emailError instanceof Error ? emailError.message : JSON.stringify(emailError)
      console.error(
        `send-booking-confirmation: Resend error for reservation ${reservationIdFromRequest}:`,
        resendErrorMsg,
      )
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        `Resend API error: ${resendErrorMsg}`,
      )
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: resendErrorMsg,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // --- 7. Update Status to Success ---
    await updateEmailDispatchStatus(
      supabase,
      reservationIdFromRequest,
      'SENT_SUCCESSFULLY',
    )

    console.log(
      `send-booking-confirmation: Email sent successfully for reservation ${reservationIdFromRequest}. Email ID: ${emailData?.id}`,
    )

    return new Response(
      JSON.stringify({
        message: 'Booking confirmation email sent successfully!',
        email_id: emailData?.id,
        verification_id: verificationId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred'
    console.error(
      `send-booking-confirmation: Unexpected error for ${
        reservationIdFromRequest || 'unknown'
      }:`,
      e,
    )

    if (reservationIdFromRequest) {
      // Fallback to update status on unexpected error
      try {
        const supabaseForErrorFallback = createClient(
          supabaseUrl!,
          supabaseServiceRoleKey!,
        )
        await updateEmailDispatchStatus(
          supabaseForErrorFallback,
          reservationIdFromRequest,
          'DISPATCH_FAILED',
          `Unexpected error: ${errorMessage}`,
        )
      } catch (updateError) {
        console.error(
          `send-booking-confirmation: Failed to update error status for ${reservationIdFromRequest}:`,
          updateError,
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
