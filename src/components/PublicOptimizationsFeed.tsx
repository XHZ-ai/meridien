import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { TrendingUp, Clock, Users, RefreshCw } from 'lucide-react';
import { PublicOptimizationCard } from './PublicOptimizationCard';
import { AdaptationModal } from './AdaptationModal';
import { FullScreenOptimization } from './FullScreenOptimization';
import { Toast } from './Toast';
import { supabase } from '../lib/supabase';
import { adaptSharedOptimization } from '../lib/aiOptimizations';
import { useCredits } from '../contexts/CreditContext';
import { deductCredits, CREDIT_COSTS } from '../lib/credits';
import { redirectToUpgrade } from '../lib/upgradeRedirect';
import { useNavigate } from 'react-router-dom';

interface PublicOptimization {
  id: string;
  title: string;
  problem: string;
  solution: string;
  workflow_fit: string;
  votes_count: number;
  created_at: string;
  user_id: string;
  tool: {
    id: number;
    name: string;
    logo: string;
    url: string;
  };
  author_profile_type?: string;
  author_email?: string;
}

interface AdaptedOptimization {
  title: string;
  problem: string;
  solution: string;
  workflow_fit: string;
  tool: {
    id: number;
    name: string;
    description: string;
    url: string;
    logo: string;
  };
}

interface PublicOptimizationsFeedProps {
  session: Session;
}

type SortType = 'popular' | 'recent' | 'recommended';

