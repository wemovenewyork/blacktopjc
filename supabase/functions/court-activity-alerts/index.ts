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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get checkin counts per court in last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: checkins, error: checkinsError } = await supabase
      .from('court_checkins')
      .select('court_id')
      .gte('created_at', twoHoursAgo);

    if (checkinsError) throw checkinsError;
    if (!checkins || checkins.length === 0) {
      return new Response(JSON.stringify({ success: true, courts_alerted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count checkins per court
    const courtCounts: Record<string, number> = {};
    for (const c of checkins) {
      courtCounts[c.court_id] = (courtCounts[c.court_id] ?? 0) + 1;
    }

    // Find active courts (threshold met)
    const activeCourts = Object.entries(courtCounts).filter(([, count]) => count >= 4);

    let courtsAlerted = 0;

    for (const [courtId, count] of activeCourts) {
      // Check if we already sent an alert for this court in the last hour (dedupe)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentAlerts } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'court_activity')
        .gte('created_at', oneHourAgo)
        .contains('payload_json', { court_id: courtId })
        .limit(1);

      if (recentAlerts && recentAlerts.length > 0) {
        continue; // Already sent alert recently
      }

      // Get court info
      const { data: court } = await supabase
        .from('courts')
        .select('name, neighborhood')
        .eq('id', courtId)
        .single();

      if (!court) continue;

      // Find users who favorited this court with threshold <= count
      const { data: favorites } = await supabase
        .from('court_favorites')
        .select('user_id, alert_threshold')
        .eq('court_id', courtId)
        .lte('alert_threshold', count);

      if (!favorites) continue;

      for (const fav of favorites) {
        // Send push notification via edge function
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            user_id: fav.user_id,
            type: 'court_activity',
            payload: { court_id: courtId, checkin_count: count, court_name: court.name },
            title: '🏀 Court is Popping!',
            body: `${count} players checked in at ${court.name} in ${court.neighborhood}`,
          }),
        });
      }

      courtsAlerted++;
    }

    return new Response(
      JSON.stringify({ success: true, courts_alerted: courtsAlerted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
