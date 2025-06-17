import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'text' | 'circle' | 'rectangle';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
  dark?: boolean;
}

export function SkeletonLoader({
  type = 'rectangle',
  width,
  height,
  className = '',
  count = 1,
  dark = false
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    const bgColor = dark ? 'bg-[#1e1e1e]' : 'bg-gray-200';
    const shimmerColor = dark ? 'after:via-white/5' : 'after:via-white/30';
    
    let baseClasses = `animate-pulse ${bgColor} relative overflow-hidden `;
    
    // Add shimmer effect
    baseClasses += "after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent " + 
      shimmerColor + " after:to-transparent after:animate-[shimmer_1.5s_infinite] ";
    
    switch (type) {
      case 'card':
        return <div className={`${baseClasses} rounded-[20px] h-[150px] ${className}`} style={{ width, height }}></div>;
      case 'text':
        return <div className={`${baseClasses} h-4 rounded-full ${className}`} style={{ width: width || '100%', height }}></div>;
      case 'circle':
        return <div className={`${baseClasses} rounded-full ${className}`} style={{ width: width || '40px', height: height || '40px' }}></div>;
      case 'rectangle':
      default:
        return <div className={`${baseClasses} rounded-lg ${className}`} style={{ width, height }}></div>;
    }
  };

  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
}