export function PublicOptimizationsFeed({ session }: PublicOptimizationsFeedProps) {
  const navigate = useNavigate();
  const [optimizations, setOptimizations] = useState<PublicOptimization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('popular');
  const [isReplicating, setIsReplicating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [selectedOptimization, setSelectedOptimization] = useState<PublicOptimization | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptedOptimization, setAdaptedOptimization] = useState<AdaptedOptimization | null>(null);
  const [showAdaptedModal, setShowAdaptedModal] = useState(false);

  // 🪙 Credit system integration
  const { credits, hasEnoughCredits, refreshCredits } = useCredits();

  useEffect(() => {
    fetchOptimizations();
    
    // Souscription en temps réel pour les nouvelles optimisations
    const optimizationSubscription = supabase
      .channel('shared_optimizations_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shared_optimizations',
          filter: 'is_active=eq.true'
        },
        async (payload) => {
          console.log('🆕 New optimization detected:', payload.new);
          
          // Récupérer les détails complets de l'optimisation avec les informations de l'outil
          const { data: fullOptimization, error } = await supabase
            .from('shared_optimizations')
            .select(`
              *,
              tools:tool_id (
                id,
                name,
                logo,
                url
              ),
              users:user_id (
                email
              )
            `)
            .eq('id', payload.new.id)
            .eq('is_active', true)
            .single();

          if (error) {
            console.error('Error fetching full optimization:', error);
            return;
          }

          if (fullOptimization) {
            const newOptimization: PublicOptimization = {
              id: fullOptimization.id,
              title: fullOptimization.title,
              problem: fullOptimization.problem,
              solution: fullOptimization.solution,
              workflow_fit: fullOptimization.workflow_fit,
              votes_count: fullOptimization.votes_count,
              created_at: fullOptimization.created_at,
              user_id: fullOptimization.user_id,
              tool: {
                id: fullOptimization.tools.id,
                name: fullOptimization.tools.name,
                logo: fullOptimization.tools.logo,
                url: fullOptimization.tools.url
              },
              author_profile_type: fullOptimization.profile_type,
              author_email: fullOptimization.users?.email
            };

            setOptimizations(prev => {
              // Éviter les doublons
              if (prev.some(opt => opt.id === newOptimization.id)) {
                return prev;
              }

              const updated = [newOptimization, ...prev];
              
              // Appliquer le tri selon le critère actuel
              if (sortBy === 'popular') {
                return updated.sort((a, b) => b.votes_count - a.votes_count);
              } else if (sortBy === 'recent') {
                return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              }
              return updated;
            });
            
            setToast({ message: 'New optimization added to feed!', type: 'success' });
          }
        }
      )
      .subscribe();

    // Nettoyage des souscriptions
    return () => {
      supabase.removeChannel(optimizationSubscription);
    };
  }, [sortBy, session.user.id]);

  const fetchOptimizations = async () => {
    try {
      setIsLoading(true);
      
      // Try using the RPC function first, with fallback to direct query
      try {
        const { data, error } = await supabase.rpc('get_public_optimizations', {
          sort_type: sortBy,
          limit_count: 20,
          offset_count: 0
        });

        if (error) {
          console.error('RPC function error:', error);
          throw error;
        }

        console.log('📊 Fetched optimizations via RPC:', data?.optimizations?.length || 0);
        setOptimizations(data?.optimizations || []);
        return;
      } catch (rpcError) {
        console.warn('⚠️ RPC function failed, falling back to direct query:', rpcError);
        
        // Fallback to direct query if RPC function fails
        let query = supabase
          .from('shared_optimizations')
          .select(`
            id,
            title,
            problem,
            solution,
            workflow_fit,
            votes_count,
            created_at,
            user_id,
            profile_type,
            tools:tool_id (
              id,
              name,
              logo,
              url
            )
          `)
          .eq('is_active', true)
          .limit(20);

        // Apply sorting
        if (sortBy === 'popular') {
          query = query.order('votes_count', { ascending: false });
        } else if (sortBy === 'recent') {
          query = query.order('created_at', { ascending: false });
        } else {
          // For 'recommended', just use recent for now
          query = query.order('created_at', { ascending: false });
        }

        const { data: fallbackData, error: fallbackError } = await query;

        if (fallbackError) {
          console.error('Fallback query error:', fallbackError);
          throw fallbackError;
        }

        // Transform the data to match expected format
        const transformedOptimizations: PublicOptimization[] = (fallbackData || []).map(opt => ({
          id: opt.id,
          title: opt.title,
          problem: opt.problem,
          solution: opt.solution,
          workflow_fit: opt.workflow_fit,
          votes_count: opt.votes_count || 0,
          created_at: opt.created_at,
          user_id: opt.user_id,
          tool: {
            id: opt.tools?.id || 0,
            name: opt.tools?.name || 'Unknown Tool',
            logo: opt.tools?.logo || '/logos/default.svg',
            url: opt.tools?.url || '#'
          },
          author_profile_type: opt.profile_type
        }));

        console.log('📊 Fetched optimizations via fallback:', transformedOptimizations.length);
        setOptimizations(transformedOptimizations);
      }
    } catch (err) {
      console.error('Error fetching optimizations:', err);
      setToast({ message: 'Failed to load optimizations. Please try again.', type: 'error' });
      // Set empty array to show "no optimizations" state instead of loading forever
      setOptimizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 FONCTION AMÉLIORÉE POUR AJOUTER UN POINT À UNE OPTIMISATION
  const addPointToOptimization = async (optimizationId: string): Promise<boolean> => {
    try {
      console.log('🎯 [POINT ATTRIBUTION] Starting point attribution for optimization:', optimizationId);
      
      if (!optimizationId) {
        console.error('❌ [POINT ATTRIBUTION] No optimization ID provided');
        return false;
      }

      // First, get the current votes_count with detailed logging
      console.log('🔍 [POINT ATTRIBUTION] Fetching current votes count...');
      const { data: currentData, error: fetchError } = await supabase
        .from('shared_optimizations')
        .select('votes_count, title')
        .eq('id', optimizationId)
        .single();

      if (fetchError) {
        console.error('❌ [POINT ATTRIBUTION] Error fetching current votes:', fetchError);
        return false;
      }

      if (!currentData) {
        console.error('❌ [POINT ATTRIBUTION] No data found for optimization:', optimizationId);
        return false;
      }

      const currentVotes = currentData.votes_count || 0;
      const newVotesCount = currentVotes + 1;
      
      console.log(`📊 [POINT ATTRIBUTION] Current votes: ${currentVotes} → New votes: ${newVotesCount} for "${currentData.title}"`);

      // Update with the incremented value
      console.log('💾 [POINT ATTRIBUTION] Updating votes count in database...');
      const { error: updateError } = await supabase
        .from('shared_optimizations')
        .update({ 
          votes_count: newVotesCount
        })
        .eq('id', optimizationId);

      if (updateError) {
        console.error('❌ [POINT ATTRIBUTION] Error updating votes count:', updateError);
        return false;
      }

      console.log('✅ [POINT ATTRIBUTION] Database updated successfully');

      // Mettre à jour l'état local avec logging détaillé
      console.log('🔄 [POINT ATTRIBUTION] Updating local state...');
      setOptimizations(prev => {
        const updated = prev.map(opt => {
          if (opt.id === optimizationId) {
            console.log(`🔄 [POINT ATTRIBUTION] Local state updated for "${opt.title}": ${opt.votes_count} → ${newVotesCount}`);
            return { ...opt, votes_count: newVotesCount };
          }
          return opt;
        });
        return updated;
      });

      console.log('✅ [POINT ATTRIBUTION] Point attribution completed successfully');
      return true;
    } catch (err) {
      console.error('❌ [POINT ATTRIBUTION] Unexpected error:', err);
      return false;
    }
  };

  const handleReplicate = async (optimizationId: string, mode: 'copy' | 'regen', comment?: string) => {
    try {
      // ⚠️ IMPORTANT: Pas de déduction de crédits pour la copie simple
      // Les crédits ne sont déduits QUE pour l'adaptation personnalisée
      
      setIsReplicating(true);
      
      // Utiliser une requête directe au lieu de l'Edge Function
      const { data: optimization, error } = await supabase
        .from('shared_optimizations')
        .select(`
          *,
          tools:tool_id (
            id,
            name,
            description,
            url,
            logo
          )
        `)
        .eq('id', optimizationId)
        .single();

      if (error) {
        console.error('Error fetching optimization:', error);
        setToast({ message: 'Failed to fetch optimization details', type: 'error' });
        return;
      }

      // Créer directement l'optimisation dans task_history
      const { data: taskData, error: taskError } = await supabase
        .from('task_history')
        .insert([
          {
            user_id: session.user.id,
            title: optimization.title,
            name: optimization.tools.name,
            category: 'replicated_optimization',
            difficulty_level: 'intermediate',
            execution_started: false,
            problem: optimization.problem,
            description: optimization.solution,
            workflow_fit: optimization.workflow_fit,
          }
        ])
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task:', taskError);
        setToast({ message: 'Failed to replicate optimization', type: 'error' });
        return;
      }

      // Ajouter à user_optimizations
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
        setToast({ message: 'Failed to add to your optimizations', type: 'error' });
        return;
      }

      // 🎯 AJOUTER UN POINT À L'OPTIMISATION ORIGINALE
      console.log('🎯 [REPLICATION] Awarding point for replication...');
      const pointAdded = await addPointToOptimization(optimizationId);
      
      if (pointAdded) {
        console.log('✅ [REPLICATION] Point successfully awarded');
      } else {
        console.warn('⚠️ [REPLICATION] Failed to award point, but replication succeeded');
      }

      const actionText = mode === 'copy' ? 'copied' : 'adapted';
      setToast({ message: `Optimization ${actionText} to your list!`, type: 'success' });
    } catch (err) {
      console.error('Error replicating:', err);
      setToast({ message: 'Failed to add optimization', type: 'error' });
    } finally {
      setIsReplicating(false);
    }
  };

  const handleShowAdaptModal = (optimization: PublicOptimization) => {
    // 🪙 VÉRIFICATION DES CRÉDITS AVANT D'OUVRIR LE MODAL D'ADAPTATION - REDIRECTION
    if (!hasEnoughCredits(CREDIT_COSTS.OPTIMIZATION_ADAPTATION)) {
      console.log('🔄 Redirecting to pricing: insufficient credits for adaptation');
      redirectToUpgrade(navigate, {
        reason: 'insufficient-credits-adaptation',
        requiredCredits: CREDIT_COSTS.OPTIMIZATION_ADAPTATION,
        currentCredits: credits?.monthly_credits || 0,
        optimizationTitle: optimization.title,
        featureName: 'Smart Adaptation'
      });
      return;
    }

    console.log('🔧 Opening adaptation modal for:', optimization.title);
    setSelectedOptimization(optimization);
    setShowAdaptModal(true);
  };

  const handleAdapt = async (comment: string) => {
    if (!selectedOptimization) {
      console.error('❌ [ADAPTATION] No selected optimization found');
      return;
    }

    // 🎯 SAUVEGARDER L'ID DE L'OPTIMISATION ORIGINALE AVANT TOUTE OPÉRATION
    const originalOptimizationId = selectedOptimization.id;
    const originalOptimizationTitle = selectedOptimization.title;
    
    console.log('🎯 [ADAPTATION] Starting adaptation process for:', originalOptimizationTitle, 'ID:', originalOptimizationId);

    try {
      // 🪙 DÉDUCTION DES CRÉDITS POUR L'ADAPTATION D'OPTIMISATION AVEC REDIRECTION
      console.log('🪙 Deducting credits for optimization adaptation...');
      const creditResult = await deductCredits(
        session.user.id, 
        CREDIT_COSTS.OPTIMIZATION_ADAPTATION,
        (message, type, options) => setToast({ message, type }),
        (trigger, requiredCredits, currentCredits) => {
          // Redirection automatique au lieu du modal
          redirectToUpgrade(navigate, {
            reason: 'insufficient-credits-during-adaptation',
            requiredCredits,
            currentCredits,
            optimizationTitle: originalOptimizationTitle,
            featureName: 'Smart Adaptation'
          });
        }
      );
      
      if (!creditResult.success) {
        // Si la déduction échoue pour manque de crédits, rediriger
        if (creditResult.message.includes('Insufficient credits')) {
          redirectToUpgrade(navigate, {
            reason: 'insufficient-credits-adaptation-failed',
            requiredCredits: CREDIT_COSTS.OPTIMIZATION_ADAPTATION,
            currentCredits: credits?.monthly_credits || 0,
            optimizationTitle: originalOptimizationTitle,
            featureName: 'Smart Adaptation'
          });
        }
        return;
      }

      // Rafraîchir les crédits dans le contexte
      await refreshCredits();

      setIsAdapting(true);

      // Get user profile for personalization
      const { data: profile, error: profileError } = await supabase
        .from('user_profile_ai')
        .select('profile_type, ai_level, daily_description')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      // ⚠️ IMPORTANT: adaptSharedOptimization ne déduit PAS de crédits
      // Les crédits ont déjà été déduits ci-dessus
      const adaptedOpt = await adaptSharedOptimization(
        {
          name: selectedOptimization.tool.name,
          description: selectedOptimization.solution
        },
        {
          profile_type: profile.profile_type,
          ai_level: profile.ai_level,
          daily_description: profile.daily_description || '',
          user_context: comment,
          original_optimization: {
            title: selectedOptimization.title,
            problem: selectedOptimization.problem,
            solution: selectedOptimization.solution,
            workflow_fit: selectedOptimization.workflow_fit
          }
        }
      );

      // Create the adapted optimization object
      const adaptedOptimization: AdaptedOptimization = {
        title: adaptedOpt.title,
        problem: adaptedOpt.problem,
        solution: adaptedOpt.solution,
        workflow_fit: adaptedOpt.workflow_fit,
        tool: {
          id: selectedOptimization.tool.id,
          name: selectedOptimization.tool.name,
          description: selectedOptimization.solution,
          url: selectedOptimization.tool.url,
          logo: selectedOptimization.tool.logo
        }
      };

      // 🎯 STOCKER L'ID DE L'OPTIMISATION ORIGINALE DANS L'OBJET ADAPTÉ
      (adaptedOptimization as any).originalOptimizationId = originalOptimizationId;
      (adaptedOptimization as any).originalOptimizationTitle = originalOptimizationTitle;

      setAdaptedOptimization(adaptedOptimization);
      setShowAdaptModal(false);
      setShowAdaptedModal(true);

    } catch (error) {
      console.error('Error adapting optimization:', error);
      setToast({ message: 'Failed to adapt optimization. Please try again.', type: 'error' });
    } finally {
      setIsAdapting(false);
    }
  };

  const handleAddAdaptedOptimization = async (): Promise<void> => {
    if (!adaptedOptimization) {
      console.error('❌ [ADAPTED SAVE] No adapted optimization found');
      return;
    }

    // 🎯 RÉCUPÉRER L'ID DE L'OPTIMISATION ORIGINALE
    const originalOptimizationId = (adaptedOptimization as any).originalOptimizationId;
    const originalOptimizationTitle = (adaptedOptimization as any).originalOptimizationTitle;
    
    console.log('🎯 [ADAPTED SAVE] Saving adapted optimization and awarding point to original:', originalOptimizationTitle, 'ID:', originalOptimizationId);

    if (!originalOptimizationId) {
      console.error('❌ [ADAPTED SAVE] No original optimization ID found in adapted optimization object');
      setToast({ message: 'Error: Original optimization reference lost', type: 'error' });
      return;
    }

    try {
      // Create task history record
      const { data: taskData, error: taskError } = await supabase
        .from('task_history')
        .insert([
          {
            user_id: session.user.id,
            title: adaptedOptimization.title,
            name: adaptedOptimization.tool.name,
            category: 'adapted_optimization',
            difficulty_level: 'intermediate',
            execution_started: false,
            problem: adaptedOptimization.problem,
            description: adaptedOptimization.solution,
            workflow_fit: adaptedOptimization.workflow_fit,
          }
        ])
        .select()
        .single();

      if (taskError) {
        console.error('❌ [ADAPTED SAVE] Error creating task:', taskError);
        throw taskError;
      }

      console.log('✅ [ADAPTED SAVE] Task created successfully:', taskData.id);

      // Add to user optimizations
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
        console.error('❌ [ADAPTED SAVE] Error adding to user optimizations:', optimizationError);
        throw optimizationError;
      }

      console.log('✅ [ADAPTED SAVE] Added to user optimizations successfully');

      // 🎯 AJOUTER UN POINT À L'OPTIMISATION ORIGINALE QUAND ELLE EST ADAPTÉE
      console.log('🎯 [ADAPTED SAVE] Awarding point to original optimization for adaptation...');
      const pointAdded = await addPointToOptimization(originalOptimizationId);
      
      if (pointAdded) {
        console.log('✅ [ADAPTED SAVE] Point successfully awarded to original optimization');
        setToast({ 
          message: `Adapted optimization saved and point awarded to "${originalOptimizationTitle}"!`, 
          type: 'success' 
        });
      } else {
        console.warn('⚠️ [ADAPTED SAVE] Failed to award point to original optimization');
        setToast({ 
          message: 'Adapted optimization saved successfully! (Point attribution failed)', 
          type: 'success' 
        });
      }
      
    } catch (err) {
      console.error('❌ [ADAPTED SAVE] Error adding adapted optimization:', err);
      setToast({ message: 'Failed to save adapted optimization', type: 'error' });
      throw err;
    }
  };

  const handleExecuteAdaptedOptimization = async (taskId: string): Promise<void> => {
    // This would navigate to the execution page - implement as needed
    console.log('Execute adapted optimization:', taskId);
  };

  const sortOptions = [
    { value: 'popular', label: 'Popular', icon: TrendingUp },
    { value: 'recent', label: 'Recent', icon: Clock },
    { value: 'recommended', label: 'For You', icon: Users },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2 tracking-tight">
          Community Optimizations
        </h2>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto">
          Discover how others optimize their workflows with AI
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={fetchOptimizations}
          disabled={isLoading}
          className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95
            bg-white shadow-sm border border-gray-200"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 text-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sort Filters */}
      <div className="flex items-center justify-center gap-3 mb-6 overflow-x-auto pb-2">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value as SortType)}
              className={`relative flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-medium
                whitespace-nowrap transition-all duration-300 ${
                sortBy === option.value
                  ? 'bg-gradient-to-r from-[#00ACC1] to-[#00838F] text-white shadow-md hover:shadow-lg scale-105 hover:scale-110'
                  : 'bg-white text-teal-700 border border-teal-200/50 hover:bg-teal-50/50 hover:border-teal-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md'
              }`}
            >
              {sortBy === option.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                  animate-[shimmer_3s_infinite] opacity-60 pointer-events-none" />
              )}
              <Icon className="w-4 h-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Community Feed Container - Expanded to fill remaining space */}
      <div className="flex-1 overflow-y-auto">
        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="relative rounded-[24px] overflow-hidden h-[320px]">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 rounded-[24px]"></div>
                <div 
                  className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                  }}
                ></div>
              </div>
            ))}
          </div>
        ) : optimizations.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center py-16 md:py-20 bg-gradient-to-br from-gray-50 to-white rounded-[24px] border border-gray-200 shadow-sm relative overflow-hidden max-w-md">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <div key={i} 
                    className="absolute rounded-full bg-button/5"
                    style={{
                      width: `${Math.random() * 80 + 40}px`,
                      height: `${Math.random() * 80 + 40}px`,
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animation: `float ${Math.random() * 15 + 20}s infinite linear`,
                      opacity: Math.random() * 0.3 + 0.1,
                    }}>
                  </div>
                ))}
              </div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-button/10 to-button/5 
                  flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Users className="w-8 h-8 md:w-10 md:h-10 text-button" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-4">
                  No optimizations found
                </h3>
                <p className="text-text-secondary text-base md:text-lg leading-relaxed">
                  {sortBy === 'recommended' 
                    ? 'Complete your profile to see personalized recommendations'
                    : 'Be the first to share an optimization!'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {optimizations.map((optimization) => (
              <PublicOptimizationCard
                key={optimization.id}
                optimization={optimization}
                onReplicate={handleReplicate}
                onShowAdaptModal={handleShowAdaptModal}
                isReplicating={isReplicating}
              />
            ))}
          </div>
        )}
      </div>

      {/* Adaptation Modal */}
      {showAdaptModal && selectedOptimization && (
        <AdaptationModal
          optimization={selectedOptimization}
          onClose={() => {
            console.log('🔧 Closing adaptation modal');
            setShowAdaptModal(false);
            setSelectedOptimization(null);
          }}
          onAdapt={handleAdapt}
          isAdapting={isAdapting}
        />
      )}

      {/* Adapted Optimization Modal */}
      {showAdaptedModal && adaptedOptimization && (
        <FullScreenOptimization
          tool={adaptedOptimization.tool}
          personalizationContext={{
            title: adaptedOptimization.title,
            problem: adaptedOptimization.problem,
            solution: adaptedOptimization.solution,
            workflow_fit: adaptedOptimization.workflow_fit
          }}
          onClose={() => {
            setShowAdaptedModal(false);
            setAdaptedOptimization(null);
          }}
          onAddToOptimizations={handleAddAdaptedOptimization}
          onExecute={handleExecuteAdaptedOptimization}
          session={session}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}