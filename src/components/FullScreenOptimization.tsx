import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Plus, Sparkles, ExternalLink } from 'lucide-react';
import { ComingSoonModal } from './ComingSoonModal';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { getToolLogo } from '../lib/logoUtils';

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  logo: string;
}

interface PersonalizationContext {
  title?: string;
  problem?: string;
  solution?: string;
  workflow_fit?: string;
  optimization_id?: string;
}

interface Session {
  user: {
    id: string;
  };
}

interface FullScreenOptimizationProps {
  tool: Tool;
  personalizationContext?: PersonalizationContext;
  onClose: () => void;
  onAddToOptimizations: () => Promise<void>;
  onExecute: (taskId: string) => Promise<void>;
  session: Session;
}

export function FullScreenOptimization({
  tool,
  personalizationContext,
  onClose,
  onAddToOptimizations,
  onExecute,
  session
}: FullScreenOptimizationProps) {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [userScrollY, setUserScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isAddingOptimization, setIsAddingOptimization] = useState(false);
  const [success, setSuccess] = useState(false);
  const [optimizationId, setOptimizationId] = useState<string | null>(null);
  const [optimization, setOptimization] = useState<PersonalizationContext | undefined>(personalizationContext);
  const navigate = useNavigate();
  
  
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
  
  // Capture scroll position when the modal opens and position modal accordingly (same logic as ToolModal)
  useEffect(() => {
    // Store current scroll position
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Position modal at user's current viewport
    if (modalRef.current) {
      // Set modal position relative to current scroll
      modalRef.current.style.top = `${scrollY + (isMobile ? 50 : 100)}px`;
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile]);

  const handleAddToOptimizations = async () => {
    try {
      setIsAddingOptimization(true);
      
      // Fetch the current session to ensure we have the latest data
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Authentication required. Please make sure you're logged in.");
      }
      
      // Defensive check for session and user ID
      if (!currentSession || !currentSession.user || !currentSession.user.id) {
        console.error("Session or user ID is missing");
        throw new Error("Authentication required. Please make sure you're logged in.");
      }
      
      const userId = currentSession.user.id;
      
      // First create task history record
      const { data: taskData, error: taskError } = await supabase
        .from('task_history')
        .insert([
          {
            user_id: userId,
            title: personalizationContext?.title || `Optimize your workflow with ${tool.name}`,
            name: tool.name,
            category: 'tool_optimization',
            difficulty_level: 'intermediate',
            execution_started: false,  // Set to false to prevent automatic execution
            problem: personalizationContext?.problem || '',
            description: personalizationContext?.solution || '',
            workflow_fit: personalizationContext?.workflow_fit || ''
          }
        ])
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task history:', taskError);
        throw taskError;
      }

      // Store the optimization ID
      setOptimizationId(taskData.id);

      // Then add to user optimizations
      const { error: optimizationError } = await supabase
        .from('user_optimizations')
        .insert([
          {
            user_id: userId,
            task_id: taskData.id,
            status: 'active'
          }
        ]);

      if (optimizationError) {
        console.error('Error adding to user optimizations:', optimizationError);
        throw optimizationError;
      }
      
      // Update the optimization object with the ID
      setOptimization({
        ...optimization,
        optimization_id: taskData.id
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/optimizations');
      }, 2000);
      return;
      
    } catch (error) {
      console.error("Error adding optimization:", error);
      setIsAddingOptimization(false);
      throw error;
    }
  };
  
  const handleExecute = async () => {
    try {
      // First, add the optimization to the user's list if not already added
      if (!personalizationContext?.optimization_id) {
        await onAddToOptimizations();
      }
      
      // If we have an optimization_id (either from before or just created), execute it
      if (personalizationContext?.optimization_id) {
        await onExecute(personalizationContext.optimization_id);
      } else {
        // This shouldn't happen if onAddToOptimizations works correctly,
        // but let's handle it just in case
        console.log("No optimization ID available to execute");
      }
    } catch (error) {
      console.error("Error executing optimization:", error);
    }
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[11000]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed left-1/2 -translate-x-1/2 z-[11001] w-full max-w-[800px] px-4 max-h-[90vh]"
        style={{ 
          top: `${Math.max(20, userScrollY + (isMobile ? 50 : 100))}px`,
          marginBottom: '20px'
        }}
      >
        <div 
          className="bg-white rounded-[28px] w-full overflow-hidden
            pointer-events-auto animate-fade-scale border border-gray-200 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-4 
            flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-8 bg-gradient-to-b from-[#00ACC1]/70 to-[#00ACC1]/30 rounded-full mr-2 hidden md:block"></span>
              <div>
                <span className="text-sm text-gray-400 uppercase tracking-wider font-medium block mb-0.5">Personalized Recommendation</span>
                <h2 className="text-lg md:text-xl font-bold text-text-primary">
                  {isMobile 
                    ? 'AI optimization ' 
                    : 'AI optimization, for your workflow'}
                </h2>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200
                bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm
                hover:border-gray-300 hover:shadow-md active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 md:p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
                {[...Array(3)].map((_, i) => (
                  <div key={i} 
                    className="absolute rounded-full bg-[#00ACC1]/5"
                    style={{
                      width: `${Math.random() * 100 + 40}px`,
                      height: `${Math.random() * 100 + 40}px`,
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animation: `float ${Math.random() * 10 + 15}s infinite linear`,
                      opacity: Math.random() * 0.3 + 0.1,
                    }}/>
                ))}
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 md:mb-5">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center">
                      {getToolLogo({
                        filename: tool.logo,
                        toolName: tool.name,
                        size: isMobile ? 32 : 40
                      })}
                    </div>
                    
                    <div>
                      <p className={`${isMobile ? 'text-xs' : 'text-xs md:text-sm'} text-text-secondary mb-0.5`}>AI Tool Recommended</p>
                      <p className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm md:text-base'} text-text-primary`}>{tool.name}</p>
                    </div>
                  </div>
                  
                  <a 
                    href={tool.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 px-2 py-1 md:px-3 md:py-2 bg-gradient-to-r from-white/90 to-teal-50/80 backdrop-blur-md
                      rounded-full text-xs font-medium text-[#00ACC1] hover:bg-teal-100/80 transition-all
                      border border-teal-200/50 hover:border-teal-300/70 shadow-sm hover:shadow`}
                  >
                    {isMobile ? 'Visit' : 'Visit Website'} 
                    <ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </a>
                </div>

                <div className={`${isMobile ? 'mb-3' : 'mb-5'}`}>
                  <h2 className={`${isMobile ? 'text-base' : 'text-xl md:text-2xl'} font-bold text-text-primary leading-tight`}>
                    {personalizationContext?.title || `Optimize your workflow with ${tool.name}`}
                  </h2>
                </div>

                <div className={`${isMobile ? 'space-y-3' : 'space-y-5'}`}>
                  <div className={`space-y-1 ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                    <h3 className={`${isMobile ? 'text-xs' : 'text-xs md:text-sm'} uppercase tracking-wider font-semibold text-[#00ACC1]/80`}>Context</h3>
                    <div className={`bg-gray-50/70 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-2.5' : 'p-4'} border border-gray-200/50 shadow-sm
                      flex items-start gap-3`}>
                      <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-400/30 flex-shrink-0"></div>
                      <p className={`text-text-primary ${isMobile ? 'text-xs leading-tight' : 'text-sm md:text-base leading-relaxed'}`}>
                        {personalizationContext?.problem || "Your current workflow could be optimized"}
                      </p>
                    </div>
                  </div>

                  <div className={`bg-gradient-to-br from-[#00ACC1]/[0.05] to-[#00ACC1]/[0.02] rounded-2xl ${isMobile ? 'p-2.5 md:p-4' : 'p-4 md:p-5'} border border-[#00ACC1]/10 shadow-md`}>
                    <h3 className={`${isMobile ? 'text-sm' : 'text-base md:text-lg'} font-medium text-text-primary ${isMobile ? 'mb-2' : 'mb-3'} flex items-center gap-2`}>
                      <Sparkles className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'} text-[#00ACC1]`} />
                      Solution
                    </h3>
                    <p className={`text-text-primary ${isMobile ? 'text-xs leading-tight' : 'text-sm md:text-base leading-relaxed'}`}>
                      {personalizationContext?.solution || `Use ${tool.name} to optimize your tasks and increase your productivity`}
                    </p>
                  </div>
                </div>

                <div className={`flex ${isMobile ? 'flex-col gap-2 pt-3 mt-3' : 'flex-col sm:flex-row gap-3 md:gap-4 pt-6 md:pt-7 mt-3'}`}>
                  <button
                    onClick={handleAddToOptimizations}
                    disabled={isAddingOptimization || success}
                    className={`flex-1 flex items-center justify-center gap-2 
                      ${isMobile ? 'px-3 py-2.5 text-xs' : 'px-4 py-3.5 md:px-5 md:py-4 text-sm md:text-base'} rounded-2xl 
                      ${success 
                        ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                        : 'bg-teal-50 text-[#00ACC1] border border-teal-200 hover:bg-teal-100 hover:border-teal-300'}
                      transition-all duration-300 shadow-sm hover:shadow
                      hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 disabled:hover:bg-teal-50`}
                  >
                    {success ? (
                      <>
                        <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 md:w-4.5 md:h-4.5'}`} />
                        <span>{isMobile ? 'Added!' : 'Added to my Optimizations!'}</span>
                      </>
                    ) : isAddingOptimization ? (
                      <>
                        <div className={`w-${isMobile ? '3' : '4'} h-${isMobile ? '3' : '4'} border-2 border-gray-300/30 border-t-gray-600 rounded-full animate-spin`} />
                        <span>{isMobile ? 'Adding...' : 'Adding in progress...'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 md:w-4.5 md:h-4.5'} text-[#00ACC1]`} />
                        <span>{isMobile ? 'Add' : 'Add to my optimizations'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExecute}
                    className={`flex-1 flex items-center justify-center gap-2
                      ${isMobile ? 'px-3 py-2.5 text-xs' : 'px-4 py-3.5 md:px-5 md:py-4 text-sm md:text-base'} rounded-2xl
                      bg-gradient-to-br from-[#00ACC1]/80 to-[#00838F]/60 text-white hover:from-[#00ACC1]/90 hover:to-[#00838F]/70
                      transition-all duration-300 font-medium shadow-md hover:shadow-lg
                      border border-[#00ACC1]/20 hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <Sparkles className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 md:w-4.5 md:h-4.5'}`} />
                    <span>{isMobile ? 'Execute' : 'Execute with Lynor Copilot'}</span>
                  </button>
                </div>
                
                {personalizationContext?.workflow_fit && (
                  <div className={`${isMobile ? 'hidden' : 'mt-4 md:mt-6 text-xs px-3 py-1.5'} inline-flex items-center rounded-full
                    bg-gradient-to-r from-teal-50 to-teal-100/50 border border-teal-200/50 shadow-sm`}>
                    <p className="text-[#00ACC1] font-medium">
                      {personalizationContext.workflow_fit}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showComingSoon && (
        <ComingSoonModal onClose={() => setShowComingSoon(false)} />
      )}
    </>
  );
}