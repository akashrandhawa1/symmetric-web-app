import React, { useState, useEffect } from 'react';

interface ReadinessBarProps {
  preSetScore: number;
  postSetScore: number;
  color: string;
}
export const ReadinessBar: React.FC<ReadinessBarProps> = ({ preSetScore, postSetScore, color }) => {
  const [width, setWidth] = useState(preSetScore);

  useEffect(() => {
    setWidth(preSetScore);
    const timer = setTimeout(() => {
      setWidth(postSetScore);
    }, 350); 

    return () => clearTimeout(timer);
  }, [preSetScore, postSetScore]);

  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ 
          width: `${width}%`, 
          backgroundColor: color,
          transition: 'width 1.5s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      ></div>
    </div>
  );
};
