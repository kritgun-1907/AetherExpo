import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id } = await req.json();

    // Get user's current stats
    const { data: user } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    // Simple achievement check
    const newAchievements = [];
    
    // Award "First Steps" achievement if user has eco_points
    if (user.eco_points >= 1) {
      newAchievements.push({
        id: 'first_steps',
        name: 'First Steps',
        description: 'Started tracking emissions',
        emoji: '🌱'
      });
    }

    return new Response(JSON.stringify({ 
      awarded_achievements: newAchievements.length,
      achievements: newAchievements 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
