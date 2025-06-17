import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { LogOut, TrendingUp, Blocks, ClipboardList, Target, X, Link2, ExternalLink, Wrench, ArrowRight, Cpu, Compass, Lightbulb, Sparkles } from 'lucide-react';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { SmartConnectionsModal } from '../components/SmartConnectionsModal';
import { GPTPromptConnection } from '../components/GPTPromptConnection';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { getToolLogo } from '../lib/logoUtils';

interface ProfileProps {
  session: Session;
  handleSignOut: () => void;
}

interface UserProfile {
  profile_type: string;
  ai_level: string;
  daily_description: string;
  intentions: string[];
}

interface UserTool {
  id: number;
  name: string;
  description: string;
  logo: string;
  url: string;
  user_tool_id?: string;
}

interface ParsedDailyDescription {
  daily_work: string;
  main_tools: string[];
  current_goals: string[];
}

const PROFILE_TYPE_DESCRIPTIONS = {
  creator: "You're a creative professional who uses AI to enhance your creative work and content production.",
  strategist: "You excel at planning and analysis, using AI to make data-driven decisions and develop strategies.",
  operator: "You're focused on execution and efficiency, leveraging AI to optimize workflows and processes.",
  explorer: "You're curious and experimental, always eager to discover and test new AI technologies."
};

const AI_LEVEL_DESCRIPTIONS = {
  beginner: "You're starting your AI journey, focusing on learning the basics and fundamental applications.",
  intermediate: "You have experience with AI tools and are comfortable using them in your daily work.",
  advanced: "You're highly proficient with AI, using it extensively and exploring advanced applications."
};

