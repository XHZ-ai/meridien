import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Brain, ExternalLink, LightbulbIcon, MessagesSquare, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getToolLogo } from '../lib/logoUtils';

interface OptimizationDetailsModalProps {
  problem: string;
  solution: string;
  workflow_fit: string; // Conservé dans l'interface mais non utilisé
  toolName: string;
  url?: string;
  onClose: () => void;
  onExecute: () => void;
  hasConversation?: boolean;
}

export function OptimizationDetailsModal({
  problem,
  solution,
  workflow_fit,
  toolName,
  url,
  onClose,
  onExecute,
  hasConversation = false
}: OptimizationDetailsModalProps) {
  const navigate = useNavigate();
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

  // Capture scroll position when the modal opens and position modal accordingly
  useEffect(() => {
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] p-2 sm:p-4"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed left-1/2 -translate-x-1/2 z-[201] w-full max-w-[90%] sm:max-w-[calc(100%-2rem)] md:max-w-md px-2 sm:px-4 max-h-[90vh] sm:max-h-[85vh] md:max-h-[80vh]"
        style={{ 
          top: `${Math.max(10, userScrollY + 20)}px`,
          marginBottom: '10px'
        }}
      >
        <div 
          className="rounded-2xl sm:rounded-3xl w-full overflow-hidden pointer-events-auto animate-fade-scale border border-teal/15 hover:border-teal/25 hover:bg-gray-50 transition-all duration-300 flex flex-col"
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header with tool info and close button */}
          <div className="flex items-center justify-between p-2 sm:p-4 md:p-6 border-b border-teal/10"
            style={{
              background: '#ffffff',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center">
                {getToolLogo({
                  toolName,
                  size: isMobile ? 24 : 36
                })}
              </div>
              
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-text-secondary mb-1`}>Outil IA</p>
                <p className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'} text-text-primary`}>{toolName}</p>
              </div>
            </div>
              
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2.5 hover:bg-gray-100 rounded-full 
                transition-all duration-300 ease-in-out border border-teal/20 shadow-sm 
                hover:shadow-[0_6px_16px_rgba(0,172,193,0.3)] hover:animate-[pulse_0.3s_ease-in-out] active:scale-95"
              style={{
                background: '#ffffff',
              }}
            >
              <X className="w-4 sm:w-5 h-4 sm:h-5 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className={`${isMobile ? 'space-y-2 p-2' : 'space-y-4 p-3 sm:p-5 md:p-7'} flex-grow overflow-y-auto`}>
            {/* Problem Statement */}
            <div className="space-y-1.5">
              <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-wider font-semibold text-teal/80`}>Contexte</h3>
              <div className="rounded-xl p-2 sm:p-3 md:p-4 border border-teal/15 shadow-md"
                style={{
                  background: '#ffffff',
                  boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-400/30 flex-shrink-0"></div>
                  <p className={`text-text-primary ${isMobile ? 'text-sm leading-normal' : 'text-base leading-relaxed'}`}>
                    {problem || "Votre workflow actuel pourrait être optimisé"}
                  </p>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="rounded-xl p-2 sm:p-3 md:p-4 border border-teal/15 shadow-md"
              style={{
                background: '#ffffff',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.05)',
              }}
            >
              <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-text-primary mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3`}>
                <LightbulbIcon className={`${isMobile ? 'w-3 sm:w-4 h-3 sm:h-4' : 'w-5 h-5'} text-teal`} />
                Solution
              </h3>
              <p className={`text-text-primary ${isMobile ? 'text-sm leading-normal' : 'text-base leading-relaxed'}`}>
                {solution || `Utiliser ${toolName} pour optimiser votre workflow et augmenter votre productivité`}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`${isMobile ? 'mt-2 p-2' : 'mt-3 sm:mt-4 p-3 sm:p-5 md:p-7'} border-t border-teal/10 flex flex-col gap-3 sm:gap-4`}>
            <button
              onClick={onExecute}
              className={`w-full ${isMobile ? 'px-2 py-1.5' : 'px-3 sm:px-5 py-2 sm:py-3'} bg-gradient-to-br from-teal to-teal/80 text-white rounded-2xl sm:rounded-3xl
                hover:from-teal/90 hover:to-teal/70 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2
                font-medium shadow-md hover:shadow-lg hover:shadow-[0_8px_20px_rgba(0,172,193,0.5)] border border-teal/20
                hover:scale-[1.02] active:scale-[0.98] group 
                ${isMobile ? 'text-sm' : 'text-base'} min-w-[120px] sm:min-w-[140px] md:min-w-[200px]`}
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(0,172,193,0.8), rgba(0,69,71,0.5))`,
                transition: 'all 0.3s ease-in-out',
              }}
            >
              {hasConversation ? (
                <>
                  <span className="sm:hidden">Continue</span>
                  <span className="hidden sm:inline">Continue with Copilot</span>
                  <MessagesSquare className={`${isMobile ? 'w-3 sm:w-4 h-3 sm:h-4' : 'w-5 h-5'} transition-transform duration-300 
                    group-hover:scale-110`} />
                </>
              ) : (
                <>
                  <span className="sm:hidden">Execute</span>
                  <span className="hidden sm:inline">Execute with Copilot</span>
                  <Rocket className={`${isMobile ? 'w-3 sm:w-4 h-3 sm:h-4' : 'w-5 h-5'} transition-transform duration-300 
                    group-hover:scale-110`} />
                </>
              )}
            </button>
            
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 sm:gap-2 text-text-secondary hover:text-teal hover:underline
                  transition-colors duration-300 text-xs sm:text-sm md:text-base mt-1 sm:mt-2"
              >
                <span>Visiter {toolName}</span>
                <ExternalLink className="w-3 sm:w-4 h-3 sm:h-4 md:w-5 md:h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Styles intégrés pour animations */}
      <style jsx>{`
        @keyframes fade-scale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}