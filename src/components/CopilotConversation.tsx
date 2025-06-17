import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Mic } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { TypewriterText } from './TypewriterText';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface CopilotConversationProps {
  session: Session;
}

export function CopilotConversation({ session }: CopilotConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [progress, setProgress] = useState(() => {
    const savedProgress = localStorage.getItem(`copilot_progress_${session.user.id}`);
    return savedProgress ? parseInt(savedProgress, 10) : 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(() => {
    return localStorage.getItem(`copilot_complete_${session.user.id}`) === 'true';
  });
  const [isTyping, setIsTyping] = useState(false);
  const [completedMessages, setCompletedMessages] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const messageCountRef = useRef(() => {
    const savedCount = localStorage.getItem(`copilot_message_count_${session.user.id}`);
    return savedCount ? parseInt(savedCount, 10) : 0;
  });

  // Load saved messages on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(`copilot_messages_${session.user.id}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
      const savedCompleted = localStorage.getItem(`copilot_completed_messages_${session.user.id}`);
      if (savedCompleted) {
        setCompletedMessages(JSON.parse(savedCompleted));
      }
    }
  }, [session.user.id]);

  // Save state changes to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`copilot_messages_${session.user.id}`, JSON.stringify(messages));
    }
  }, [messages, session.user.id]);

  useEffect(() => {
    if (completedMessages.length > 0) {
      localStorage.setItem(`copilot_completed_messages_${session.user.id}`, JSON.stringify(completedMessages));
    }
  }, [completedMessages, session.user.id]);

  useEffect(() => {
    localStorage.setItem(`copilot_progress_${session.user.id}`, progress.toString());
  }, [progress, session.user.id]);

  useEffect(() => {
    localStorage.setItem(`copilot_complete_${session.user.id}`, isComplete.toString());
  }, [isComplete, session.user.id]);

  useEffect(() => {
    localStorage.setItem(`copilot_message_count_${session.user.id}`, messageCountRef.current.toString());
  }, [messageCountRef.current, session.user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Only start conversation if no saved messages exist
    const savedMessages = localStorage.getItem(`copilot_messages_${session.user.id}`);
    if (!savedMessages && messages.length === 0) {
      startConversation();
    }
    
    // Update progress based on message count (max 6 exchanges)
    const messageCount = Math.floor(messages.length / 2);
    messageCountRef.current = messageCount;
    setProgress(Math.min((messageCount / 4) * 100, 100));
  }, [messages]);

  const startConversation = async () => {
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Lynor Copilot — an emotionally intelligent AI assistant.

Your mission is to have a natural, human conversation (EXACTLY 4 messages) to deeply understand a new user.

🎯 Hidden objectives (don't mention them, but cover all):
1. What they do daily (job, tasks, routine)
2. Their relationship with technology and AI
3. Their working style and preferences

🧠 CRITICAL RULES:
- Ask ONE thoughtful question at a time
- Show understanding by reflecting their answers
- Let conversation flow naturally between topics
- Never directly ask about AI or profile types
- Focus on understanding their natural way of working
- Keep a warm, friendly tone
- MUST end conversation after exactly 4 messages
- NEVER ask more than 4 questions total
don't hesitate to redirect the conversation with an open-ended question to avoid losing information by remaining too focused on a single subject. 

📌 IMPORTANT:
- On your 4th message, ALWAYS end with "**CONVERSATION_COMPLETE**"
- Before ending, briefly acknowledge their sharing
- Keep the ending natural and friendly

Start with a warm welcome and ask about their daily work or responsibilities.`
          }
        ],
        temperature: 0.7,
      });

      const firstMessage = response.choices[0]?.message?.content;
      if (firstMessage) {
        setMessages([{ 
          role: 'assistant',
          content: firstMessage.trim()
        }]);
        
        // Mark first message as completed after a delay
        setTimeout(() => setCompletedMessages([0]), 1000);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Failed to start conversation. Please refresh and try again.');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const analyzeProfile = async (conversationMessages: Message[]) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `IMPORTANT: You MUST respond in English only with valid JSON.

Analyze the full conversation with the user and extract their AI profile using context-aware reasoning.

🎯 Extract the following:
	1.	profileType (choose ONE):

	•	Creator → creative work (content, visuals, writing)
	•	Strategist → planning, thinking, analysis
	•	Operator → execution, coordination, organization
	• Optimiser → analyzing, adjusting, optimizing

	2.	aiLevel (choose ONE):

	•	Beginner → little or no AI use
	•	Intermediate → has tried tools occasionally
	•	Advanced → uses AI regularly in work

	3.	dailyDescription:
natural summary (2-4 sentences) of what they do day-to-day.
	4.	intentions:
What they want to improve, fix, or optimize (2–4 max). Short expressions (e.g. "automate tasks", "save time").
	5.	knownTools:
List AI or productivity tools mentioned (e.g. ChatGPT, Notion AI). If none, return an empty array.

📦 Output ONLY this valid JSON format in English:{
  "profileType": "Creator|Strategist|Operator|Optimiser",
  "aiLevel": "Beginner|Intermediate|Advanced",
  "dailyDescription": "summary here",
  "intentions": ["...", "..."],
  "knownTools": ["...", "..."]
} 

CRITICAL:
	•	Response MUST be in English
	•	Return ONLY the JSON object, no comments or extra text
	•	Infer answers even if implicit — read between the lines
	•	Ensure the output is valid JSON that can be parsed`
          },
          ...conversationMessages
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const analysis = response.choices[0]?.message?.content;
      
      if (!analysis) {
        console.error('No analysis content received from OpenAI');
        return null;
      }

      try {
        return JSON.parse(analysis);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', analysis);
        return null;
      }
    } catch (error) {
      console.error('Error analyzing profile:', error);
      return null;
    }
  };

  const saveProfile = async (profile: any) => {
    try {
      // First check if the profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profile_ai')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking for existing profile:', fetchError);
        return false;
      }

      // Prepare the profile data
      const profileData = {
        user_id: session.user.id,
        profile_type: profile.profileType.toLowerCase(),
        ai_level: profile.aiLevel.toLowerCase(),
        daily_description: profile.dailyDescription,
        intentions: profile.intentions,
        known_tools: profile.knownTools,
        has_completed_initial_conversation: true,
        conversation_completed_at: new Date().toISOString()
      };

      let result;

      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('user_profile_ai')
          .update(profileData)
          .eq('id', existingProfile.id);
      } else {
        // Insert new profile
        result = await supabase
          .from('user_profile_ai')
          .insert([profileData]);
      }

      if (result.error) {
        console.error('Error saving profile:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveProfile function:', error);
      return false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Get the current message count (remember, each exchange is 2 messages)
      const currentMessageNumber = messageCountRef.current + 1;
      const isFinalAssistantMessage = currentMessageNumber >= 4;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are Lynor Copilot — an emotionally intelligent AI assistant.
You are in message ${currentMessageNumber} of exactly 4 messages.
${isFinalAssistantMessage ? '⚠️ This MUST be your final response. End with **CONVERSATION_COMPLETE**' : ''}

🎯 Hidden objectives (cover all, smoothly):
1. Daily work and routines
2. Technology/AI familiarity
3. Working style and preferences

🧠 CRITICAL RULES:
- One clear question at a time
- Show you understand their previous answer
- Natural flow between topics
- Never ask directly about AI or profiles
- Keep responses warm and engaging
- MUST end after exactly 4 messages
- NEVER exceed 4 messages total
${isFinalAssistantMessage ? '- Your final message must be a warm conclusion summarizing what you learned, NOT a question' : ''}
${isFinalAssistantMessage ? '- Thank them for sharing and express enthusiasm about personalizing their experience' : ''}

${isFinalAssistantMessage ? '\n📌 This is your FINAL message. End with a warm conclusion and **CONVERSATION_COMPLETE**' : ''}`
          },
          ...messages,
          userMessage
        ],
        temperature: 0.7,
      });

      const aiMessage = response.choices[0]?.message?.content;
      if (aiMessage) {
        let messageContent = aiMessage;
        const isLastMessage = isFinalAssistantMessage;
        
        if (messageContent.includes('**CONVERSATION_COMPLETE**')) {
          messageContent = messageContent.replace('**CONVERSATION_COMPLETE**', '').trim();
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: messageContent
          }]);

          const newMessageIndex = messages.length + 1;
          setTimeout(() => {
            setCompletedMessages(prev => [...prev, newMessageIndex]);
          }, messageContent.length * 30 + 500);
          
          // Wait for the final message to be typed out
          setTimeout(async () => {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "Perfect! I now have all the information needed to personalize your experience. Let me analyze your profile..."
            }]);
            
            // Add a small delay before starting analysis
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create a deep copy of messages for analysis
            const conversationMessages = [...messages, userMessage];
            
            const profile = await analyzeProfile(conversationMessages);
            if (profile) {
              const saved = await saveProfile(profile);
              if (saved) {
                // Success path
                setTimeout(() => {
                  setIsComplete(true);
                  setTimeout(() => {
                    // Clear localStorage before navigating
                    localStorage.removeItem(`copilot_messages_${session.user.id}`);
                    localStorage.removeItem(`copilot_completed_messages_${session.user.id}`);
                    localStorage.removeItem(`copilot_progress_${session.user.id}`);
                    localStorage.removeItem(`copilot_complete_${session.user.id}`);
                    localStorage.removeItem(`copilot_message_count_${session.user.id}`);
                    navigate('/home');
                    window.location.reload();
                  }, 2000);
                }, 1000);
              } else {
                // Handle save error
                setMessages(prev => [...prev, { 
                  role: 'assistant', 
                  content: 'There was an error saving your profile. Please refresh the page and try again.' 
                }]);
                setError('Failed to save profile. Please try again.');
              }
            } else {
              // Handle analysis error
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'I apologize, but I was unable to analyze your profile correctly. Please refresh the page and try again.' 
              }]);
              setError('Failed to analyze profile. Please try again.');
            }
          }, messageContent.length * 30 + 1000);
        } else {
          // Handle regular message
          const newMessageIndex = messages.length + 1;
          setMessages(prev => [...prev, {
            role: 'assistant', 
            content: messageContent
          }]);
          
          // Mark message as completed after typing animation
          setTimeout(() => {
            setCompletedMessages(prev => [...prev, newMessageIndex]);
          }, messageContent.length * 30 + 500);
          
          // Force completion on final exchange if needed
          if (isLastMessage && !messageContent.includes('**CONVERSATION_COMPLETE**')) {
            setTimeout(() => {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Thank you for sharing all this information with me. I now have a good understanding of your workflow and preferences. Let's finalize your profile so I can personalize your experience! **CONVERSATION_COMPLETE**"
              }]);
              
              // Process the completion
              setTimeout(async () => {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: "Perfect! I now have all the information needed to personalize your experience. Let me analyze your profile..."
                }]);
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const allMessages = [...messages, userMessage, {
                  role: 'assistant',
                  content: "Thank you for sharing all this information with me. I now have a good understanding of your workflow and preferences."
                }];
                
                const profile = await analyzeProfile(allMessages);
                if (profile) {
                  const saved = await saveProfile(profile);
                  if (saved) {
                    setTimeout(() => {
                      setIsComplete(true);
                      setTimeout(() => {
                        // Clear localStorage before navigating
                        localStorage.removeItem(`copilot_messages_${session.user.id}`);
                        localStorage.removeItem(`copilot_completed_messages_${session.user.id}`);
                        localStorage.removeItem(`copilot_progress_${session.user.id}`);
                        localStorage.removeItem(`copilot_complete_${session.user.id}`);
                        localStorage.removeItem(`copilot_message_count_${session.user.id}`);
                        navigate('/home');
                        window.location.reload();
                      }, 2000);
                    }, 1000);
                  } else {
                    setError('Failed to save profile. Please try again.');
                  }
                } else {
                  setError('Failed to analyze profile. Please try again.');
                }
              }, 2000);
            }, messageContent.length * 30 + 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but there was an error processing your response. Please try again.' 
      }]);
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };
  
  // Handle Enter key press to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-between overflow-hidden min-h-screen">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10">
        <div className="relative w-36 sm:w-64 h-1 bg-gray-200/60 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="absolute inset-y-0 left-0 bg-button transition-all duration-500 ease-out rounded-full shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 text-center">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 text-sm bg-red-500/20 text-red-600 rounded-full hover:bg-red-500/30 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
      
      {/* Conversation Area */}
      <div className="w-full h-[calc(100vh-7rem)] overflow-y-auto py-6 md:py-8 space-y-6 conversation-scroll">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 animate-slide-up mb-6 ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {message.role === 'assistant' ? (
                <>
                  {/* Assistant Message */}
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                    <video
                      src="/logos/copilot-animation.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center mb-1">
                      <p className="text-sm font-medium text-button tracking-wide">Lynor Copilot</p>
                    </div>
                    <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white text-text-primary
                      shadow-sm text-[15px] leading-relaxed">
                      {completedMessages.includes(index) ? (
                        <span>{message.content}</span>
                      ) : (
                        <TypewriterText
                          text={message.content}
                          onComplete={() => setCompletedMessages(prev => [...prev, index])}
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* User Message */}
                  <div className="flex flex-col gap-1 flex-1 items-end">
                    <div className="flex items-center mb-1">
                      <p className="text-sm font-medium text-text-secondary tracking-wide">You</p>
                    </div>
                    <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 bg-button/10 text-text-primary
                      shadow-sm text-[15px] leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 justify-start animate-fade-scale mb-6">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                <video
                  src="/logos/copilot-animation.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-5 h-5"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center mb-1">
                  <p className="text-sm font-medium text-button tracking-wide">Lynor Copilot</p>
                </div>
                <div className="inline-flex max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white text-text-primary
                  shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-button/30 rounded-full animate-[bounce_0.8s_infinite]"></span>
                    <span className="w-1.5 h-1.5 bg-button/30 rounded-full animate-[bounce_0.8s_0.2s_infinite]"></span>
                    <span className="w-1.5 h-1.5 bg-button/30 rounded-full animate-[bounce_0.8s_0.4s_infinite]"></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
  
      <div className="fixed bottom-[40px] md:left-[calc(50%)] left-1/2 -translate-x-1/2 md:-translate-x-1/2 
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent px-2 py-2.5 text-[15px] placeholder-gray-400
                text-[#1e1e1e] min-w-0 resize-none min-h-[72px] max-h-[120px] overflow-auto
                outline-none focus:outline-none focus:ring-0"
              disabled={isLoading || isComplete}
              style={{ height: 'auto' }}
              rows={1}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isComplete}
              className="absolute right-[6px] md:right-3 top-1/2 -translate-y-[80%] md:-translate-y-[85%] w-[10px] h-[10px] md:w-9 md:h-9 flex items-center justify-center 
                rounded-full bg-black text-white hover:bg-neutral-900 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
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

      {/* Completion Overlay */}
      {isComplete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="text-center space-y-6 sm:space-y-8 animate-fade-scale p-6 sm:p-10 bg-white rounded-[20px] border border-gray-200 backdrop-blur-md max-w-md mx-auto shadow-card">
            <h2 className="text-2xl sm:text-4xl font-bold text-text-primary"
              style={{ animation: 'softGlow 3s ease-in-out infinite' }}>
              Preparing Your Space
            </h2>
            <p className="text-lg sm:text-xl text-text-secondary max-w-md mx-auto leading-relaxed">
              Customizing your experience based on your profile...
            </p>
            <div className="flex items-center justify-center gap-3 text-button mt-6">
              <div className="w-2 h-2 rounded-full bg-button/80 animate-[bounce_0.8s_infinite]"></div>
              <div className="w-2 h-2 rounded-full bg-button/80 animate-[bounce_0.8s_0.2s_infinite]"></div>
              <div className="w-2 h-2 rounded-full bg-button/80 animate-[bounce_0.8s_0.4s_infinite]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}