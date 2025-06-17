import React, { useState } from 'react';

interface AuthFormProps {
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  handleAuth: (e: React.FormEvent) => Promise<void>;
  error: string | null;
}

export function AuthForm({
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  handleAuth,
  error
}: AuthFormProps) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Client-side validation
  const validateEmail = () => {
    if (!email.trim()) {
      return "Email address is required";
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const validatePassword = () => {
    if (!password.trim()) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must contain at least 6 characters";
    }
    if (isSignUp) {
      if (!/(?=.*[a-z])/.test(password)) {
        return "Password must contain at least one lowercase letter";
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        return "Password must contain at least one uppercase letter";
      }
      if (!/(?=.*\d)/.test(password)) {
        return "Password must contain at least one number";
      }
    }
    return null;
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail();
    if (emailError) {
      setValidationError(emailError);
      return;
    }
    setValidationError(null);
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword();
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }
    setValidationError(null);
    await handleAuth(e);
  };

  const handleBack = () => {
    setStep('email');
    setValidationError(null);
  };

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    
    // Error message mappings
    const errorMappings: Record<string, string> = {
      'invalid_credentials': 'Incorrect email or password. Please check your credentials.',
      'Invalid email or password. Please try again.': 'Incorrect email or password. Please try again.',
      'Invalid login credentials': 'Invalid login credentials. Check your email and password.',
      'user_not_found': 'No account found with this email address.',
      'email_already_exists': 'An account already exists with this email address.',
      'weak_password': 'The password is too weak. Use at least 6 characters.',
      'invalid_email': 'Invalid email format.',
      'network_error': 'Connection error. Please check your internet connection.',
      'server_error': 'Temporary server error. Please try again in a few moments.',
      'rate_limit_exceeded': 'Too many attempts. Please wait before trying again.',
      'account_disabled': 'This account has been disabled. Contact support.',
      'email_not_verified': 'Please verify your email address before signing in.'
    };

    // Find exact or partial match
    for (const [key, message] of Object.entries(errorMappings)) {
      if (error.includes(key) || error === key) {
        return message;
      }
    }

    // Generic error messages based on context
    if (error.toLowerCase().includes('password')) {
      return 'Password issue. Please check that it meets the required criteria.';
    }
    
    if (error.toLowerCase().includes('email')) {
      return 'Email issue. Please check that it is correct.';
    }

    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return 'Connection problem. Check your internet connection and try again.';
    }

    // Default error message
    return error.length > 100 ? 'An error occurred. Please try again.' : error;
  };

  // Determine which error to display (local validation or server error)
  const currentError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
      <div className="w-full max-w-[350px] bg-white rounded-[20px] p-4 sm:p-8 
        border border-[#d1d1d1] shadow-lg animate-fade-scale relative overflow-hidden">
        
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center text-[#292929]"
            style={{ letterSpacing: '0.02em', animation: 'softGlow 3s ease-in-out infinite', fontFamily: 'Geist Sans, sans-serif' }}>
              {isSignUp ? 'Create an account' : 'Welcome back'}
          </h1>

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <input
                  required
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  style={{ fontFamily: 'Geist Sans, sans-serif' }}
                  className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-[#f9f9f9] rounded-[20px] border transition-all duration-200 ease-out
                    text-[#292929] placeholder-[#908F94] hover:border-[#292929]/50
                    focus:outline-none focus:scale-[1.01] focus:bg-white/70 focus:backdrop-blur-sm
                    ${currentError 
                      ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(248,113,113,0.15)]' 
                      : 'border-[#d1d1d1] focus:border-[#292929] focus:shadow-[0_0_0_4px_rgba(41,41,41,0.15)]'}`}
                />
              </div>
              {currentError && (
                <div className="relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                    border-l-[8px] border-r-[8px] border-b-[8px] 
                    border-l-transparent border-r-transparent border-b-[#fef2f2]"></div>
                  <div className="p-4 bg-gradient-to-br from-[#fef2f2] via-[#fef2f2] to-[#fdf2f8] 
                    rounded-2xl border border-[#fecaca] shadow-[0_4px_20px_rgba(248,113,113,0.08)] 
                    animate-[fadeIn_0.4s_ease-out] backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#f87171] to-[#ef4444] 
                        flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#dc2626] text-sm font-medium leading-relaxed" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
                          {getErrorMessage(currentError)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                style={{ fontFamily: 'Geist Sans, sans-serif' }}
                className="group w-full px-6 py-4 bg-gradient-to-r from-[#1f1f1f] via-[#2a2a2a] to-[#1f1f1f] 
                  text-white rounded-3xl font-medium transition-all duration-300 ease-out
                  hover:from-[#0f0f0f] hover:via-[#1a1a1a] hover:to-[#0f0f0f] hover:scale-[1.02] 
                  hover:shadow-[0_8px_25px_rgba(31,31,31,0.2)] active:scale-[0.98] 
                  shadow-[0_4px_15px_rgba(31,31,31,0.12)] transform-gpu
                  before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-r 
                  before:from-transparent before:via-white/5 before:to-transparent 
                  before:translate-x-[-100%] hover:before:translate-x-[100%] 
                  before:transition-transform before:duration-700 relative overflow-hidden"
                >
                <span className="relative z-10">Continue</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{ fontFamily: 'Geist Sans, sans-serif' }}
                    className="group flex items-center text-[#6b7280] hover:text-[#374151] transition-all duration-300 
                      hover:translate-x-[-2px] mb-3"
                  >
                    <svg className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:translate-x-[-1px]" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <div className="bg-gradient-to-r from-[#f8fafc] to-[#f1f5f9] rounded-2xl p-4 border border-[#e2e8f0]">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#1f1f1f] to-[#0f0f0f] rounded-full flex items-center justify-center mr-3 shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1f2937] truncate" style={{ fontFamily: 'Geist Sans, sans-serif' }}>{email}</p>
                        <p className="text-xs text-[#6b7280] mt-0.5" style={{ fontFamily: 'Geist Sans, sans-serif' }}>Verified email address</p>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  required
                  minLength={6}
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  autoFocus
                  style={{ fontFamily: 'Geist Sans, sans-serif' }}
                  className={`w-full px-5 py-4 bg-gradient-to-br from-[#fafbfc] to-[#f8fafc] rounded-2xl 
                    border-2 transition-all duration-300 ease-out text-[#1f2937] placeholder-[#9ca3af]
                    hover:from-[#f8fafc] hover:to-[#f1f5f9] hover:border-[#d1d5db]
                    focus:outline-none focus:from-white focus:to-[#fefefe] focus:scale-[1.005] 
                    focus:shadow-[0_0_0_4px_rgba(31,31,31,0.08)] focus:border-[#1f1f1f]
                    transform-gpu
                    ${currentError 
                      ? 'border-[#ef4444] focus:border-[#ef4444] focus:shadow-[0_0_0_4px_rgba(239,68,68,0.08)]' 
                      : 'border-[#e5e7eb]'}`}
                />
                <p className="mt-3 text-xs text-[#6b7280] font-medium flex items-center" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
                  {isSignUp ? (
                    <>
                      <svg className="w-3 h-3 mr-1.5 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Minimum 6 characters with uppercase, lowercase and number
                    </>
                  ) : ''}
                </p>
              </div>
              {currentError && (
                <div className="relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                    border-l-[8px] border-r-[8px] border-b-[8px] 
                    border-l-transparent border-r-transparent border-b-[#fef2f2]"></div>
                  <div className="p-4 bg-gradient-to-br from-[#fef2f2] via-[#fef2f2] to-[#fdf2f8] 
                    rounded-2xl border border-[#fecaca] shadow-[0_4px_20px_rgba(248,113,113,0.08)] 
                    animate-[fadeIn_0.4s_ease-out] backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#f87171] to-[#ef4444] 
                        flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#dc2626] text-sm font-medium leading-relaxed" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
                          {getErrorMessage(currentError)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                style={{ fontFamily: 'Geist Sans, sans-serif' }}
                className="group w-full px-6 py-4 bg-gradient-to-r from-[#1f1f1f] via-[#2a2a2a] to-[#1f1f1f] 
                  text-white rounded-3xl font-medium transition-all duration-300 ease-out
                  hover:from-[#0f0f0f] hover:via-[#1a1a1a] hover:to-[#0f0f0f] hover:scale-[1.02] 
                  hover:shadow-[0_8px_25px_rgba(31,31,31,0.2)] active:scale-[0.98] 
                  shadow-[0_4px_15px_rgba(31,31,31,0.12)] transform-gpu
                  before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-r 
                  before:from-transparent before:via-white/5 before:to-transparent 
                  before:translate-x-[-100%] hover:before:translate-x-[100%] 
                  before:transition-transform before:duration-700 relative overflow-hidden"
                >
                <span className="relative z-10">{isSignUp ? 'Create my account' : 'Sign in'}</span>
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-text-secondary text-sm" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setStep('email');
                setValidationError(null);
              }}
              style={{ fontFamily: 'Geist Sans, sans-serif' }}
              className="text-[#292929] hover:underline transition-all"
            >
              {isSignUp ? 'Sign in' : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}