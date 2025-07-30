const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { Buffer } = require('node:buffer');
const { Resend } = require('resend');

// --- Supabase Setup for Padel App ---
// These will be set in Netlify environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error('Error: Padel Supabase URL is required.');
}
if (!supabaseServiceKey) {
    console.error('Error: Padel Supabase service key is required.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// --- Lomi Webhook Secret ---
// This will be set in Netlify environment variables
const LOMI_WEBHOOK_SECRET = process.env.LOMI_WEBHOOK_SECRET;

// --- Resend Setup ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL_ADDRESS = process.env.RESEND_FROM_EMAIL_ADDRESS || "noreply@padelsociety.ci";

let resend;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
} else {
    console.warn("Padel App: RESEND_API_KEY is not set. Email notifications will be disabled.");
}

// --- Helper: Verify Lomi Webhook Signature ---
async function verifyLomiWebhook(rawBody, signatureHeader) {
    if (!signatureHeader) {
        throw new Error("Missing Lomi signature header (X-Lomi-Signature).");
    }
    if (!LOMI_WEBHOOK_SECRET) {
        console.error("LOMI_WEBHOOK_SECRET is not set. Cannot verify webhook.");
        // In a real scenario, you might want to restrict this error based on NODE_ENV
        throw new Error("Webhook secret not configured.");
    }

    const expectedSignature = crypto
        .createHmac("sha256", LOMI_WEBHOOK_SECRET)
        .update(rawBody) // rawBody should be a string or Buffer
        .digest("hex");

    try {
        const sigBuffer = Buffer.from(signatureHeader);
        const expectedSigBuffer = Buffer.from(expectedSignature);
        if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
            throw new Error("Lomi webhook signature mismatch.");
        }
    } catch (e) {
        console.error("Error during signature comparison:", e.message);
        throw new Error("Lomi webhook signature verification failed due to comparison error or invalid signature format.");
    }

    try {
        return JSON.parse(rawBody.toString("utf8"));
    } catch (e) {
        console.error("Failed to parse JSON from verified webhook body:", e.message);
        throw new Error("Verified webhook body is not valid JSON.");
    }
}

