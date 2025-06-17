import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  logo?: string;
  category?: string;
}

interface ToolContextModalProps {
  tool: Tool;
  onClose: () => void;
  onCreateOptimization: (context: string) => Promise<void>;
  isCreating: boolean;
}

export function ToolContextModal({ tool, onClose, onCreateOptimization, isCreating }: ToolContextModalProps) {
  const [context, setContext] = useState('');
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
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    
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
  }, [context]);

  const handleCreate = async () => {
    if (isCreating) return;
    await onCreateOptimization(context.trim());
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
        className="fixed left-1/2 -translate-x-1/2 z-[10000] w-full max-w-[calc(100%-2rem)] md:max-w-2xl px-4 max-h-[90vh]"
        style={{ 
          top: `${Math.max(20, userScrollY + 50)}px`,
          marginBottom: '20px'
        }}
      >
        <div 
          className="rounded-3xl w-full overflow-hidden pointer-events-auto animate-fade-scale border border-teal/15 hover:border-teal/25 hover:bg-gray-50 transition-all duration-300"
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff', // Fond blanc pur
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Ombre légère
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-8 border-b border-teal/10"
            style={{
              background: '#ffffff', // Fond blanc pour l'en-tête
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', // Ombre subtile
            }}
          >
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-text-primary">Create Personalized Optimization</h2>
                <p className="text-sm md:text-base text-text-secondary">Tell us about your specific needs with {tool.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-full 
                transition-all duration-300 ease-in-out border border-teal/20 shadow-sm 
                hover:shadow-[0_6px_16px_rgba(0,172,193,0.3)] hover:animate-[pulse_0.3s_ease-in-out] active:scale-95"
              style={{
                background: '#ffffff',
              }}
            >
              <X className="w-5 h-5 md:w-6 md:h-6 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Context Section */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-text-primary">Add Your Context (Optional)</h3>
              </div>
              <p className="text-sm md:text-base text-text-secondary mb-6 leading-relaxed">
                Share details about your workflow, constraints, or specific goals to get a more personalized optimization with {tool.name}.
              </p>
              
              <textarea
                ref={textareaRef}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={`e.g., I need to ${tool.name.toLowerCase()} for my small team, budget-friendly options preferred, must integrate with our existing tools...`}
                className="w-full px-6 py-4 border border-teal/15 rounded-2xl 
                  focus:border-teal/50 outline-none transition-all duration-300
                  text-base text-text-primary placeholder-text-secondary/60 resize-none
                  hover:border-teal/25 focus:shadow-[0_0_20px_rgba(0,172,193,0.08)]
                  min-h-[100px] max-h-[150px]"
                disabled={isCreating}
                style={{
                  background: '#ffffff', // Fond blanc pour la textarea
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)', // Ombre intérieure légère
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 md:p-8 border-t border-teal/10">
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="flex-1 px-6 py-3 border border-teal/15 rounded-3xl text-base
                  hover:bg-teal/10 transition-all duration-300 text-text-secondary hover:text-text-primary
                  disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
              
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 flex items-center justify-center gap-3 px-5 py-3 text-base
                  bg-gradient-to-br from-teal to-teal/80 text-white rounded-3xl
                  hover:from-teal/90 hover:to-teal/70 transition-all duration-300 
                  font-medium shadow-lg hover:shadow-[0_8px_20px_rgba(0,172,193,0.5)] 
                  hover:animate-[pulse_1.5s_ease-in-out_infinite] border border-teal/20 
                  hover:scale-[1.02] active:scale-[0.98] min-w-[140px] md:min-w-[200px]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:shadow-lg disabled:hover:animate-none"
                style={{
                  backgroundImage: isCreating ? undefined : 
                    `linear-gradient(135deg, rgba(0,172,193,0.8), rgba(0,69,71,0.5)),
                     url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: isCreating ? undefined : 'overlay',
                  backdropFilter: isCreating ? undefined : 'blur(14px)',
                }}
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="sm:hidden">Generating...</span>
                    <span className="hidden sm:inline">Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Get an opt.</span>
                    <span className="hidden sm:inline">Create Optimization</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
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