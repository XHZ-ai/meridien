import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { ArrowRight, Sparkles, Brain, Search, Zap } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { FullScreenOptimization } from '../components/FullScreenOptimization';
import { GPTPromptConnection } from '../components/GPTPromptConnection';
import { PublicOptimizationsFeed } from '../components/PublicOptimizationsFeed';
import { useCredits } from '../contexts/CreditContext';
import { deductCredits, CREDIT_COSTS, checkSufficientCredits } from '../lib/credits';
import { redirectToUpgrade } from '../lib/upgradeRedirect';
import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/Toast';
import { findSimilarTools } from '../lib/semanticMatching';
import { generateToolOptimization } from '../lib/aiOptimizations';

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  logo?: string;
  category?: string;
  embedding?: number[];
}

interface Optimization {
  title: string;
  problem: string;
  solution: string;
  workflow_fit: string;
  tool: Tool;
  optimization_id?: string;
}

interface HomeProps {
  session: Session;
}

const StepAnimation = ({ currentStep, stepText, userScrollY }: { currentStep: number; stepText: string; userScrollY: number }) => {
  const progressPercentage = (currentStep / 3) * 100;

  const getLoaderColor = (step: number) => {
    switch (step) {
      case 1: return '#3b82f6'; // blue
      case 2: return '#10b981'; // green
      case 3: return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center p-4">
      <div 
        className="bg-white rounded-[24px] p-8 max-w-md w-full mx-auto shadow-xl border border-gray-100"
        style={{ 
          marginTop: `${Math.max(20, userScrollY + 50)}px`,
          marginBottom: '20px'
        }}
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Étapes */}
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 
                    ${step <= currentStep ? 'bg-gray-800 scale-105' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-2">{currentStep}/3</span>
          </div>

          {/* Cercle loader animé */}
          <div className="w-10 h-10 flex items-center justify-center">
            <svg className="w-10 h-10 animate-spin-loader" viewBox="0 0 50 50">
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="5"
              />
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke={getLoaderColor(currentStep)}
                strokeWidth="5"
                strokeDasharray="80"
                strokeDashoffset="60"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Texte d'étape */}
          <div className="text-center">
            <h3 className="text-base font-medium text-gray-800">{stepText}</h3>
          </div>

          {/* Barre de progression ultra fluide */}
          <div className="w-full mt-2">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-700 transition-[width] duration-[1600ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepAnimation;

export function Home({ session }: HomeProps) {
  const navigate = useNavigate();
  const { credits, hasEnoughCredits, refreshCredits } = useCredits();
  const [routine, setRoutine] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [showOptimization, setShowOptimization] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'credit-deduction'; options?: any } | null>(null);
  const [showGPTModal, setShowGPTModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [userScrollY, setUserScrollY] = useState(0);

  // États pour l'animation des étapes
  const [currentStep, setCurrentStep] = useState(0);
  const [stepText, setStepText] = useState('');

  const stepTexts = [
    '',
    'Analyzing your task',
    'Finding the best AI tool', 
    'Generating optimization'
  ];

  // Fonction pour afficher le toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'credit-deduction', options?: any) => {
    setToast({ message, type, options });
  }, []);

  // Fonction pour rediriger vers la page pricing
  const redirectToPricing = useCallback((reason: string) => {
    console.log(`🔄 Redirecting to upgrade required: ${reason}`);
    redirectToUpgrade(navigate, {
      reason,
      requiredCredits: CREDIT_COSTS.OPTIMIZATION_DETECTION,
      currentCredits: credits?.monthly_credits || 0,
      featureName: 'AI Workflow Analysis'
    });
  }, [navigate, credits?.monthly_credits]);

  // Récupération du profil utilisateur (memoized)
  const fetchProfile = useCallback(async () => {
    if (profileData) return profileData;
    
    try {
      const { data, error } = await supabase
        .from('user_profile_ai')
        .select('profile_type, ai_level')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      const profile = data || { profile_type: 'general', ai_level: 'beginner' };
      setProfileData(profile);
      return profile;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const defaultProfile = { profile_type: 'general', ai_level: 'beginner' };
      setProfileData(defaultProfile);
      return defaultProfile;
    }
  }, [session.user.id, profileData]);

  // Initialisation de la page
  useEffect(() => {
    const initializePage = async () => {
      setIsPageLoading(true);
      try {
        await fetchProfile();
        
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setTimeout(() => setIsPageLoading(false), 150);
      }
    };
    
    initializePage();
  }, [fetchProfile]);

  // PIPELINE PRINCIPAL - 3 ÉTAPES AVEC SYSTÈME DE CRÉDITS ET REDIRECTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routine.trim()) return;

    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      setError('OpenAI API key is not configured.');
      return;
    }

    try {
      // Capturer la position de scroll avant de commencer
      const scrollY = window.scrollY;
      setUserScrollY(scrollY);

      setIsAnalyzing(true);
      setError(null);
      setCurrentStep(0);

      // 🪙 DÉDUCTION DES CRÉDITS POUR LA DÉTECTION D'OPTIMISATION AVEC REDIRECTION
      console.log('🪙 Deducting credits for optimization detection...');
      const creditResult = await deductCredits(
        session.user.id, 
        CREDIT_COSTS.OPTIMIZATION_DETECTION,
        showToast,
        (trigger, requiredCredits, currentCredits) => {
          // Redirection automatique au lieu du modal
          redirectToUpgrade(navigate, {
            reason: 'insufficient-credits-during-operation',
            requiredCredits,
            currentCredits,
            featureName: 'AI Workflow Analysis'
          });
        }
      );
      
      if (!creditResult.success) {
        setIsAnalyzing(false);
        // Si la déduction échoue pour manque de crédits, rediriger
        if (creditResult.message.includes('Insufficient credits')) {
          redirectToUpgrade(navigate, {
            reason: 'insufficient-credits-deduction-failed',
            requiredCredits: CREDIT_COSTS.OPTIMIZATION_DETECTION,
            currentCredits: credits?.monthly_credits || 0,
            featureName: 'AI Workflow Analysis'
          });
        }
        return;
      }

      // Rafraîchir les crédits dans le contexte
      await refreshCredits();

      // 🎯 ÉTAPE 1: Identifier le problème
      setCurrentStep(1);
      setStepText(stepTexts[1]);
      const problemResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'As a Workflow Optimization Expert: Identify the main AI-optimizable bottleneck or improvement goal from the user input. Be specific and actionable. 20 words max.' 
          },
          { role: 'user', content: routine }
        ],
        max_tokens: 50,
        temperature: 0.3
      });

      const problem = problemResponse.choices[0]?.message?.content?.trim() || 'Workflow optimization needed';
      console.log('✅ Step 1 - Problem/volunty identified:', problem);

      // 🎯 ÉTAPE 2: Matching vectoriel avec semanticMatching.ts
      setCurrentStep(2);
      setStepText(stepTexts[2]);
      
      let topTools = [];
      try {
        // Utiliser la fonction semanticMatching existante
        topTools = await findSimilarTools(problem, session.user.id);
        console.log('✅ Step 2 - Tools found:', topTools.length);
        
        // Prendre les 3 premiers outils
        topTools = topTools.slice(0, 3);
        
        if (topTools.length === 0) {
          throw new Error('No matching tools found');
        }
      } catch (toolError) {
        console.error('Error finding tools:', toolError);
        // Fallback: récupérer quelques outils de la base de données
        const { data: fallbackTools, error: fallbackError } = await supabase
          .from('tools')
          .select('id, name, description, url, logo, category')
          .limit(3);
          
        if (fallbackError || !fallbackTools || fallbackTools.length === 0) {
          throw new Error('No tools available');
        }
        
        topTools = fallbackTools.map(tool => ({
          ...tool,
          matchScore: 0.5
        }));
        console.log('✅ Step 2 - Using fallback tools:', topTools.length);
      }

      // 🎯 ÉTAPE 3: Générer l'optimisation
      setCurrentStep(3);
      setStepText(stepTexts[3]);
      
      const profile = await fetchProfile();
      
      const optimizationResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI optimization expert. Create a personalized workflow optimization recommendation.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Action-oriented title reflecting their goal (should not exeed 60 chars)",
  "problem": "Brief problem description",
  "solution": "Concrete solution with specific steps (max 40 words)",
  "workflow_fit": "How to integrate this tool in their workflow (max 30 words)",
  "selected_tool_name": "exact_tool_name_from_list"
}

