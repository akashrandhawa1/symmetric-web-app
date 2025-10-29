import React, { useState, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
  onComplete?: () => void;
}
export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 40, className, delay = 0, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setDisplayedText('');
    setIsStarted(false);

    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsStarted(true);
      onCompleteRef.current?.();
      return;
    }

    const startTimer = setTimeout(() => {
      setIsStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, delay, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      return;
    }

    if (isStarted && text) {
      const effectiveSpeed = speed || Math.max(16, Math.floor(900 / Math.max(1, text.length)));
      let i = 0;
      const intervalId = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i > text.length) {
          clearInterval(intervalId);
          onCompleteRef.current?.();
        }
      }, effectiveSpeed);
      return () => clearInterval(intervalId);
    }
  }, [isStarted, text, speed, prefersReducedMotion]);

  if (!isStarted) return <p className={className}>&nbsp;</p>; // Reserve space

  return (
    <p className={className}>
      {displayedText}
      {displayedText.length < text.length && <span className="typewriter-cursor"></span>}
    </p>
  );
};
