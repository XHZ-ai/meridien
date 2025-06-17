import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { Toast, ToastType } from './components/Toast';
import { Home } from './pages/Home';
import { Optimizations } from './pages/Optimizations';
import { Discovery } from './pages/Discovery';
import { Pricing } from './pages/Pricing';
import { Profile } from './pages/Profile';
import { ExecuteCopilot } from './pages/ExecuteCopilot';
import { UpgradeRequired } from './pages/UpgradeRequired';
import { Session } from '@supabase/supabase-js';
import { AuthForm } from './components/AuthForm';
import { HomeView } from './components/HomeView';
import { WelcomeView } from './components/WelcomeView';
import { CopilotConversation } from './components/CopilotConversation';
import { FloatingNavbar } from './components/FloatingNavbar';
import { Sidebar } from './components/Sidebar';
import { CreditProvider } from './contexts/CreditContext';
import { supabase } from './lib/supabase';

// Create a wrapper component to use hooks
function AppContent() {
   console.log("VERSION COPIE BOLT"); // ✅ Marqueur pour confirmer le déploiement
  const navigate = useNavigate();
  const location = useLocation();
  
  // Core state
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [hasCompletedInitialConversation, setHasCompletedInitialConversation] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const MAX_RETRIES = 5; // Increased from 3 to 5
  const RETRY_DELAY = 2000; // Increased from 1000ms to 2000ms (2 seconds)
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [lastVisitedRoute, setLastVisitedRoute] = useState<string>(() => {
    return sessionStorage.getItem('lastVisitedRoute') || '/home';
  });
  const [appHasFocus, setAppHasFocus] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Sidebar state - ✅ TOUJOURS VISIBLE EN MODE RÉTRACTÉ
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // ✅ TOUJOURS OUVERTE
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // ✅ SUR MOBILE, FERMER LA SIDEBAR
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        // ✅ SUR DESKTOP, TOUJOURS OUVERTE
        setIsSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const toggleSidebar = () => {
    // ✅ SUR DESKTOP, NE JAMAIS FERMER COMPLÈTEMENT LA SIDEBAR
    // Elle reste toujours visible, on ne fait que toggle entre rétracté/déployé
    if (!isMobile) {
      // La logique de collapse/expand est gérée dans le composant Sidebar lui-même
      return;
    } else {
      // Sur mobile, on peut l'ouvrir/fermer
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  // Listen for menu state changes from FloatingNavbar
  useEffect(() => {
    const handleMenuStateChange = (event: CustomEvent) => {
      setIsMenuOpen(event.detail.isOpen);
    };
    
    document.addEventListener('menuStateChange', handleMenuStateChange as EventListener);
    
    return () => {
      document.removeEventListener('menuStateChange', handleMenuStateChange as EventListener);
    };
  }, []);

  // Check Supabase connectivity with retry logic
  const checkSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profile_ai')
        .select('count')
        .limit(1)
        .single();

      if (error) {
        if (connectionRetries < MAX_RETRIES) {
          console.log(`Retrying connection (attempt ${connectionRetries + 1}/${MAX_RETRIES})...`);
          setConnectionRetries(prev => prev + 1);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (connectionRetries + 1)));
          return checkSupabaseConnection();
        }
        console.error('Supabase connection error after retries:', error);
        setIsSupabaseConnected(false);
        showToast('Unable to connect to the database. Please check your connection.', 'error');
        return false;
      }

      setIsSupabaseConnected(true);
      setConnectionRetries(0);
      return true;
    } catch (err) {
      if (connectionRetries < MAX_RETRIES) {
        console.log(`Retrying connection (attempt ${connectionRetries + 1}/${MAX_RETRIES})...`);
        setConnectionRetries(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (connectionRetries + 1)));
        return checkSupabaseConnection();
      }
      console.error('Network error checking Supabase connection:', err);
      setIsSupabaseConnected(false);
      showToast('Network error. Please check your internet connection.', 'error');
      return false;
    }
  };

  // Fetch user profile status with improved error handling and retry mechanism
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return;

      try {
        // First verify connection with retries
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          console.error('Failed to establish Supabase connection');
          return;
        }

        // Retry mechanism specifically for fetching user profile
        let profileRetryCount = 0;
        let existingProfile = null;
        let fetchError = null;

        while (profileRetryCount < MAX_RETRIES) {
          try {
            console.log(`Attempting to fetch user profile (attempt ${profileRetryCount + 1}/${MAX_RETRIES})`);
            
            const { data, error } = await supabase
              .from('user_profile_ai')
              .select('has_completed_initial_conversation')
              .eq('user_id', session.user.id)
              .limit(1)
              .maybeSingle();

            if (error) {
              console.error(`Error fetching user profile (attempt ${profileRetryCount + 1}):`, error);
              fetchError = error;
              profileRetryCount++;
              
              if (profileRetryCount < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * profileRetryCount));
                continue;
              } else {
                // Max retries reached
                showToast('Error loading user profile. Please try again.', 'error');
                return;
              }
            }

            // Success - break out of retry loop
            existingProfile = data;
            break;

          } catch (err) {
            console.error(`Network error fetching user profile (attempt ${profileRetryCount + 1}):`, err);
            fetchError = err;
            profileRetryCount++;
            
            if (profileRetryCount < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * profileRetryCount));
              continue;
            } else {
              // Max retries reached - set connection state to false for full-screen error
              setIsSupabaseConnected(false);
              showToast('Network error. Please check your connection and try again.', 'error');
              return;
            }
          }
        }

        if (!existingProfile) {
          // If no profile exists, create one with retry logic
          let createRetryCount = 0;
          
          while (createRetryCount < MAX_RETRIES) {
            try {
              console.log(`Attempt ${createRetryCount + 1} to create user profile`);
              
              // Double-check if profile exists before creating to avoid race conditions
              const { data: doubleCheckProfile, error: doubleCheckError } = await supabase
                .from('user_profile_ai')
                .select('has_completed_initial_conversation')
                .eq('user_id', session.user.id)
                .limit(1)
                .maybeSingle();
                
              if (doubleCheckProfile) {
                // Profile was created by another process in the meantime
                console.log('Found profile during double-check:', doubleCheckProfile);
                setHasCompletedInitialConversation(doubleCheckProfile.has_completed_initial_conversation || false);
                break;
              }
              
              const { data: newProfile, error: createError } = await supabase
                .from('user_profile_ai')
                .insert([
                  { 
                    user_id: session.user.id,
                    has_completed_initial_conversation: false,
                    monthly_credits: 100,
                    last_credit_reset: new Date().toISOString()
                  }
                ])
                .select()
                .single();

              if (createError) {
                console.error(`Error creating user profile (attempt ${createRetryCount + 1}):`, createError);
                createRetryCount++;
                if (createRetryCount === MAX_RETRIES) {
                  showToast('Unable to create user profile. Please try again later.', 'error');
                  return;
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * createRetryCount));
                continue;
              }

              setHasCompletedInitialConversation(false);
              break;
            } catch (err) {
              console.error(`Network error creating profile (attempt ${createRetryCount + 1}):`, err);
              createRetryCount++;
              if (createRetryCount === MAX_RETRIES) {
                setIsSupabaseConnected(false);
                showToast('Network error. Please check your connection and try again.', 'error');
                return;
              }
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * createRetryCount));
            }
          }
        } else {
          setHasCompletedInitialConversation(existingProfile.has_completed_initial_conversation || false);
        }
      } catch (err) {
        console.error('Unexpected error in fetchUserProfile:', err);
        // Set connection state to false to trigger full-screen error display
        setIsSupabaseConnected(false);
        showToast('Network error. Please check your connection and try again.', 'error');
      }
    };

    fetchUserProfile();
  }, [session, connectionRetries]);

  // Save the current route whenever it changes
  useEffect(() => {
    if (session && location.pathname !== '/' && location.pathname !== '/welcome' && location.pathname !== '/conversation') {
      sessionStorage.setItem('lastVisitedRoute', location.pathname);
      setLastVisitedRoute(location.pathname);
      console.log('Route saved:', location.pathname);
    }
  }, [location.pathname, session]);

  // Handle visibility change and focus events
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      console.log('Visibility changed:', isVisible ? 'visible' : 'hidden');
      
      if (isVisible && !appHasFocus) {
        setAppHasFocus(true);
        // Don't reload or navigate here, just update our tracking state
      } else if (!isVisible && appHasFocus) {
        setAppHasFocus(false);
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appHasFocus]);

  // Initialize the session - run once at startup
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        // Restore last visited route from sessionStorage
        const savedRoute = sessionStorage.getItem('lastVisitedRoute');
        if (savedRoute) {
          console.log('Restored saved route:', savedRoute);
          setLastVisitedRoute(savedRoute);
        }
        
        console.log('Initializing app and fetching session...');
        
        // Check Supabase connection first with retries
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          console.error('Failed to establish initial Supabase connection');
          return;
        }
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          showToast('Error retrieving your session. Please refresh the page.', 'error');
          return;
        }
        
        console.log('Session retrieved:', session ? 'Valid session' : 'No session');
        setSession(session);

        // If there's a valid session, navigate to the last visited route
        if (session && savedRoute && savedRoute !== '/') {
          console.log('Will navigate to saved route:', savedRoute);
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        showToast('Error connecting to the server. Please refresh the page.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    // Handle auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('User signed out or no session');
        setSession(null);
        setActiveView('home');
        navigate('/');
        showToast('You have been successfully logged out', 'success');
        return;
      }
      
      if (event === 'SIGNED_IN') {
        console.log('User signed in successfully');
        setSession(session);
        
        // Get the saved route from storage
        const savedRoute = sessionStorage.getItem('lastVisitedRoute');
        if (savedRoute && savedRoute !== '/') {
          console.log('Navigating to saved route after sign in:', savedRoute);
          navigate(savedRoute);
        } else {
          navigate('/home');
        }
      }
    });

    return () => {
      console.log('Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      setError(null);
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          if (error.message === 'User already registered') {
            setError('This email is already registered. Please log in instead.');
          } else {
            showToast(error.message, 'error');
          }
        } else {
          setActiveView('home');
          showToast('Account created successfully! You can now log in.', 'success');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message === 'Invalid login credentials') {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(error.message);
          }
        } else {          
          const savedRoute = sessionStorage.getItem('lastVisitedRoute');
          navigate(savedRoute && savedRoute !== '/' ? savedRoute : '/home');
          showToast('Welcome to Lynor 👋', 'success');
        }
      }
    } catch (err: any) {
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple sign-out attempts
    
    try {
      console.log('Sign out initiated');
      setIsSigningOut(true);
      
      // Clear session state first for immediate UI feedback
      setSession(null);
      setActiveView('home');
      
      // Then attempt to sign out from Supabase with error handling
      try {
        console.log('Calling Supabase signOut()');
        const { error } = await supabase.auth.signOut({
          scope: 'local' // Try using local scope instead of global to prevent CORS issues
        });
        
        if (error) {
          console.error('Error during Supabase sign out:', error);
          // Still proceed with client-side logout even if API call fails
        }
      } catch (supabaseError) {
        console.error('Exception during Supabase sign out:', supabaseError);
        // Still proceed with client-side logout
      }
      
      // Clear any localStorage items related to auth
      try {
        console.log('Clearing local storage auth items');
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-jqwpaqgwywnbljkatscn-auth-token');
      } catch (storageError) {
        console.error('Error clearing localStorage:', storageError);
      }
      
      // Navigate to home and show success message
      showToast('You have been successfully logged out', 'success');
      navigate('/');
      console.log('Sign out complete, redirected to home');
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      showToast('Error during sign out, but session was cleared', 'warning');
      navigate('/');
    } finally {
      setIsSigningOut(false);
    }
  };

  // Show connection error state
  if (!isSupabaseConnected && !isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-8 max-w-md w-full text-center space-y-4">
          <Sparkles className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-red-500">Connection Error</h2>
          <p className="text-text-secondary">Unable to connect to the database. Please check your internet connection and try again.</p>
          <button
            onClick={() => {
              setConnectionRetries(0);
              setIsSupabaseConnected(true);
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500/20 text-red-600 rounded-[20px] hover:bg-red-500/30 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // MAIN RENDER
  return (
    <CreditProvider session={session}>
      <div className="min-h-screen bg-primary">
        {/* INITIAL LOADING STATE */}
        {isLoading && (
          <div className="min-h-screen bg-primary flex items-center justify-center">
            <div className="relative w-full max-w-[240px] h-12 overflow-hidden rounded-lg">
              {/* Dark background with shimmer effect */}
              <div className="absolute inset-0 bg-dark-DEFAULT rounded-lg"></div>
              
              {/* Pulsing glow in the center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-white/10 rounded-full animate-pulse"></div>
              </div>
              
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)',
                }}
              ></div>
              
              {/* Loading text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/70 text-sm font-light tracking-wider">Chargement...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* LOGIN / SIGNUP SCREEN (NO SESSION) */}
        {!session && !isLoading && (
          <div className="min-h-screen bg-primary text-text-primary">
            {activeView === 'login' ? (
              <AuthForm
                isSignUp={isSignUp}
                setIsSignUp={setIsSignUp}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleAuth={handleAuth}
                error={error}
              />
            ) : (
              <div className="min-h-screen flex flex-col items-center justify-center px-4">
                <div className="relative w-full max-w-[420px] text-center space-y-8 p-8 sm:p-12 
                  bg-white/80 backdrop-blur-md rounded-[32px] border border-white/20
                  shadow-[0_8px_32px_rgba(0,0,0,0.08)] animate-fade-scale">
                  <div className="flex flex-col items-center">
                    <img 
                      src="/lynor-logo.png" 
                      alt="Lynor Logo" 
                      className="w-20 h-20 object-contain mb-6" 
                    />
                    <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4"
                      style={{ animation: 'softGlow 3s ease-in-out infinite', letterSpacing: '0.02em' }}>
                      Welcome to Lynor
                    </h1>
                    <p className="text-[#908F94] text-lg max-w-md mx-auto font-light">
                      Access your smart workspace.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                    <button
                      onClick={() => {
                        setActiveView('login');
                        setIsSignUp(false);
                      }}
                      className="px-8 py-4 bg-neutral-900 text-white rounded-2xl
                        transition-all duration-300 flex items-center justify-center gap-2
                        hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]
                        shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('login');
                        setIsSignUp(true);
                      }}
                      className="px-8 py-4 bg-white/10 text-neutral-800 rounded-2xl
                        transition-all duration-300 border border-neutral-200/50
                        hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]
                        backdrop-blur shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                    >
                      Create account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* MAIN INTERFACE (USER LOGGED IN) */}
        {session && !isLoading && (
          <div className="min-h-screen bg-primary text-text-primary flex flex-col">
            {/* ✅ SIDEBAR DESKTOP - TOUJOURS VISIBLE */}
            {!isMobile && (
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                session={session}
                activeView={activeView}
                setActiveView={setActiveView}
                handleSignOut={handleSignOut}
              />
            )}

            {/* ✅ MOBILE FLOATING NAVBAR */}
            {isMobile && (
              <FloatingNavbar
                hidden={!hasCompletedInitialConversation || window.location.pathname === '/conversation' || window.location.pathname.startsWith('/execute/')}
                session={session}
                activeView={activeView}
                setActiveView={setActiveView}
                handleSignOut={handleSignOut}
              />
            )}
            
            {/* Create space for mobile menu when open */}
            {isMenuOpen && isMobile && (
              <div className="h-16 w-full transition-all duration-300 mt-12"></div>
            )}
            
            {/* ✅ MAIN CONTENT AREA - AVEC MARGE POUR SIDEBAR FLOTTANTE */}
            <main className={`
              flex-1 transition-all duration-500 ease-in-out animate-fade-in
              ${!isMobile ? 'ml-24' : ''}
              ${isMobile ? 'pt-[80px]' : 'pt-0'}
            `}>
              <Routes>
                <Route 
                  path="/welcome" 
                  element={
                    hasCompletedInitialConversation ? (
                      <Navigate to="/home" replace />
                    ) : (
                      <WelcomeView />
                    )
                  } 
                />
                <Route
                  path="/conversation"
                  element={
                    hasCompletedInitialConversation ? (
                      <Navigate to="/home" replace />
                    ) : (
                      <CopilotConversation session={session} />
                    )
                  }
                />
                <Route 
                  path="/home" 
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <Home session={session} />
                    )
                  } 
                />
                <Route 
                  path="/optimizations" 
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <Optimizations session={session} />
                    )
                  } 
                />
                <Route 
                  path="/discovery" 
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <Discovery session={session} />
                    )
                  } 
                />
                <Route 
                  path="/pricing" 
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <Pricing session={session} />
                    )
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <Profile session={session} handleSignOut={handleSignOut} />
                    )
                  } 
                />
                <Route
                  path="/execute/:optimizationId"
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <ExecuteCopilot session={session} />
                    )
                  }
                />
                <Route 
                  path="/upgrade-required" 
                  element={
                    !hasCompletedInitialConversation ? (
                      <Navigate to="/welcome" replace />
                    ) : (
                      <UpgradeRequired session={session} />
                    )
                  } 
                />
                <Route 
                  path="/*" 
                  element={
                    session ? (
                      hasCompletedInitialConversation ? (
                        <Navigate to="/home" replace />
                      ) : (
                        <Navigate to="/welcome" replace />
                      )
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/"
                  element={
                    session ? (
                      <Navigate to={lastVisitedRoute} replace />
                    ) : (
                    <Navigate to="/welcome" replace />
                    )
                  } 
                />
              </Routes>
            </main>
            {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}
          </div>
        )}
        {toast && !session && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </CreditProvider>
  );
}

// Main App component that provides router context
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;