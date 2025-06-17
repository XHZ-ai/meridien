import React, { useState } from 'react';
import { Plus, Sparkles, User, Calendar } from 'lucide-react';
import { getToolLogo } from '../lib/logoUtils';
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

interface PublicOptimizationCardProps {
  optimization: PublicOptimization;
  onReplicate: (optimizationId: string, mode: 'copy' | 'regen', comment?: string) => Promise<void>;
  onShowAdaptModal: (optimization: PublicOptimization) => void;
  isReplicating: boolean;
}

export function PublicOptimizationCard({ 
  optimization, 
  onReplicate, 
  onShowAdaptModal,
  isReplicating
}: PublicOptimizationCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const handleAddClick = async () => {
    try {
      await onReplicate(optimization.id, 'copy');
      navigate('/optimizations');
    } catch (error) {
      console.error('Error adding optimization:', error);
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0];
    return parts.slice(0, 2).toUpperCase();
  };

  // Fonction pour tronquer le texte avec ellipses
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="rounded-3xl border border-teal/15 shadow-sm hover:shadow-lg 
      transition-all duration-500 group relative overflow-hidden h-[520px] flex flex-col
      hover:border-teal/30 hover:-translate-y-1 active:translate-y-0 backdrop-blur-sm"
      style={{
        background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(0, 172, 193, 0.15)),
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
          repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255, 255, 255, 0.03) 0.5px, rgba(255, 255, 255, 0.03) 1px)`,
        backgroundBlendMode: 'overlay',
        backdropFilter: 'blur(12px) saturate(1.5)',
      }}
    >
      
      {/* Gradient overlay subtil */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/20 via-transparent to-cyan-50/20 
        opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* En-tête avec info outil - Hauteur fixe */}
      <div className="flex items-center justify-between p-6 pb-4 relative z-10 min-h-[80px]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {optimization.tool && (
            <div className="flex-shrink-0">
              {getToolLogo({
                filename: optimization.tool.logo,
                toolName: optimization.tool.name,
                size: 36
              })}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">AI Tool</p>
            <p className="font-semibold text-gray-900 text-sm truncate">
              {optimization.tool?.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 
            flex items-center justify-center border border-gray-200 group-hover:border-gray-300 
            transition-all duration-300">
            <span className="text-xs font-semibold text-gray-600">
              {getInitials(optimization.author_email)}
            </span>
          </div>
          <div className="text-right min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {optimization.author_email?.split('@')[0] || 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              {formatDate(optimization.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Titre - Hauteur fixe avec troncature */}
      <div className="px-6 pb-4 relative z-10">
        <h3 className="text-lg font-bold text-gray-900 leading-tight h-[3.5rem] flex items-start
          group-hover:text-teal-700 transition-colors duration-300">
          <span className="line-clamp-2">
            {truncateText(optimization.title, 80)}
          </span>
        </h3>
      </div>

      {/* Problème et Solution - Zone flexible mais contrôlée */}
      <div className="px-6 pb-4 flex-1 flex flex-col gap-3 relative z-10 min-h-0">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 
          shadow-sm group-hover:shadow-md transition-all duration-300 h-[120px] overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Context</p>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed line-clamp-5 overflow-hidden font-normal">
            {optimization.problem}
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200/50
          shadow-md group-hover:shadow-lg transition-all duration-300 h-[180px] overflow-hidden
          relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
            animate-[shimmer_3s_infinite] opacity-60 pointer-events-none" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Solution</p>
          </div>
          <p className="text-sm text-teal-900 leading-relaxed line-clamp-6 overflow-hidden font-semibold relative z-10">
            {optimization.solution}
          </p>
        </div>
      </div>

      {/* Actions - Hauteur fixe en bas */}
      <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-50 
        relative z-10 mt-auto bg-gradient-to-r from-gray-50/50 to-transparent">
        
        {/* Bouton Add à gauche */}
        <button
          onClick={handleAddClick}
          disabled={isReplicating}
          className="px-3 py-2.5 bg-white text-gray-700 rounded-3xl text-sm font-medium
            hover:bg-white hover:text-teal-700 transition-all duration-300 flex items-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95
            border border-gray-200 hover:border-teal-200 shadow-sm hover:shadow-md group/add"
        >
          <Plus className="w-4 h-4 group-hover/add:rotate-90 transition-transform duration-300" />
          <span>Add</span>
        </button>
        
        {/* Bouton Adapt à droite */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShowAdaptModal(optimization)}
            disabled={isReplicating}
            className="px-3 py-2.5 bg-gradient-to-r from-[#00ACC1] to-[#00838F] text-white rounded-3xl text-sm font-medium
              hover:from-[#00C4D8] hover:to-[#0097A7] transition-all duration-300 flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95
              shadow-md hover:shadow-lg border-0 group/adapt"
          >
            <Sparkles className="w-4 h-4 group-hover/adapt:rotate-12 transition-transform duration-300" />
            <span>Adapt</span>
          </button>
        </div>
      </div>
    </div>
  );
}