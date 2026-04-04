import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch last 30 ratings for this user
    const { data: ratings, error } = await supabase
      .from('game_ratings')
      .select('skill_rating, sportsmanship_rating, punctuality_status, created_at')
      .eq('rated_user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    if (!ratings || ratings.length === 0) {
      return new Response(JSON.stringify({ message: 'No ratings found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const punctualityMap: Record<string, number> = { ontime: 10, late: 5, noshow: 0 };

    // Calculate rolling averages scaled 0-100
    const punctualityScores = ratings.map((r) => punctualityMap[r.punctuality_status] ?? 5);
    const sportsmanshipScores = ratings.map((r) => ((r.sportsmanship_rating - 1) / 4) * 100);
    const skillScores = ratings.map((r) => ((r.skill_rating - 1) / 4) * 100);

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const hooper_score_punctuality = Math.round(avg(punctualityScores) * 10) / 10;
    const hooper_score_sportsmanship = Math.round(avg(sportsmanshipScores) * 10) / 10;
    const hooper_score_skill = Math.round(avg(skillScores) * 10) / 10;

    const { error: updateError } = await supabase
      .from('users')
      .update({ hooper_score_punctuality, hooper_score_sportsmanship, hooper_score_skill })
      .eq('id', user_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        hooper_score_punctuality,
        hooper_score_sportsmanship,
        hooper_score_skill,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
