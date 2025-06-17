import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { 
  Home, 
  Search, 
  Settings, 
  CreditCard, 
  User, 
  Crown,
  LogOut,
  Cpu,
  TrendingUp,
  Calendar,
  Gauge,
} from 'lucide-react';
import { CreditDisplay } from './CreditDisplay';
import { useCredits } from '../contexts/CreditContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  activeView: string;
  setActiveView: (view: string) => void;
  handleSignOut: () => void;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  session, 
  activeView, 
  setActiveView, 
  handleSignOut 
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits } = useCredits();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Gestion robuste du scroll et du focus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navigationItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/home',
    },
    {
      id: 'discovery',
      label: 'Discovery',
      icon: Search,
      path: '/discovery',
    },
    {
      id: 'optimizations',
      label: 'Optimizations',
      icon: TrendingUp,
      path: '/optimizations',
    },
    {
      id: 'pricing',
      label: 'Pricing',
      icon: CreditCard,
      path: '/pricing',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
    }
  ];

  const handleNavigation = (item: typeof navigationItems[0]) => {
    setActiveView(item.id);
    navigate(item.path);
    onClose();
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  const handleUpgradeClick = () => {
    navigate('/pricing');
    setActiveView('pricing');
    onClose();
  };

  // Déterminer le statut des crédits et le type d'utilisateur
  const isLowCredits = credits && credits.monthly_credits <= 20;
  const isCriticalCredits = credits && credits.monthly_credits <= 3;
  const isPro = credits && credits.monthly_credits === 1000;
  const maxCredits = isPro ? 1000 : 100;

  return (
    <>
      {/* ✅ SIDEBAR DESKTOP */}
      {!isMobile && (
        <div 
          className={`
            fixed left-4 top-4 bottom-4 z-50
            rounded-3xl border border-teal/15
            animate-cinematicFadeIn
            transition-all duration-300 ease-out
            ${isExpanded ? 'w-80' : 'w-16'}
          `}
          style={{
            background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(0, 172, 193, 0.05)),
              url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
              repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255, 255, 255, 0.03) 0.5px, rgba(255, 255, 255, 0.03) 1px)`,
            backgroundBlendMode: 'overlay',
            backdropFilter: 'blur(12px) saturate(1.5)',
            boxShadow: isExpanded ? '0 0.5rem 1.5rem rgba(0, 172, 193, 0.25)' : '0 0.25rem 1rem rgba(0, 172, 193, 0.2)'
          }}
          role="navigation"
          aria-label="Main navigation"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-center border-b border-teal/10
            transition-all duration-300 ease-out
            ${isExpanded ? 'h-20 px-6' : 'h-20 px-0'}
          `}>
            {isExpanded ? (
              <div className="flex items-center gap-3 w-full opacity-100 transition-opacity duration-300 ease-out">
                <img 
                  src="/lynor-logo.png" 
                  alt="Lynor Logo" 
                  className="w-10 h-10 object-contain" 
                />
                <div>
                  <h2 className="text-[1.25rem] font-semibold text-gray-900">Lynor</h2>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center opacity-100 transition-opacity duration-300 ease-out">
                <img 
                  src="/lynor-logo.png" 
                  alt="Lynor Logo" 
                  className="w-8 h-8 object-contain opacity-80" 
                />
              </div>
            )}
          </div>

          {/* Navigation principale */}
          <div className="flex-1 flex flex-col justify-between p-4">
            <nav className="space-y-3" role="navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCurrentPath(item.path);
                
                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => handleNavigation(item)}
                      className={`
                        w-full flex items-center rounded-2xl text-left relative overflow-hidden
                        transition-all duration-300 ease-out animate-cinematicFadeIn
                        ${isExpanded ? 'px-4 py-3 gap-3' : 'p-3 justify-center'}
                        ${isActive 
                          ? 'bg-teal/10 text-gray-900 shadow-[0_0.25rem_1rem_rgba(0,172,193,0.2)]' 
                          : 'text-gray-700 hover:bg-teal/10 hover:text-gray-900 link'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={`
                        w-6 h-6 flex-shrink-0
                        ${isActive ? 'text-teal' : 'text-gray-600 group-hover:text-gray-800'}
                        group-hover:scale-110 transition-all duration-300 ease-out
                      `} />
                      {isExpanded && (
                        <div className="flex-1 min-w-0 opacity-100 transition-opacity duration-300 ease-out">
                          <span className={`
                            font-semibold text-[0.875rem] block
                            ${isActive ? 'text-gray-900' : 'text-gray-900'}
                          `}>
                            {item.label}
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>

            {/* Section crédits */}
            {isExpanded && (
              <div className="space-y-3 mt-4">
                <div className={`
                  p-4 rounded-2xl border border-teal/20 backdrop-blur-lg
                  bg-gradient-to-br from-white/90 to-teal/10
                  transition-all duration-300 ease-out group
                  hover:scale-[1.02] hover:filter-brightness-[1.1]
                  ${isCriticalCredits 
                    ? 'border-red-200/50 shadow-lg' 
                    : isLowCredits 
                      ? 'border-orange-200/50 shadow-md'
                      : isPro
                        ? 'border-teal/30 shadow-sm'
                        : 'border-teal/20 shadow-sm'
                  }
                `}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300
                        ${isCriticalCredits 
                          ? 'bg-red-500/10 text-red-600' 
                          : isLowCredits 
                            ? 'bg-orange-500/10 text-orange-600'
                            : isPro
                              ? 'bg-teal/10 text-teal'
                              : 'bg-teal/10 text-teal'
                        }
                      `}>
                        {isPro ? <Crown className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                      </div>
                      <span className="text-[0.875rem] font-semibold text-gray-900">
                        {isPro ? 'Pro Credits' : 'Credits'}
                      </span>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`
                        text-[1.5rem] font-bold
                        ${isCriticalCredits 
                          ? 'text-red-600' 
                          : isLowCredits 
                            ? 'text-orange-600'
                            : isPro
                              ? 'text-teal'
                              : 'text-teal'
                        }
                      `}>
                        {credits?.monthly_credits || 0}
                      </span>
                      <span className="text-[0.875rem] text-gray-500">/ {maxCredits}</span>
                    </div>
                    {(isLowCredits || isCriticalCredits) && !isPro && (
                      <span className={`
                        text-[0.75rem] font-medium
                        ${isCriticalCredits ? 'text-red-600' : 'text-orange-600'}
                      `}>
                        {isCriticalCredits ? 'Critical: Upgrade now!' : 'Low: Get more credits!'}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-teal/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`
                        h-2 rounded-full transition-all duration-500 ease-out
                        ${isCriticalCredits 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : isLowCredits 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                            : 'bg-gradient-to-r from-teal to-teal/80'
                        }
                      `}
                      style={{ width: `${Math.max(5, ((credits?.monthly_credits || 0) / maxCredits) * 100)}%` }}
                    />
                  </div>
                  {!isPro && (
                    <button
                      onClick={handleUpgradeClick}
                      className="btn-primary w-full flex items-center justify-center gap-2 px-[1.5rem] py-[0.5rem] rounded-full text-[0.875rem] font-semibold relative overflow-hidden animate-cinematicFadeIn mt-3"
                    >
                      <Gauge className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{(isLowCredits || isCriticalCredits) ? 'Upgrade Now' : 'Upgrade to Pro'}</span>
                    </button>
                  )}
                  {isPro && (
                    <div className="btn-secondary w-full flex items-center justify-center gap-2 px-[1.5rem] py-[0.5rem] rounded-full text-[0.875rem] font-semibold relative overflow-hidden animate-cinematicFadeIn mt-3">
                      <Crown className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Pro Member</span>
                    </div>
                  )}
                </div>
                <div className="relative group">
                  <button
                    onClick={() => {
                      handleSignOut();
                      onClose();
                    }}
                    className="btn-tertiary w-full flex items-center justify-center gap-2 px-[1.25rem] py-[0.5rem] rounded-full text-[0.875rem] font-medium relative overflow-hidden animate-cinematicFadeIn"
                  >
                    <LogOut className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ ZONE CRÉDITS MOBILE */}
      {isMobile && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`
            relative overflow-hidden rounded-3xl border border-teal/15
            transition-all duration-300 ease-out animate-cinematicFadeIn
            group hover:scale-[1.02] hover:filter-brightness-[1.1]
          `}>
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(0, 172, 193, 0.1)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
                  repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255, 255, 255, 0.03) 0.5px, rgba(255, 255, 255, 0.03) 1px)`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(16px) saturate(1.5)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_3s_infinite] opacity-60" />
            <div className="relative z-10 p-4 min-w-[140px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {isPro ? <Crown className="w-4 h-4 text-teal" /> : <Cpu className="w-4 h-4 text-teal" />}
                  </div>
                  <span className="text-[0.875rem] font-semibold text-gray-900">
                    {isPro ? 'Pro' : 'Credits'}
                  </span>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-[1.5rem] font-bold text-gray-900">
                    {credits?.monthly_credits || 0}
                  </span>
                  <span className="text-[0.875rem] text-gray-500">/{maxCredits}</span>
                </div>
                {(isLowCredits || isCriticalCredits) && !isPro && (
                  <span className={`
                    text-[0.75rem] font-medium
                    ${isCriticalCredits ? 'text-red-600' : 'text-orange-600'}
                  `}>
                    {isCriticalCredits ? 'Critical: Upgrade now!' : 'Low: Get more credits!'}
                  </span>
                )}
              </div>
              <div className="w-full bg-teal/10 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="h-1.5 bg-gradient-to-r from-teal to-teal/80 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(8, ((credits?.monthly_credits || 0) / maxCredits) * 100)}%` }}
                />
              </div>
              {!isPro ? (
                <button
                  onClick={handleUpgradeClick}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 px-[1.5rem] py-[0.5rem] rounded-full text-[0.875rem] font-semibold relative overflow-hidden animate-cinematicFadeIn mt-3"
                >
                  <Gauge className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{(isLowCredits || isCriticalCredits) ? 'Upgrade' : 'Go Pro'}</span>
                </button>
              ) : (
                <div className="btn-secondary w-full flex items-center justify-center gap-1.5 px-[1.5rem] py-[0.5rem] rounded-full text-[0.875rem] font-semibold relative overflow-hidden animate-cinematicFadeIn mt-3">
                  <Crown className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Pro</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-teal/30 rounded-full"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Styles intégrés pour animations et boutons */}
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
        
        .btn-primary:hover {
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
        
        .btn-primary:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 
            0 0.25rem 1rem rgba(255, 147, 0, 0.5),
            inset 0 0.125rem 0.25rem rgba(0, 0, 0, 0.1),
            inset 0 0 0.5rem rgba(0, 172, 193, 0.3);
        }
        
        /* Bouton secondaire */
        .btn-secondary {
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.9),
            rgba(0, 172, 193, 0.05)
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
          color: #00838f;
          font-weight: 600;
          text-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.3);
          box-shadow: 0 0.125rem 0.5rem rgba(0, 172, 193, 0.2);
          backdrop-filter: blur(12px) saturate(1.6);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-secondary::before {
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
        
        .btn-secondary:hover {
          transform: translateY(-0.125rem) scale(1.02);
          background: linear-gradient(
            135deg,
            rgba(255, 147, 0, 0.6) 0%,
            rgba(200, 100, 0, 0.5) 30%,
            rgba(0, 131, 143, 0.4) 60%,
            rgba(0, 69, 71, 0.3) 100%
          );
          background-size: 300% 300%;
          color: white;
          box-shadow: 
            0 0.5rem 1.5rem rgba(255, 147, 0, 0.3),
            0 0.25rem 0.75rem rgba(0, 131, 143, 2),
            0 0 0.75rem rgba(255, 143, 0, 0.4);
          animation: warmGradient 2s ease-in-out infinite;
        }
        
        .btn-secondary:hover::before {
          left: 100%;
        }
        
        .btn-secondary:active {
          transform: none;
          box-shadow: 
            0 0.125rem 0.5rem rgba(0, 172, 193, 0.4),
            inset 0 0.125rem 0.25rem rgba(0, 0, 0, 0.1);
        }

        /* Bouton tertiaire pour Sign Out */
        .btn-tertiary {
          background: linear-gradient(
            to bottom,
            rgba(249, 250, 251, 1),
            rgba(243, 244, 246, 1)
          );
          color: #4b5563;
          font-weight: 500;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 172, 193, 0.1);
          backdrop-filter: blur(12px) saturate(1.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-tertiary:hover {
          transform: translateY(-0.0625rem) scale(1.02);
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 1),
            rgba(0, 172, 193, 0.1)
          );
          color: #00acc1;
          box-shadow: 0 0.25rem 0.5rem rgba(0, 172, 193, 0.2);
        }
        
        .btn-tertiary:active {
          transform: translateY(0) scale(0.99);
          box-shadow: 0 0.0625rem 0.125rem rgba(0, 172, 193, 0.1);
        }
        
        /* Animations */
        @keyframes cinematicFadeIn {
          0% {
            opacity: 0;
            transform: translateY(1.5rem) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes warmGradient {
          0%, 100% { 
            background-position: 0% 50%;
          }
          50% { 
            background-position: 100% 50%;
          }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-10px); opacity: 0.6; }
        }
        @keyframes glassGlow {
          0%, 100% {
            background-position: 0% 50%;
            filter: brightness(1) saturate(1);
          }
          25% {
            background-position: 50% 0%;
            filter: brightness(1.15) saturate(1.25);
          }
          50% {
            background-position: 100% 50%;
            filter: brightness(1.2) saturate(1.3);
          }
          75% {
            background-position: 50% 100%;
            filter: brightness(1.15) saturate(1.25);
          }
        }
        .link {
          position: relative;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          display: inline-flex;
          align-items: center;
        }
        .link::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.6s ease;
          z-index: 0;
        }
        .link:hover {
          color: white;
          background: linear-gradient(
            135deg,
            rgba(0, 172, 193, 0.8) 0%,
            rgba(0, 131, 143, 0.7) 30%,
            rgba(0, 96, 100, 0.6) 60%,
            rgba(0, 69, 71, 0.5) 100%
          );
          background-size: 300% 300%;
          text-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.3);
          box-shadow: 0 0.25rem 1rem rgba(0, 172, 193, 0.3);
          animation: warmGradient 2s ease-in-out infinite;
          z-index: 1;
        }
        .link:hover::before {
          left: 100%;
        }
      `}</style>
    </>
  );
}