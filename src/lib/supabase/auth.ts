'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTimelyStore } from '@/lib/store';

export function useSupabaseSync() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, setUserId, syncWithSupabase } = useTimelyStore();

  useEffect(() => {
    async function initAuth() {
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        await syncWithSupabase();
      }
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: string, session: { user: { id: string } } | null) => {
          if (session?.user) {
            setUserId(session.user.id);
            await syncWithSupabase();
          } else {
            setUserId(null);
          }
          setIsLoading(false);
        }
      );
      
      setIsLoading(false);
      
      return () => {
        subscription.unsubscribe();
      };
    }
    
    initAuth().catch((err) => {
      console.error('Supabase auth init failed:', err);
      setError(err.message);
      setIsLoading(false);
    });
  }, [setUserId, syncWithSupabase]);

  return { isLoading, error, userId };
}

export async function signInWithEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}