export function Profile({ session, handleSignOut }: ProfileProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGPTModal, setShowGPTModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isGPTConnected, setIsGPTConnected] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [parsedDailyDescription, setParsedDailyDescription] = useState<ParsedDailyDescription | null>(null);
  const [tools, setTools] = useState<UserTool[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    fetchUserTools();
    checkGPTStatus();
    
    const state = location.state as { showConnectionsModal?: boolean } | null;
    if (state?.showConnectionsModal) {
      setShowConnectionsModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [session.user.id, location]);

  useEffect(() => {
    if (profile?.daily_description) {
      try {
        if (profile.daily_description.trim().startsWith('{')) {
          const parsedData = JSON.parse(profile.daily_description);
          setParsedDailyDescription({
            daily_work: parsedData.daily_work || '',
            main_tools: Array.isArray(parsedData.main_tools) ? parsedData.main_tools : [],
            current_goals: Array.isArray(parsedData.current_goals) ? parsedData.current_goals : []
          });
        } else {
          setParsedDailyDescription({
            daily_work: profile.daily_description,
            main_tools: [],
            current_goals: []
          });
        }
      } catch (err) {
        console.error('Error parsing daily description:', err);
        setParsedDailyDescription({
          daily_work: profile.daily_description,
          main_tools: [],
          current_goals: []
        });
      }
    }
  }, [profile?.daily_description]);

  const checkGPTStatus = async () => {
    try {
      const { data: gptSync } = await supabase
        .from('gpt_user_sync')
        .select('has_description')
        .eq('user_id', session.user.id)
        .single();
      
      setIsGPTConnected(gptSync?.has_description || false);
    } catch (err) {
      console.error('Error checking GPT status:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profile_ai')
        .select('profile_type, ai_level, daily_description, intentions')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load profile data');
    }
  };

  const fetchUserTools = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tools')
        .select(`
          tools (
            id,
            name,
            description,
            logo,
            url
          ),
          id
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;

      const userTools = data?.map(item => ({
        ...item.tools,
        user_tool_id: item.id
      })) || [];
      setTools(userTools);
    } catch (err) {
      console.error('Error fetching user tools:', err);
      setError('Failed to load tools');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    try {
      const { error } = await supabase
        .from('user_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;

      setTools(prev => prev.filter(tool => tool.user_tool_id !== toolId));
    } catch (err) {
      console.error('Error deleting tool:', err);
      setError('Failed to delete tool');
    }
  };

  const getProfileTypeEmoji = (type: string) => {
    switch (type) {
      case 'creator': return '🎨';
      case 'strategist': return '📊';
      case 'operator': return '⚙️';
      case 'explorer': return '🔍';
      default: return '✨';
    }
  };

  const getAILevelEmoji = (level: string) => {
    switch (level) {
      case 'beginner': return '🌱';
      case 'intermediate': return '📈';
      case 'advanced': return '🚀';
      default: return '✨';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
        <div className="px-4 md:px-8 lg:px-16 pb-6">
          <div className="max-w-[920px] mx-auto">
            <div className="relative h-8 w-40 mb-20 md:mb-24 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-[#f3f3f3] rounded-lg"></div>
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                }}
              ></div>
            </div>
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <SkeletonLoader key={i} type="card" height={i === 0 ? "200px" : "160px"} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
      <div className="px-6 md:px-8 lg:px-16 pb-6">
        <div className="max-w-[920px] mx-auto">
          {/* Header */}
          <div className="mb-20 md:mb-24 text-center relative">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3 animate-fade-scale">
              Your AI Profile
            </h1>
            <p className="text-text-secondary text-sm md:text-base max-w-md mx-auto animate-fade-scale-sm">
              Your AI profile helps Lynor personalize recommendations and optimizations.
            </p>
          </div>

          <div className="space-y-8">
            {/* Smart Connections Card */}
            <div className="rounded-3xl p-6 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] animate-fade-scale"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-teal" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-1">Smart Connections</h2>
                    <p className="text-text-secondary text-sm">Connect your AI tools to enhance Lynor's suggestions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConnectionsModal(true)}
                  className="btn-primary px-6 py-3 rounded-3xl text-sm font-semibold flex items-center gap-1.5 relative overflow-hidden"
                >
                  <span className="relative z-10">{isGPTConnected ? 'Manage' : 'Connect'}</span>
                  <Link2 className="w-4 h-4 relative z-10" />
                </button>
              </div>
            </div>

            {/* AI Profile */}
            <div className="rounded-3xl p-6 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] animate-fade-scale"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-6 flex items-center gap-2">
                <Blocks className="w-5 h-5 text-teal" />
                My AI Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Type Card */}
                <div className="bg-teal/5 rounded-xl p-5 border border-teal/10 hover:border-teal/20 transition-all duration-300 hover:shadow-md group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Blocks className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Profile Type</p>
                      <h3 className="font-semibold text-text-primary capitalize">
                        {profile?.profile_type || 'Not set'} {getProfileTypeEmoji(profile?.profile_type || '')}
                      </h3>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {profile?.profile_type ? 
                      PROFILE_TYPE_DESCRIPTIONS[profile.profile_type as keyof typeof PROFILE_TYPE_DESCRIPTIONS] 
                      : 'Complete your AI profile to see your type'}
                  </p>
                </div>

                {/* AI Level Card */}
                <div className="bg-teal/5 rounded-xl p-5 border border-teal/10 hover:border-teal/20 transition-all duration-300 hover:shadow-md group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">AI Level</p>
                      <h3 className="font-semibold text-text-primary capitalize">
                        {profile?.ai_level || 'Not set'} {getAILevelEmoji(profile?.ai_level || '')}
                      </h3>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {profile?.ai_level ? 
                      AI_LEVEL_DESCRIPTIONS[profile.ai_level as keyof typeof AI_LEVEL_DESCRIPTIONS]
                      : 'Complete your AI profile to see your level'}
                  </p>
                </div>

                {/* Goals & Intentions Card */}
                <div className="bg-teal/5 rounded-xl p-5 border border-teal/10 hover:border-teal/20 transition-all duration-300 hover:shadow-md group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-5 h-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Goals & Intentions</p>
                      <h3 className="font-semibold text-text-primary">
                        {profile?.intentions && profile.intentions.length 
                          ? `${profile.intentions.length} Goals` 
                          : 'No goals set'}
                      </h3>
                    </div>
                  </div>
                  {profile?.intentions && profile.intentions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.intentions.map((intention, index) => (
                        <div 
                          key={index}
                          className="px-2 py-1 bg-teal/10 text-teal rounded-full text-xs"
                        >
                          {intention}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-secondary text-sm">
                      No goals or intentions set yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Work & Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-scale">
              {/* Daily Work Card */}
              <div className="rounded-3xl p-6 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] h-full"
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: 'overlay',
                  backdropFilter: 'blur(8px) saturate(1.4)',
                }}
              >
                {/* Daily Work Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-teal" />
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold text-text-primary">Your Daily Work</h2>
                  </div>
                  <div className="bg-teal/5 rounded-xl p-5 border border-teal/10">
                    {parsedDailyDescription?.daily_work ? (
                      <div className="space-y-2">
                        {parsedDailyDescription.daily_work
                          .split(/\.\s+/)
                          .filter(sentence => sentence.trim().length > 0)
                          .map((sentence, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="text-teal mt-1 text-lg">•</span>
                              <p className="text-text-primary">{sentence.trim() + (sentence.endsWith('.') ? '' : '.')}</p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-text-primary leading-relaxed">
                        {profile?.daily_description || 'No daily routine description available.'}
                      </p>
                    )}
                  </div>
                </div>
                {/* Main Tools Section */}
                {parsedDailyDescription?.main_tools && parsedDailyDescription.main_tools.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-teal" />
                      </div>
                      <h2 className="text-lg md:text-xl font-semibold text-text-primary">Your Main Tools</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsedDailyDescription.main_tools.map((tool, index) => (
                        <div 
                          key={index}
                          className="px-3 py-1.5 bg-teal/5 border border-teal/10 text-text-primary rounded-full text-sm flex items-center gap-2 hover:bg-teal/10 transition-colors"
                        >
                          <div className="w-4 h-4 rounded-full bg-teal/20 flex items-center justify-center">
                            <span className="text-[8px] text-teal">AI</span>
                          </div>
                          {tool}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Current Goals Section */}
                {parsedDailyDescription?.current_goals && parsedDailyDescription.current_goals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-teal" />
                      </div>
                      <h2 className="text-lg md:text-xl font-semibold text-text-primary">Your Current Goals</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsedDailyDescription.current_goals.map((goal, index) => (
                        <div 
                          key={index}
                          className="px-3 py-1.5 bg-teal/10 text-teal rounded-full text-sm"
                        >
                          {goal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Tools Card */}
              <div className="rounded-3xl p-6 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] h-full"
                style={{
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                  backgroundBlendMode: 'overlay',
                  backdropFilter: 'blur(8px) saturate(1.4)',
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-teal" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-text-primary">Your AI Tools</h2>
                </div>
                {tools.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tools.map((tool) => (
                      <div 
                        key={tool.id}
                        className="flex items-start gap-3 p-3 rounded-xl bg-teal/5 hover:bg-teal/10 transition-colors relative group"
                      >
                        <button
                          onClick={() => handleDeleteTool(tool.user_tool_id!)}
                          className="absolute top-2 right-2 p-1 text-transparent group-hover:text-teal/50 hover:text-red-600 transition-all duration-200 active:scale-95"
                          title="Remove tool"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-shrink-0 flex items-center justify-center">
                          {getToolLogo({
                            filename: tool.logo,
                            toolName: tool.name,
                            size: 36
                          })}
                        </div>
                        <div className="min-w-0">
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-text-primary mb-1 hover:text-teal transition-colors inline-flex items-center gap-1 truncate max-w-full"
                          >
                            <span className="truncate">{tool.name}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                          <p className="text-text-secondary text-xs line-clamp-2">{tool.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-teal/5 rounded-xl border border-teal/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-teal/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-transform duration-500">
                        <Compass className="w-8 h-8 text-teal" />
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary mb-3">Discover AI Tools</h3>
                      <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">
                        Explore and add powerful AI tools to enhance your workflow
                      </p>
                      <button
                        onClick={() => navigate('/discovery')}
                        className="btn-primary px-6 py-3 rounded-3xl text-sm font-semibold flex items-center gap-1.5 mx-auto relative overflow-hidden"
                      >
                        <span className="relative z-10">Browse Tools</span>
                        <ArrowRight className="w-4 h-4 relative z-10" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lynor Copilot Insights */}
            <div className="rounded-3xl p-6 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_8px_24px_rgba(0,172,193,0.4)] animate-fade-scale cursor-pointer group overflow-hidden"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-teal/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-teal/0 via-teal/5 to-teal/0 opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center shadow-[0_0_12px_rgba(0,172,193,0.2)] group-hover:shadow-[0_0_20px_rgba(0,172,193,0.5)] transition-all duration-500">
                  <Lightbulb className="w-6 h-6 text-teal" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-text-primary">Lynor Copilot Insights</h2>
                  <p className="text-text-secondary text-sm">Coming soon</p>
                </div>
              </div>
              <div className="bg-teal/5 rounded-xl p-5 border border-teal/10 flex items-start gap-4 group-hover:border-teal/20 transition-all duration-500 shadow-[0_4px_12px_rgba(0,172,193,0.05)] group-hover:shadow-[0_8px_24px_rgba(0,172,193,0.15)]">
                <div className="w-1 h-full bg-gradient-to-b from-teal/20 to-teal/5 rounded-full" />
                <div>
                  <p className="text-text-primary leading-relaxed text-base">
                    Soon: personalized insights and diagnostics from Lynor Copilot based on your usage patterns and AI interactions.
                  </p>
                  <div className="flex mt-4 gap-3">
                    <div className="h-3 w-24 rounded-full bg-gradient-to-r from-teal/20 to-teal/10 animate-pulse"></div>
                    <div className="h-3 w-16 rounded-full bg-gradient-to-r from-teal/20 to-teal/10 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="h-3 w-20 rounded-full bg-gradient-to-r from-teal/20 to-teal/10 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign Out Section */}
            <div className="rounded-3xl p-6 md:p-8 border border-teal/15 hover:border-teal/25 transition-all duration-300 relative shadow-sm hover:shadow-[0_4px_12px_rgba(0,172,193,0.2)] animate-fade-scale group"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(8px) saturate(1.4)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-teal/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <LogOut className="w-5 h-5 text-teal" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold text-teal">Sign Out</h2>
              </div>
              <p className="text-text-secondary text-sm mb-6 max-w-lg">
                Sign out of your account. You'll need to sign in again to access your profile and tools.
              </p>
              <button
                onClick={handleSignOut}
                className="btn-primary px-6 py-3 rounded-3xl text-sm font-semibold flex items-center gap-1.5 relative overflow-hidden"
              >
                <LogOut className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Connections Modal */}
      {showConnectionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-scale"
          style={{ animationDelay: '0s' }}
        >
          <div className="rounded-3xl p-8 max-w-md w-full border border-teal/20 hover:border-teal/30 transition-all duration-300 relative shadow-[0_4px_16px_rgba(0,172,193,0.3)] group"
            style={{
              background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.05)),
                url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
              backgroundBlendMode: 'overlay',
              backdropFilter: 'blur(10px) saturate(1.6)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-teal/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <SmartConnectionsModal
              session={session}
              onClose={() => setShowConnectionsModal(false)}
              onConnectGPT={() => {
                setShowConnectionsModal(false);
                setTimeout(() => {
                  setShowGPTModal(true);
                }, 200);
              }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center shadow-[0_0_12px_rgba(0,172,193,0.2)] group-hover:shadow-[0_0_20px_rgba(0,172,193,0.4)] transition-all duration-500">
                    <Link2 className="w-6 h-6 text-teal" />
                  </div>
                  <h2 className="text-2xl font-semibold text-text-primary">Smart Connections</h2>
                </div>
                <button
                  onClick={() => setShowConnectionsModal(false)}
                  className="p-2 text-teal/50 hover:text-teal transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 bg-teal/10 text-teal text-xs font-medium rounded-full flex items-center gap-1 animate-pulse-slow">
                    <Sparkles className="w-3 h-3" /> Recommended
                  </span>
                </div>
                <p className="text-base text-text-secondary leading-relaxed">
                  Connect your AI tools to enhance Lynor's suggestions
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    setShowConnectionsModal(false);
                    setTimeout(() => {
                      setShowGPTModal(true);
                    }, 200);
                  }}
                  className="btn-primary px-6 py-3 rounded-3xl text-base font-semibold flex items-center gap-2 justify-center relative overflow-hidden shadow-[0_4px_12px_rgba(0,172,193,0.2)] hover:shadow-[0_6px_16px_rgba(0,172,193,0.3)] animate-pulse-slow"
                >
                  <Link2 className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Connect GPT</span>
                </button>
                <div className="flex gap-2 mt-2">
                  <div className="h-2 w-16 rounded-full bg-gradient-to-r from-teal/20 to-teal/10 animate-pulse" style={{ animationDelay: "0s" }}></div>
                  <div className="h-2 w-12 rounded-full bg-gradient-to-r from-teal/20 to-teal/10 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="h-2 w-20 rounded-full bg-gradient-to-r from-teal/20 to-teal/10 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </SmartConnectionsModal>
          </div>
        </div>
      )}
      
      {/* GPT Connection Modal */}
      {showGPTModal && (
        <GPTPromptConnection
          session={session}
          onClose={() => {
            setIsClosingModal(true);
            setTimeout(() => {
              setShowGPTModal(false);
              setIsClosingModal(false);
            }, 200);
          }}
          onSuccess={() => {
            setShowGPTModal(false);
            setIsClosingModal(false);
          }}
          isClosing={isClosingModal}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes fade-scale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-scale-sm {
          0% { opacity: 0; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .btn-primary {
          background: linear-gradient(
            135deg,
            rgba(0, 172, 193, 0.8),
            rgba(0, 131, 143, 0.7)
          ),
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>');
          background-blend-mode: overlay;
          color: white;
          font-weight: 600;
          box-shadow: 
            0 4px 12px rgba(0, 172, 193, 0.2),
            inset 0 0 4px rgba(0, 172, 193, 0.2);
          backdrop-filter: blur(8px) saturate(1.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-primary:hover {
          background: linear-gradient(
            135deg,
            rgba(0, 200, 220, 0.9),
            rgba(0, 131, 143, 0.8)
          );
          transform: translateY(-1px) scale(1.03);
          box-shadow: 
            0 8px 20px rgba(0, 172, 193, 0.4),
            inset 0 0 6px rgba(0, 172, 193, 0.3);
        }
        .btn-primary:active {
          transform: scale(0.98);
          box-shadow: 
            0 2px 8px rgba(0, 172, 193, 0.2),
            inset 0 0 4px rgba(0, 172, 193, 0.2);
        }
      `}</style>
    </div>
  );
}