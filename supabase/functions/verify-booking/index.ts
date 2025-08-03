import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // The Supabase client is initialized with the service role key
    // to have admin privileges, but we pass the user's auth token
    // to RLS-protected functions to enforce user-specific permissions.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });


    const { action, ...body } = await req.json();

    let data;
    let error;

    switch (action) {
      case 'verify_pin':
        ({ data, error } = await supabase.rpc('verify_staff_pin', { p_pin: body.pin }));
        break;
      case 'get_reservation':
        ({ data, error } = await supabase.rpc('get_reservation_for_verification', { p_verification_id: body.verificationId }));
        break;
      case 'mark_used':
        ({ data, error } = await supabase.rpc('mark_booking_as_used', { p_verification_id: body.verificationId }));
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    if (error) {
      console.error(`Error in action '${action}':`, error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error('Unexpected error in verify-booking:', e);
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
