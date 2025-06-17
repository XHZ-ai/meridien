import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';

interface ComingSoonModalProps {
  onClose: () => void;
}

export function ComingSoonModal({ onClose }: ComingSoonModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [userScrollY, setUserScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if on mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Capture scroll position when modal opens
  useEffect(() => {
    // Store current scroll position
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-white to-gray-50/90 rounded-[28px] p-5 md:p-6 max-w-md w-full mx-auto
          animate-fade-scale shadow-[0_10px_50px_rgba(0,0,0,0.1)] border border-white/70"
        style={{ 
          marginTop: `${Math.max(20, userScrollY + 50)}px`,
          marginBottom: '20px'
        }}
      >
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-button/10 to-button/5 
              border border-white/50 shadow-sm flex items-center justify-center group">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-button group-hover:scale-110 transition-transform" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-text-primary">Bientôt disponible</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/70 rounded-full transition-all
              hover:scale-105 active:scale-95"
          >
            <X className="w-4 h-4 md:w-5 md:h-5 text-text-secondary" />
          </button>
        </div>
        
        <div className="space-y-3 md:space-y-4">
          <p className="text-text-primary text-sm md:text-base leading-relaxed">
            {isMobile 
              ? 'Bientôt, Lynor Copilot vous guidera pour implémenter ces optimisations étape par étape.' 
              : 'Bientôt, vous pourrez exécuter ces optimisations avec Lynor Copilot - votre assistant IA qui vous guidera à travers chaque étape de mise en œuvre.'}
          </p>
          <p className="text-text-secondary text-xs md:text-sm leading-relaxed">
            {isMobile 
              ? 'Restez à l\'écoute pour cette fonctionnalité !' 
              : 'Restez à l\'écoute pour cette fonctionnalité qui vous aidera à tirer le meilleur parti de vos outils IA !'}
          </p>
          
          {/* Progress indicator */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-button to-indigo-500 rounded-full"></div>
          </div>
          
          <div className="text-xs text-center text-text-secondary mt-2">
            Déploiement prévu pour Q3 2025
          </div>
        </div>
      </div>
    </div>
  );
}