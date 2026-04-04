import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  title: string;
  body: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, type, payload, title, body }: PushPayload = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's Expo push token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', user_id)
      .single();

    if (userError) throw userError;

    // Save notification to DB
    await supabase.from('notifications').insert({
      user_id,
      type,
      payload_json: payload,
      read: false,
    });

    // Send push if token exists
    if (user?.expo_push_token) {
      const message = {
        to: user.expo_push_token,
        sound: 'default',
        title,
        body,
        data: payload,
        priority: 'high',
      };

      const expoPushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const expoPushData = await expoPushRes.json();

      return new Response(
        JSON.stringify({ success: true, expo_response: expoPushData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification saved, no push token' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
