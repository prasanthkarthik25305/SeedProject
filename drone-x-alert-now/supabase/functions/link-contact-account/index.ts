// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to find a user by email using admin.listUsers paging
async function findUserByEmail(adminClient: any, email: string) {
  try {
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const found = data.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (found) return found;
      if (page >= (data.lastPage || page)) break;
      page++;
    }
    return null;
  } catch (e) {
    console.error('findUserByEmail error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';

    // Authenticated supabase client (caller)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify caller
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { contactId, email } = await req.json();
    if (!contactId || !email) {
      return new Response(JSON.stringify({ error: 'contactId and email are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Service role client for admin operations
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ensure the contact belongs to the caller
    const { data: contactRow, error: contactErr } = await service
      .from('emergency_contacts')
      .select('id,user_id,contact_user_id')
      .eq('id', contactId)
      .maybeSingle();

    if (contactErr || !contactRow || contactRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find target user by email
    const targetUser = await findUserByEmail(service, email);
    const accountExists = !!targetUser;

    if (accountExists) {
      // Link contact to existing user
      const { error: updateErr } = await service
        .from('emergency_contacts')
        .update({ contact_user_id: targetUser.id })
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (updateErr) {
        console.error('link update error:', updateErr);
        return new Response(JSON.stringify({ linked: false, accountExists: true, error: updateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ linked: accountExists, accountExists }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('link-contact-account error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
