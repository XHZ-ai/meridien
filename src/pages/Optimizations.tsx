import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { IconBrandOpenai } from '@tabler/icons-react';
import { Menu, AlertTriangle, X, ArrowRight, AlertCircle, Rocket, Gauge, Eye, MessagesSquare, Star } from 'lucide-react';
import { SkeletonLoader } from '../components/misc/SkeletonLoader';
import { OptimizationDetailsModal } from '../components/OptimizationDetailsModal';
import { supabase } from '../lib/supabase';
import { getToolLogo } from '../lib/utils';

interface OptimizationsProps {
  session: Session;
}

interface Task {
  id: string;
  title: string;
  name: string;
  difficulty_level: string;
  execution_started: boolean;
  workflow_fit: string;
  description: string;
  experience_level_match: string;
  profile_alignment: string;
  problem: string;
  url?: string;
  has_conversation?: boolean;
}

export function Optimizations({ session }: OptimizationsProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [fetchingConversations, setFetchingConversations] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [session.user.id]);

  const showDeleteConfirmation = (task: Task) => {
    setTaskToDelete(task);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setDeletingTaskId(taskId);
      
      const { error: deleteError } = await supabase
        .from('user_optimizations')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', session.user.id);

      if (deleteError) {
        throw deleteError;
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      setTaskToDelete(null);
      setError('Failed to delete optimization');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_optimizations')
        .select(`
          *,
          task_history:task_id(*)
        `)
        .match({
          user_id: session.user.id
        })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching tasks:', fetchError);
        setError('Failed to load optimizations');
        return;
      }

      // Transform the data to match the Task interface
      const transformedTasks = data?.reduce((acc: Task[], item) => {
        if (item.task_history) {
          acc.push({
            id: item.task_history.id,
            title: item.task_history.title,
            name: item.task_history.name,
            difficulty_level: item.task_history.difficulty_level || 'intermediate',
            execution_started: item.task_history.execution_started,
            description: item.task_history.description || '',
            workflow_fit: item.task_history.workflow_fit || 'Customized for your workflow',
            experience_level_match: item.task_history.experience_level_match || 'Matched to your AI experience',
            profile_alignment: item.task_history.profile_alignment || 'Aligned with your working style',
            problem: item.task_history.problem || ''
          });
        }
        return acc;
      }, []) || [];

      setTasks(transformedTasks);
      
      // Check which optimizations have existing conversations
      if (transformedTasks.length > 0) {
        await checkExistingConversations(transformedTasks);
      }
    } catch (err) {
      console.error('Error in fetchTasks:', err);
      setError('An unexpected error occurred');
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };
  
  const checkExistingConversations = async (taskList: Task[]) => {
    try {
      setFetchingConversations(true);
      
      const { data: conversations, error } = await supabase
        .from('copilot_conversations')
        .select('optimization_id')
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }
      
      // Create a set of optimization IDs that have conversations
      const optimizationIds = new Set(conversations?.map(conv => conv.optimization_id) || []);
      
      // Update tasks with conversation status
      setTasks(taskList.map(task => ({
        ...task,
        has_conversation: optimizationIds.has(task.id)
      })));
    } catch (err) {
      console.error('Error checking conversations:', err);
    } finally {
      setFetchingConversations(false);
    }
  };

  const handleExecuteOptimization = (taskId: string) => {
    navigate(`/execute/${taskId}`);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-primary pt-[20px]">
      <div className="px-4 md:px-8 lg:px-16 pb-6">
        <div className="max-w-[1280px] mx-auto">
          <h1 className="text-2xl md:text-[2.5rem] font-bold text-text-primary mb-8 animate-cinematicFadeIn">
            My Optimizations
          </h1>
      
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="relative rounded-3xl overflow-hidden">
                  <div className="bg-[#f3f3f3] h-[260px] w-full">
                    <div 
                      className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center animate-cinematicFadeIn">
              <p className="text-red-600 text-lg">{error}</p>
              <button
                onClick={fetchTasks}
                className="mt-6 px-6 py-3 bg-red-500/20 text-red-600 rounded-3xl 
                  hover:bg-red-500/30 hover:scale-102 transition-all duration-300 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 md:p-12 text-center border border-teal/15 
              shadow-card max-w-lg mx-auto relative overflow-hidden animate-cinematicFadeIn"
              style={{
                background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(0, 172, 193, 0.05)),
                  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
                  repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255, 255, 255, 0.03) 0.5px, rgba(255, 255, 255, 0.03) 1px)`,
                backgroundBlendMode: 'overlay',
                backdropFilter: 'blur(12px) saturate(1.5)',
              }}
            >
              {/* Particules flottantes */}
              <div className="absolute inset-0 pointer-events-none">
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
              
              {/* Content */}
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-8
                  transform hover:scale-105 transition-transform duration-300">
                  <Gauge className="w-10 h-10 text-teal" />
                </div>
                
                <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                  Let's Optimize Your Workflow
                </h3>
                
                <p className="text-text-secondary text-lg md:text-xl mb-10 max-w-md mx-auto leading-relaxed">
                  Tell us about your daily tasks and routines, and we'll help you discover AI-powered optimizations 
                  tailored just for you.
                </p>
                
                <button
                  onClick={() => navigate('/home')}
                  className="px-7 py-4 bg-teal text-white rounded-3xl hover:bg-teal/90
                    transition-all duration-300 flex items-center gap-3 mx-auto
                    hover:scale-[1.02] active:scale-[0.98] font-semibold
                    shadow-[0_4px_12px_rgba(0,172,193,0.3)]"
                  style={{
                    background: `linear-gradient(135deg, rgba(0,172,193,0.8), rgba(0,69,71,0.5))`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <span>Share Your Daily Routine</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="group bg-white rounded-3xl p-8 border border-teal/15
                    hover:border-teal/30 transition-all duration-300 shadow-card hover:shadow-lg
                    transform hover:-translate-y-1 active:translate-y-0 relative overflow-hidden
                    flex flex-col min-h-[340px] animate-cinematicFadeIn"
                  style={{
                    background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(0, 172, 193, 0.15)),
                      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
                      repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255, 255, 255, 0.03) 0.5px, rgba(255, 255, 255, 0.03) 1px)`,
                    backgroundBlendMode: 'overlay',
                    backdropFilter: 'blur(12px) saturate(1.5)',
                  }}
                >
                  {/* Header with title and delete button */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <h3 className="text-2xl md:text-[2rem] font-bold text-text-primary leading-tight">
                      {task.title || `Optimize with ${task.name}`}
                    </h3>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showDeleteConfirmation(task);
                      }}
                      disabled={deletingTaskId === task.id}
                      className="flex-shrink-0 p-2 text-text-secondary/50 hover:text-red-600
                        transition-all duration-200 rounded-full hover:bg-red-50 z-10
                        -mt-1"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-all duration-300 ${
                          deletingTaskId === task.id ? 'animate-spin' : ''
                        }`}
                      >
                        {deletingTaskId === task.id ? (
                          <>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </>
                        ) : (
                          <>
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  
                  <div className="relative h-full flex flex-col">
                    {/* Challenge and Solution */}
                    <div className="space-y-8 flex-1">
                      {/* Challenge */}
                      <div className="flex items-start gap-4 border border-teal/10 rounded-xl p-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <AlertCircle className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[1rem] md:text-[1.125rem] font-semibold text-text-primary mb-2">Challenge</h4>
                          <p className="text-[0.875rem] md:text-base text-text-primary leading-relaxed">
                            {task.problem || "Your current workflow could be optimized"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Solution */}
                      <div className="flex items-start gap-4 border border-teal/10 rounded-xl p-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Rocket className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[1rem] md:text-[1.125rem] font-semibold text-text-primary mb-2">Solution</h4>
                          <p className="text-[0.875rem] md:text-base text-text-primary leading-relaxed">
                            {task.description || `Use ${task.name} to streamline your tasks and boost productivity`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer with action buttons */}
                    <div className="pt-5 mt-5 border-t border-teal/10 flex items-center justify-between gap-2 sm:gap-4">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-6 py-3 border border-teal/15 rounded-3xl text-[#6b6b6b] 
                          hover:bg-gradient-to-r hover:from-teal/5 hover:to-teal/10 transition-all duration-300 text-[0.875rem] 
                          flex items-center justify-center hover:border-teal/30 hover:scale-102 
                          hover:shadow-[0_6px_16px_rgba(0,172,193,0.3)] min-w-[100px]"
                      >
                        <span className="flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          <span>Details</span>
                        </span>
                      </button>
                      
                      <button
                        onClick={() => handleExecuteOptimization(task.id)}
                        className="px-6 py-3 bg-gradient-to-br from-teal to-teal/80 text-white/90 rounded-3xl text-[0.875rem]
                          hover:from-teal/90 hover:to-teal/70 hover:text-white transition-all duration-300 
                          shadow-[0_4px_12px_rgba(0,172,193,0.3)] hover:shadow-[0_8px_20px_rgba(0,172,193,0.5)] 
                          hover:scale-[1.02] hover:animate-[pulse_1.5s_ease-in-out_infinite] active:scale-[0.98]
                          flex items-center justify-center group border border-teal/20 min-w-[100px] sm:min-w-[140px]"
                        style={{
                          backgroundImage: `linear-gradient(135deg, rgba(0,172,193,0.8), rgba(0,69,71,0.5)),
                            url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>'),
                            repeating-linear-gradient(45deg, transparent, transparent 0.5px, rgba(255,255,255,0.03) 0.5px, rgba(255,255,255,0.03) 1px)`,
                          backgroundBlendMode: 'overlay',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {task.has_conversation ? (
                            <>
                              <span>Continue</span>
                              <MessagesSquare className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                            </>
                          ) : (
                            <>
                              <span className="sm:hidden">Execute</span>
                              <span className="hidden sm:inline">Execute with Copilot</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Details Modal */}
          {selectedTask && (
            <OptimizationDetailsModal
              problem={selectedTask.problem || "Your current workflow could be more efficient"}
              solution={selectedTask?.description || selectedTask.name}
              workflow_fit={selectedTask.workflow_fit || "This solution is tailored to your specific needs"}
              toolName={selectedTask.name}
              url={selectedTask.url || null}
              onClose={() => setSelectedTask(null)}
              onExecute={() => handleExecuteOptimization(selectedTask.id)}
              hasConversation={selectedTask.has_conversation}
            />
          )}
          
          {/* Delete Confirmation Dialog */}
          {taskToDelete && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-cinematicFadeIn shadow-card border mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary">Delete this optimization?</h3>
                </div>
                
                <div className="bg-red-50 rounded-2xl p-5 mb-8">
                  <p className="text-text-primary font-semibold mb-1 text-lg">{taskToDelete.title || taskToDelete.name}</p>
                  <p className="text-red-600/70 text-sm">This action cannot be undone</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setTaskToDelete(null)}
                    className="px-6 py-3 border border-gray-300 rounded-full text-gray-600 font-semibold
                      hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 hover:scale-105"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={() => {
                      handleDeleteTask(taskToDelete.id);
                      setTaskToDelete(null);
                    }}
                    disabled={deletingTaskId === taskToDelete.id}
                    className="px-6 py-3 bg-red-600 text-white rounded-full font-semibold
                      hover:bg-red-700 hover:scale-105 transition-all duration-300 flex items-center 
                      justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {deletingTaskId === taskToDelete.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}