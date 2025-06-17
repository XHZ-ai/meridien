import React, { useState, useEffect } from 'react';
import { Coins, Calendar, AlertTriangle, TrendingDown, Zap, Crown } from 'lucide-react';
import { useCredits } from '../contexts/CreditContext';
import { formatCredits, getDaysUntilReset } from '../lib/credits';

interface CreditDisplayProps {
  variant?: 'compact' | 'full' | 'navbar';
  className?: string;
  showAnimation?: boolean;
  onUpgradeClick?: () => void;
}

export function CreditDisplay({ 
  variant = 'compact', 
  className = '', 
  showAnimation = false,
  onUpgradeClick 
}: CreditDisplayProps) {
  const { credits, isLoading } = useCredits();
  const [previousCredits, setPreviousCredits] = useState<number | null>(null);
  const [showDeductionAnimation, setShowDeductionAnimation] = useState(false);
  const [deductedAmount, setDeductedAmount] = useState(0);

  // Détecter les changements de crédits pour l'animation
  useEffect(() => {
    if (credits && previousCredits !== null && credits.monthly_credits < previousCredits) {
      const deducted = previousCredits - credits.monthly_credits;
      setDeductedAmount(deducted);
      setShowDeductionAnimation(true);
      
      // Arrêter l'animation après 3 secondes
      setTimeout(() => {
        setShowDeductionAnimation(false);
        setDeductedAmount(0);
      }, 3000);
    }
    
    if (credits) {
      setPreviousCredits(credits.monthly_credits);
    }
  }, [credits?.monthly_credits, previousCredits]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!credits) {
    return (
      <div className={`flex items-center gap-2 text-red-500 ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm">Credits unavailable</span>
      </div>
    );
  }

  // ✅ DÉTERMINER LE TYPE D'UTILISATEUR ET LES SEUILS
  const isPro = credits.plan_type === 'pro' || credits.monthly_credits === 1000;
  const maxCredits = isPro ? 1000 : 100;
  const lowThreshold = isPro ? 200 : 20; // 20% du total
  const criticalThreshold = isPro ? 50 : 3; // 5% du total pour Pro, 3 pour Explorer
  
  const isLowCredits = credits.monthly_credits <= lowThreshold;
  const isCriticalCredits = credits.monthly_credits <= criticalThreshold;
  const daysUntilReset = getDaysUntilReset(credits.last_credit_reset);

  // Navbar variant - compact pour la navigation
  if (variant === 'navbar') {
    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        {/* Animation de déduction */}
        {showDeductionAnimation && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>-{deductedAmount}</span>
            </div>
          </div>
        )}
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
          isCriticalCredits 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : isLowCredits 
              ? 'bg-amber-100 text-amber-700 border border-amber-200'
              : isPro
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
        } ${showDeductionAnimation ? 'animate-pulse scale-105' : ''}`}>
          {isPro ? (
            <Crown className="w-4 h-4 text-purple-500" />
          ) : (
            <Coins className={`w-4 h-4 ${
              isCriticalCredits ? 'text-red-500' : 
              isLowCredits ? 'text-amber-500' : 'text-gray-500'
            }`} />
          )}
          <span className="text-sm font-medium">{credits.monthly_credits}</span>
          
          {isCriticalCredits && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          
          {/* Bouton upgrade pour crédits faibles */}
          {isLowCredits && !isPro && onUpgradeClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpgradeClick();
              }}
              className="ml-1 p-1 hover:bg-white/50 rounded-full transition-colors"
              title="Upgrade to Pro"
            >
              <Crown className="w-3 h-3 text-blue-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        {/* Animation de déduction */}
        {showDeductionAnimation && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>-{deductedAmount}</span>
            </div>
          </div>
        )}
        
        <div className={`transition-all duration-300 ${showDeductionAnimation ? 'animate-pulse scale-105' : ''}`}>
          {isPro ? (
            <Crown className="w-4 h-4 text-purple-500" />
          ) : (
            <Coins className={`w-4 h-4 ${
              isCriticalCredits ? 'text-red-500' : 
              isLowCredits ? 'text-amber-500' : 'text-gray-500'
            }`} />
          )}
        </div>
        <span className={`text-sm font-medium transition-colors duration-300 ${
          isCriticalCredits ? 'text-red-600' : 
          isLowCredits ? 'text-amber-600' : 
          isPro ? 'text-purple-600' : 'text-gray-700'
        } ${showDeductionAnimation ? 'animate-pulse' : ''}`}>
          {credits.monthly_credits}
        </span>
        
        {isCriticalCredits && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
        
        {/* Bouton upgrade pour crédits faibles */}
        {isLowCredits && !isPro && onUpgradeClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick();
            }}
            className="ml-1 p-1 hover:bg-blue-50 rounded-full transition-colors"
            title="Upgrade to Pro"
          >
            <Crown className="w-3 h-3 text-blue-500" />
          </button>
        )}
      </div>
    );
  }

  // Full variant - affichage détaillé
  return (
    <div className={`relative bg-white rounded-xl p-4 border border-gray-200 shadow-sm transition-all duration-300 ${
      showDeductionAnimation ? 'ring-2 ring-red-200 shadow-lg' : ''
    } ${className}`}>
      
      {/* Animation de déduction globale */}
      {showDeductionAnimation && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            <span>{deductedAmount} credits used</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg transition-all duration-300 ${
            isCriticalCredits 
              ? 'bg-red-100 text-red-600' 
              : isLowCredits 
                ? 'bg-amber-100 text-amber-600'
                : isPro
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-gray-100 text-gray-600'
          } ${showDeductionAnimation ? 'animate-pulse scale-110' : ''}`}>
            {isPro ? <Crown className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
          </div>
          <h3 className="font-semibold text-gray-800">
            {isPro ? 'Pro Credits' : 'Monthly Credits'}
          </h3>
        </div>
        
        {isCriticalCredits ? (
          <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span>Critical</span>
          </div>
        ) : isLowCredits ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>Low</span>
            </div>
            {!isPro && onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs
                  hover:bg-blue-200 transition-colors"
              >
                <Crown className="w-3 h-3" />
                <span>Upgrade</span>
              </button>
            )}
          </div>
        ) : isPro ? (
          <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs">
            <Crown className="w-3 h-3" />
            <span>Pro</span>
          </div>
        ) : null}
      </div>
      
      <div className="space-y-4">
        {/* Barre de progression améliorée */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Remaining</span>
            <span className={`font-bold text-lg transition-all duration-300 ${
              isCriticalCredits ? 'text-red-600' : 
              isLowCredits ? 'text-amber-600' : 
              isPro ? 'text-purple-600' : 'text-gray-800'
            } ${showDeductionAnimation ? 'animate-pulse scale-110' : ''}`}>
              {formatCredits(credits.monthly_credits)}
            </span>
          </div>
          
          <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            {/* Barre de progression avec gradient */}
            <div 
              className={`h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                isCriticalCredits 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : isLowCredits 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                    : isPro
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
              } ${showDeductionAnimation ? 'animate-pulse' : ''}`}
              style={{ width: `${Math.max(5, (credits.monthly_credits / maxCredits) * 100)}%` }}
            >
              {/* Effet de brillance */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                animate-[shimmer_2s_infinite] opacity-60" />
            </div>
            
            {/* Indicateur de déduction */}
            {showDeductionAnimation && (
              <div className="absolute top-0 right-0 h-3 bg-red-300 animate-pulse"
                style={{ width: `${(deductedAmount / maxCredits) * 100}%` }} />
            )}
          </div>
          
          {/* Indicateurs de seuils */}
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0</span>
            <span className="text-amber-500">{lowThreshold}</span>
            <span>{maxCredits}</span>
          </div>
        </div>
        
        {/* Informations de reset */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}</span>
          
          {daysUntilReset <= 3 && (
            <div className="ml-auto flex items-center gap-1 text-blue-600">
              <Zap className="w-3 h-3" />
              <span className="text-xs font-medium">Soon!</span>
            </div>
          )}
        </div>
        
        {/* Messages d'alerte avec boutons upgrade */}
        {isCriticalCredits && !isPro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Critical: Very low credits</span>
              </div>
              {onUpgradeClick && (
                <button
                  onClick={onUpgradeClick}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors"
                >
                  Upgrade Now
                </button>
              )}
            </div>
          </div>
        )}
        
        {isLowCredits && !isCriticalCredits && !isPro && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Running low on credits</span>
              </div>
              {onUpgradeClick && (
                <button
                  onClick={onUpgradeClick}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Crown className="w-3 h-3" />
                  <span>Upgrade</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}