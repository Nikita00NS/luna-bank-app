import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { syncFromSupabase } from '../lib/sync';

/**
 * Hook to sync data from Supabase on app startup
 * Called once when user is authenticated
 */
export function useSupabaseSync() {
  const { user, authed } = useStore();
  const synced = useRef(false);

  useEffect(() => {
    if (authed && user && !synced.current) {
      synced.current = true;
      syncFromSupabase(user.telegram_id).catch(err => {
        console.warn('Supabase sync failed (offline mode):', err);
      });
    }
  }, [authed, user]);
}
