import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogOut, Stars } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function WelcomeView() {
  const navigate = useNavigate();
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  
  // Check if the user actually has a valid session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error checking session:", error);
          setHasSession(false);
        } else {
          setHasSession(!!data.session);
        }
        setSessionChecked(true);
      } catch (err) {
        console.error("Exception checking session:", err);
        setHasSession(false);
        setSessionChecked(true);
      }
    };
    
    checkSession();
  }, []);
  
  // If no valid session is found, redirect to login
  useEffect(() => {
    if (sessionChecked && !hasSession) {
      navigate('/');
    }
  }, [sessionChecked, hasSession, navigate]);
  
  const handleSignOut = async () => {
    try {
      // Try to clear local session first
      setIsSignedOut(true);
      
      // Then attempt to sign out from Supabase with local scope
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (error) {
        console.error('Error during sign out API call:', error);
        // Continue with redirection anyway
      } finally {
        // Clear any auth-related items just to be sure
        try {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('sb-jqwpaqgwywnbljkatscn-auth-token');
        } catch (storageError) {
          console.error('Error clearing localStorage:', storageError);
        }
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always redirect, even if errors occur
      navigate('/');
    }
  };

  if (isSignedOut) {
    return <Navigate to="/" replace />;
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="relative w-full max-w-[240px] h-12 overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-dark-DEFAULT rounded-lg"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-white/10 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)',
            }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/70 text-sm font-light tracking-wider">Vérification...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-primary 
      flex items-center justify-center px-4 z-50 overflow-hidden">
      {/* Textured background with grid pattern */}
      <div className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 80%), linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 24px 24px, 24px 24px'
        }}
      ></div>
      
      {/* Subtle floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} 
            className="absolute rounded-full bg-button/5"
            style={{
              width: `${Math.random() * 120 + 40}px`, 
              height: `${Math.random() * 120 + 40}px`,
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 20}s infinite linear`,
              opacity: Math.random() * 0.3 + 0.1,
              transform: `translate(-50%, -50%) scale(${Math.random() * 0.5 + 0.5})`,
            }}>
          </div>
        ))}
      </div>
      
      <button
        onClick={handleSignOut}
        className="absolute top-4 right-4 flex items-center px-3 py-2.5 rounded-full text-text-secondary
          hover:text-red-600 hover:bg-red-500/5 transition-all duration-300 group"
        title="Sign out"
      >
        <LogOut className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Sign out</span>
      </button>

      <div className="w-full max-w-[480px] text-center space-y-8 md:space-y-14 
        bg-white/90 backdrop-blur-lg rounded-[30px] p-8 sm:p-12 
        shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-white/20
        animate-[fadeScale_0.7s_cubic-bezier(0.16,1,0.3,1)] transform hover:translate-y-[-3px] transition-all duration-700">
        
        <div className="space-y-8 md:space-y-12 px-2">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary
            tracking-tight leading-tight"
            style={{ 
              animation: 'softGlow 3s ease-in-out infinite',
              textShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}
          >
            Welcome to Lynor
          </h1>
          
          <div className="space-y-6 md:space-y-8">
            <p className="text-xl md:text-2xl text-text-primary font-medium
              tracking-tight">
              You're about to meet your AI Copilot.
            </p>
            <p className="text-base md:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
              This quick conversation helps Lynor understand your profile — so the interface can adapt to how you think and work.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => navigate('/conversation')}
            className="relative px-8 py-4 bg-[#292929] text-white rounded-[24px]
              transition-all duration-300 flex items-center justify-center gap-3
              hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto
              shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
          >            
            <span className="relative text-lg font-medium tracking-wide">Start</span>
            <Stars className="w-5 h-5 relative animate-pulse" />
          </button>
        </div>
      </div>
    </div>
  );
}