import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { client_id, secret, access_token, start_date, end_date } = await req.json();

    console.log('Fetching transactions from', start_date, 'to', end_date);

    // FIX: Use backticks for template literal
    const plaidUrl = `https://${PLAID_ENV}.plaid.com/transactions/get`;
    console.log('Plaid URL:', plaidUrl);

    const response = await fetch(plaidUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: client_id,
        secret: secret,
        access_token: access_token,
        start_date: start_date,
        end_date: end_date,
      }),
    });

    const data = await response.json();
    console.log('Transactions response:', data.transactions?.length || 0, 'transactions');

    if (!response.ok) {
      console.error('Plaid API error:', data);
      throw new Error(data.error_message || 'Failed to fetch transactions');
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
    console.error('Error in get-transactions function:', error);
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