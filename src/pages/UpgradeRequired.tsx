import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { 
  ArrowLeft, 
  Zap, 
  Crown, 
  AlertTriangle, 
  Coins, 
  Check, 
  Loader,
  XCircle,
  Plus,
  CreditCard,
  Lock
} from 'lucide-react';
import { useCredits } from '../contexts/CreditContext';
import { useSubscription } from '../hooks/useSubscription';
import { redirectToCheckout, redirectToPortal, STRIPE_PRICES } from '../lib/stripe';
import { Toast } from '../components/Toast';

interface UpgradeRequiredProps {
  session: Session;
}

interface UpgradeReason {
  reason: string;
  requiredCredits: number;
  currentCredits: number;
  featureName?: string;
  toolName?: string;
  optimizationTitle?: string;
}

export function UpgradeRequired({ session }: UpgradeRequiredProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { credits } = useCredits();
  const { subscription, isPro, refreshSubscription } = useSubscription(session);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Récupérer les informations de redirection
  const upgradeInfo = location.state as UpgradeReason | null;

  // 🎯 Logique des valeurs exacte
  const requiredCredits = upgradeInfo?.requiredCredits || 0;
  const currentCredits = upgradeInfo?.currentCredits || credits?.monthly_credits || 0;

  // Debug: Log des valeurs
  useEffect(() => {
    console.log('UpgradeInfo:', upgradeInfo);
    console.log('Credits:', credits);
    console.log('Required Credits:', requiredCredits);
    console.log('Current Credits:', currentCredits);
    console.log('Deficit:', requiredCredits - currentCredits);
  }, [upgradeInfo, credits, requiredCredits, currentCredits]);

  useEffect(() => {
    if (isPro) {
      navigate(-1);
    }
  }, [isPro, navigate]);

  const getActionMessage = () => {
    if (!upgradeInfo?.reason) {
      return "perform this action";
    }
    const { reason, toolName } = upgradeInfo;
    switch (reason) {
      case 'insufficient-credits-optimization':
      case 'insufficient-credits-during-operation':
      case 'insufficient-credits-deduction-failed':
      case 'insufficient-credits-button-click':
        return "detect an optimization";
      case 'insufficient-credits-tool-optimization':
      case 'insufficient-credits-during-creation':
      case 'insufficient-credits-context-modal':
        return toolName ? `create a ${toolName} optimization` : "create an AI optimization";
      case 'insufficient-credits-adaptation':
      case 'insufficient-credits-during-adaptation':
        return "adapt an optimization";
      case 'insufficient-credits-copilot':
        return "use Copilot";
      default:
        return "perform this action";
    }
  };

  const getContextualDescription = () => {
    if (!upgradeInfo?.reason) {
      return "You need more credits to access this feature.";
    }
    const { reason, toolName } = upgradeInfo;
    switch (reason) {
      case 'insufficient-credits-optimization':
      case 'insufficient-credits-during-operation':
      case 'insufficient-credits-deduction-failed':
      case 'insufficient-credits-button-click':
        return "Our AI finds optimization opportunities using advanced ML.";
      case 'insufficient-credits-tool-optimization':
      case 'insufficient-credits-during-creation':
      case 'insufficient-credits-context-modal':
        return toolName ? `Create a custom ${toolName} workflow tailored to you.` : "Create a custom AI workflow tailored to you.";
      case 'insufficient-credits-adaptation':
      case 'insufficient-credits-during-adaptation':
        return "Personalize shared optimizations with AI.";
      case 'insufficient-credits-copilot':
        return "Get step-by-step AI guidance with Copilot.";
      default:
        return "You need more credits to access this feature.";
    }
  };

  const handleUpgradeToPro = async () => {
    if (!session?.user) {
      setToast({ message: 'Please sign in to upgrade', type: 'error' });
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
      console.error('Error upgrading:', error);
      setToast({ message: 'Checkout failed. Try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyMoreCredits = () => {
    setToast({ message: 'Credit purchase coming soon! Upgrade to Pro for now.', type: 'error' });
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.customer_id) {
      setToast({ message: 'No subscription found', type: 'error' });
      return;
    }
    try {
      setIsProcessing(true);
      await redirectToPortal(subscription.customer_id);
    } catch (error) {
      console.error('Error opening portal:', error);
      setToast({ message: 'Portal failed. Try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const actionMessage = getActionMessage();
  const contextualDescription = getContextualDescription();

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 md:px-8 lg:px-16 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-20 animate-fade-in">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300 hover:scale-110"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#004547]" />
            </button>
            <h1 className="text-2xl font-bold text-[#004547]">
              Low Credits
            </h1>
          </div>

          {/* 🚀 Main Message */}
          <div className="mb-20 text-center animate-fade-in">
            <div className="bg-white rounded-xl p-10 shadow-md border border-[#00ACC1]/10">
              <div className="w-16 h-16 bg-[#00ACC1] rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-[#004547] mb-4 leading-tight">
                Low Credits for {actionMessage}
              </h2>
              <p className="text-2xl font-semibold text-[#00ACC1] mb-6">
                Get Pro for 1000 Credits/Month
              </p>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                {contextualDescription}
              </p>
              <button
                onClick={handleUpgradeToPro}
                disabled={isProcessing}
                className={`w-full max-w-md mx-auto px-8 py-5 bg-[#00ACC1] text-white rounded-xl text-xl font-bold
                  transition-all duration-300 hover:bg-[#00838F] hover:scale-[1.03] active:scale-[0.98]
                  flex items-center justify-center gap-3 shadow-md
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'animate-pulse-subtle'}`}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-6 h-6" />
                    Get Pro Now - $19/mo
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-[#00ACC1]" />
                Secure Checkout • 30-Day Guarantee
              </p>
            </div>
          </div>

          {/* 🚀 Credit Status */}
          <div className="mb-20 animate-fade-in">
            <div className="bg-white rounded-xl p-6 shadow-md border border-[#00ACC1]/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Coins className="w-8 h-8 text-[#00ACC1]" />
                <div>
                  <p className="text-lg font-medium text-gray-600">You Have</p>
                  <p className="text-4xl font-bold text-[#004547]">{currentCredits}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-lg font-medium text-gray-600">Required</p>
                  <p className="text-4xl font-bold text-red-600">{requiredCredits}</p>
                </div>
              </div>
              <div className="bg-red-50 rounded-full px-6 py-3 flex items-center gap-2 animate-pulse-subtle">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <p className="text-2xl font-bold text-red-600">
                  Need {requiredCredits - currentCredits}
                </p>
              </div>
            </div>
          </div>

          {/* 🚀 Pro Offer */}
          <div className="mb-20 animate-fade-in">
            <div className="bg-white rounded-xl p-8 shadow-md border border-[#00ACC1]/10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00ACC1] text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse-subtle">
                <Zap className="w-4 h-4" />
                Limited Offer
              </div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#00ACC1] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-[#004547] mb-3">Go Pro</h3>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-5xl font-bold text-[#00ACC1]">$19</span>
                  <span className="text-2xl text-gray-600">/mo</span>
                </div>
                <p className="text-2xl text-[#00ACC1] font-semibold">1000 Credits/Month</p>
                <p className="text-lg text-gray-600 mt-2">{Math.round(1000 / Math.max(currentCredits, 1))}x More Credits!</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[
                  '1000 credits monthly',
                  'All AI optimizations',
                  'Priority Copilot',
                  'Advanced personalization'
                ].map((feature, index) => (
                  <div key={feature} className="flex items-center gap-3">
                    <Check className="w-6 h-6 text-[#00ACC1]" />
                    <span className="text-lg text-[#004547]">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpgradeToPro}
                disabled={isProcessing}
                className={`w-full px-8 py-5 bg-[#00ACC1] text-white rounded-xl text-xl font-bold
                  transition-all duration-300 hover:bg-[#00838F] hover:scale-[1.03] active:scale-[0.98]
                  flex items-center justify-center gap-3 shadow-md
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'animate-pulse-subtle'}`}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-6 h-6" />
                    Get Pro Now
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4 text-center flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-[#00ACC1]" />
                Trusted by 10,000+ users • 30-Day Guarantee
              </p>
            </div>
          </div>

          {/* 🚀 Buy Credits */}
          <div className="mb-20 animate-fade-in">
            <div className="bg-white rounded-xl p-6 shadow-md border border-[#00ACC1]/10 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#00ACC1]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-[#00ACC1]" />
                </div>
                <h3 className="text-2xl font-bold text-[#004547] mb-2">Buy Credits</h3>
                <p className="text-lg text-gray-600">One-time purchase</p>
              </div>
              <div className="space-y-4 mb-6">
                {[
                  { credits: 50, price: 9, desc: 'Occasional use' },
                  { credits: 100, price: 15, desc: 'Great value' },
                  { credits: 200, price: 25, desc: 'Best value', highlight: true }
                ].map((option, index) => (
                  <div key={option.credits} 
                    className={`flex items-center justify-between p-3 rounded-lg
                      ${option.highlight ? 'bg-[#00ACC1]/10 border border-[#00ACC1]/20' : 'bg-gray-50'}`}>
                    <div>
                      <span className={`text-lg font-semibold ${option.highlight ? 'text-[#00ACC1]' : 'text-[#004547]'}`}>
                        {option.credits} Credits
                      </span>
                      <p className="text-sm text-gray-600">{option.desc}</p>
                    </div>
                    <span className={`text-lg font-bold ${option.highlight ? 'text-[#00ACC1]' : 'text-[#004547]'}`}>
                      ${option.price}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleBuyMoreCredits}
                className="w-full px-6 py-4 bg-white border-2 border-[#00ACC1] text-[#00ACC1] rounded-xl text-lg font-semibold
                  transition-all duration-300 hover:bg-[#00ACC1]/10 hover:scale-[1.03] active:scale-[0.98]
                  flex items-center justify-center gap-3"
              >
                <CreditCard className="w-6 h-6" />
                Buy Credits
              </button>
              <p className="text-sm text-gray-500 mt-4 text-center">
                Credits never expire
              </p>
            </div>
          </div>

          {/* 🚀 Subscription Management */}
          {isPro && (
            <div className="mb-20 animate-fade-in">
              <div className="bg-white rounded-xl p-6 shadow-md border border-[#00ACC1]/10 max-w-xl mx-auto">
                <h4 className="text-2xl font-bold text-[#004547] mb-4 text-center">Pro Member</h4>
                <p className="text-lg text-gray-600 mb-6 text-center">
                  Manage your subscription.
                </p>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-gray-100 text-[#004547] rounded-xl text-lg font-semibold
                    transition-all duration-300 hover:bg-gray-200 hover:scale-[1.03] active:scale-[0.98]
                    flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Manage Subscription
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          className="animate-fade-in"
        />
      )}

      {/* Styles */}
      <style jsx>{`
        /* CTA Button */
        .btn-primary {
          background: #00ACC1;
          color: white;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 172, 193, 0.2);
          transition: all 0.3s ease;
        }
        .btn-primary:hover:not(:disabled) {
          background: #00838F;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(0, 172, 193, 0.3);
        }
        .btn-primary:active:not(:disabled) {
          transform: scale(0.98);
          box-shadow: 0 2px 8px rgba(0, 172, 193, 0.2);
        }

        /* Animations */
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }

        /* Responsive */
        @media (max-width: 768px) {
          .text-6xl { font-size: 2.5rem; }
          .text-5xl { font-size: 2.25rem; }
          .text-4xl { font-size: 2rem; }
          .text-3xl { font-size: 1.75rem; }
          .text-2xl { font-size: 1.25rem; }
          .text-xl { font-size: 1rem; }
          .text-lg { font-size: 0.875rem; }
        }
      `}</style>
    </div>
  );
}