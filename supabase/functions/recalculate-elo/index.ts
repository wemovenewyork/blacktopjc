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
    const { game_id, rated_user_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all ratings for this user in this game
    const { data: ratings, error: ratingsError } = await supabase
      .from('game_ratings')
      .select('*')
      .eq('game_id', game_id)
      .eq('rated_user_id', rated_user_id);

    if (ratingsError) throw ratingsError;
    if (!ratings || ratings.length === 0) {
      return new Response(JSON.stringify({ message: 'No ratings found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate weighted score
    const punctualityMap: Record<string, number> = { ontime: 5, late: 3, noshow: 1 };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const r of ratings) {
      const skillWeight = 0.5;
      const sportWeight = 0.3;
      const punctWeight = 0.2;

      const punctScore = punctualityMap[r.punctuality_status] ?? 3;
      const weighted =
        r.skill_rating * skillWeight +
        r.sportsmanship_rating * sportWeight +
        punctScore * punctWeight;

      weightedSum += weighted;
      totalWeight += 1;
    }

    const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 3;

    // Map avg (1-5 scale) to ELO delta
    let eloDelta = 0;
    if (avgScore > 4.0) {
      eloDelta = Math.round(25 + ((avgScore - 4.0) / 1.0) * 25); // +25 to +50
    } else if (avgScore > 3.0) {
      eloDelta = Math.round(5 + ((avgScore - 3.0) / 1.0) * 20); // +5 to +25
    } else if (avgScore > 2.0) {
      eloDelta = Math.round(-10 + ((avgScore - 2.0) / 1.0) * 15); // -10 to +5
    } else {
      eloDelta = Math.round(-25 + ((avgScore - 1.0) / 1.0) * 15); // -25 to -10
    }

    // Fetch current ELO
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('elo_rating')
      .eq('id', rated_user_id)
      .single();

    if (userError) throw userError;

    const newElo = Math.max(1, (user.elo_rating ?? 1000) + eloDelta);

    // Check for no-show: 2+ raters marked noshow
    const noshowCount = ratings.filter((r) => r.punctuality_status === 'noshow').length;
    const noshowWarning = noshowCount >= 2;

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        elo_rating: newElo,
        games_until_rated: 0,
        ...(noshowWarning ? { noshow_warning: true } : {}),
      })
      .eq('id', rated_user_id);

    if (updateError) throw updateError;

    // Trigger hooper score update
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-hooper-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ user_id: rated_user_id }),
    });

    return new Response(
      JSON.stringify({ success: true, new_elo: newElo, delta: eloDelta }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
