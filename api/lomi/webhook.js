import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Buffer } from 'node:buffer';

// --- Supabase Setup for Padel App ---
// These will be set in Vercel environment variables
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
// This will be set in Vercel environment variables
const LOMI_WEBHOOK_SECRET = process.env.LOMI_WEBHOOK_SECRET;



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


// Configure Vercel to handle raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to get raw body from Vercel request
async function getRawBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

// --- Vercel Function Handler ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.setHeader('Content-Type', 'application/json');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-lomi-signature']; // Lomi sends this header

    let eventPayload;
    try {
        eventPayload = await verifyLomiWebhook(rawBody, signature);
        console.log('Padel App: Lomi webhook event verified:', eventPayload?.event || 'Event type missing');
    } catch (err) {
        console.error('Padel App: Lomi signature verification failed:', err.message);
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: `Webhook verification failed: ${err.message}` });
    }

    // --- Event Processing ---
    try {
        const lomiEventType = eventPayload?.event;
        const eventData = eventPayload?.data;

        console.log('Padel App: Received Lomi event type:', lomiEventType);

        if ((lomiEventType === 'PAYMENT_SUCCEEDED' || lomiEventType === 'CHECKOUT_COMPLETED' || lomiEventType === 'checkout.completed') && eventData) {
            // Handle both possible event type formats that Lomi might send

            let reservationId, lomiPaymentId, lomiCheckoutSessionId, amount, currency;

            if (lomiEventType === 'CHECKOUT_COMPLETED' || lomiEventType === 'checkout.completed') {
                lomiCheckoutSessionId = eventData.id; // The ID of the CheckoutSession object
                // Extract reservation_id from metadata. It was set in create-lomi-checkout-session
                reservationId = eventData.metadata?.reservation_id;
                amount = eventData.amount; // This should be the amount from the checkout session object
                currency = eventData.currency_code;
                // If the transaction_id is available directly on the completed checkout session data from Lomi, use it.
                lomiPaymentId = eventData.transaction_id || null;
                console.log(`Padel App: Parsed CHECKOUT_COMPLETED: lomiCheckoutSessionId=${lomiCheckoutSessionId}, reservationId=${reservationId}`);
            } else if (lomiEventType === 'PAYMENT_SUCCEEDED') {
                lomiPaymentId = eventData.transaction_id; // The ID of the Transaction object
                reservationId = eventData.metadata?.reservation_id;
                amount = eventData.gross_amount || eventData.amount; // Try both field names
                currency = eventData.currency_code;
                console.log(`Padel App: Parsed PAYMENT_SUCCEEDED: lomiPaymentId=${lomiPaymentId}, reservationId=${reservationId}`);
            }


            if (!reservationId) {
                console.error('Padel App Webhook Error: Missing reservation_id in Lomi webhook metadata.', { lomiEventData: eventData });
                res.setHeader('Content-Type', 'application/json');
                return res.status(400).json({ error: 'Missing reservation_id in Lomi webhook metadata for processing.' });
            }
            if (amount === undefined || !currency) {
                console.error('Padel App Webhook Error: Missing amount or currency from Lomi event data.', { amount, currency, lomiEventData: eventData });
                res.setHeader('Content-Type', 'application/json');
                return res.status(400).json({ error: 'Missing amount or currency in Lomi webhook payload.' });
            }

            // Call RPC to record payment and update reservation
            // For XOF, Lomi sends amount in base units (not cents), so we don't divide by 100
            const { error: rpcError } = await supabase.rpc('record_padel_lomi_payment', {
                p_reservation_id: reservationId,
                p_lomi_payment_id: lomiPaymentId, // Can be null if only checkout_session_id is primary
                p_lomi_checkout_session_id: lomiCheckoutSessionId, // Can be null if payment_succeeded doesn't have it
                p_amount_paid: amount, // XOF amounts are sent in base units, no conversion needed
                p_currency_paid: currency,
                p_lomi_event_payload: eventPayload // Store the whole Lomi event
            });

            if (rpcError) {
                console.error('Padel App Webhook Error: Failed to call record_padel_lomi_payment RPC:', rpcError);
                res.setHeader('Content-Type', 'application/json');
                return res.status(500).json({ error: 'Failed to process payment update in Padel DB.' });
            }
            console.log(`Padel App: Payment for reservation ${reservationId} processed successfully via Lomi webhook.`);

            // ---- Send Booking Confirmation Email via Supabase Function ----
            try {
                console.log(`Padel App: Triggering send-booking-confirmation for reservation ${reservationId} via HTTP call`);
                const functionUrl = `${supabaseUrl}/functions/v1/send-booking-confirmation`;

                const emailResponse = await fetch(functionUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${supabaseServiceKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ reservation_id: reservationId }),
                });

                const emailResult = await emailResponse.text();

                if (!emailResponse.ok) {
                    console.error(
                        `Padel App Webhook Warning: Error triggering send-booking-confirmation for ${reservationId}:`,
                        {
                            status: emailResponse.status,
                            statusText: emailResponse.statusText,
                            response: emailResult,
                        }
                    );
                } else {
                    console.log(
                        `Padel App: Successfully triggered send-booking-confirmation for ${reservationId}:`,
                        emailResult
                    );
                }
            } catch (emailError) {
                console.error(
                    `Padel App Webhook Warning: Exception calling send-booking-confirmation for ${reservationId}:`,
                    emailError
                );
            }
            // ---- End: Send Booking Confirmation Email ----

        } else {
            console.log('Padel App: Lomi event type not handled or missing data:', lomiEventType);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ received: true, message: "Webhook processed by Padel App" });

    } catch (error) {
        console.error('Padel App Webhook - Uncaught error during event processing:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: 'Internal server error processing webhook event.' });
    }
}