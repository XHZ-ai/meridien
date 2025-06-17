import React, { useState, useEffect } from 'react';

interface TypewriterEffectProps {
  text: string;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterEffect({ text, onComplete, className = '' }: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset when text changes
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);

    const typingInterval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= text.length - 1) {
          clearInterval(typingInterval);
          onComplete?.(); // Immediately call onComplete when typing is done
          return prev;
        }
        return prev + 1;
      });
    }, 10); // Even faster typing speed

    return () => clearInterval(typingInterval);
  }, [text]);

  useEffect(() => {
    setDisplayText(text.slice(0, currentIndex + 1));
  }, [currentIndex, text]);

  return (
    <span className={`${className} font-sans`}>
      {displayText}
      <span className="animate-[blink_1s_infinite] ml-0.5 opacity-70 font-light">│</span>
    </span>
  );
}