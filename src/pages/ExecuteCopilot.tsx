import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { 
  ArrowLeft, 
  Send, 
  ExternalLink,
  Brain,
  Sparkles,
  Loader
} from 'lucide-react';
import { getOptimizationDetails, getOrCreateConversation, saveMessage, getCopilotResponse } from '../lib/copilot';
import { TypewriterText } from '../components/TypewriterText';
import { Toast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getToolLogo } from '../lib/logoUtils';
import { useCredits } from '../contexts/CreditContext';
import { redirectToUpgrade } from '../lib/upgradeRedirect';
import { CREDIT_COSTS } from '../lib/credits';

interface ExecuteCopilotProps {
  session: Session;
}

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  created_at: string;
}

interface Optimization {
  id: string;
  title: string;
  problem: string;
  solution: string;
  workflow_fit: string;
  name: string;
  description: string;
}

export function ExecuteCopilot({ session }: ExecuteCopilotProps) {
  const { optimizationId } = useParams<{ optimizationId: string }>();
  const navigate = useNavigate();
  const { refreshCredits, credits } = useCredits(); // 🪙 Ajouter le hook des crédits
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [initialMessageRequested, setInitialMessageRequested] = useState(false);
  const [isMobileSafari, setIsMobileSafari] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Detect iOS Safari and mobile devices
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    setIsMobileSafari(isIOS && isSafari);
    setIsMobileDevice(window.innerWidth < 768);
  }, []);
  
  // Fetch data on initial load
  useEffect(() => {
    if (!optimizationId) {
      setError('No optimization ID provided');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        console.log('Fetching optimization and conversation data for ID:', optimizationId);
        
        // Get optimization details
        const optDetails = await getOptimizationDetails(optimizationId);
        if (!optDetails) {
          setError('Optimization not found');
          setIsLoading(false);
          return;
        }
        setOptimization(optDetails);
        console.log('Optimization details loaded:', optDetails.title);
        
        // Get or create conversation
        const conversation = await getOrCreateConversation(session.user.id, optimizationId);
        setConversationId(conversation.conversation_id);
        console.log('Conversation ID:', conversation.conversation_id);
        console.log('Existing messages:', conversation.messages?.length || 0);
        
        // Check if we have existing messages
        if (conversation.messages && conversation.messages.length > 0) {
          console.log('Setting existing messages:', conversation.messages.length);
          setMessages(conversation.messages);
          
          // Mark all existing messages as completed immediately to avoid animation
          const existingMessageIds = new Set(conversation.messages.map(msg => msg.id));
          setCompletedMessages(existingMessageIds);
          
          // Since there are existing messages, don't generate an initial message
          setInitialMessageSent(true);
        } else {
          // If no existing messages, we'll need to generate an initial message
          // But only set the flag, don't trigger the generation here
          console.log('No existing messages, will generate initial message');
          setInitialMessageRequested(true);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load conversation. Please try again.');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [optimizationId, session.user.id]);
  
  // Generate initial message if needed (and only once)
  useEffect(() => {
    const generateInitialMessage = async () => {
      try {
        // Only proceed if:
        // 1. initialMessageRequested is true (meaning we need a first message)
        // 2. initialMessageSent is false (we haven't already sent one)
        // 3. We have the optimization and conversationId
        // 4. We're not currently loading
        if (
          initialMessageRequested && 
          !initialMessageSent && 
          !isLoading && 
          optimization && 
          conversationId
        ) {
          console.log("Generating initial message...");
          setIsTyping(true);
          setInitialMessageSent(true); // Set this immediately to prevent multiple calls
          setInitialMessageRequested(false); // Clear the request flag
          
          try {
            // Create an empty messages array to pass to getCopilotResponse
            // This ensures a fresh conversation start
            const emptyMessages: Message[] = [];
            
            const initialResponse = await getCopilotResponse(
              conversationId,
              emptyMessages,
              optimization
            );
            
            console.log("Initial response generated:", initialResponse.substring(0, 30) + "...");
            
            // 🪙 RAFRAÎCHIR LES CRÉDITS APRÈS LA GÉNÉRATION DU MESSAGE INITIAL
            await refreshCredits();
            
            // The response is already saved to the database in getCopilotResponse,
            // so we just need to fetch the updated messages
            const { data: updatedMessages, error: messagesError } = await supabase
              .from('copilot_messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true });
              
            if (messagesError) {
              console.error('Error fetching updated messages:', messagesError);
            } else if (updatedMessages) {
              console.log('Updated messages received:', updatedMessages.length);
              setMessages(updatedMessages);
              
              // Mark the first message as completed after its length * 30ms + 500ms
              // to give time for the typewriter effect
              if (updatedMessages.length > 0) {
                const firstMessageId = updatedMessages[0]?.id;
                if (firstMessageId) {
                  const messageContent = updatedMessages[0].content;
                  const typingTime = messageContent.length * 30 + 500;
                  
                  setTimeout(() => {
                    setCompletedMessages(prev => new Set([...prev, firstMessageId]));
                  }, typingTime);
                }
              }
            }
          } catch (copilotError) {
            console.error('Error generating initial copilot response:', copilotError);
            
            // 🚨 REDIRECTION AUTOMATIQUE EN CAS D'ERREUR DE CRÉDITS
            if (copilotError instanceof Error && copilotError.message.includes('Insufficient credits')) {
              console.log('🔄 Redirecting to upgrade: insufficient credits for initial Copilot message');
              redirectToUpgrade(navigate, {
                reason: 'insufficient-credits-copilot',
                requiredCredits: CREDIT_COSTS.COPILOT_QUERY,
                currentCredits: credits?.monthly_credits || 0,
                featureName: 'Lynor Copilot'
              });
              return;
            } else {
              setError('Failed to generate initial message. Please try refreshing the page.');
            }
          }
          
          setIsTyping(false);
        }
      } catch (error) {
        console.error('Error generating initial message:', error);
        setIsTyping(false);
        setError('Failed to generate initial message. Please try refreshing the page.');
      }
    };
    
    generateInitialMessage();
  }, [initialMessageRequested, initialMessageSent, isLoading, optimization, conversationId, refreshCredits, navigate, credits]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isLoading]);
  
  // Improved scrollToBottom function that properly targets the message container
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [messageInput]);
  
  // Prevent body scrolling when component mounts
  useEffect(() => {
    // Save current body styles
    const originalBodyStyle = document.body.style.cssText;
    const originalHtmlStyle = document.documentElement.style.cssText;
    
    // Prevent scrolling on body and html
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    
    // Restore original styles when unmounting
    return () => {
      document.body.style.cssText = originalBodyStyle;
      document.documentElement.style.cssText = originalHtmlStyle;
    };
  }, []);
  
  const handleMessageComplete = (messageId: string) => {
    setCompletedMessages(prev => new Set([...prev, messageId]));
  };
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending || !conversationId || !optimization) return;
    
    const userMessage = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    
    try {
      // Save user message
      const savedMessage = await saveMessage(conversationId, 'user', userMessage);
      if (savedMessage) {
        // Update local messages state with user message
        setMessages(prev => [...prev, savedMessage]);
        
        // Show typing indicator
        setIsTyping(true);
        
        try {
          // Get copilot response (credits are deducted inside getCopilotResponse)
          const response = await getCopilotResponse(
            conversationId,
            [...messages, savedMessage],
            optimization
          );
          
          // 🪙 RAFRAÎCHIR LES CRÉDITS APRÈS CHAQUE MESSAGE COPILOT
          await refreshCredits();
          
          // Fetch all messages to ensure we have the latest state
          const { data: updatedMessages, error: messagesError } = await supabase
            .from('copilot_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
          if (messagesError) {
            console.error('Error fetching updated messages:', messagesError);
          } else {
            setMessages(updatedMessages || []);
          }
        } catch (copilotError) {
          console.error('Error getting copilot response:', copilotError);
          
          // 🚨 REDIRECTION AUTOMATIQUE EN CAS D'ERREUR DE CRÉDITS
          if (copilotError instanceof Error && copilotError.message.includes('Insufficient credits')) {
            console.log('🔄 Redirecting to upgrade: insufficient credits for Copilot message');
            redirectToUpgrade(navigate, {
              reason: 'insufficient-credits-copilot',
              requiredCredits: CREDIT_COSTS.COPILOT_QUERY,
              currentCredits: credits?.monthly_credits || 0,
              featureName: 'Lynor Copilot'
            });
            return;
          } else {
            setError('Failed to get response from Copilot. Please try again.');
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setIsTyping(false);
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };
  
  // Render message with markdown-like formatting
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    
    return lines.map((line, lineIndex) => {
      let formattedLine = line.replace(
        /(\*\*|__)(.*?)\1/g, 
        '<span class="font-semibold text-gray-900">$2</span>'
      );
      
      if (formattedLine.trim().match(/^[•*-]\s/)) {
        formattedLine = `<span class="inline-block text-gray-400">•</span><span class="inline-block pl-2">${formattedLine.trim().substring(2)}</span>`;
      }
      
      if (formattedLine.trim().match(/^\d+\.\s/)) {
        const number = formattedLine.trim().match(/^\d+/)?.[0] || '';
        formattedLine = `<span class="inline-block text-gray-400">${number}.</span><span class="inline-block pl-1">${formattedLine.trim().substring(number.length + 2)}</span>`;
      }
      
      // Code block formatting
      if (formattedLine.includes('```')) {
        formattedLine = formattedLine.replace(/```(.*?)```/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono text-sm">$1</code>');
      } else if (formattedLine.includes('`')) {
        formattedLine = formattedLine.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono text-sm">$1</code>');
      }
      
      return (
        <React.Fragment key={lineIndex}>
          <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          {lineIndex < lines.length - 1 && <div className="h-2" />}
        </React.Fragment>
      );
    });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 flex items-center justify-center p-2.5 animate-pulse">
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-gray-500 font-medium">Loading your conversation...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="bg-red-50 border border-red-100 rounded-[28px] p-6 max-w-md w-full shadow-lg">
          <h2 className="text-xl font-semibold text-red-700 mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/optimizations')}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-[20px] hover:bg-red-200 transition-colors"
          >
            Back to Optimizations
          </button>
        </div>
      </div>
    );
  }

  if (!optimization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="bg-yellow-50 border border-yellow-100 rounded-[28px] p-6 max-w-md w-full shadow-lg">
          <h2 className="text-xl font-semibold text-yellow-700 mb-4">Optimization Not Found</h2>
          <p className="text-yellow-600 mb-4">The optimization you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/optimizations')}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-[20px] hover:bg-yellow-200 transition-colors"
          >
            Back to Optimizations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col h-screen max-h-screen overflow-hidden bg-[#f7f9fc]">
      {/* Two-column layout: Optimization details (left) and Chat (right) */}
      <div className="hidden md:block md:fixed md:left-0 md:top-0 md:bottom-0 md:w-[420px] bg-white border-r border-gray-100 z-10">
        <div className="h-16 border-b border-gray-100 flex items-center px-6">
          <button
            onClick={() => navigate('/optimizations')}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center"
            aria-label="Go back to optimizations"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="ml-3 text-lg font-medium text-gray-800">Optimization Details</h1>
        </div>
        
        <div className="p-6 h-[calc(100%-4rem)] flex flex-col overflow-auto">
          <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 leading-tight">{optimization.title}</h2>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center">
                {getToolLogo({
                  toolName: optimization.name,
                  size: 36
                })}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">AI Tool</p>
                <p className="font-medium text-gray-700">{optimization.name}</p>
              </div>
            </div>
            
            {/* Problem */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Context</h3>
              <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-[20px] p-4 border border-gray-100">
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{optimization.problem}</p>
                </div>
              </div>
            </div>
            
            {/* Solution */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Solution</h3>
              <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 rounded-[20px] p-4 border border-indigo-100/30">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{optimization.solution || optimization.description}</p>
                </div>
              </div>
            </div>
            
            {/* Workflow Fit - if available */}
            {optimization.workflow_fit && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Personalization</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50/80 
                  rounded-full border border-violet-100/50">
                  <p className="text-violet-700 text-sm font-medium">{optimization.workflow_fit}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Additional resources */}
          <div className="mt-auto">
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(optimization.name)}`} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 transition-colors text-sm flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Learn more about {optimization.name}</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Chat area - right column - FIXED for proper display */}
      <div className="flex-1 flex flex-col h-full relative md:ml-[420px]">
        {/* Mobile-only header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-gray-100 flex items-center justify-between px-4 
          bg-white/95 backdrop-blur-sm z-30 shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/optimizations')}
              className="p-2 hover:bg-gray-50 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2 ml-1">
              <h1 className="text-sm font-medium text-gray-700">Lynor Copilot</h1>
              <p className="text-[10px] text-gray-400">AI assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {getToolLogo({
                toolName: optimization.name,
                size: 20,
                className: "mr-1.5"
              })}
            </div>
            <div className="text-sm font-medium text-gray-500 truncate max-w-[100px]">
              {optimization.name}
            </div>
          </div>
        </div>
        
        {/* Desktop header */}
        <div className="hidden md:flex items-center px-6 h-16 border-b border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium text-gray-800">Conversation with Lynor Copilot</h1>
          </div>
        </div>
        
        {/* Scrollable Messages Container - FIXED for proper display */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-gradient-to-b from-white to-gray-50/80 conversation-scroll
            mt-16 md:mt-0 pb-[8rem] md:pb-[8rem] h-[calc(100vh-7rem)] md:h-[calc(100vh-10rem)]"
        >
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={message.id}
                className={`mb-8 ${message.sender === 'copilot' ? '' : 'flex justify-end'}`}
              >
                {message.sender === 'copilot' ? (
                  <div className="max-w-[85%] md:max-w-[75%] animate-fade-scale" 
                       style={{ animationDuration: '0.3s', animationDelay: `${index * 0.05}s` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
  <img
    src="/logos/lynor-logo.png"
    alt="Lynor logo"
    className="w-6 h-6 object-contain"
  />
</div>
                      <div className="text-xs font-medium text-gray-400">Lynor Copilot</div>
                    </div>
                    
                    <div className="pl-9">
                      <div className="text-[15px]">
                        {completedMessages.has(message.id) ? (
                          <div className="space-y-2 leading-relaxed text-gray-700">
                            {renderMessageContent(message.content)}
                          </div>
                        ) : (
                          <TypewriterText 
                            text={message.content} 
                            onComplete={() => handleMessageComplete(message.id)}
                            speed={15}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] md:max-w-[75%] animate-fade-scale"
                       style={{ animationDuration: '0.3s', animationDelay: `${index * 0.05}s` }}>
                    <div className="flex justify-end mb-1.5">
                      <div className="text-xs font-medium text-gray-400">You</div>
                    </div>
                    <div className="bg-[#222222] text-white rounded-2xl rounded-tr-sm px-3.5 py-3 shadow-sm text-[15px]">
                      <p className="whitespace-pre-line">{message.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : !isTyping ? (
            <div className="flex items-center justify-center h-full opacity-70">
              <p className="text-gray-400 text-center">
                {initialMessageRequested ? "Starting conversation..." : "No messages yet"}
              </p>
            </div>
          ) : null}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="max-w-[85%] md:max-w-[75%] mb-8 animate-fade-scale">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
  <img
    src="/logos/lynor-logo.png"
    alt="Lynor logo"
    className="w-6 h-6 object-contain"
  />
</div>
                <div className="text-xs font-medium text-gray-400">Lynor Copilot</div>
              </div>
              
              <div className="pl-9">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full animate-[bounce_0.8s_infinite]" style={{ backgroundColor: '#373737', opacity: 0.6 }}></span>
<span className="w-1.5 h-1.5 rounded-full animate-[bounce_0.8s_0.2s_infinite]" style={{ backgroundColor: '#373737', opacity: 0.75 }}></span>
<span className="w-1.5 h-1.5 rounded-full animate-[bounce_0.8s_0.4s_infinite]" style={{ backgroundColor: '#373737', opacity: 0.9 }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area - Fixed at bottom with proper spacing */}
        <div className="fixed bottom-[40px] md:left-[calc(50%+210px)] left-1/2 -translate-x-1/2 md:-translate-x-1/2 
          w-[92%] md:w-[85%] max-w-2xl z-40 mb-6">
          <form
            onSubmit={handleSubmit}
            className="relative bg-white/95 backdrop-blur-xl rounded-[28px] p-2 
              shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-gray-200/50 hover:border-gray-300/50 
              transition-all duration-300 group"
          >
            <div className="relative flex items-center">
              <textarea
  ref={inputRef}
  value={messageInput}
  onChange={(e) => setMessageInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Ask anything..."
  className="flex-1 bg-transparent px-2 py-2.5 text-[15px] placeholder-gray-400
    text-[#1e1e1e] min-w-0 resize-none min-h-[72px] max-h-[120px] overflow-auto
    outline-none focus:outline-none focus:ring-0"
  disabled={isSending || isTyping}
  style={{ height: 'auto' }}
  rows={1}
/>
              
              <button
  type="submit"
  disabled={!messageInput.trim() || isSending}
  className="absolute right-[6px] md:right-3 top-1/2 -translate-y-[80%] md:-translate-y-[85%] w-[10px] h-[10px] md:w-9 md:h-9 flex items-center justify-center 
    rounded-full bg-black text-white hover:bg-neutral-900 transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSending ? (
    <div className="w-3 h-3 md:w-4 md:h-4 border-[2px] border-white border-t-transparent rounded-full animate-spin" />
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7M12 3v18" />
    </svg>
  )}
</button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Toast Message */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}