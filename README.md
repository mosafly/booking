# Padel Society

An application for booking padel courts, featuring integration with lomi. payments.

## Overview

padelsociety.ci is a modern web application designed to streamline the process of reserving padel courts. Users can browse available courts, make bookings, and handle payments securely. Administrators have tools to manage reservations and oversee the platform.

This project is built with:

- **Frontend**: React, TS
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Styling**: Tailwind CSS + Shadcn
- **Payments**: lomi.
- **Email Notifications**: Resend (for booking confirmations)

## Features

- User registration and authentication.
- Browse and search for available padel courts.
- Real-time court booking system.
- Secure payment processing via lomi. integration.
- User dashboard to manage existing reservations.
- Admin panel for managing courts, users, and all reservations (confirm/cancel).
- Responsive design for accessibility on various devices.

## Getting started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- Node.js (v16 or higher recommended)
- An active Supabase account
- An active lomi. account for payment processing
- An active Resend account for sending email notifications

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/lomiafrica/booking
    cd booking
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Populate the `.env` file with your credentials and configuration details for Supabase, lomi., and Resend. Refer to `.env.example` for the required variables. Key variables include:
    - Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (for frontend)
    - Lomi: `LOMI_API_KEY` (for Supabase Edge Function), `LOMI_WEBHOOK_SECRET` (for Netlify function)
    - Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL_ADDRESS`

### Running Locally

Follow these steps to get the application running on your machine:

1.  **Start the Frontend development server:**
    Open a terminal window, navigate to the project directory, and run:
    ```bash
    pnpm run dev
    ```
    This compiles the frontend code and serves the application, usually at `http://localhost:5173`. Keep this terminal window open while you are developing.

2.  **Set Up Supabase backend (One-time or after pulling changes):**
   
    In a *separate* terminal window (while the first one is still running `pnpm run dev`), run the following commands. You typically only need to run `login` and `link` once per project setup. Run `db push` initially and whenever database schema changes are made (e.g., in `supabase/migrations`).
    ```bash
    # Log in to your Supabase account via the CLI (if not already logged in)
    supabase login

    # Link this local project to your Supabase project online (replace YOUR_PROJECT_REF)
    # Find YOUR_PROJECT_REF in your Supabase project settings (General > Project Ref)
    supabase link --project-ref YOUR_PROJECT_REF

    # Apply database schema changes from local migrations to your Supabase database
    supabase db push
    ```
    This will apply migrations from `supabase/migrations/`, including:
    - `01_db_init.sql`: Sets up initial tables (profiles, courts, reservations, payments) and basic RLS/triggers.
    - `02_webhook_system.sql`: Defines the `record_padel_lomi_payment` RPC function.
    - `03_email_system.sql`: Defines the `get_booking_confirmation_email_data` RPC function.

3.  **Deploy the lomi. Checkout function (Initial setup or after function changes):**
    Ensure Docker Desktop (or Docker Engine for Linux) is **running** on your machine. Then, in the second terminal window, deploy the Supabase Edge Function:
    
    ```bash
    supabase functions deploy create-lomi-checkout-session --no-verify-jwt
    ```
    You only need to re-run this command if you modify the code within the `supabase/functions/create-lomi-checkout-session/` directory.

After completing these steps, your local frontend application (running from step 1) should be accessible in your browser and able to communicate with your configured Supabase backend and the deployed Edge Function for payments.

## Note: FOR AMOS (Kindly refer to point 4.)

This section provides a more detailed explanation to help better understand the setup process and the core payment logic.

### Getting Started

The "Getting Started" section guides you through setting up the project locally. Here's a breakdown of the crucial steps:

*   **Prerequisites:**
    *   **Node.js:** Essential for running JavaScript/TypeScript outside the browser, managing project dependencies (`pnpm install`), and running the local development server (`pnpm run dev`). Ensure it's installed (`node -v`).
    *   **Supabase account:** Provides the backend (database, authentication, serverless functions). Sign up, create a project, and note your Project URL and API keys for the `.env` file.
    *   **lomi. account:** Handles secure payment processing. Sign up and get your Lomi API Key for the `.env` file.
    *   **Resend account:** Handles sending email notifications. Sign up and get your Resend API Key and email address for the `.env` file.

*   **Installation:**
    1.  `git clone ...`: Downloads the project code.
    2.  `cd ...`: Moves your terminal into the project directory.
    3.  `pnpm install`: Downloads required libraries listed in `package.json`. Install `pnpm` first if needed (`npm install -g pnpm`).
    4.  `cp .env.example .env`: Creates your personal configuration file from the template.
    5.  **Populate `.env`:** Edit the `.env` file and replace placeholders with your actual Supabase, lomi., and Resend credentials. **This is critical for the app to connect to backend services.**

