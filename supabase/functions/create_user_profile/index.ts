// Function to create a profile for a user if it doesn't exist
// This helps ensure every user has a profile record

// @ts-expect-error: Deno runtime import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error: Deno runtime import
import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

// @ts-expect-error: Deno global
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
// @ts-expect-error: Deno global
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }

  try {
    const { user_id, role = 'client' } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if the user exists in auth.users
    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(user_id)

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in auth.users' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if profile already exists
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    if (!profileExists) {
      // Create profile if it doesn't exist
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ id: user_id, role }])
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, profile: data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Profile already exists' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
