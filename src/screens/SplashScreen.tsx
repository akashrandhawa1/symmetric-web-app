import React, { useEffect } from 'react';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}
export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onAnimationComplete, 4000);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="h-full w-full bg-transparent flex flex-col items-center justify-center splash-screen">
      <h1 className="splash-title-new text-4xl font-bold tracking-widest text-white/90">
        {'SYMMETRIC'.split('').map((char, index) => (
          <span key={index} style={{ animationDelay: `${0.5 + index * 0.1}s` }}>{char}</span>
        ))}
      </h1>
    </div>
  );
};
