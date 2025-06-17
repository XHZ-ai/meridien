import { supabase } from './supabase';

export interface CreditResult {
  success: boolean;
  message: string;
  remaining_credits: number;
}

export interface UserCredits {
  monthly_credits: number;
  last_credit_reset: string;
  plan_type?: string;
}

// Coûts des différentes fonctionnalités
export const CREDIT_COSTS = {
  OPTIMIZATION_DETECTION: 6,    // Détection d'optimisation
  OPTIMIZATION_ADAPTATION: 2,   // Adaptation d'optimisation
  PERSONALIZED_GENERATION: 2,   // Génération personnalisée
  COPILOT_QUERY: 1              // Requête Copilot
} as const;

/**
 * Check network connectivity
 */
async function checkNetworkStatus(): Promise<boolean> {
  try {
    // Try to make a simple request to check connectivity
    const response = await fetch('/ping', { 
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return true;
  } catch (error) {
    // Check if we're online according to the browser
    return navigator.onLine;
  }
}

/**
 * Vérifie si l'utilisateur a suffisamment de crédits pour une action
 * @param userId - ID de l'utilisateur
 * @param cost - Coût de l'opération
 * @returns true si l'utilisateur a suffisamment de crédits
 */
export async function checkSufficientCredits(userId: string, cost: number): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) {
      return false;
    }
    
    return credits.monthly_credits >= cost;
  } catch (err) {
    console.error('❌ Error checking credits:', err);
    return false;
  }
}

/**
 * Déduit des crédits pour un utilisateur avec feedback amélioré et vérifications
 * @param userId - ID de l'utilisateur
 * @param cost - Nombre de crédits à déduire
 * @param showToast - Fonction pour afficher un toast (optionnel)
 * @param onInsufficientCredits - Fonction appelée quand les crédits sont insuffisants (optionnel)
 * @returns Résultat de la déduction
 */
export async function deductCredits(
  userId: string, 
  cost: number, 
  showToast?: (message: string, type: 'success' | 'error' | 'credit-deduction', options?: any) => void,
  onInsufficientCredits?: (trigger: 'insufficient-credits', requiredCredits: number, currentCredits: number) => void
): Promise<CreditResult> {
  try {
    console.log(`🪙 Attempting to deduct ${cost} credits for user ${userId}`);
    
    // Vérifier d'abord si l'utilisateur a suffisamment de crédits
    const currentCredits = await getUserCredits(userId);
    if (!currentCredits) {
      const errorMessage = 'Unable to check credit balance. Please try again.';
      
      if (showToast) {
        showToast(errorMessage, 'error');
      }
      
      return {
        success: false,
        message: errorMessage,
        remaining_credits: 0
      };
    }

    // Si pas assez de crédits, déclencher le callback
    if (currentCredits.monthly_credits < cost) {
      const errorMessage = `Insufficient credits. You need ${cost} credits but only have ${currentCredits.monthly_credits}.`;
      
      if (onInsufficientCredits) {
        onInsufficientCredits('insufficient-credits', cost, currentCredits.monthly_credits);
      } else if (showToast) {
        showToast(errorMessage, 'error');
      }
      
      return {
        success: false,
        message: errorMessage,
        remaining_credits: currentCredits.monthly_credits
      };
    }
    
    // Check network connectivity
    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      console.error('❌ Network connectivity issue detected');
      const errorMessage = 'Network connection unavailable. Please check your internet connection and try again.';
      
      if (showToast) {
        showToast(errorMessage, 'error');
      }
      
      return {
        success: false,
        message: errorMessage,
        remaining_credits: currentCredits.monthly_credits
      };
    }
    
    const { data, error } = await supabase.rpc('deduct_credits', {
      input_user_id: userId,  // ✅ Nom correct du paramètre
      input_cost: cost        // ✅ Nom correct du paramètre
    });

    if (error) {
      console.error('❌ Error deducting credits:', error);
      
      // Handle specific network-related errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        const errorMessage = 'Network connection lost. Please check your internet connection and try again.';
        
        if (showToast) {
          showToast(errorMessage, 'error');
        }
        
        return {
          success: false,
          message: errorMessage,
          remaining_credits: currentCredits.monthly_credits
        };
      }
      
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No response from credit deduction function');
    }

    const result = data[0] as CreditResult;
    
    if (result.success) {
      console.log(`✅ Credits deducted successfully. Remaining: ${result.remaining_credits}`);
      
      // Afficher un toast de succès avec les détails des crédits
      if (showToast) {
        showToast(
          `Operation completed successfully`, 
          'credit-deduction',
          {
            creditAmount: cost,
            remainingCredits: result.remaining_credits
          }
        );
      }
    } else {
      console.log(`⚠️ Credit deduction failed: ${result.message}`);
      
      if (showToast) {
        showToast(result.message, 'error');
      }
    }

    return result;
  } catch (err) {
    console.error('❌ Error in deductCredits:', err);
    
    // Check if it's a network error
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      const errorMessage = 'Network connection unavailable. Please check your internet connection and try again.';
      
      if (showToast) {
        showToast(errorMessage, 'error');
      }
      
      return {
        success: false,
        message: errorMessage,
        remaining_credits: 0
      };
    }
    
    const errorMessage = 'Failed to process credit deduction';
    
    if (showToast) {
      showToast(errorMessage, 'error');
    }
    
    return {
      success: false,
      message: errorMessage,
      remaining_credits: 0
    };
  }
}

