import React, { useState, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { IconBrandOpenai } from '@tabler/icons-react';
import { Copy, Check, ArrowRight, Clipboard, ClipboardCheck, X } from 'lucide-react';

interface GPTPromptConnectionProps {
  session: Session;
  onClose: () => void;
  onSuccess: () => void;
  isClosing: boolean;
}

export function GPTPromptConnection({ session, onClose, onSuccess, isClosing }: GPTPromptConnectionProps) {
  const [step, setStep] = useState<'intro' | 'copyPrompt' | 'pasteResponse' | 'success' | 'error'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [gptResponse, setGptResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [userScrollY, setUserScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const gptPrompt = `You are a professional analyst. Based on my past conversations, write a clear and precise 30-word max description of:

1. What I concretely do in my daily work  
2. The main tools I use and why  
3. My current projects or goals

Return ONLY the description. No greetings, no explanation, just the final text.

Important: Do not include ANY explanatory text before or after the JSON. Your response must be valid JSON only.`;

  // Check if on mobile device
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

  // Capture scroll position when modal opens
  useEffect(() => {
    // Store current scroll position
    const scrollY = window.scrollY;
    setUserScrollY(scrollY);
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Auto-focus textarea when reaching the paste step
  useEffect(() => {
    if (step === 'pasteResponse' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [step]);

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(gptPrompt).then(
      () => {
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 3000);
      },
      (err) => {
        console.error('Could not copy prompt: ', err);
        setError('Failed to copy to clipboard. Please try copying manually.');
      }
    );
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGptResponse(text);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to read from clipboard', err);
      setError('Unable to paste from clipboard. Please paste manually.');
    }
  };

  const handlePasteResponse = async () => {
    if (!gptResponse.trim()) {
      setError('Please paste the response from ChatGPT');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save the response directly to user_profile_ai table's daily_description field
      const { error: updateError } = await supabase
        .from('user_profile_ai')
        .update({
          daily_description: gptResponse,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);
      
      if (updateError) {
        console.error('Error saving ChatGPT response:', updateError);
        setError('Failed to save data. Please try again in a few moments.');
        setStep('error');
        return;
      }
      
      // Also update the gpt_user_sync to maintain compatibility
      await supabase
        .from('gpt_user_sync')
        .upsert(
          {
            user_id: session.user.id,
            has_description: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      
      // Success!
      setStep('success');
      
      // Call success handler after showing success message
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (err) {
      console.error('Error processing GPT response:', err);
      setError('Failed to process the response. Please try again.');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#10a37f]/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
                  <img 
                    src="https://www.svgrepo.com/show/306500/openai.svg"
                    alt="ChatGPT Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-text-primary mb-2 sm:mb-3">
                  {isMobile ? 'Connect ChatGPT' : 'Connect ChatGPT'}
                </h3>
                <p className="text-text-secondary text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                  {isMobile ? 'Connect to get personalized recommendations' : 'Connect your ChatGPT usage patterns to get personalized optimization recommendations tailored just for you.'}
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
              <h4 className="text-base sm:text-lg font-medium text-text-primary mb-2">
                {isMobile ? 'Steps:' : 'How it works:'}  
              </h4>
              <ol className="space-y-3 text-text-secondary text-sm">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#10a37f]/10 rounded-full flex items-center justify-center text-[#10a37f] text-sm font-medium">1</div>
                  <span>
                    {isMobile ? 'Copy prompt' : 'Copy a special prompt we provide'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#10a37f]/10 rounded-full flex items-center justify-center text-[#10a37f] text-sm font-medium">2</div>
                  <span>
                    {isMobile ? 'Paste to ChatGPT' : 'Paste it into ChatGPT and wait for the response'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#10a37f]/10 rounded-full flex items-center justify-center text-[#10a37f] text-sm font-medium">3</div>
                  <span>
                    {isMobile ? 'Copy & paste back' : 'Copy ChatGPT\'s response and paste it back here'}
                  </span>
                </li>
              </ol>
            </div>
              
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border border-gray-200 rounded-xl
                  hover:bg-gray-50 transition-colors text-text-secondary hover:text-text-primary order-2 sm:order-1 sm:flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('copyPrompt')}
                className="px-5 py-3 bg-[#10a37f] hover:bg-[#10a37f]/90 rounded-xl
                  transition-colors text-white flex items-center justify-center gap-2
                  font-medium border border-[#10a37f]/20 order-1 sm:order-2 sm:flex-1
                  hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      
      case 'copyPrompt':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-16 h-16 bg-[#10a37f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Copy className="w-8 h-8 text-[#10a37f]" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Copy This Prompt</h3>
              <p className="text-text-secondary text-sm max-w-md mx-auto">
                {isMobile ? 'Copy & paste to ChatGPT' : 'Copy the prompt below and paste it into ChatGPT'}
              </p>
            </div>

            {/* Prompt container with separated copy button */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm text-text-secondary">Prompt to copy:</div>
                <button
                  onClick={copyPromptToClipboard}
                  className={`px-3 py-1.5 rounded-[20px] flex items-center gap-2 text-sm transition-all
                    ${promptCopied 
                      ? 'bg-[#10a37f] text-white' 
                      : 'bg-gray-100 text-text-primary hover:bg-gray-200'}
                    border ${promptCopied ? 'border-[#10a37f]/30' : 'border-gray-200'}`}
                >
                  {promptCopied ? (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
                <pre className="text-text-primary/80 text-xs sm:text-sm whitespace-pre-wrap font-mono overflow-auto max-h-36 sm:max-h-60">
                  {gptPrompt}
                </pre>
              </div>
            </div>

            <div className="bg-[#f9f9f9] rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#10a37f]/10 rounded-lg">
                  <img 
                    src="https://www.svgrepo.com/show/306500/openai.svg"
                    alt="OpenAI Logo"
                    className="w-5 h-5"
                  />
                </div>
                <div>
                  <h4 className="text-text-primary font-medium text-sm sm:text-base mb-1">After you get a response:</h4>
                  <p className="text-text-secondary text-xs sm:text-sm">
                    {isMobile ? 'Paste it in the next step' : 'Paste it in the next step so we can analyze your usage patterns.'}
                  </p>
                </div>
              </div>
            </div>
              
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <button
                onClick={() => setStep('intro')}
                className="px-5 py-3 border border-gray-200 rounded-xl
                  hover:bg-gray-50 transition-colors text-text-secondary hover:text-text-primary 
                  flex items-center justify-center gap-2 order-2 sm:order-1 sm:flex-1"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep('pasteResponse')}
                className="px-5 py-3 bg-[#10a37f] hover:bg-[#10a37f]/90
                  rounded-xl transition-colors text-white flex items-center justify-center gap-2
                  font-medium border border-[#10a37f]/20 order-1 sm:order-2 sm:flex-1"
              >
                <span>{isMobile ? 'Got response' : 'I got a response'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      
      case 'pasteResponse':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-16 h-16 bg-[#10a37f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clipboard className="w-8 h-8 text-[#10a37f]" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {isMobile ? 'Paste Response' : 'Paste ChatGPT\'s Response'}
              </h3>
              <p className="text-text-secondary text-sm max-w-md mx-auto">
                {isMobile ? 'Paste from ChatGPT below' : 'Copy the entire response from ChatGPT and paste it below'}
              </p>
            </div>

            {/* Enhanced textarea with glow effect and paste button */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm text-text-secondary">
                  {isMobile ? 'Response:' : 'Response from ChatGPT:'}
                </div>
                <button
                  onClick={pasteFromClipboard}
                  className="px-3 py-1.5 rounded-[20px] flex items-center gap-2 bg-gray-50
                    text-text-primary hover:bg-gray-100 transition-all text-sm border border-gray-200"
                >
                  <Clipboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Paste from clipboard</span>
                  <span className="inline sm:hidden">Paste</span>
                </button>
              </div>
              
              <div className="relative">
                <div className={`absolute -inset-0.5 bg-[#10a37f]/20 rounded-xl blur-sm ${gptResponse ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}></div>
                <textarea
                  ref={textareaRef}
                  value={gptResponse}
                  onChange={(e) => {
                    setGptResponse(e.target.value);
                    setError(null);
                  }}
                  placeholder={isMobile ? 'Paste response here...' : 'Paste the JSON response from ChatGPT here...'}
                  className="w-full h-32 sm:h-56 px-3 py-3 sm:px-4 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl 
                    focus:border-[#10a37f]/50 outline-none transition-all duration-300
                    text-text-primary placeholder-text-secondary/50 resize-none font-mono text-xs sm:text-sm relative z-10
                    hover:border-[#10a37f]/30 focus:shadow-[0_0_20px_rgba(0,0,0,0.1)]"
                />
                <p className="mt-2 text-xs text-text-secondary flex items-center gap-1">
                  <Clipboard className="w-3 h-3" />
                  {isMobile ? 'Copy the entire response' : 'Make sure to copy the entire response, including all curly braces { }'}
                </p>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
              
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <button
                onClick={() => setStep('copyPrompt')}
                className="px-5 py-3 border border-gray-200 rounded-xl
                  hover:bg-gray-50 transition-colors text-text-secondary hover:text-text-primary 
                  flex items-center justify-center gap-2 order-2 sm:order-1 sm:flex-1"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Back</span>
              </button>
              
              <button
                onClick={handlePasteResponse}
                disabled={isLoading || !gptResponse.trim()}
                className={`px-5 py-3 ${
                  isLoading || !gptResponse.trim()
                    ? 'bg-[#10a37f]/60 cursor-not-allowed'
                    : 'bg-[#10a37f] hover:bg-[#0d8c6e]'
                } rounded-xl transition-colors text-white flex items-center justify-center gap-2 font-medium
                border ${isLoading || !gptResponse.trim() ? 'border-[#10a37f]/30' : 'border-[#10a37f]/20'} 
                order-1 sm:order-2 sm:flex-1`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>{isMobile ? 'Processing...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span>Connect</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center py-6 sm:py-8 space-y-4 sm:space-y-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#10a37f]/10 rounded-full flex items-center justify-center mx-auto mb-4 
              animate-pulse">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-[#10a37f]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-text-primary">
              {isMobile ? 'Connected!' : 'Successfully Connected!'}
            </h3>
            <p className="text-text-secondary text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              {isMobile 
                ? 'Your ChatGPT data will be used for personalized recommendations.' 
                : 'Your ChatGPT usage patterns have been analyzed. We\'ll use this data to provide personalized recommendations tailored to your workflow.'}
            </p>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center py-6 sm:py-8 space-y-4 sm:space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary">Save Failed</h3>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              {error || "We couldn't save your ChatGPT data. Please try again in a few moments."}
            </p>
            <button
              onClick={() => setStep('pasteResponse')}
              className="px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl
                transition-colors text-text-primary flex items-center justify-center gap-2 mx-auto"
            >
              Try Again
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden p-4">
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm
        transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      >
        <div 
          ref={modalRef}
          className={`bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 max-w-md sm:max-w-xl w-full mx-auto
            shadow-[0_0_50px_rgba(0,0,0,0.1)] ${isClosing ? 'animate-fade-out-scale' : 'animate-fade-scale'}
            max-h-[95vh] overflow-y-auto`}
          style={{ 
            marginTop: `${Math.max(20, userScrollY + 50)}px`,
            marginBottom: '20px'
          }}
        >
          {renderStep()}
        </div>
      </div>
    </div>
  );
}