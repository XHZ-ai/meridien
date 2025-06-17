import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SmartConnectionsModalProps {
  onClose: () => void;
  onConnectGPT: () => void;
  session: Session;
}

export function SmartConnectionsModal({ onClose, onConnectGPT, session }: SmartConnectionsModalProps) {
  const [isGPTConnected, setIsGPTConnected] = React.useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [userScrollY, setUserScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if on mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Store current scroll position
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    
    // Check GPT connection status
    const checkGPTStatus = async () => {
      const { data: gptSync } = await supabase
        .from('gpt_user_sync')
        .select('has_description')
        .eq('user_id', session.user.id)
        .single();
      
      setIsGPTConnected(gptSync?.has_description || false);
    };
    
    checkGPTStatus();
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', checkMobile);
    };
  }, [session.user.id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-[24px] p-5 md:p-8 max-w-2xl w-full mx-auto animate-fade-scale shadow-card border border-gray-200 max-h-[95vh] md:max-h-[80vh] overflow-y-auto"
        style={{ 
          marginTop: `${Math.max(20, userScrollY + 50)}px`,
          marginBottom: '20px'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-3xl font-semibold text-text-primary">{isMobile ? 'Connections' : 'SmartConnections'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        <p className="text-text-primary text-base font-medium mb-2">{isMobile ? 'Connect tools' : 'Connect your favorite tools to Lynor in 3 clicks'}</p>
        
        <p className="text-text-secondary text-sm mb-8 leading-relaxed max-w-xl">
          {isMobile ? 'Secure analysis to improve your AI suggestions.' : 'Lynor Copilot securely analyzes your data to improve the relevance of your AI suggestions and refine your personal profile. The more you connect, the smarter Lynor gets.'}
        </p>

        <div className="space-y-4">
          {/* ChatGPT Connection */}
          <button
            onClick={onConnectGPT}
            className="w-full px-5 py-4 bg-white hover:bg-gray-50 rounded-xl border border-gray-200
              transition-all duration-200 flex items-center justify-between group text-left
              hover:border-[#10a37f]/30 hover:shadow-lg active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#10a37f]/10 flex items-center justify-center">
                <img 
                  src="https://www.svgrepo.com/show/306500/openai.svg"
                  alt="ChatGPT Logo"
                  className="w-6 h-6 transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div>
                <h3 className="text-base font-medium text-text-primary mb-1">ChatGPT</h3>
                <p className="text-sm text-text-secondary">
                  {isMobile ? 'Connect usage patterns' : 'Connect your ChatGPT usage patterns'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isGPTConnected ? (
                <div className="px-3 py-1.5 bg-[#10a37f]/10 text-[#10a37f] rounded-full text-sm font-medium">
                  Connected
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#10a37f]/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#10a37f]">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Google Calendar Connection - Coming Soon */}
          <div className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200
            flex items-center gap-4 opacity-60 cursor-not-allowed px-5 py-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <img 
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google Calendar Logo"
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-text-primary mb-1">
                  {isMobile ? 'Calendar' : 'Google Calendar'}
                </h3>
                <span className="text-xs bg-button/10 text-button px-2 py-0.5 rounded-full">Soon</span>
              </div>
              <p className="text-sm text-text-secondary">
                {isMobile ? 'Sync events' : 'Sync your calendar events'}
              </p>
            </div>
          </div>

          {/* Gmail Connection - Coming Soon */}
          <div className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200
            flex items-center gap-4 opacity-60 cursor-not-allowed px-5 py-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <img 
                src="https://www.svgrepo.com/show/349378/gmail.svg"
                alt="Gmail Logo"
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-text-primary mb-1">Gmail</h3>
                <span className="text-xs bg-button/10 text-button px-2 py-0.5 rounded-full">Soon</span>
              </div>
              <p className="text-sm text-text-secondary">
                {isMobile ? 'Connect workflow' : 'Connect your email workflow'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}