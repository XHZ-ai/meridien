import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
  className?: string;
}

export function TypewriterText({ text, onComplete, speed = 30, className = '' }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start fade-in animation after a brief delay
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      // Call onComplete with a slight delay to ensure all animations are done
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 200);
      return () => clearTimeout(completeTimer);
    }
  }, [currentIndex, text, onComplete, speed]);

  return (
    <span className={`transition-opacity duration-300 leading-relaxed text-gray-700 ${className} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {displayedText}
      <span className="inline-block w-[1px] h-[1em] bg-blue-500/80 ml-0.5 animate-[blink_1s_infinite]"></span>
    </span>
  );
}