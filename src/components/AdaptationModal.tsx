import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface PublicOptimization {
  id: string;
  title: string;
  problem: string;
  solution: string;
  workflow_fit: string;
  tool: {
    id: number;
    name: string;
    logo: string;
    url: string;
  };
}

interface AdaptationModalProps {
  optimization: PublicOptimization;
  onClose: () => void;
  onAdapt: (comment: string) => Promise<void>;
  isAdapting: boolean;
}

export function AdaptationModal({ optimization, onClose, onAdapt, isAdapting }: AdaptationModalProps) {
  const [comment, setComment] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [userScrollY, setUserScrollY] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Capture scroll position and prevent background scrolling
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [comment]);

  const handleAdapt = async () => {
    if (isAdapting) return;
    await onAdapt(comment.trim());
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed left-1/2 -translate-x-1/2 z-[10000] w-full max-w-lg md:max-w-2xl px-4 max-h-[90vh]"
        style={{ 
          top: `${Math.max(20, userScrollY + 50)}px`,
          marginBottom: '20px'
        }}
      >
        <div 
          className="bg-white rounded-[24px] w-full overflow-hidden
            pointer-events-auto animate-fade-scale border border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img 
                src="/lynor-logo.png" 
                alt="Lynor Logo"
                className="w-10 h-10 md:w-12 md:h-12 object-contain transform transition-all duration-300 hover:scale-105"
              />
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-text-primary">Adapt to Your Workflow</h2>
                <p className="text-sm md:text-base text-text-secondary">Personalize this optimization for your needs</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 
                transform hover:scale-110 active:scale-95 hover:rotate-90"
            >
              <X className="w-5 h-5 md:w-6 md:h-6 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6 md:space-y-8">
            {/* Context Section */}
            <div className="transform transition-all duration-500 hover:translate-y-[-2px]">
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-text-primary mb-2
                  bg-gradient-to-r from-text-primary to-button bg-clip-text">
                  Add Your Context (Optional)
                </h3>
              </div>
              <p className="text-base text-text-secondary mb-6 leading-relaxed
                transition-colors duration-300 hover:text-text-primary/80">
                Tell us about your specific needs, constraints, or preferences to get a more personalized adaptation.
              </p>
              
              <div className="relative group">
                <textarea
                  ref={textareaRef}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g., I work with a small team, need something budget-friendly, prefer tools that integrate with Slack..."
                  className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[20px] outline-none
                    text-base text-text-primary placeholder-text-secondary/60 resize-none
                    min-h-[100px] max-h-[150px] transform transition-all duration-500
                    hover:translate-y-[-2px] focus:translate-y-[-3px] focus:scale-[1.01]
                    hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] focus:shadow-[0_12px_35px_rgba(59,130,246,0.15)]
                    bg-gradient-to-br from-gray-50/50 to-white hover:from-gray-50/80 focus:from-blue-50/30"
                  disabled={isAdapting}
                />
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-button/3 via-transparent to-button/3 
                  opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none
                  transform scale-95 group-hover:scale-100" />
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-button/8 via-transparent to-purple-500/8 
                  opacity-0 group-focus-within:opacity-100 transition-all duration-700 pointer-events-none
                  transform scale-90 group-focus-within:scale-100" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 md:p-8 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-transparent">
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isAdapting}
                className="flex-1 px-6 py-3 md:py-4 border border-gray-200 rounded-[20px] text-base
                  hover:bg-gray-50 transition-all duration-300 text-text-secondary hover:text-text-primary
                  disabled:opacity-50 disabled:cursor-not-allowed font-medium
                  transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-md
                  hover:border-gray-300"
              >
                Cancel
              </button>
              
              <button
                onClick={handleAdapt}
                disabled={isAdapting}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-3 md:py-4 text-base
                  bg-gradient-to-br from-button to-button/90 text-white rounded-[20px]
                  hover:from-button/90 hover:to-button/80 transition-all duration-300 
                  font-medium shadow-lg hover:shadow-xl border border-button/20 
                  transform hover:scale-[1.05] active:scale-[0.95]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent 
                  translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {isAdapting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adapting...</span>
                  </>
                ) : (
                  <>
                    <span>Adapt for Me</span>
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>


    </>
  );
}