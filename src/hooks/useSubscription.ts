import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { StripeSubscription } from '../lib/stripe';

interface UserSubscription {
  subscription_status: string | null;
  subscription_id: string | null;
  customer_id: string | null;
  plan_type: string;
  monthly_credits: number;
}

export function useSubscription(session: Session | null) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!session?.user?.id) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profile_ai')
        .select('subscription_status, subscription_id, customer_id, plan_type, monthly_credits')
        .eq('user_id', session.user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setSubscription(data || {
        subscription_status: null,
        subscription_id: null,
        customer_id: null,
        plan_type: 'free',
        monthly_credits: 100
      });
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [session?.user?.id]);

  const refreshSubscription = () => {
    fetchSubscription();
  };

  const isPro = subscription?.plan_type === 'pro' && 
                subscription?.subscription_status === 'active';

  const hasUnlimitedCredits = subscription?.monthly_credits === -1;

  return {
    subscription,
    isLoading,
    error,
    refreshSubscription,
    isPro,
    hasUnlimitedCredits
  };
}