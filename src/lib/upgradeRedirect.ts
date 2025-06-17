import { NavigateFunction } from 'react-router-dom';

export interface UpgradeRedirectInfo {
  reason: string;
  requiredCredits: number;
  currentCredits: number;
  featureName?: string;
  toolName?: string;
  optimizationTitle?: string;
}

/**
 * Redirige l'utilisateur vers la page d'upgrade avec le contexte approprié
 * @param navigate - Fonction de navigation React Router
 * @param info - Informations sur la raison de la redirection
 */
export function redirectToUpgrade(navigate: NavigateFunction, info: UpgradeRedirectInfo) {
  console.log(`🔄 Redirecting to upgrade page: ${info.reason}`);
  
  navigate('/upgrade-required', { 
    state: info,
    replace: true // Remplace l'entrée actuelle dans l'historique
  });
}

/**
 * Fonctions utilitaires pour les redirections courantes
 */
export const upgradeRedirects = {
  /**
   * Redirection pour analyse de workflow insuffisante
   */
  workflowAnalysis: (navigate: NavigateFunction, requiredCredits: number, currentCredits: number) => {
    redirectToUpgrade(navigate, {
      reason: 'insufficient-credits-optimization',
      requiredCredits,
      currentCredits,
      featureName: 'AI Workflow Analysis'
    });
  },

  /**
   * Redirection pour optimisation d'outil spécifique
   */
  toolOptimization: (navigate: NavigateFunction, requiredCredits: number, currentCredits: number, toolName: string) => {
    redirectToUpgrade(navigate, {
      reason: 'insufficient-credits-tool-optimization',
      requiredCredits,
      currentCredits,
      toolName,
      featureName: `${toolName} Integration`
    });
  },

  /**
   * Redirection pour adaptation d'optimisation
   */
  optimizationAdaptation: (navigate: NavigateFunction, requiredCredits: number, currentCredits: number, optimizationTitle?: string) => {
    redirectToUpgrade(navigate, {
      reason: 'insufficient-credits-adaptation',
      requiredCredits,
      currentCredits,
      optimizationTitle,
      featureName: 'Smart Adaptation'
    });
  },

  /**
   * Redirection pour Copilot
   */
  copilotQuery: (navigate: NavigateFunction, requiredCredits: number, currentCredits: number) => {
    redirectToUpgrade(navigate, {
      reason: 'insufficient-credits-copilot',
      requiredCredits,
      currentCredits,
      featureName: 'Lynor Copilot'
    });
  }
};