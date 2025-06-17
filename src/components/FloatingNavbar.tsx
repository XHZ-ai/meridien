import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { Home, Search, Lightbulb, CreditCard, User, Menu, X, LogOut } from 'lucide-react';
import { CreditDisplay } from './CreditDisplay';
import { useCredits } from '../contexts/CreditContext';

interface FloatingNavbarProps {
  hidden: boolean;
  session: Session;
  activeView: string;
  setActiveView: (view: string) => void;
  handleSignOut: () => void;
}

export function FloatingNavbar({ hidden, session, activeView, setActiveView, handleSignOut }: FloatingNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, hasEnoughCredits } = useCredits();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check if on mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Emit menu state changes for other components
  useEffect(() => {
    const event = new CustomEvent('menuStateChange', { detail: { isOpen: isMenuOpen } });
    document.dispatchEvent(event);
  }, [isMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Fonction pour rediriger vers la page pricing
  const redirectToPricing = () => {
    console.log('🔄 Redirecting to pricing from navbar');
    navigate('/pricing', { 
      state: { 
        reason: 'low-credits-navbar',
        currentCredits: credits?.monthly_credits || 0
      }
    });
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'discovery', label: 'Discovery', icon: Search, path: '/discovery' },
    { id: 'optimizations', label: 'My Optimizations', icon: Lightbulb, path: '/optimizations' },
    { id: 'pricing', label: 'Pricing', icon: CreditCard, path: '/pricing' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ];

  const handleNavigation = (path: string, id: string) => {
    setActiveView(id);
    navigate(path);
    setIsMenuOpen(false);
  };

  const getCurrentPath = () => {
    return location.pathname;
  };

  if (hidden) return null;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
        <div className="bg-white/95 backdrop-blur-xl rounded-[24px] px-6 py-3 
          shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-200/50 
          hover:border-gray-300/50 transition-all duration-300">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-2">
              <img 
                src="/lynor-logo.png" 
                alt="Lynor Logo" 
                className="w-6 h-6 object-contain" 
              />
              <span className="font-semibold text-gray-800 text-sm">Lynor</span>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getCurrentPath() === item.path;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path, item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-[16px] text-sm font-medium
                      transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                      ${isActive 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Credits Display */}
            <div className="ml-2 pl-4 border-l border-gray-200">
              <CreditDisplay 
                variant="navbar" 
                onUpgradeClick={redirectToPricing}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img 
                src="/lynor-logo.png" 
                alt="Lynor Logo" 
                className="w-6 h-6 object-contain" 
              />
              <span className="font-semibold text-gray-800">Lynor</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Credits Display */}
              <CreditDisplay 
                variant="compact" 
                onUpgradeClick={redirectToPricing}
              />
              
              {/* Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu Content */}
            <div className="absolute top-16 left-4 right-4 bg-white rounded-[20px] shadow-xl border border-gray-200 overflow-hidden animate-fade-scale">
              <div className="py-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = getCurrentPath() === item.path;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path, item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors hover:bg-gray-50 ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-2" />
                
                {/* Sign Out */}
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}