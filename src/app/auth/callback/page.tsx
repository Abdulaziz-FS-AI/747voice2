'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSupabaseClient();
  
  const planId = searchParams.get('plan_id');
  const billingCycle = searchParams.get('billing_cycle');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/signin?error=callback_error');
          return;
        }

        if (data.session) {
          // Check if user has a profile, if not create one
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create one
            const profileData: any = {
              id: data.session.user.id,
              email: data.session.user.email!,
              first_name: data.session.user.user_metadata?.first_name || data.session.user.user_metadata?.name?.split(' ')[0] || '',
              last_name: data.session.user.user_metadata?.last_name || data.session.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
              onboarding_completed: false,
            };

            // If plan info was passed, store it for later processing
            if (planId) {
              profileData.preferences = {
                selected_plan_id: planId,
                billing_cycle: billingCycle || 'monthly'
              };
            }

            const { error: insertError } = await supabase
              .from('profiles')
              .insert(profileData);

            if (insertError) {
              console.error('Error creating profile:', insertError);
            }
          }

          // Redirect to dashboard or onboarding
          const shouldOnboard = !profile?.onboarding_completed;
          router.push(shouldOnboard ? '/auth/success' : '/dashboard');
        } else {
          // No session, redirect to sign in
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.push('/auth/signin?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}