/**
 * ✅ FONCTION MISE À JOUR: Récupère les crédits avec renouvellement automatique
 * @param userId - ID de l'utilisateur
 * @returns Crédits de l'utilisateur avec renouvellement automatique si nécessaire
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    console.log(`🪙 Fetching credits with auto-renewal for user ${userId}`);
    
    // Check network connectivity first
    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      console.error('❌ Network connectivity issue detected');
      throw new Error('Network connection unavailable. Please check your internet connection and try again.');
    }
    
    // ✅ UTILISER LA FONCTION AVEC RENOUVELLEMENT AUTOMATIQUE
    const { data, error } = await supabase.rpc('get_user_credits', {
      input_user_id: userId
    });

    if (error) {
      console.error('❌ Error fetching user credits:', error);
      
      // Handle specific network-related errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Network connection lost. Please check your internet connection and try again.');
      }
      
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No credit data found for user');
      return null;
    }

    const credits = data[0] as UserCredits;
    console.log(`✅ User credits fetched with auto-renewal: ${credits.monthly_credits} remaining (${credits.plan_type} plan)`);
    
    return credits;
  } catch (err) {
    console.error('❌ Error in getUserCredits:', err);
    
    // Re-throw network errors with clear messaging
    if (err instanceof Error && err.message.includes('Network connection')) {
      throw err;
    }
    
    // Handle fetch errors specifically
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('Network connection unavailable. Please check your internet connection and try again.');
    }
    
    throw new Error('Failed to fetch user credits');
  }
}

/**
 * Vérifie si un utilisateur a suffisamment de crédits pour une opération
 * @param userId - ID de l'utilisateur
 * @param cost - Coût de l'opération
 * @returns true si l'utilisateur a suffisamment de crédits
 */
export async function hasEnoughCredits(userId: string, cost: number): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) {
      return false;
    }
    
    return credits.monthly_credits >= cost;
  } catch (err) {
    console.error('❌ Error checking credits:', err);
    return false;
  }
}

/**
 * Formate l'affichage des crédits
 * @param credits - Nombre de crédits
 * @returns Chaîne formatée
 */
export function formatCredits(credits: number): string {
  return `${credits} credit${credits !== 1 ? 's' : ''}`;
}

/**
 * Calcule les jours restants jusqu'à la prochaine réinitialisation
 * @param lastReset - Date de la dernière réinitialisation
 * @returns Nombre de jours restants
 */
export function getDaysUntilReset(lastReset: string): number {
  const resetDate = new Date(lastReset);
  const nextMonth = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);
  const now = new Date();
  const diffTime = nextMonth.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}