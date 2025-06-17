import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { getUserCredits, UserCredits } from '../lib/credits';

interface CreditContextType {
  credits: UserCredits | null;
  isLoading: boolean;
  refreshCredits: () => Promise<void>;
  hasEnoughCredits: (cost: number) => boolean;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

interface CreditProviderProps {
  children: ReactNode;
  session: Session | null;
}

export function CreditProvider({ children, session }: CreditProviderProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCredits = async () => {
    if (!session?.user?.id) {
      setCredits(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userCredits = await getUserCredits(session.user.id);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error refreshing credits:', error);
      setCredits(null);
    } finally {
      setIsLoading(false);
    }
  };

  const hasEnoughCredits = (cost: number): boolean => {
    if (!credits) return false;
    return credits.monthly_credits >= cost;
  };

  useEffect(() => {
    refreshCredits();
  }, [session?.user?.id]);

  const value: CreditContextType = {
    credits,
    isLoading,
    refreshCredits,
    hasEnoughCredits
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits(): CreditContextType {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}