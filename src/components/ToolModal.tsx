import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { ComingSoonModal } from './ComingSoonModal';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { getToolLogo } from '../lib/logoUtils';
import { generateToolOptimization } from '../lib/aiOptimizations';
import { Session } from '@supabase/supabase-js';
import { FullScreenOptimization } from './FullScreenOptimization';
import { ToolContextModal } from './ToolContextModal';
import { useCredits } from '../contexts/CreditContext';
import { deductCredits, CREDIT_COSTS } from '../lib/credits';
import { redirectToUpgrade } from '../lib/upgradeRedirect';
import { Toast } from './Toast';

interface Tool {
  id: number;
  name: string;
  description: string;
  category: string;
  url?: string;
  pricing?: string;
  logo?: string;
}

interface ToolModalProps {
  tool: Tool;
  onClose: () => void;
  onAddToTools: () => Promise<void>;
  session: Session;
}

export function ToolModal({ tool, onClose, onAddToTools, session }: ToolModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { hasEnoughCredits, refreshCredits, credits } = useCredits();
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [userScrollY, setUserScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [optimizationId, setOptimizationId] = useState<string | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [isCreatingOptimization, setIsCreatingOptimization] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'credit-deduction'; options?: any } | null>(null);

  // Check if on mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Capture scroll position when the modal opens and position modal accordingly
  useEffect(() => {
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    
    document.body.style.overflow = 'hidden';
    
    if (modalRef.current) {
      modalRef.current.style.top = `${scrollY + 100}px`;
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Fonction pour afficher le toast
  const showToast = (message: string, type: 'success' | 'error' | 'credit-deduction', options?: any) => {
    setToast({ message, type, options });
  };

  const handleAddToOptimizations = async () => {
    if (!optimization) return;
    
    try {
      setIsAdding(true);

      const { data: taskData, error: taskError } = await supabase
        .from('task_history')
        .insert([
          {
            user_id: session.user.id,
            title: optimization.title,
            name: tool.name,
            category: 'tool_optimization',
            difficulty_level: 'intermediate',
            execution_started: false,
            problem: optimization.problem,
            description: optimization.solution,
            workflow_fit: optimization.workflow_fit
          }
        ])
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task history:', taskError);
        throw taskError;
      }

      setOptimizationId(taskData.id);

      const { error: optimizationError } = await supabase
        .from('user_optimizations')
        .insert([
          {
            user_id: session.user.id,
            task_id: taskData.id,
            status: 'active'
          }
        ]);

      if (optimizationError) {
        console.error('Error adding to user optimizations:', optimizationError);
        throw optimizationError;
      }

      setOptimization({
        ...optimization,
        optimization_id: taskData.id
      });

      return;
      
    } catch (err) {
      console.error('Error adding optimization:', err);
      setError('Failed to add optimization. Please try again.');
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const handleExecuteOptimization = async (taskId: string): Promise<void> => {
    navigate(`/execute/${taskId}`);
  };

  const handleCreateOptimization = async (userContext?: string) => {
    try {
      console.log('🪙 Checking credits for tool optimization creation...');
      
      if (!hasEnoughCredits(CREDIT_COSTS.PERSONALIZED_GENERATION)) {
        redirectToUpgrade(navigate, {
          reason: 'insufficient-credits-tool-optimization',
          requiredCredits: CREDIT_COSTS.PERSONALIZED_GENERATION,
          currentCredits: credits?.monthly_credits || 0,
          toolName: tool.name,
          featureName: `${tool.name} Integration`
        });
        return;
      }

      setIsCreatingOptimization(true);
      setError(null);

      console.log('🪙 Deducting credits for tool optimization creation...');
      const creditResult = await deductCredits(
        session.user.id, 
        CREDIT_COSTS.PERSONALIZED_GENERATION,
        showToast,
        (trigger, requiredCredits, currentCredits) => {
          redirectToUpgrade(navigate, {
            reason: 'insufficient-credits-during-creation',
            requiredCredits,
            currentCredits,
            toolName: tool.name,
            featureName: `${tool.name} Integration`
          });
        }
      );
      
      if (!creditResult.success) {
        setIsCreatingOptimization(false);
        if (creditResult.message.includes('Insufficient credits')) {
          redirectToUpgrade(navigate, {
            reason: 'insufficient-credits-deduction-failed',
            requiredCredits: CREDIT_COSTS.PERSONALIZED_GENERATION,
            currentCredits: credits?.monthly_credits || 0,
            toolName: tool.name,
            featureName: `${tool.name} Integration`
          });
        }
        return;
      }

      await refreshCredits();

      const { data: profile, error: profileError } = await supabase
        .from('user_profile_ai')
        .select('profile_type, ai_level, daily_description')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      if (!profile) {
        setError('User profile not found. Please complete your profile setup first.');
        return;
      }

      const optimization = await generateToolOptimization(
        {
          name: tool.name,
          description: tool.description
        },
        {
          profile_type: profile.profile_type,
          ai_level: profile.ai_level,
          daily_description: profile.daily_description || '',
          user_context: userContext
        }
      );

      setOptimization({
        title: optimization.title,
        problem: optimization.problem,
        solution: optimization.solution,
        workflow_fit: optimization.workflow_fit,
        tool: tool
      });

    } catch (err) {
      console.error('Error generating optimization:', err);
      
      if (err instanceof Error && err.message.includes('Insufficient credits')) {
        redirectToUpgrade(navigate, {
          reason: 'insufficient-credits-error',
          requiredCredits: CREDIT_COSTS.PERSONALIZED_GENERATION,
          currentCredits: credits?.monthly_credits || 0,
          toolName: tool.name,
          featureName: `${tool.name} Integration`
        });
      } else {
        setError('Failed to generate optimization. Please try again.');
      }
    } finally {
      setIsCreatingOptimization(false);
      setShowContextModal(false);
    }
  };

  const handleShowContextModal = () => {
    if (!hasEnoughCredits(CREDIT_COSTS.PERSONALIZED_GENERATION)) {
      redirectToUpgrade(navigate, {
        reason: 'insufficient-credits-context-modal',
        requiredCredits: CREDIT_COSTS.PERSONALIZED_GENERATION,
        currentCredits: credits?.monthly_credits || 0,
        toolName: tool.name,
        featureName: `${tool.name} Integration`
      });
      return;
    }

    setShowContextModal(true);
  };

  const canCreateOptimization = hasEnoughCredits(CREDIT_COSTS.PERSONALIZED_GENERATION);

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
        className="fixed left-1/2 -translate-x-1/2 z-[10000] w-full max-w-[calc(100%-2rem)] sm:max-w-2xl px-4 max-h-[90vh]"
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
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Ombre légère pour la profondeur
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-teal/10 px-5 py-4 flex items-center justify-between"
            style={{
              background: '#ffffff', // Fond blanc pour l'en-tête
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', // Ombre subtile
            }}
          >
            <div className="flex items-center gap-4">
              {tool.logo ? (
                <div className="flex-shrink-0 flex items-center">
                  {getToolLogo({
                    filename: tool.logo,
                    toolName: tool.name,
                    size: 36
                  })}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
                  <div className="w-6 h-6 flex items-center justify-center text-teal">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              )}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-text-primary">{tool.name}</h2>
                <p className="text-text-secondary text-[0.6875rem] sm:text-xs">{tool.category}</p>
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
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-2.5 sm:p-4">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-text-primary mb-1.5">About</h3>
                <p className="text-text-secondary leading-relaxed text-[0.6875rem] sm:text-xs">{tool.description}</p>
              </div>

              {tool.pricing && (
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-text-primary mb-1.5">Pricing</h3>
                  <div className="inline-block px-3 py-1 bg-teal/10 text-teal rounded-full text-[0.6875rem] sm:text-xs">
                    {tool.pricing}
                  </div>
                </div>
              )}

              {tool.url && (
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-text-primary mb-1.5">Website</h3>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-teal hover:underline text-[0.6875rem] sm:text-sm"
                  >
                    {isMobile ? 'Visit site' : `Visit ${tool.name}`}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Create Optimization Button */}
            <div className="mt-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
                  <p className="text-red-600 text-[0.6875rem] sm:text-xs">{error}</p>
                </div>
              )}
              <button 
                onClick={canCreateOptimization ? handleShowContextModal : () => {
                  redirectToUpgrade(navigate, {
                    reason: 'insufficient-credits-button-click',
                    requiredCredits: CREDIT_COSTS.PERSONALIZED_GENERATION,
                    currentCredits: credits?.monthly_credits || 0,
                    toolName: tool.name,
                    featureName: `${tool.name} Integration`
                  });
                }}
                disabled={isGenerating || isCreatingOptimization}
                className={`w-full px-5 py-3 rounded-3xl transition-all duration-300 flex items-center justify-center gap-2
                  font-medium hover:scale-[1.02] active:scale-[0.98] border border-teal/20 min-w-[140px] sm:min-w-[200px]
                  disabled:opacity-70 disabled:hover:scale-100 disabled:hover:animate-none ${
                    canCreateOptimization && !isGenerating && !isCreatingOptimization
                      ? 'bg-gradient-to-br from-teal to-teal/80 text-white hover:from-teal/90 hover:to-teal/70 ' +
                        'hover:shadow-[0_8px_20px_rgba(0,172,193,0.5)] hover:animate-[pulse_1.5s_ease-in-out_infinite]'
                      : 'bg-gray-300 text-gray-500 cursor-pointer'
                  }`}
                style={{
                  backgroundImage: canCreateOptimization && !isGenerating && !isCreatingOptimization
                    ? `linear-gradient(135deg, rgba(0,172,193,0.8), rgba(0,69,71,0.5)),
                       url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`
                    : undefined,
                  backgroundBlendMode: canCreateOptimization && !isGenerating && !isCreatingOptimization ? 'overlay' : undefined,
                  backdropFilter: canCreateOptimization && !isGenerating && !isCreatingOptimization ? 'blur(14px)' : undefined,
                }}
              >
                {isGenerating || isCreatingOptimization ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="sm:hidden">Generating...</span>
                    <span className="hidden sm:inline">Generating optimization...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span className="sm:hidden">Get an opt.</span>
                    <span className="hidden sm:inline">Create an optimization with this tool</span>
                    {!canCreateOptimization && (
                      <span className="text-[0.6875rem] sm:text-xs">({CREDIT_COSTS.PERSONALIZED_GENERATION} credits)</span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tool Context Modal */}
      {showContextModal && (
        <ToolContextModal
          tool={tool}
          onClose={() => setShowContextModal(false)}
          onCreateOptimization={handleCreateOptimization}
          isCreating={isCreatingOptimization}
        />
      )}
      
      {/* Full Screen Optimization */}
      {optimization && (
        <FullScreenOptimization
          tool={{
            id: tool.id,
            name: tool.name,
            description: tool.description,
            url: tool.url || '',
            logo: tool.logo || ''
          }}
          personalizationContext={{
            title: optimization.title,
            problem: optimization.problem,
            solution: optimization.solution,
            workflow_fit: optimization.workflow_fit,
            optimization_id: optimizationId
          }}
          onClose={() => {
            setOptimization(null);
            onClose();
          }} 
          onAddToOptimizations={handleAddToOptimizations}
          onExecute={handleExecuteOptimization}
          session={session}
        />
      )}

      {/* Toast Message */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          options={toast.options}
          onClose={() => setToast(null)}
        />
      )}

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