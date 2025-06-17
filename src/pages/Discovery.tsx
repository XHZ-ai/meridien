import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { Compass, Search, X, Filter, CheckCircle2, Code, Zap, PenTool, BarChart, Brain, MessageSquare, Layout, LineChart, Star, Check, ArrowRight, Cpu, Palette, ListTodo, Microscope, Binary, Bot, Brush, Target } from 'lucide-react';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Toast } from '../components/Toast';
import { supabase, checkNetworkStatus } from '../lib/supabase';
import { ToolCard } from '../components/ToolCard';
import { ToolModal } from '../components/ToolModal';
import OpenAI from 'openai';
import { findSimilarTools, filterToolsBySimilarity, ToolWithEmbedding } from '../lib/semanticMatching';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});
const getToolLogo = ({
  filename,
  toolName,
  size = 32,
  version = 1, // ⚠️ tu peux changer cette version à 2 ou 3 si nécessaire
}: {
  filename?: string;
  toolName: string;
  size?: number;
  version?: number;
}) => {
  if (filename) {
    return (
      <img
        src={`/logos/${filename}?v=${version}`} // ⚠️ Ajout du cache buster ici
        alt={toolName}
        className="rounded-xl object-contain shadow-sm"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  } else {
    return (
      <div
        className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center rounded-xl font-semibold shadow-sm"
        style={{ width: size, height: size }}
      >
        {toolName.charAt(0).toUpperCase()}
      </div>
    );
  }
};
interface DiscoveryProps {
  session: Session;
}

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  logo: string;
  category: string;
  pricing: string;
  keywords: string;
  isAdded?: boolean;
  matchScore?: number;
}

const CATEGORIES = [
  {
    id: 'Automatisation',
    name: 'Automation',
    description: 'Automate workflows, sync data, and connect apps — no code.',
    icon: Cpu
  },
  {
    id: 'Contenu & Création',
    name: 'Creation',
    description: 'Generate text, images, videos, audio, or complete content pieces.',
    icon: Palette
  },
  {
    id: 'Organisation & Productivité',
    name: 'Productivity',
    description: 'Plan tasks, manage focus, and organize daily work with smart tools.',
    icon: ListTodo
  },
  {
    id: 'Recherche & Analyse',
    name: 'Research',
    description: 'Find, extract, and summarize complex information or trends.',
    icon: Microscope
  },
  {
    id: 'Développement & Code',
    name: 'Coding',
    description: 'Generate code, build apps, and accelerate development with AI.',
    icon: Binary
  },
  {
    id: 'Communication & IA Générative',
    name: 'LLM',
    description: 'ChatGPT-style tools for conversation, summarization, and smart replies',
    icon: Bot
  },
  {
    id: 'Design & Visuels',
    name: 'Design',
    description: 'Create visuals, edit media, and design assets instantly.',
    icon: Brush
  },
  {
    id: 'Business & Stratégie',
    name: 'Business',
    description: 'Boost strategy, marketing, and analytics with AI-driven tools.',
    icon: Target
  }
];

const getCategoryStyle = (categoryId: string) => {
  const styles = {
    'Automatisation': {
      default: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      selected: 'bg-indigo-600 text-white'
    },
    'Contenu & Création': {
      default: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
      selected: 'bg-rose-600 text-white'
    },
    'Organisation & Productivité': {
      default: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
      selected: 'bg-emerald-600 text-white'
    },
    'Recherche & Analyse': {
      default: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      selected: 'bg-amber-600 text-white'
    },
    'Développement & Code': {
      default: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
      selected: 'bg-cyan-600 text-white'
    },
    'Communication & IA Générative': {
      default: 'bg-violet-50 text-violet-600 hover:bg-violet-100',
      selected: 'bg-violet-600 text-white'
    },
    'Design & Visuels': {
      default: 'bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100',
      selected: 'bg-fuchsia-600 text-white'
    },
    'Business & Stratégie': {
      default: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      selected: 'bg-blue-600 text-white'
    }
  };
  
  return styles[categoryId as keyof typeof styles] || {
    default: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
    selected: 'bg-gray-600 text-white'
  };
};

