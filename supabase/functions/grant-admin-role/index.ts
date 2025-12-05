import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract the authorization header to verify caller's identity
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create a client with the user's token to verify their identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the calling user's identity
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !callingUser) {
      console.error('Failed to authenticate caller:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the calling user has admin role using service role client
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Error checking caller admin status:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!callerRole) {
      console.warn(`Non-admin user ${callingUser.id} (${callingUser.email}) attempted to grant admin role`);
      return new Response(
        JSON.stringify({ error: 'Access denied. Only admins can grant admin roles.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Caller is verified as admin, proceed with granting role
    const { userEmail } = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: { users }, error: findError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (findError) {
      console.error('Error finding user:', findError);
      return new Response(
        JSON.stringify({ error: 'Failed to find user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users?.find(u => u.email === userEmail);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has admin role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ message: 'User already has admin role' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grant admin role
    const { error: grantError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      });

    if (grantError) {
      console.error('Error granting admin role:', grantError);
      return new Response(
        JSON.stringify({ error: 'Failed to grant admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${callingUser.email} granted admin role to ${user.email}`);

    return new Response(
      JSON.stringify({ 
        message: 'Admin role granted successfully',
        userId: user.id,
        userEmail: user.email,
        grantedBy: callingUser.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grant-admin-role function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