Choose the MOST relevant tool and provide actionable implementation steps.`
          },
          {
            role: 'user',
            content: `User's Problem: ${problem}

User Profile: ${profile?.profile_type || 'General'} (AI experience: ${profile?.ai_level || 'beginner'})

Available Tools (ranked by relevance):
${topTools.map((t, i) => 
  `${i+1}. ${t.name} ${t.matchScore ? `(similarity: ${t.matchScore.toFixed(3)})` : ''}: ${t.description}`
).join('\n')}

Create a specific, actionable optimization plan using the most relevant tool.`
          }
        ],
        max_tokens: 400,
        temperature: 0.4
      });

      // Parser la réponse JSON
      const responseContent = optimizationResponse.choices[0]?.message?.content?.trim() || '{}';
      
      let result;
      try {
        const cleaned = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Fallback avec le premier outil
        result = {
          title: "Optimize Your Workflow",
          problem: problem,
          solution: `Use ${topTools[0].name} to streamline your workflow. This AI tool can help automate repetitive tasks and improve your productivity.`,
          workflow_fit: "Start by implementing this tool gradually, focusing on one feature at a time to avoid overwhelming your current process.",
          selected_tool_name: topTools[0].name
        };
      }

      // Sélectionner l'outil recommandé
      const selectedTool = topTools.find(t => t.name === result.selected_tool_name) || topTools[0];

      // Utiliser generateToolOptimization pour générer l'optimisation finale
      const toolOptimization = await generateToolOptimization(
        {
          name: selectedTool.name,
          description: selectedTool.description
        },
        {
          profile_type: profile?.profile_type || 'general',
          ai_level: profile?.ai_level || 'beginner',
          daily_description: routine
        }
      );

      const finalOptimization: Optimization = {
        title: toolOptimization.title,
        problem: toolOptimization.problem,
        solution: toolOptimization.solution,
        workflow_fit: toolOptimization.workflow_fit,
        tool: selectedTool
      };

      console.log('✅ Step 3 - Optimization generated:', finalOptimization.title);

      // Afficher l'optimisation immédiatement
      setOptimization(finalOptimization);
      setTimeout(() => setShowOptimization(true), 200);

    } catch (err: any) {
      console.error('Pipeline error:', err);
      setError(err.message || 'Failed to generate optimization. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setCurrentStep(0);
      setStepText('');
    }
  };

  // Ajouter l'optimisation aux favoris ET la partager automatiquement
  const handleAddToOptimizations = async (): Promise<void> => {
    if (!optimization) return;

    try {
      console.log('🚀 Adding optimization to user optimizations AND sharing publicly...');
      
      // 1. Créer l'entrée dans task_history
      const { data: taskData, error: taskError } = await supabase
        .from('task_history')
        .insert([
          {
            user_id: session.user.id,
            title: optimization.title,
            name: optimization.tool.name,
            category: 'routine_optimization',
            difficulty_level: 'intermediate',
            execution_started: false,
            problem: optimization.problem,
            description: optimization.solution,
            workflow_fit: optimization.workflow_fit,
          }
        ])
        .select()
        .single();

      if (taskError) throw new Error('Failed to save optimization');

      // 2. Ajouter à user_optimizations
      const { error: optimizationError } = await supabase
        .from('user_optimizations')
        .insert([
          {
            user_id: session.user.id,
            task_id: taskData.id,
            status: 'active'
          }
        ]);

      if (optimizationError) throw new Error('Failed to save optimization');

      // 3. NOUVEAU: Partager automatiquement dans shared_optimizations
      console.log('📤 Auto-sharing optimization to public feed...');
      const { error: shareError } = await supabase
        .from('shared_optimizations')
        .insert([
          {
            user_id: session.user.id,
            title: optimization.title,
            problem: optimization.problem,
            solution: optimization.solution,
            workflow_fit: optimization.workflow_fit,
            tool_id: optimization.tool.id,
            profile_type: profileData?.profile_type || 'general',
            is_active: true,
            votes_count: 0
          }
        ]);

      if (shareError) {
        console.error('❌ Error sharing optimization:', shareError);
        // Ne pas faire échouer toute l'opération si le partage échoue
        redirectToUpgrade(navigate, {
          reason: 'insufficient-credits-error',
          requiredCredits: CREDIT_COSTS.OPTIMIZATION_DETECTION,
          currentCredits: credits?.monthly_credits || 0,
          featureName: 'AI Workflow Analysis'
        });
      } else {
        console.log('✅ Optimization shared publicly successfully!');
      }
      
      setOptimization({ ...optimization, optimization_id: taskData.id });
      showToast('Optimization saved and shared with the community!', 'success');
      
    } catch (err: any) {
      console.error('Error adding optimization:', err);
      showToast(err.message || 'Failed to save optimization', 'error');
      throw err;
    }
  };

  const handleExecuteOptimization = async (taskId: string): Promise<void> => {
    try {
      navigate(`/execute/${taskId}`);
    } catch (err) {
      console.error('Error executing optimization:', err);
      setError('Failed to start optimization. Please try again.');
      throw err;
    }
  };

  const handleCloseOptimization = () => {
    setShowOptimization(false);
    setOptimization(null);
    setRoutine('');
    setCurrentStep(0);
    setStepText('');
  };

  // Contenu statique
  const staticContent = useMemo(() => (
    <div className="max-w-[720px] mx-auto space-y-6 md:space-y-8">
      <h1 className="text-[40px] md:text-[56px] leading-[1.1] font-semibold text-[#111111] tracking-[-0.02em]">
        Optimize your workflow with AI tools
      </h1>
      <p className="text-lg md:text-xl text-[#666666] max-w-[540px]">
        Tell us about your daily tasks and we'll help you find the perfect AI tools to make your work more efficient.
      </p>
    </div>
  ), []);

  // 🚨 NOUVEAU: Vérifier si l'utilisateur a suffisamment de crédits pour affichage visuel
  const canAnalyze = hasEnoughCredits(CREDIT_COSTS.OPTIMIZATION_DETECTION);

  // Loading screen pendant l'initialisation
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-primary">
        <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-16 pt-[20px] md:pt-[40px]">
          <div className="max-w-[720px] mx-auto">
            <div className="relative h-12 w-3/4 mb-4 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-[#f3f3f3] rounded-lg"></div>
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                }}
              ></div>
            </div>
            <div className="relative h-6 w-1/2 mb-8 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-[#f3f3f3] rounded-lg"></div>
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-16 pt-[35px] md:pt-[65px]">
        {staticContent}

        <form onSubmit={handleSubmit} className="mt-8 md:mt-16">
          <div className="max-w-[920px] mx-auto relative flex flex-col">
            <textarea
              value={routine}
              onChange={(e) => setRoutine(e.target.value)}
              onFocus={() => console.log('Textarea focused')}
              placeholder="Describe your daily tasks and routines..."
              className="neon-textarea w-full px-8 py-6 bg-gradient-to-r from-white/95 to-teal/5 border-none
                rounded-[20px] outline-none focus:outline-none focus:ring-0 focus:scale-[1.04]
                transition transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s cubic-bezier(0.4, 0, 0.2, 1)
                text-lg placeholder:text-gray-400 text-[#111111] resize-none h-[180px] md:h-[240px]
                shadow-md hover:shadow-lg transform hover:scale-[1.005] relative z-[1]
                will-change-transform backface-visibility-hidden"
              disabled={isAnalyzing}
            />
            <div className="absolute bottom-6 left-6 z-[20]">
              <div className="relative">
                {!isMobile && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/profile', { 
                        state: { showConnectionsModal: true } 
                      });
                    }}
                    className="btn-primary px-4 py-2 rounded-[20px] text-sm font-semibold
                      transition-all duration-300 flex items-center gap-2 overflow-hidden
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isAnalyzing}
                  >
                    <Sparkles className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Smart Connections</span>
                  </button>
                )}
              </div>
            </div>
            <button
              type="submit"
              className={`btn-primary absolute bottom-6 right-6 px-6 py-3 rounded-[20px] font-semibold
                transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden
                ${isAnalyzing || !routine.trim() ? 'opacity-50 cursor-not-allowed' : ''} z-[20]`}
              disabled={isAnalyzing || !routine.trim()}
              onClick={!canAnalyze ? (e) => {
                e.preventDefault();
                redirectToUpgrade(navigate, {
                  reason: 'insufficient-credits-button-click',
                  requiredCredits: CREDIT_COSTS.OPTIMIZATION_DETECTION,
                  currentCredits: credits?.monthly_credits || 0,
                  featureName: 'AI Workflow Analysis'
                });
              } : undefined}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 bg-gradient-to-tr from-[#00ACC1] to-white/20 rounded-full animate-[spin_0.8s_linear_infinite] border-2 border-[#00ACC1]/50 relative z-10" />
                  <span className="relative z-10">Analyzing...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Analyze</span>
                  {!canAnalyze && (
                    <span className="text-xs relative z-10">({CREDIT_COSTS.OPTIMIZATION_DETECTION} credits)</span>
                  )}
                  <ArrowRight className="w-4 h-4 relative z-10" />
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Community Optimizations Feed - Conteneur agrandi */}
        <div className="mt-8 md:mt-20">
          <div 
            className="rounded-[28px] border border-gray-200/60 shadow-sm overflow-hidden backdrop-blur-sm"
            style={{
              background: `linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(0, 172, 193, 0.15) 70%, rgba(0, 172, 193, 0.3) 100%), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='none'><rect width='100' height='100' fill='url(%23noise)'/><defs><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter></defs></svg>"), repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255, 255, 255, 0.03) 0.5px, rgba(255, 255, 255, 0.03) 1px)`,
              backgroundBlendMode: 'overlay',
              backdropFilter: 'blur(12px) saturate(1.6)',
              backgroundSize: '100% 100%, 100px 100px, 100% 100%',
              backgroundPosition: 'center, center, center'
            }}
          >
            <div className="p-6 md:p-8">
              <PublicOptimizationsFeed session={session} />
            </div>
          </div>
        </div>
        
        {/* Animation intelligente pour les 3 étapes - avec position utilisateur */}
        {isAnalyzing && (
          <StepAnimation 
            currentStep={currentStep}
            stepText={stepText}
            userScrollY={userScrollY}
          />
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="fixed bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20
            text-red-600 px-4 py-3 rounded-[20px] text-center md:max-w-md md:mx-auto z-50">
            {error}
          </div>
        )}

        {/* Full Screen Optimization */}
        {showOptimization && optimization && (
          <FullScreenOptimization
            tool={optimization.tool}
            personalizationContext={{
              title: optimization.title,
              problem: optimization.problem,
              solution: optimization.solution,
              workflow_fit: optimization.workflow_fit,
              optimization_id: optimization.optimization_id
            }}
            onClose={handleCloseOptimization}
            onAddToOptimizations={handleAddToOptimizations}
            onExecute={handleExecuteOptimization}
            session={session}
          />
        )}
        
        {/* GPT Connection Modal */}
        {showGPTModal && (
          <GPTPromptConnection
            session={session}
            onClose={() => {
              setIsClosingModal(true);
              setTimeout(() => {
                setShowGPTModal(false);
                setIsClosingModal(false);
              }, 200);
            }}
            onSuccess={() => {
              setShowGPTModal(false);
              setIsClosingModal(false);
            }}
            isClosing={isClosingModal}
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
      </div>

      {/* Styles intégrés pour boutons et textarea */}
      <style jsx>{`
        /* Bouton principal avec effet verre brossé */
        .btn-primary {
          background: linear-gradient(
            135deg,
            rgba(0, 172, 193, 0.8) 0%,
            rgba(0, 131, 143, 0.7) 30%,
            rgba(0, 96, 100, 0.6) 60%,
            rgba(0, 69, 71, 0.5) 100%
          );
          background-size: 300% 300%;
          background-image: linear-gradient(
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
          color: white;
          font-weight: 600;
          text-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.3);
          box-shadow: 
            0 0.25rem 1rem rgba(0, 172, 193, 0.3),
            inset 0 0 0.375rem rgba(0, 172, 193, 0.2);
          backdrop-filter: blur(12px) saturate(1.6);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: warmGradient 6s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
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
        
        .btn-primary:hover:not(:disabled) {
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
        
        .btn-primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
          box-shadow: 
            0 0.25rem 1rem rgba(255, 147, 0, 0.5),
            inset 0 0.125rem 0.25rem rgba(0, 0, 0, 0.1),
            inset 0 0 0.5rem rgba(0, 172, 193, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Neon effect pour textarea sur le focus */
        .neon-textarea:focus {
          box-shadow: 0 0 15px 3px rgba(0, 172, 193, 0.3), 
                      0 0 30px 5px rgba(0, 172, 193, 0.12);
          border: 1px solid rgba(0, 172, 193, 0.1);
          z-index: 1;
          transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                      border 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Animations */
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