export function Discovery({ session }: DiscoveryProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [placeholderText, setPlaceholderText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<{ toolId: number; visible: boolean }>({ toolId: 0, visible: false });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showingSearchResults, setShowingSearchResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const placeholders = [
    'Build a website',
    'Image generating',
    '3D design',
    'Writing marketing content',
    'Build an app'
  ];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const showNextPlaceholder = () => {
      setIsTransitioning(false);
      // Fade out current text
      setTimeout(() => {
        setPlaceholderText(placeholders[currentTextIndex]);
        setIsTransitioning(false);
        
        // Schedule next text change
        timeoutId = setTimeout(() => {
        const nextIndex = (currentTextIndex + 1) % placeholders.length;
        setCurrentTextIndex(nextIndex);
        }, 2000); // Show each text for 2 seconds
      }, 200); // Fade out duration
    };

    showNextPlaceholder();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentTextIndex, placeholders]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const pricingOptions = [
    { value: 'Gratuit', label: 'Gratuit' },
    { value: 'Freemium', label: 'Freemium' },
    { value: 'Payant', label: 'Payant' }
  ];

  useEffect(() => {
    async function fetchTools() {
      try {
        setIsLoading(true);
        setError(null);

        // Check network connectivity first
        if (!checkNetworkStatus()) {
          throw new Error('No internet connection. Please check your network and try again.');
        }

        // Implement retry mechanism with exponential backoff
        const maxRetries = 3;
        let retryCount = 0;
        let lastError = null;

        while (retryCount < maxRetries) {
          try {
            const { data, error } = await supabase
              .from('tools')
              .select('id, name, description, url, logo, category, pricing, keywords');

            if (error) {
              throw error;
            }

            if (data) {
              // Fetch user's added tools
              const { data: userTools, error: userToolsError } = await supabase
                .from('user_tools')
                .select('tool_id')
                .eq('user_id', session.user.id);

              if (userToolsError) {
                console.error('Error fetching user tools:', userToolsError);
                throw userToolsError;
              }

              // Mark tools that are already added
              const toolsWithStatus = data.map(tool => ({
                ...tool,
                isAdded: userTools?.some(ut => ut.tool_id === tool.id) || false
              }));

              setTools(toolsWithStatus);
              setFilteredTools(toolsWithStatus);

              const categories = [...new Set(data.map(tool => tool.category).filter(Boolean))];
              const initialCategories = categories.slice(0, 10);
              setVisibleCategories(initialCategories);

              // Successfully fetched data, exit retry loop
              break;
            }
          } catch (err) {
            lastError = err;
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Wait with exponential backoff before retrying
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
          }
        }

        // If we've exhausted all retries and still have an error, throw it
        if (retryCount === maxRetries && lastError) {
          throw lastError;
        }

      } catch (err: any) {
        console.error('Error fetching tools:', err);
        setError(err.message || 'Failed to load tools. Please try again later.');
        setTools([]);
        setFilteredTools([]);
      } finally {
        setTimeout(() => setIsLoading(false), 800);
      }
    }

    fetchTools();
  }, [session.user.id]);
  
  useEffect(() => {
    // Start with all tools
    let filtered = [...tools];
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(tool => 
        selectedCategories.includes(tool.category)
      );
    }
    
    // Filter out paid tools when Free Mode is enabled (desktop only)
    if (!isMobile && showFreeOnly) {
      filtered = filtered.filter(tool => tool.pricing !== 'Payant');
    }
    
    // For semantic search, tools already come with matchScore, so we don't need to filter here
    // Just make sure we keep previous filter functionality intact
    
    setFilteredTools(filtered);
  }, [tools, selectedCategories, searchQuery, priceFilters, showFreeOnly]);

  const handleCategorySelect = (categoryId: string) => {
    if (isMobile) {
      // For mobile, update selectedCategories for filter behavior
      setSelectedCategories(prev => {
        if (prev.includes(categoryId)) {
          return prev.filter(id => id !== categoryId);
        } else {
          return [...prev, categoryId];
        }
      });
    } else {
      // For desktop, update selectedCategory for scroll behavior
      setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
      
      // Also update selectedCategories for filtering
      if (categoryId === selectedCategory) {
        setSelectedCategories([]);
      } else {
        setSelectedCategories([categoryId]);
      }
    }
  };
  
  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery('');
    setShowingSearchResults(false);
    
    // Reset all match scores
    setTools(prevTools => prevTools.map(tool => ({
      ...tool,
      matchScore: undefined
    })));
  };

  const handleAddToTools = async (tool: Tool) => {
    try {
      const { data, error: checkError } = await supabase
        .from('user_tools')
        .select('id')
        .match({ user_id: session.user.id, tool_id: tool.id })
        .maybeSingle();

      if (checkError) {
        console.error('Supabase error:', checkError);
        throw new Error(checkError.message);
      }

      if (data) {
        // Tool already added
        console.log('Tool already in user\'s collection');
        // Update tools state to mark this tool as added
        setTools(prev => prev.map(t => 
          t.id === tool.id ? { ...t, isAdded: true } : t
        ));
        setToast({ message: `${tool.name} is already in your collection`, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        return;
      }

      const { error: insertError } = await supabase
        .from('user_tools')
        .insert([
          { user_id: session.user.id, tool_id: tool.id }
        ]);

      if (insertError) {
        console.error('Supabase error:', insertError);
        setToast({ message: `Failed to add ${tool.name}`, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        throw new Error(insertError.message);
      }

      // Show success animation
      setSuccessAnimation({ toolId: tool.id, visible: true });
      setToast({ message: `${tool.name} added to your tools`, type: 'success' });
      // Update tools state to mark this tool as added
      setTools(prev => prev.map(t => 
        t.id === tool.id ? { ...t, isAdded: true } : t
      ));
      setTimeout(() => setToast(null), 3000);
      
      setTimeout(() => {
        setSuccessAnimation({ toolId: 0, visible: false });
      }, 2000);
    } catch (err) {
      console.error('Error adding tool:', err);
      setToast({ message: `Failed to add ${tool.name}`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    
    setSelectedCategories([]); // Clear category filters before search
    
    try {
      setIsSearching(true);
      setError(null);
      
      // Check if OpenAI API key is available
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        setToast({ message: "OpenAI API key is missing. Please check your configuration.", type: 'error' });
        setIsSearching(false);
        return;
      }
      
      // Use semantic matching instead of keyword extraction
      console.log("Performing semantic search for:", searchQuery);
      
      try {
        // Find similar tools using embeddings
        const similarTools = await findSimilarTools(searchQuery, session.user.id);
        
        // Filter by similarity score
        const highRelevanceTools = filterToolsBySimilarity(similarTools, 0.75);
        
        console.log(`Found ${highRelevanceTools.length} relevant tools with embeddings`);
        
        // Update tools state with match scores
        setTools(similarTools);
        
        // Set flag to show search results
        setShowingSearchResults(true);
        
        // Display results toast
        setToast({ 
          message: `Found ${highRelevanceTools.length} tools matching your search`, 
          type: 'success' 
        });
        setTimeout(() => setToast(null), 5000);
      } catch (embeddingError) {
        console.error("Error with semantic search:", embeddingError);
        setError("Failed to search using AI. Please try again.");
      }
      
    } catch (err) {
      console.error('Error searching tools:', err);
      setError('Failed to search. Please try again.');
      setShowingSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
        <div className="px-4 md:px-8 lg:px-16 pb-6">
          <div className="max-w-[1280px] mx-auto">
            <SkeletonLoader type="text" width="200px" height="32px" className="mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonLoader key={i} type="card" height="280px" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
      <div className="px-4 md:px-8 lg:px-16 pb-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-8 md:mb-12 mt-10 md:mt-12 tracking-tight">
              I want an AI tool to...
            </h1>
            
            {/* Modern Search Container */}
            <div className="relative max-w-[640px] mx-auto">
              <div className="relative flex items-center">
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Describe a task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 rounded-full bg-white border border-gray-200 
                    focus:border-text-primary focus:outline-none transition-all duration-300 text-base
                    placeholder:text-gray-400 pr-16 shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className={`absolute right-2.5 w-10 h-10 flex items-center justify-center rounded-full transition-all
                    ${searchQuery.trim() && !isSearching 
                      ? 'bg-black text-white hover:bg-black/90' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  aria-label="Search"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
                
                {showingSearchResults && (
                  <button 
                    onClick={() => {
                      setShowingSearchResults(false);
                      setSearchQuery('');
                      setTools(prevTools => prevTools.map(tool => ({
                        ...tool,
                        matchScore: undefined
                      })));
                    }}
                    className="absolute right-[60px] p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              {/* Free/Paid Toggles */}
              <div className="hidden md:flex items-center justify-center mt-8">
                <button
                  onClick={() => setShowFreeOnly(!showFreeOnly)}
                  className={`px-4 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 text-sm
                    shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                    ${showFreeOnly 
                      ? 'bg-gradient-to-br from-[#292929] to-[#1a1a1a] text-white border border-black/10' 
                      : 'bg-white text-[#666666] border border-gray-200 hover:border-gray-300 hover:text-[#292929]'}`}
                >
                  <span>Free Mode</span>
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    showFreeOnly 
                      ? 'bg-emerald-400 scale-100' 
                      : 'bg-gray-300 scale-90'
                  }`} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile Category Pills */}
          {isMobile && (
            <div className="mb-6">
              <div className="overflow-x-auto hide-scrollbar pb-2">
                <div className="flex gap-2 min-w-max px-1">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`py-2 px-4 rounded-full text-sm font-medium whitespace-nowrap shadow-sm
                        ${selectedCategories.includes(category.id)
                          ? 'bg-[#292929] text-white'
                          : 'bg-white text-[#292929] border border-gray-200'
                        } transition-all duration-300`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Desktop Category Carousel */}
          {!isMobile && (
            <div className="mb-8 relative hidden md:block">
              {/* Left Arrow */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 z-20">
                <button
                  onClick={() => {
                    const container = document.getElementById('category-scroll');
                    if (container) {
                      container.scrollTo({
                        left: container.scrollLeft - 340,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200
                    flex items-center justify-center text-gray-600"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
              </div>
              
              {/* Scrollable Container */}
              <div id="category-scroll" className="overflow-x-auto hide-scrollbar relative">
                <div className="flex gap-4 pb-4 min-w-max px-4 md:px-0 mx-20 ml-4 scroll-smooth">
                {CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`group bg-white rounded-[20px] p-6 border transition-all duration-300 cursor-pointer
                      min-w-[320px] max-w-[320px] flex flex-col gap-4 hover:-translate-y-1 active:translate-y-0
                      ${
                        selectedCategory === category.id 
                          ? `ring-2 ring-${
                              category.id === 'Automatisation' ? 'indigo' : 
                              category.id === 'Contenu & Création' ? 'rose' :
                              category.id === 'Organisation & Productivité' ? 'emerald' :
                              category.id === 'Recherche & Analyse' ? 'amber' :
                              category.id === 'Développement & Code' ? 'cyan' :
                              category.id === 'Communication & IA Générative' ? 'violet' :
                              category.id === 'Design & Visuels' ? 'fuchsia' :
                              category.id === 'Business & Stratégie' ? 'blue' :
                              'gray'}-500/40 shadow-lg bg-gradient-to-br from-${
                              category.id === 'Automatisation' ? 'indigo' : 
                              category.id === 'Contenu & Création' ? 'rose' :
                              category.id === 'Organisation & Productivité' ? 'emerald' :
                              category.id === 'Recherche & Analyse' ? 'amber' :
                              category.id === 'Développement & Code' ? 'cyan' :
                              category.id === 'Communication & IA Générative' ? 'violet' :
                              category.id === 'Design & Visuels' ? 'fuchsia' :
                              category.id === 'Business & Stratégie' ? 'blue' :
                              'gray'}-50/40 to-white/90 border-transparent`
                          : 'border-gray-200 hover:border-gray-300 shadow-card hover:shadow-lg'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 flex items-center justify-center
                        transition-all duration-300 rounded-xl ${
                          selectedCategory === category.id
                            ? `bg-${
                                category.id === 'Automatisation' ? 'indigo' : 
                                category.id === 'Contenu & Création' ? 'rose' :
                                category.id === 'Organisation & Productivité' ? 'emerald' :
                                category.id === 'Recherche & Analyse' ? 'amber' :
                                category.id === 'Développement & Code' ? 'cyan' :
                                category.id === 'Communication & IA Générative' ? 'violet' :
                                category.id === 'Design & Visuels' ? 'fuchsia' :
                                category.id === 'Business & Stratégie' ? 'blue' :
                                'gray'}-100/90  shadow-sm`
                            : category.id === 'Automatisation' ? 'text-indigo-600' : // Automatisation
                              category.id === 'Contenu & Création' ? 'text-rose-600' : // Contenu & Création
                              category.id === 'Organisation & Productivité' ? 'text-emerald-600' : // Organisation & Productivité
                              category.id === 'Recherche & Analyse' ? 'text-amber-600' : // Recherche & Analyse
                              category.id === 'Développement & Code' ? 'text-cyan-600' : // Développement & Code
                              category.id === 'Communication & IA Générative' ? 'text-violet-600' :
                              category.id === 'Design & Visuels' ? 'text-fuchsia-600' :
                              category.id === 'Business & Stratégie' ? 'text-blue-600' :
                              'text-gray-600' + ' group-hover:scale-110'
                        }`}>
                        <category.icon className={`w-6 h-6 transition-transform duration-300 ${selectedCategory === category.id ? 'scale-110' : ''}`} />
                      </div>
                      <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                        selectedCategory === category.id 
                          ? category.id === 'Automatisation' ? 'text-indigo-700' :
                            category.id === 'Contenu & Création' ? 'text-rose-700' :
                            category.id === 'Organisation & Productivité' ? 'text-emerald-700' :
                            category.id === 'Recherche & Analyse' ? 'text-amber-700' :
                            category.id === 'Développement & Code' ? 'text-cyan-700' :
                            category.id === 'Communication & IA Générative' ? 'text-violet-700' :
                            category.id === 'Design & Visuels' ? 'text-fuchsia-700' :
                            category.id === 'Business & Stratégie' ? 'text-blue-700' :
                            'text-gray-700'
                          : 'text-text-primary'
                      }`}>{category.name}</h3>
                    </div>
                    <p className={`text-sm transition-colors duration-300 ${
                      selectedCategory === category.id ? 'text-text-primary' : 'text-text-secondary'
                    }`}>{category.description}</p>
                  </div>
                ))}
                </div>
              </div>
              
              {/* Right Arrow */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 z-20">
                <button
                  onClick={() => {
                    const container = document.getElementById('category-scroll');
                    if (container) {
                      container.scrollTo({
                        left: container.scrollLeft + 340,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200
                    flex items-center justify-center text-gray-600"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {showingSearchResults ? (
            <div className="bg-white rounded-[20px] p-6 md:p-8 border border-gray-200 shadow-card animate-fade-scale">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Search Results</h2>
                <span className="text-sm text-text-secondary">
                  Found {filteredTools.length} matching tools
                </span>
              </div>
              
              {filteredTools.length === 0 ? (
                <div className="bg-gray-50 rounded-[20px] p-8 text-center border border-gray-200 max-w-md mx-auto">
                  <Compass className="w-12 h-12 text-button/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2">No matching tools found</h3>
                  <p className="text-text-secondary mb-4">
                    Try adjusting your search terms or filters to find relevant tools.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-button text-white rounded-[20px] hover:bg-button/90 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      title={tool.name}
                      category={tool.category}
                      icon={<Code />}
                      description={tool.description}
                      pricing={tool.pricing}
                      logo={tool.logo}
                      url={tool.url}
                      onLearnMore={() => setSelectedTool(tool)}
                      onAddToTools={() => handleAddToTools(tool)}
                      showSuccess={successAnimation.visible && successAnimation.toolId === tool.id}
                      isAdded={tool.isAdded}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : selectedCategory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools
                .filter(tool => tool.category === selectedCategory)
                .map((tool) => (
                  <ToolCard
                    key={tool.id}
                    title={tool.name}
                    category={tool.category}
                    icon={<Code />}
                    description={tool.description}
                    pricing={tool.pricing}
                    logo={tool.logo}
                    url={tool.url}
                    onLearnMore={() => setSelectedTool(tool)}
                    onAddToTools={() => handleAddToTools(tool)}
                    showSuccess={successAnimation.visible && successAnimation.toolId === tool.id}
                    isAdded={tool.isAdded}
                  />
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-6 text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-500/20 text-red-600 rounded-[20px] hover:bg-red-500/30 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  title={tool.name}
                  category={tool.category}
                  icon={<Code />}
                  description={tool.description}
                  pricing={tool.pricing}
                  logo={tool.logo}
                  url={tool.url}
                  onLearnMore={() => setSelectedTool(tool)}
                  onAddToTools={() => handleAddToTools(tool)}
                  showSuccess={successAnimation.visible && successAnimation.toolId === tool.id}
                  isAdded={tool.isAdded}
                />
              ))}
            </div>
          )}

          {/* Tool Details Modal */}
          {selectedTool && (
            <ToolModal
              tool={selectedTool}
              session={session}
              onClose={() => setSelectedTool(null)}
              onAddToTools={() => handleAddToTools(selectedTool)}
            />
          )}

          {/* Toast Message */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}