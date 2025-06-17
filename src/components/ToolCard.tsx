import React from 'react';
import { ArrowRight, ExternalLink, Check } from 'lucide-react';
import { getToolLogo } from '../lib/logoUtils';

interface ToolCardProps {
  title: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  pricing?: string;
  logo?: string;
  url?: string;
  onLearnMore: () => void;
  onAddToTools: () => void;
  showSuccess?: boolean;
  isAdded?: boolean;
}

export function ToolCard({ 
  title, 
  category, 
  icon, 
  description,
  pricing,
  logo,
  url,
  onLearnMore,
  onAddToTools,
  showSuccess = false,
  isAdded = false
}: ToolCardProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  
  // Check if on mobile
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="group bg-white/90 rounded-3xl p-6 border border-teal/15
      hover:border-teal/30 hover:shadow-lg transition-all duration-300 h-full
      hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(0,172,193,0.15)),
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
          repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255,255,255,0.03) 0.5px, rgba(255,255,255,0.03) 1px)`,
        backgroundBlendMode: 'overlay',
        backdropFilter: 'blur(12px) saturate(1.5)',
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4 mb-4">
          {logo ? (
            <div className="flex-shrink-0 flex items-center">
              {getToolLogo({
                filename: logo,
                toolName: title,
                size: 40,
                className: "rounded-lg"
              })}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-8 flex items-center justify-center text-teal">
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-semibold text-text-primary truncate">{title}</h3>
              {pricing && (
                <span className="px-2 py-0.5 bg-teal/10 text-teal rounded-full text-xs font-medium ml-2">
                  {pricing}
                </span>
              )}
            </div>
            <span className={`text-sm ${getCategoryColor(category)}`}>{category}</span>
          </div>
        </div>

        <p className="text-text-secondary text-xs sm:text-sm mb-6 line-clamp-3 flex-grow">
          {description}
        </p>
        <div className="flex items-center gap-2 sm:gap-3 mt-auto pt-4 border-t border-teal/10">
          <button
            onClick={onLearnMore}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-3xl
              bg-gray-100 text-text-primary hover:bg-gradient-to-r hover:from-teal/10 hover:to-teal/20 
              transition-all duration-300 border border-teal/15 hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)]
              hover:scale-[1.02] min-w-[100px] sm:min-w-[120px]"
          >
            <span className="sm:hidden">Learn</span>
            <span className="hidden sm:inline">Learn More</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={onAddToTools}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-3xl
              bg-teal text-white hover:from-teal/90 hover:to-teal/70 transition-all duration-300 
              hover:shadow-[0_8px_20px_rgba(0,172,193,0.5)] hover:animate-[pulse_1.5s_ease-in-out_infinite]
              hover:scale-[1.02] relative overflow-hidden border border-teal/20 min-w-[100px] sm:min-w-[120px]
              disabled:opacity-75 disabled:cursor-default disabled:hover:bg-teal disabled:hover:shadow-none
              disabled:hover:scale-100 disabled:hover:animate-none"
            disabled={isAdded}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(0,172,193,0.8), rgba(0,69,71,0.5)),
                url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
                repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255,255,255,0.03) 0.5px, rgba(255,255,255,0.03) 1px)`,
              backgroundBlendMode: 'overlay',
              backdropFilter: 'blur(12px)',
            }}
          >
            {showSuccess ? (
              <div className="flex items-center gap-2 animate-fade-scale">
                <Check className="w-4 h-4" />
                <span>Added!</span>
              </div>
            ) : isAdded ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Added</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add to Tools</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Styles intégrés pour animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes fade-scale {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function getCategoryColor(category: string) {
  const colors: { [key: string]: string } = {
    'Automatisation': 'text-blue-600',
    'Contenu & Création': 'text-purple-600',
    'Organisation & Productivité': 'text-green-600',
    'Recherche & Analyse': 'text-amber-600',
    'Développement & Code': 'text-indigo-600',
    'Communication & IA Générative': 'text-rose-600',
    'Design & Visuels': 'text-teal-600',
    'Business & Stratégie': 'text-orange-600'
  };
  return colors[category] || 'text-text-secondary';
}