// --- Helper: Craft Booking Confirmation Email HTML ---
function craftBookingConfirmationEmailHTML(emailData) {
    const userName = emailData.userName || "Valued Customer";
    // Basic date/time formatting, consider a library for more complex needs if running in Node.js
    const formattedDate = new Date(emailData.startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = new Date(emailData.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
        .container { background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #0056b3; }
        p { line-height: 1.6; }
        .footer { margin-top: 20px; text-align: center; font-size: 0.9em; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Your Padel Court Booking is Confirmed!</h1>
        <p>Hello ${userName},</p>
        <p>Thank you for your booking. Here are your reservation details:</p>
        <ul>
          <li><strong>Reservation ID:</strong> ${emailData.reservationId}</li>
          <li><strong>Court:</strong> ${emailData.courtName}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime}</li>
          <li><strong>Total Price:</strong> ${emailData.totalPrice} ${emailData.currency || 'XOF'}</li>
        </ul>
        <p>We look forward to seeing you!</p>
        <div class="footer">
          <p>Padel Society CI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


// --- Netlify Function Handler ---
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
        };
    }

    const rawBody = event.body; // Netlify provides the raw string body here
    const signature = event.headers['x-lomi-signature']; // Lomi sends this header

    let eventPayload;
    try {
        eventPayload = await verifyLomiWebhook(rawBody, signature);
        console.log('Padel App: Lomi webhook event verified:', eventPayload?.event || 'Event type missing');
    } catch (err) {
        console.error('Padel App: Lomi signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook verification failed: ${err.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // --- Event Processing ---
    try {
        const lomiEventType = eventPayload?.event;
        const eventData = eventPayload?.data;

        console.log('Padel App: Received Lomi event type:', lomiEventType);

        if ((lomiEventType === 'PAYMENT_SUCCEEDED' || lomiEventType === 'checkout.completed') && eventData) {
            // 'checkout.completed' is the DB enum, 'CHECKOUT_COMPLETED' is the API type.
            // Lomi webhook sender uses API type, so check for 'CHECKOUT_COMPLETED' if that's what Lomi API sends.
            // For safety, let's assume Lomi sends the documented API event names from webhooks-api-docs.md

            let reservationId, lomiPaymentId, lomiCheckoutSessionId, amount, currency;

            if (lomiEventType === 'CHECKOUT_COMPLETED') { // Lomi API sends this for checkout completion
                lomiCheckoutSessionId = eventData.id; // The ID of the CheckoutSession object
                // Extract reservation_id from metadata. It was set in create-lomi-checkout-session
                reservationId = eventData.metadata?.reservation_id;
                amount = eventData.amount; // This should be the amount from the checkout session object
                currency = eventData.currency_code;
                // If the transaction_id is available directly on the completed checkout session data from Lomi, use it.
                // Otherwise, lomiCheckoutSessionId might serve as provider_payment_id.
                lomiPaymentId = eventData.transaction_id || null; // Check actual Lomi payload for this
                console.log(`Padel App: Parsed CHECKOUT_COMPLETED: lomiCheckoutSessionId=${lomiCheckoutSessionId}, reservationId=${reservationId}`);
            } else if (lomiEventType === 'PAYMENT_SUCCEEDED') { // Lomi API sends this
                lomiPaymentId = eventData.transaction_id; // The ID of the Transaction object
                reservationId = eventData.metadata?.reservation_id;
                amount = eventData.gross_amount; // From Transaction object
                currency = eventData.currency_code;
                console.log(`Padel App: Parsed PAYMENT_SUCCEEDED: lomiPaymentId=${lomiPaymentId}, reservationId=${reservationId}`);
            }


            if (!reservationId) {
                console.error('Padel App Webhook Error: Missing reservation_id in Lomi webhook metadata.', { lomiEventData: eventData });
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Missing reservation_id in Lomi webhook metadata for processing.' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
            if (amount === undefined || !currency) {
                console.error('Padel App Webhook Error: Missing amount or currency from Lomi event data.', { amount, currency, lomiEventData: eventData });
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Missing amount or currency in Lomi webhook payload.' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            // Call RPC to record payment and update reservation
            const { error: rpcError } = await supabase.rpc('record_padel_lomi_payment', {
                p_reservation_id: reservationId,
                p_lomi_payment_id: lomiPaymentId, // Can be null if only checkout_session_id is primary
                p_lomi_checkout_session_id: lomiCheckoutSessionId, // Can be null if payment_succeeded doesn't have it
                p_amount_paid: amount / 100, // Assuming Lomi sends amount in smallest unit (e.g. cents)
                p_currency_paid: currency,
                p_lomi_event_payload: eventPayload // Store the whole Lomi event
            });

            if (rpcError) {
                console.error('Padel App Webhook Error: Failed to call record_padel_lomi_payment RPC:', rpcError);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Failed to process payment update in Padel DB.' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
            console.log(`Padel App: Payment for reservation ${reservationId} processed successfully via Lomi webhook.`);

            // ---- Send Booking Confirmation Email Directly ----
            if (resend && RESEND_API_KEY && FROM_EMAIL_ADDRESS) {
                try {
                    // Fetch necessary data for the email using RPC
                    const { data: emailRpcData, error: rpcFetchError } = await supabase
                        .rpc('get_booking_confirmation_email_data', { p_reservation_id: reservationId });

                    if (rpcFetchError) {
                        console.error(`Padel App Webhook Warning: Failed to fetch reservation details via RPC for email (Res ID: ${reservationId}):`, rpcFetchError);
                        // Do not fail the webhook for this, log and continue.
                    } else if (emailRpcData && emailRpcData.length > 0) { // RPC returns an array of rows
                        const emailDetails = emailRpcData[0]; // Get the first (and should be only) row

                        const userEmail = emailDetails.user_email;
                        const courtName = emailDetails.court_name;
                        const startTime = emailDetails.start_time;
                        const totalPrice = emailDetails.total_price;
                        // const userName = emailDetails.user_name; // Available if you populate it in RPC
                        // const dbCurrency = emailDetails.currency; // Available from RPC

                        if (userEmail && courtName && startTime && totalPrice !== null) {
                            const emailSubject = `Your Padel Court Booking Confirmed: ${courtName}`;
                            const emailPayload = {
                                userName: emailDetails.user_name || null,
                                reservationId: reservationId,
                                courtName: courtName,
                                startTime: startTime,
                                totalPrice: totalPrice,
                                currency: currency, // Using currency from Lomi event data, as it's most directly tied to the transaction
                            };
                            const htmlContent = craftBookingConfirmationEmailHTML(emailPayload);

                            const { data: sendData, error: sendError } = await resend.emails.send({
                                from: FROM_EMAIL_ADDRESS,
                                to: userEmail,
                                subject: emailSubject,
                                html: htmlContent,
                            });

                            if (sendError) {
                                console.error(`Padel App Webhook Warning: Failed to send confirmation email to ${userEmail} (Res ID: ${reservationId}):`, sendError);
                            } else {
                                console.log(`Padel App: Successfully sent confirmation email to ${userEmail} for reservation ${reservationId}. Resend ID: ${sendData?.id}`);
                            }
                        } else {
                            console.warn(`Padel App Webhook Warning: Missing data from RPC for sending email (Res ID: ${reservationId}). UserEmail: ${userEmail}, CourtName: ${courtName}`);
                        }
                    } else {
                        console.warn(`Padel App Webhook Warning: No reservation details found via RPC for email (Res ID: ${reservationId}) after successful payment. RPC Data:`, emailRpcData);
                    }
                } catch (emailError) {
                    console.error(`Padel App Webhook Warning: Exception while trying to send confirmation email for reservation ${reservationId}:`, emailError);
                }
            } else {
                console.warn(`Padel App Webhook: Resend API key or From Email Address not configured. Skipping email notification for reservation ${reservationId}.`);
            }
            // ---- End: Send Booking Confirmation Email ----

        } else {
            console.log('Padel App: Lomi event type not handled or missing data:', lomiEventType);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true, message: "Webhook processed by Padel App" }),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error('Padel App Webhook - Uncaught error during event processing:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error processing webhook event.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};