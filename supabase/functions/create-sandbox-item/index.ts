import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PLAID_CLIENT_ID = "68d0c16a4777030021f60af0";
const PLAID_SECRET = "a9ee159ee3e1bdd5407df071198d65";
const PLAID_ENV = "sandbox";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    console.log('Creating sandbox item for user:', user_id);

    // Use Plaid's sandbox public token creation endpoint
    // This simulates what would happen after a user completes Link
    const plaidUrl = `https://${PLAID_ENV}.plaid.com/sandbox/public_token/create`;
    console.log('Plaid URL:', plaidUrl);

    const response = await fetch(plaidUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        institution_id: 'ins_109508', // First Platypus Bank (test institution)
        initial_products: ['transactions'],
      }),
    });

    const data = await response.json();
    console.log('Sandbox item response:', data);

    if (!response.ok) {
      console.error('Plaid API error:', data);
      throw new Error(data.error_message || 'Failed to create sandbox item');
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      },
    );
  } catch (error) {
    console.error('Error in create-sandbox-item function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      },
    );
  }
});