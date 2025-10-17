import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PLAID_CLIENT_ID = "68d0c16a4777030021f60af0";
const PLAID_SECRET = "a9ee159ee3e1bdd5407df071198d65";
const PLAID_ENV = "sandbox"; // Change to 'production' for live

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, client_name, products, country_codes, language } = await req.json();

    console.log('Creating link token for user:', user);

    // FIX: Use backticks for template literal, not single quotes
    const plaidUrl = `https://${PLAID_ENV}.plaid.com/link/token/create`;
    console.log('Plaid URL:', plaidUrl);

    const requestBody = {
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      user: {
        client_user_id: user.client_user_id,
      },
      client_name: client_name || 'Aether Carbon Tracker',
      products: products || ['transactions'],
      country_codes: country_codes || ['US', 'CA', 'GB'],
      language: language || 'en',
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(plaidUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('Plaid response:', data);

    if (!response.ok) {
      console.error('Plaid API error:', data);
      throw new Error(data.error_message || 'Failed to create link token');
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
    console.error('Error in create-link-token function:', error);
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