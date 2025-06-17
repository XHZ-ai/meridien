import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, TrendingDown, Coins } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'credit-deduction';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  options?: {
    creditAmount?: number;
    remainingCredits?: number;
  };
}

export function Toast({ message, type, onClose, options }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Show toast
    setIsVisible(true);
    
    // Duration based on type
    const duration = type === 'credit-deduction' ? 4000 : 3000;
    
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const decrement = 100 / (duration / 50);
        return Math.max(0, prev - decrement);
      });
    }, 50);
    
    // Auto close
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onClose, type]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          progressColor: 'bg-green-500'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          progressColor: 'bg-red-500'
        };
      case 'credit-deduction':
        return {
          icon: TrendingDown,
          bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          progressColor: 'bg-gradient-to-r from-blue-500 to-indigo-500'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          progressColor: 'bg-blue-500'
        };
    }
  };

  const config = getToastConfig();
  const Icon = config.icon;

  return (
    <div className={`fixed top-4 right-4 z-[10000] transition-all duration-300 transform ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4 shadow-lg backdrop-blur-sm max-w-sm relative overflow-hidden`}>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-gray-200 w-full">
          <div 
            className={`h-1 ${config.progressColor} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex items-start gap-3">
          <div className={`${config.iconColor} flex-shrink-0 mt-0.5`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            {type === 'credit-deduction' && options ? (
              <div>
                <p className={`${config.textColor} font-medium text-sm mb-1`}>
                  Credits Used
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    <span className="text-red-600 font-medium">-{options.creditAmount}</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-blue-500" />
                    <span className={`${config.textColor} font-medium`}>{options.remainingCredits} remaining</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className={`${config.textColor} text-sm font-medium`}>
                {message}
              </p>
            )}
          </div>
          
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className={`${config.iconColor} hover:bg-white/50 rounded-full p-1 transition-colors flex-shrink-0`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}