*   **Running locally:**

    1.  `pnpm run dev`: Starts the frontend development server (usually `http://localhost:5173`). Keep this running.
    2.  `supabase login`: Connects the Supabase CLI tool to your account (do this once).
    3.  `supabase link --project-ref YOUR_PROJECT_ID`: Links your local project folder to your remote Supabase project (replace `YOUR_PROJECT_ID`).
    4.  `supabase db push`: Updates your remote Supabase database schema based on local files (`supabase/migrations`). Ensures database tables match the application's expectations.
    5.  `Active docker then supabase functions deploy ...`:
        *   **Docker:** Required by the Supabase CLI to package Edge Functions. Ensure Docker Desktop (or Engine) is running.
        *   `supabase functions deploy create-lomi-checkout-session --no-verify-jwt`: Uploads the payment function code (`supabase/functions/create-lomi-checkout-session/index.ts`) to Supabase, making it callable via an API endpoint. `--no-verify-jwt` might be used for simplified access during development, but review security implications for production.

### Understanding the Checkout function (`supabase/functions/create-lomi-checkout-session/index.ts`)

This file defines a Supabase Edge Function, which is server-side code running on Supabase infrastructure. Its main job is to securely create a payment session with Lomi.

*   **Purpose:** Acts as a secure bridge between your frontend and the lomi. payment gateway.
*   **Why an Edge function?** Keeps sensitive information (like your lomi. API Key) off the frontend (browser) and handles server-to-server communication securely.
*   **How it Works:**
    1. Frontend requests a checkout session from this Edge Function, sending reservation details.
    2. Edge Function validates input and constructs a payload for Lomi.
    3. Edge Function securely calls Lomi API with your `LOMI_API_KEY`.
    4. Lomi returns a unique `checkout_url`.
    5. Edge Function sends this `checkout_url` back to the frontend.
    6. Frontend redirects the user to Lomi's payment page.
    7. After payment, Lomi redirects the user back to your application (success or cancel URL).
    8. Lomi also sends a separate, asynchronous notification (webhook) to your backend to confirm the payment status.

*   For more details on the payload and specific parameters, refer to the code comments within `supabase/functions/create-lomi-checkout-session/index.ts`.

### Understanding the Lomi Webhook and Email Notification Process (`apps/padel/api/lomi./webhook.js`)

After a payment is attempted (successful or failed), Lomi sends an asynchronous webhook (HTTP POST request) to a predefined endpoint in your application. This project uses a Netlify Function (`apps/padel/api/lomi./webhook.js`) to handle these notifications.

**Purpose of the Webhook Handler:**
- Securely confirm payment success independently of the user's browser redirection.
- Update the database to reflect the confirmed payment.
- Send a booking confirmation email to the user.

**How it Works:**

1.  **Lomi Sends Webhook:** Lomi sends an event (e.g., `PAYMENT_SUCCEEDED` or `CHECKOUT_COMPLETED`) to your Netlify function endpoint `/api/lomi./webhook`.

2.  **Signature Verification:**
    - The `webhook.js` function first verifies the `X-Lomi-Signature` header using your `LOMI_WEBHOOK_SECRET`. This ensures the request is genuinely from Lomi and hasn't been tampered with.
    - If verification fails, it returns an error and stops processing.

3.  **Event Processing (on successful payment):**
    - If the event indicates a successful payment, the function extracts `reservationId`, `amount`, `currency`, and Lomi payment identifiers from the webhook payload.

4.  **Record Payment in Database (RPC Call 1):**
    - It calls the Supabase RPC function `record_padel_lomi_payment` (defined in `supabase/migrations/02_webhook_system.sql`).
    - This RPC function:
        - Creates a new record in the `public.payments` table with status `completed`.
        - A database trigger (`update_reservation_status_on_payment_trigger` from `01_db_init.sql`) then automatically updates the corresponding `public.reservations` record's status to `confirmed`.

5.  **Fetch Data for Email (RPC Call 2):**
    - After successfully recording the payment, the webhook calls the Supabase RPC function `get_booking_confirmation_email_data` (defined in `supabase/migrations/03_email_system.sql`) using the `reservationId`.
    - This RPC function queries your database and returns necessary details for the email, such as the user's email address, court name, reservation start time, and total price.

6.  **Send Booking Confirmation Email:**
    - Using the data returned by the RPC and the Resend API (configured with `RESEND_API_KEY` and `RESEND_FROM_EMAIL_ADDRESS` environment variables):
        - It crafts an HTML email body.
        - It sends the email directly to the user.
    - If email sending fails, an error is logged, but the webhook still aims to return a `200 OK` to Lomi because the payment itself was processed successfully. This prevents Lomi from unnecessarily retrying the webhook due to an email issue.

7.  **Respond to Lomi:** The `webhook.js` function returns a `200 OK` status to Lomi to acknowledge successful receipt and processing of the webhook.

**Key Environment Variables for `webhook.js` (Netlify):**
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
- `LOMI_WEBHOOK_SECRET`: Your secret for verifying Lomi webhooks.
- `RESEND_API_KEY`: Your Resend API key.
- `RESEND_FROM_EMAIL_ADDRESS`: The email address to send confirmations from.

This direct email sending approach within the webhook simplifies the system by removing the need for a separate email queuing mechanism and a scheduled Edge Function. However, it's important to monitor its performance and reliability, as delays in the Resend API could potentially slow down the webhook response time, though the code attempts to mitigate failing the webhook due to email issues.