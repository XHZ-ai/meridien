import React, { useState, useEffect } from 'react';
import { TypewriterEffect } from './TypewriterEffect';

interface LoadingScreenProps {
  phrases: string[];
  onComplete?: () => void;
}

export function LoadingScreen({ phrases, onComplete }: LoadingScreenProps) {
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showTypewriter, setShowTypewriter] = useState(true);

  // Ensure exact timing for each phrase
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const phraseDuration = 1200; // Duration for each phrase

    const showNextPhrase = () => {
      if (phraseIndex < phrases.length) {
        setCurrentPhrase(phrases[phraseIndex]);
        setShowTypewriter(true);
      } else {
        setIsAnimating(false);
        timeoutId = setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    };

    showNextPhrase();
    
    // Automatically advance to next phrase
    if (phraseIndex < phrases.length) {
      timeoutId = setTimeout(() => {
        setPhraseIndex(prev => prev + 1);
      }, phraseDuration);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [phraseIndex, phrases]);

  if (!isAnimating && !currentPhrase) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500"
      style={{
        background: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(0,172,193,0.10)),
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="none"><rect width="100" height="100" fill="url(#noise)"/><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg>')`,
        backgroundBlendMode: 'overlay',
        backdropFilter: 'blur(14px) saturate(1.6)',
      }}
    >
      <div className="text-center relative">
        {/* Text */}
        <div className={`relative z-10 transition-all duration-500 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <p className="text-xl md:text-2xl lg:text-3xl font-sans min-h-[2.5em] flex items-center justify-center px-6 sm:px-8">
            {showTypewriter && (
              <TypewriterEffect 
                text={currentPhrase}
                className="text-teal font-medium"
              />
            )}
          </p>
        </div>
        
        {/* Animated loading indicator */}
        <div className="flex justify-center gap-2 mt-6 sm:mt-8">
          <div className="w-2 h-2 rounded-full bg-teal/60 animate-[bounce_0.8s_infinite]" />
          <div className="w-2 h-2 rounded-full bg-teal/60 animate-[bounce_0.8s_0.2s_infinite]" />
          <div className="w-2 h-2 rounded-full bg-teal/60 animate-[bounce_0.8s_0.4s_infinite]" />
        </div>
      </div>
    </div>
  );
}