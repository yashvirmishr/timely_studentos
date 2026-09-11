'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTimelyStore } from '@/lib/store';

export function useSupabaseSync() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, setUserId, pullOnlyFromSupabase } = useTimelyStore();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const newId = session.user.id;
        if (prevUserIdRef.current && prevUserIdRef.current !== newId) {
          useTimelyStore.setState({
            tasks: [],
            classes: [],
            subjects: [],
            notes: [],
            files: [],
            savedChats: [],
            notifications: [],
          });
        }
        prevUserIdRef.current = newId;
        setUserId(newId);
        await pullOnlyFromSupabase();
      }
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: string, session: { user: { id: string } } | null) => {
          if (session?.user) {
            const newId = session.user.id;
            if (prevUserIdRef.current && prevUserIdRef.current !== newId) {
              useTimelyStore.setState({
                tasks: [],
                classes: [],
                subjects: [],
                notes: [],
                files: [],
                savedChats: [],
                notifications: [],
              });
            }
            prevUserIdRef.current = newId;
            setUserId(newId);
            await pullOnlyFromSupabase();
          } else {
            setUserId(null);
            prevUserIdRef.current = null;
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
  }, [setUserId, pullOnlyFromSupabase]);

  return { isLoading, error, userId };
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error };
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { error };
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}
