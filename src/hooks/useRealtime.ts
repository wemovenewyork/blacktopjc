import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeOptions {
  table: string;
  filter?: string;
  event?: RealtimeEvent;
  onData: (payload: any) => void;
}

export function useRealtime({ table, filter, event = '*', onData }: RealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let query = supabase.channel(`${table}-${filter ?? 'all'}`);

    const config: any = {
      event,
      schema: 'public',
      table,
    };
    if (filter) config.filter = filter;

    channelRef.current = query
      .on('postgres_changes', config, (payload) => {
        onData(payload);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, event]);
}
