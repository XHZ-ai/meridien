import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Clé publique Stripe
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Initialiser Stripe
export const stripePromise = loadStripe(stripePublishableKey);

// Types pour Stripe
export interface StripeSubscription {
  id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  plan: {
    id: string;
    nickname: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

export interface CreateCheckoutSessionParams {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

// Configuration des prix Stripe (remplace par tes vrais IDs de prix)
export const STRIPE_PRICES = {
  PRO_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1RYXuKP9E29OxTYf0oDHiKNU',
} as const;

// URLs de redirection
export const getStripeUrls = () => {
  const baseUrl = window.location.origin;
  return {
    success: `${baseUrl}/pricing?success=true`,
    cancel: `${baseUrl}/pricing?canceled=true`,
    return: `${baseUrl}/profile`,
  };
};

// Créer une session de checkout Stripe via Supabase Edge Function
export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  try {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: params,
    });

    if (error) {
      throw error;
    }

    return data.sessionId;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Créer une session du portail client Stripe via Supabase Edge Function
export async function createPortalSession(params: CreatePortalSessionParams) {
  try {
    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: params,
    });

    if (error) {
      throw error;
    }

    return data.url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

// Rediriger vers Stripe Checkout
export async function redirectToCheckout(priceId: string, userId: string, userEmail: string) {
  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const urls = getStripeUrls();
    const sessionId = await createCheckoutSession({
      priceId,
      userId,
      userEmail,
      successUrl: urls.success,
      cancelUrl: urls.cancel,
    });

    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

// Rediriger vers le portail client Stripe
export async function redirectToPortal(customerId: string) {
  try {
    const urls = getStripeUrls();
    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: urls.return,
    });

    window.location.href = portalUrl;
  } catch (error) {
    console.error('Error redirecting to portal:', error);
    throw error;
  }
}