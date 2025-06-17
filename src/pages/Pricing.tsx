import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { CreditCard, Zap, Crown, Star, AlertTriangle, Coins, Check, Loader, Rocket } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCredits } from '../contexts/CreditContext';
import { useSubscription } from '../hooks/useSubscription';
import { redirectToCheckout, redirectToPortal, STRIPE_PRICES } from '../lib/stripe';
import { Toast } from '../components/Toast';

interface PricingProps {
  session: Session;
}

export function Pricing({ session }: PricingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { credits } = useCredits();
  const { subscription, isPro, refreshSubscription } = useSubscription(session);
  
  const redirectInfo = location.state as {
    reason?: string;
    requiredCredits?: number;
    currentCredits?: number;
    toolName?: string;
  } | null;

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);

    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('success') === 'true') {
      setToast({ message: 'Payment successful! Welcome to Lynor Pro! 🎉', type: 'success' });
      refreshSubscription();
    } else if (urlParams.get('canceled') === 'true') {
      setToast({ message: 'Payment was canceled. You can try again anytime.', type: 'error' });
    }
  }, [location.search, refreshSubscription]);

  const getContextualMessage = () => {
    if (!redirectInfo?.reason) return null;

    const { reason, requiredCredits, currentCredits, toolName } = redirectInfo;

    switch (reason) {
      case 'insufficient-credits-optimization':
      case 'insufficient-credits-during-operation':
      case 'insufficient-credits-deduction-failed':
        return {
          type: 'error' as const,
          title: 'Insufficient Credits for Analysis',
          message: `You need ${requiredCredits} credits to analyze your workflow, but you only have ${currentCredits} remaining.`
        };
      
      case 'insufficient-credits-tool-optimization':
      case 'insufficient-credits-during-creation':
      case 'insufficient-credits-context-modal':
      case 'insufficient-credits-button-click':
        return {
          type: 'error' as const,
          title: `Insufficient Credits for ${toolName || 'Tool'} Optimization`,
          message: `You need ${requiredCredits} credits to create an optimization${toolName ? ` with ${toolName}` : ''}, but you only have ${currentCredits} remaining.`
        };
      
      case 'low-credits':
        return {
          type: 'warning' as const,
          title: 'Running Low on Credits',
          message: `You have ${currentCredits} credits remaining. Upgrade to Pro for 1000 credits per month.`
        };
      
      default:
        return {
          type: 'info' as const,
          title: 'Upgrade to Pro',
          message: 'Get 1000 credits per month and access to all Lynor features.'
        };
    }
  };

  const handleUpgradeToPro = async () => {
    if (!session?.user) {
      setToast({ message: 'Please sign in to upgrade to Pro', type: 'error' });
      return;
    }

    try {
      setIsProcessing(true);
      await redirectToCheckout(
        STRIPE_PRICES.PRO_MONTHLY,
        session.user.id,
        session.user.email || ''
      );
    } catch (error) {
      console.error('Error upgrading to Pro:', error);
      setToast({ message: 'Failed to start checkout process. Please try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription?.customer_id) {
      setToast({ message: 'No subscription found to manage', type: 'error' });
      return;
    }

    try {
      setIsProcessing(true);
      await redirectToPortal(subscription.customer_id);
    } catch (error) {
      console.error('Error opening customer portal:', error);
      setToast({ message: 'Failed to open subscription management. Please try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const contextualMessage = getContextualMessage();

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
        <div className="px-4 md:px-8 lg:px-16 pb-6">
          <div className="max-w-[1280px] mx-auto">
            <div className="relative h-8 w-40 mb-20 md:mb-24 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-[#f3f3f3] rounded-lg"></div>
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                }}
              ></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="relative rounded-3xl overflow-hidden h-[300px]">
                  <div className="absolute inset-0 bg-[#f3f3f3] rounded-3xl"></div>
                  <div 
                    className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                    }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
      <div className="px-4 md:px-8 lg:px-16 pb-6">
        <div className="max-w-[1280px] mx-auto">
          {/* Header */}
          <div className="mb-20 md:mb-24">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary text-center">
              Simple transparent pricing
            </h1>
          </div>

          {/* Message contextual */}
          {contextualMessage && (
            <div className="mb-8 p-4 md:p-6 rounded-3xl border border-teal/15 animate-cinematicFadeIn"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="fill:white;" /><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0" /></filter></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  contextualMessage.type === 'error' 
                    ? 'bg-red-50 text-red-600' 
                    : 'bg-teal/10 text-teal'
                }`}>
                  {contextualMessage.type === 'error' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : contextualMessage.type === 'warning' ? (
                    <Zap className="w-6 h-6" />
                  ) : (
                    <Crown className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg md:text-xl font-semibold mb-2 ${
  contextualMessage.type === 'error'
    ? 'text-red-800'
    : contextualMessage.type === 'warning'
      ? 'text-amber-800'
      : 'text-teal'
}`}>
                    {contextualMessage.title}
                  </h3>
                  <p className={`text-sm md:text-base ${
                    contextualMessage.type === 'error' 
                      ? 'text-red-700' 
                      : contextualMessage.type === 'warning'
                        ? 'text-amber-700'
                        : 'text-text-primary'
                  }`}>
                    {contextualMessage.message}
                  </p>
                  {credits && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                      <Coins className="w-4 h-4 text-teal" />
                      <span>Current credits: <strong>{credits.monthly_credits === 1000 ? '1000 (Pro)' : credits.monthly_credits}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
            {/* Explorer Plan */}
            <div className="rounded-3xl p-4 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] active:scale-[0.99]"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text-primary">Explorer</h3>
              <p className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-text-primary">
                €0<span className="text-base md:text-lg text-text-secondary">/mo</span>
              </p>
              <ul className="space-y-3 md:space-y-4 text-text-secondary mb-6 text-sm md:text-base">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  100 credits per month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  Basic optimizations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  Standard support
                </li>
              </ul>
              <div className="mt-auto">
                {!isPro ? (
                  <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-3xl text-center text-sm font-medium">
                    Current Plan
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 text-gray-400 rounded-3xl text-center text-sm font-medium">
                    Previous Plan
                  </div>
                )}
              </div>
            </div>
            
            {/* Pro Plan */}
            <div className="rounded-3xl p-4 md:p-8 border-2 border-teal/25 hover:border-teal/35 transition-all duration-300 relative shadow-lg transform scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal to-teal/80 text-gray-900 px-4 py-1 rounded-full text-xs md:text-sm font-medium shadow-sm">
                {isPro ? 'Current Plan' : 'Most Popular'}
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text-primary">Pro</h3>
              <p className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-text-primary">
                €4.99<span className="text-base md:text-lg text-text-secondary">/mo</span>
              </p>
              <ul className="space-y-3 md:space-y-4 text-text-secondary mb-6 text-sm md:text-base">
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-teal" />
                  <span className="font-medium">1000 credits per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-teal" />
                  Advanced optimizations
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-teal" />
                  Advanced Copilot assistant
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-teal" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-teal" />
                  Advanced insights about your AI usage
                </li>
              </ul>
              {isPro ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-white border border-teal/20 text-teal rounded-3xl
                    hover:bg-teal/10 transition-all duration-300 font-medium shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)]
                    hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Manage Subscription</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleUpgradeToPro}
                  disabled={isProcessing}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 px-6 py-3 rounded-3xl text-sm font-semibold relative overflow-hidden"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin relative z-10" />
                      <span className="relative z-10">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Start Now!</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Enterprise Plan */}
            <div className="rounded-3xl p-4 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] active:scale-[0.99]"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text-primary">Enterprise</h3>
              <p className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-text-primary">Contact us</p>
              <ul className="space-y-3 md:space-y-4 text-text-secondary mb-6 text-sm md:text-base">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  Custom integrations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  Dedicated support
                </li>
              </ul>
              <button
                onClick={() => {
                  window.open('mailto:contact@lynor.io?subject=Enterprise Plan Inquiry', '_blank');
                }}
                className="w-full px-6 py-3 border border-teal/20 text-teal rounded-3xl
                  hover:bg-teal/10 transition-all duration-300 font-medium shadow-sm
                  hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Contact Sales
              </button>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-text-primary mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <details className="group rounded-3xl p-4 md:p-6 border border-teal/15 shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] transition-all duration-300"
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: 'overlay',
                  backdropFilter: 'blur(8px) saturate(1.4)',
                }}
              >
                <summary className="font-semibold text-text-primary text-sm md:text-base cursor-pointer flex items-center justify-between">
                  What are credits and how do they work?
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="text-text-secondary text-sm mt-2">
                  Credits power AI features like optimization generation, Copilot conversations, and tool recommendations. Each action consumes a specific number of credits, which reset monthly (100 for Explorer, 1000 for Pro).
                </p>
              </details>
              
              <details className="group rounded-3xl p-4 md:p-6 border border-teal/15 shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] transition-all duration-300"
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: 'overlay',
                  backdropFilter: 'blur(8px) saturate(1.4)',
                }}
              >
                <summary className="font-semibold text-text-primary text-sm md:text-base cursor-pointer flex items-center justify-between">
                  Can I cancel my subscription anytime?
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="text-text-secondary text-sm mt-2">
                  Absolutely! You can cancel your Pro subscription anytime. You'll retain Pro access until the end of your billing period, then switch to the Explorer plan. No hassle, no hidden fees.
                </p>
              </details>

              <details className="group rounded-3xl p-4 md:p-6 border border-teal/15 shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] transition-all duration-300"
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: 'overlay',
                  backdropFilter: 'blur(8px) saturate(1.4)',
                }}
              >
                <summary className="font-semibold text-text-primary text-sm md:text-base cursor-pointer flex items-center justify-between">
                  Is my payment information secure?
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="text-text-secondary text-sm mt-2">
                  Yes, your payments are processed securely via Stripe, a trusted payment processor. We never store your payment details on our servers, ensuring top-tier security.
                </p>
              </details>

              <details className="group rounded-3xl p-4 md:p-6 border border-teal/15 shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] transition-all duration-300"
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: 'overlay',
                  backdropFilter: 'blur(8px) saturate(1.4)',
                }}
              >
                <summary className="font-semibold text-text-primary text-sm md:text-base cursor-pointer flex items-center justify-between">
                  Can I try Pro before committing?
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="text-text-secondary text-sm mt-2">
                  Start with our Explorer plan to test Lynor for free. If you love it, upgrade to Pro for more credits and advanced features. Not satisfied? Cancel anytime with ease.
                  <button
                    onClick={handleUpgradeToPro}
                    className="mt-2 text-teal font-medium hover:underline"
                  >
                    Try Pro now!
                  </button>
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes fade-scale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        /* Bouton principal avec effet verre brossé */
        .btn-primary {
          background: linear-gradient(
            135deg,
            rgba(0, 172, 193, 0.8) 0%,
            rgba(0, 131, 143, 0.7) 30%,
            rgba(0, 96, 100, 0.6) 60%,
            rgba(0, 69, 71, 0.5) 100%
          ),
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 0.5px,
            rgba(255, 255, 255, 0.03) 0.5px,
            rgba(255, 255, 255, 0.03) 1px
          );
          background-blend-mode: overlay;
          background-size: 300% 300%;
          color: white;
          font-weight: 600;
          text-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.3);
          box-shadow: 
            0 0.25rem 1rem rgba(0, 172, 193, 0.3),
            inset 0 0 0.375rem rgba(0, 172, 193, 0.2);
          backdrop-filter: blur(12px) saturate(1.6);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: warmGradient 6s ease-in-out infinite;
        }
        
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 147, 0, 0.6), transparent);
          transition: left 0.5s ease;
          z-index: 1;
        }
        
        .btn-primary:hover {
          transform: translateY(-0.125rem) scale(1.02);
          background: linear-gradient(
            135deg,
            rgba(255, 147, 0, 0.6) 0%,
            rgba(200, 100, 0, 0.5) 30%,
            rgba(0, 131, 143, 0.6) 60%,
            rgba(0, 69, 71, 0.5) 100%
          );
          background-size: 300% 300%;
          box-shadow: 
            0 0.75rem 2.5rem rgba(255, 147, 0, 0.4),
            0 0.375rem 1.25rem rgba(0, 131, 143, 0.3),
            inset 0 0.0625rem 0 rgba(255, 255, 255, 0.3),
            inset 0 0 0.625rem rgba(255, 147, 0, 0.4);
          animation-duration: 2s;
        }
        
        .btn-primary:hover::before {
          left: 100%;
        }
        
        .btn-primary:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 
            0 0.25rem 1rem rgba(255, 147, 0, 0.5),
            inset 0 0.125rem 0.25rem rgba(0, 0, 0, 0.1),
            inset 0 0 0.5rem rgba(0, 172, 193, 0.3);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          animation: none;
        }
        
        @keyframes warmGradient {
          0%, 100% { 
            background-position: 0% 50%;
          }
          50% { 
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}