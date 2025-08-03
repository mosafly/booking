# Padel Palmeraie

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
    - lomi.: `LOMI_API_KEY` (for Supabase Edge Function), `LOMI_WEBHOOK_SECRET` (for Netlify function)
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

    In a _separate_ terminal window (while the first one is still running `pnpm run dev`), run the following commands. You typically only need to run `login` and `link` once per project setup. Run `db push` initially and whenever database schema changes are made (e.g., in `supabase/migrations`).

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
