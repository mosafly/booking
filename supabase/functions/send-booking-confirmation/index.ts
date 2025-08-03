import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  createClient,
  SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

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

    // --- 1. Fetch Booking Details & Dispatch Status ---
    console.log(`Fetching booking data for ${reservationIdFromRequest}`)
    const { data: bookingDataArray, error: bookingError } = await supabase.rpc(
      'get_booking_confirmation_email_data',
      { p_reservation_id: reservationIdFromRequest },
    )

    if (bookingError || !bookingDataArray || bookingDataArray.length === 0) {
      console.error(
        `Error fetching booking ${reservationIdFromRequest}:`,
        bookingError,
      )
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        'Booking not found or DB error',
      )
      return new Response(
        JSON.stringify({ error: 'Booking not found or database error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    const bookingData = bookingDataArray[0]

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
    await updateEmailDispatchStatus(
      supabase,
      reservationIdFromRequest,
      'DISPATCH_IN_PROGRESS',
    )

    if (!bookingData.user_email || !bookingData.court_name) {
      console.error(
        `Missing essential booking data for ${reservationIdFromRequest}`,
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
        `Failed to store verification ID for ${reservationIdFromRequest}:`,
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

    const verificationUrl = `${APP_BASE_URL}/verify-booking?id=${encodeURIComponent(verificationId)}&reservation=${encodeURIComponent(reservationIdFromRequest)}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(verificationUrl)}`

    let qrCodeImageBytes: Uint8Array
    try {
      const qrResponse = await fetch(qrCodeUrl)
      if (!qrResponse.ok) {
        throw new Error(`Failed to fetch QR code (${qrResponse.status})`)
      }
      qrCodeImageBytes = new Uint8Array(await qrResponse.arrayBuffer())
    } catch (qrError) {
      console.error(
        `Failed to generate QR for ${reservationIdFromRequest}:`,
        qrError,
      )
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        `QR generation failed: ${qrError.message}`,
      )
      return new Response(
        JSON.stringify({
          error: 'Failed to generate QR code',
          details: qrError instanceof Error ? qrError.message : 'Unknown error',
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
      { label: 'Court:', value: bookingData.court_name },
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
    const emailHtml = `...` // Same HTML as before

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
      console.error(
        `Resend error for reservation ${reservationIdFromRequest}:`,
        emailError,
      )
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : JSON.stringify(emailError)
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        `Resend API error: ${errorMessage}`,
      )
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: errorMessage,
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
      `Email sent successfully for reservation ${reservationIdFromRequest}. Email ID: ${emailData?.id}`,
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
      `Unexpected error for ${reservationIdFromRequest || 'unknown'}:`,
      e,
    )

    if (reservationIdFromRequest) {
      // Fallback to update status on unexpected error
      const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)
      await updateEmailDispatchStatus(
        supabase,
        reservationIdFromRequest,
        'DISPATCH_FAILED',
        `Unexpected error: ${errorMessage}`,
      )
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
