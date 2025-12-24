import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { Buffer } from 'node:buffer'

// --- Supabase Setup for Padel App ---
// These will be set in Vercel environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Error: Padel Supabase URL is required.')
}
if (!supabaseServiceKey) {
  console.error('Error: Padel Supabase service key is required.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// --- lomi. Webhook Secret ---
// This will be set in Vercel environment variables
const LOMI_WEBHOOK_SECRET = process.env.LOMI_WEBHOOK_SECRET

// --- Helper: Verify lomi. Webhook Signature ---
async function verifyLomiWebhook(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) {
    throw new Error('Missing lomi. signature header (X-lomi-Signature).')
  }
  if (!webhookSecret) {
    console.error('LOMI_WEBHOOK_SECRET is not set. Cannot verify webhook.')
    throw new Error('Webhook secret not configured internally.')
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  const sigBuffer = Buffer.from(signatureHeader)
  const expectedSigBuffer = Buffer.from(expectedSignature)
  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    throw new Error('lomi. webhook signature mismatch.')
  }
  return JSON.parse(rawBody.toString('utf8'))
}

// Configure Vercel to handle raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper to get raw body from Vercel request
async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

// Normalize reservation_id coming from external metadata (some send 'none'/'null')
function isMissingReservationId(val) {
  try {
    if (val === null || val === undefined) return true
    const s = String(val).trim().toLowerCase()
    return s === '' || s === 'none' || s === 'null' || s === 'undefined'
  } catch {
    return true
  }
}

// --- Helper: Check if webhook has already been processed ---
async function isWebhookAlreadyProcessed(supabase, webhookEventId) {
  try {
    const { data, error } = await supabase.rpc(
      "check_webhook_already_processed",
      {
        p_webhook_event_id: webhookEventId,
      },
    );

    if (error) {
      console.warn("Error checking webhook processing status via RPC:", error);
      return false; // Default to allowing processing if check fails
    }

    return data || false;
  } catch (error) {
    console.warn("Error checking webhook processing status:", error);
    return false;
  }
}

// --- Helper: Mark webhook as processed ---
async function markWebhookAsProcessed(supabase, webhookEventId, reservationId) {
  try {
    const { error } = await supabase.rpc("update_reservation_webhook_metadata", {
      p_reservation_id: reservationId,
      p_webhook_event_id: webhookEventId,
    });

    if (error) {
      console.warn("Error marking webhook as processed:", error);
      // Don't throw - logging failure shouldn't break webhook processing
    }
  } catch (error) {
    console.warn("Error marking webhook as processed:", error);
  }
}

// --- Vercel Function Handler ---
export default async function handler(req, res) {
  console.log(
    '🚀 Padel Webhook: Received request at',
    new Date().toISOString(),
  )
  console.log('📧 Request headers:', req.headers)

  // --- Environment Variables (moved inside function) ---
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const lomiWebhookSecret = process.env.LOMI_WEBHOOK_SECRET

  console.log('🔧 Environment check:')
  console.log(`  - SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(
    `  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'
    }`,
  )
  console.log(
    `  - LOMI_WEBHOOK_SECRET: ${lomiWebhookSecret ? '✅ Set' : '❌ Missing'}`,
  )

  // Check for required environment variables
  if (!supabaseUrl || !supabaseServiceKey || !lomiWebhookSecret) {
    console.error(
      'Padel Webhook: Missing critical environment variables. Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOMI_WEBHOOK_SECRET.',
    )
    return res.status(500).json({
      error: 'Missing required environment variables',
    })
  }

  // Initialize Supabase client inside the function
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  let rawBody
  try {
    rawBody = await getRawBody(req)
  } catch (err) {
    console.error('Padel App: Error reading request body:', err)
    return res.status(500).json({ error: 'Failed to read request body' })
  }

  const signature = req.headers['x-lomi-signature']
  let eventPayload

  try {
    eventPayload = await verifyLomiWebhook(rawBody, signature, lomiWebhookSecret)
    console.log(
      'Padel App: lomi. webhook event verified:',
      eventPayload?.event || 'Event type missing',
    )
  } catch (err) {
    console.error(
      'Padel App: lomi. signature verification failed:',
      err.message,
    )
    return res
      .status(400)
      .json({ error: `Webhook verification failed: ${err.message}` })
  }

  // --- Event Processing ---
  try {
    const lomiEventType = eventPayload?.event
    const eventData = eventPayload?.data

    if (!lomiEventType || !eventData) {
      console.warn(
        'Padel App: Event type or data missing in lomi. payload.',
        eventPayload,
      )
      return res.status(400).json({ error: 'Event type or data missing.' })
    }

    console.log('Padel App: Received lomi. event type:', lomiEventType)
    console.log(
      'Padel App: Full event payload:',
      JSON.stringify(eventPayload, null, 2),
    )

    // Assuming Lomi sends metadata.reservation_id as set in create-lomi-checkout-session
    const reservationId = eventData.metadata?.reservation_id;
    const lomiTransactionId = eventData.transaction_id || eventData.id; // Transaction ID

    // checkout_session_id is sent directly on eventData from lomi, also available in metadata
    // For PAYMENT_SUCCEEDED events from lomi, checkout_session_id is a direct field
    const lomiCheckoutSessionId = String(
      eventData.checkout_session_id ||
      eventData.metadata?.checkout_session_id ||
      eventData.metadata?.linkId ||
      eventData.id ||
      "",
    );

    // Check if this webhook has already been processed to prevent duplicates
    const webhookEventId = `${lomiEventType}:${lomiTransactionId || lomiCheckoutSessionId}`;
    const webhookProcessed = await isWebhookAlreadyProcessed(
      supabase,
      webhookEventId,
    );
    if (webhookProcessed) {
      console.warn(
        `Padel App Webhook: ${webhookEventId} already processed, skipping duplicate`,
      );
      return res
        .status(200)
        .json({ received: true, message: 'Webhook already processed' });
    }

    if (!reservationId) {
      console.error(
        "Padel App Webhook Error: Missing reservation_id in Lomi webhook metadata.",
        { lomiEventData: eventData },
      );
      return res.status(400).json({
        error: "Missing reservation_id in Lomi webhook metadata.",
      });
    }
    // Amount: lomi sends gross_amount from the transactions table
    const amount = parseFloat(
      eventData.gross_amount || eventData.amount || eventData.net_amount || "0",
    );
    // Currency: lomi sends currency_code from the transactions table
    const currency = eventData.currency_code || eventData.currency || "XOF";

    // Note: after refactor, reservation may be created only after successful payment
    // so reservation_id can be missing here. We'll create it if payment succeeded.
    if (amount === undefined || !currency) {
      console.error(
        'Padel App Webhook Error: Missing amount or currency from lomi. event data.',
        { amount, currency, lomiEventData: eventData },
      )
      return res.status(400).json({
        error: 'Missing amount or currency in lomi. webhook payload.',
      })
    }

    let isSuccessEvent = false
    if (
      lomiEventType === 'checkout.completed' ||
      lomiEventType === 'CHECKOUT_COMPLETED' ||
      lomiEventType === 'payment.succeeded' ||
      lomiEventType === 'PAYMENT_SUCCEEDED'
    ) {
      isSuccessEvent = true
    }

    if (isSuccessEvent) {
      console.log(
        `Padel App: Processing successful payment${reservationId ? ` for reservation ${reservationId}` : ''}`,
      )

      // If no reservation yet, create it using metadata from checkout
      if (isMissingReservationId(reservationId)) {
        try {
          const meta = eventData.metadata || {}
          const courtIdMeta = meta.court_id
          const slotStartIso = meta.slot_start_iso
          const slotEndIso = meta.slot_end_iso
          const userName = meta.user_name || null
          const userEmail = meta.user_email || null
          const userPhone = meta.user_phone || null

          if (!courtIdMeta || !slotStartIso || !slotEndIso) {
            console.error('Missing metadata to create reservation:', {
              courtIdMeta,
              slotStartIso,
              slotEndIso,
            })
            return res.status(400).json({
              error:
                'Missing required metadata (court_id, slot_start_iso, slot_end_iso) to create reservation.',
            })
          }

          const { data: newReservation, error: reservationInsertError } =
            await supabase
              .from('reservations')
              .insert([
                {
                  court_id: courtIdMeta,
                  start_time: slotStartIso,
                  end_time: slotEndIso,
                  total_price: amount,
                  status: 'confirmed',
                  user_name: userName,
                  user_email: userEmail,
                  user_phone: userPhone,
                },
              ])
              .select()
              .single()

          if (reservationInsertError) {
            console.error('Failed to create reservation after payment:', reservationInsertError)
            return res.status(500).json({ error: 'Failed to create reservation after payment.' })
          }

          reservationId = newReservation.id
          console.log('Created reservation after payment with id:', reservationId)
        } catch (createErr) {
          console.error('Exception while creating reservation after payment:', createErr)
          return res.status(500).json({ error: 'Exception creating reservation after payment.' })
        }
      }
      // Call RPC to record payment and update reservation
      const { error: rpcError } = await supabase.rpc(
        'record_padel_lomi_payment',
        {
          p_reservation_id: reservationId,
          p_lomi_payment_id: lomiTransactionId,
          p_lomi_checkout_session_id: lomiCheckoutSessionId,
          p_amount_paid: amount,
          p_currency_paid: currency,
          p_lomi_event_payload: eventPayload,
        },
      )

      if (rpcError) {
        console.error(
          'Padel App Webhook Error: Failed to call record_padel_lomi_payment RPC:',
          rpcError,
        )
        return res
          .status(500)
          .json({ error: 'Failed to process payment update in Padel DB.' })
      }
      console.log(
        `Padel App: Payment for reservation ${reservationId} recorded successfully.`,
      )

      // Mark webhook as processed after successful payment recording
      await markWebhookAsProcessed(supabase, webhookEventId, reservationId)

      // ---- Track Meta Conversions API Purchase ----
      try {
        console.log(`Padel App: Sending Purchase event to Meta CAPI for reservation ${reservationId}`)
        const capiUrl = `${supabaseUrl}/functions/v1/meta-capi`

        // Reuse event_id coming from lomi metadata (set at checkout creation)
        const metaEventId = eventData?.metadata?.event_id || `purchase_${reservationId}_${Date.now()}`

        const capiResponse = await fetch(capiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_name: 'Purchase',
            event_id: metaEventId,
            event_source_url: 'https://www.padelpalmeraie.com', // Remplacez par votre URL Vercel
            custom_data: {
              value: amount,
              currency: currency,
              content_category: 'padel_booking',
            },
            external_id: reservationId,
            // Ajoutez email/phone si disponibles depuis la réservation
          }),
        })

        if (!capiResponse.ok) {
          console.warn(`Padel App: Meta CAPI call failed for ${reservationId}:`, capiResponse.statusText)
        } else {
          console.log(`Padel App: Meta CAPI Purchase tracked for ${reservationId}`)
        }
      } catch (capiError) {
        console.warn(`Padel App: Exception calling Meta CAPI for ${reservationId}:`, capiError)
      }

      // ---- Send Booking Confirmation Email via Supabase Function ----
      try {
        console.log(
          `Padel App: Triggering send-booking-confirmation for reservation ${reservationId} via HTTP call`,
        )
        const functionUrl = `${supabaseUrl}/functions/v1/send-booking-confirmation`

        const emailResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reservation_id: reservationId }),
        })

        const emailResult = await emailResponse.text()

        if (!emailResponse.ok) {
          console.error(
            `Padel App Webhook Warning: Error triggering send-booking-confirmation for ${reservationId}:`,
            {
              status: emailResponse.status,
              statusText: emailResponse.statusText,
              response: emailResult,
            },
          )
        } else {
          console.log(
            `Padel App: Successfully triggered send-booking-confirmation for ${reservationId}:`,
            emailResult,
          )
        }
      } catch (emailError) {
        console.error(
          `Padel App Webhook Warning: Exception calling send-booking-confirmation for ${reservationId}:`,
          emailError,
        )
      }
    } else {
      console.log(
        'Padel App: lomi. event type not a success event or not handled:',
        lomiEventType,
      )
    }

    return res
      .status(200)
      .json({ received: true, message: 'Webhook processed by Padel App' })
  } catch (error) {
    console.error(
      'Padel App Webhook - Uncaught error during event processing:',
      error,
    )
    return res
      .status(500)
      .json({ error: 'Internal server error processing webhook event.' })
  }
}
