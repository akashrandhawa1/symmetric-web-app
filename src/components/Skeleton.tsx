import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width,
    height,
  };

  return (
    <div
      className={`bg-zinc-700 ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="1rem"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div className={`bg-zinc-800 rounded-2xl p-6 border border-zinc-700 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width="3rem" height="3rem" />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" height="1.25rem" width="60%" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
};

export const SkeletonReadinessArc: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Skeleton variant="circular" width="12rem" height="12rem" className="mb-4" />
      <Skeleton variant="text" height="2rem" width="8rem" className="mb-2" />
      <Skeleton variant="text" height="1rem" width="12rem" />
    </div>
  );
};

export const SkeletonRepBars: React.FC = () => {
  return (
    <div className="space-y-2 px-4">
      <Skeleton variant="text" height="1rem" width="6rem" className="mb-3" />
      <div className="flex gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={`${Math.random() * 60 + 40}px`}
            className="flex-1"
          />
        ))}
      </div>
    </div>
  );
};

export const SkeletonHistoryCard: React.FC = () => {
  return (
    <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" height="1.25rem" width="8rem" />
        <Skeleton variant="text" height="1rem" width="4rem" />
      </div>
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height="2rem" width="4rem" />
        ))}
      </div>
      <SkeletonText lines={2} />
    </div>
  );
};

export const SkeletonPlanView: React.FC = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-800 rounded-xl p-4 border border-zinc-700"
        >
          <div className="flex items-center gap-3 mb-3">
            <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
            <div className="flex-1">
              <Skeleton variant="text" height="1.25rem" width="60%" className="mb-2" />
              <Skeleton variant="text" height="0.875rem" width="40%" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} variant="rectangular" height="1.5rem" width="3rem" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonCoachMessage: React.FC = () => {
  return (
    <div className="flex gap-3 items-start">
      <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
      <div className="flex-1 bg-zinc-800 rounded-2xl rounded-tl-none p-4 border border-zinc-700">
        <SkeletonText lines={3} />
      </div>
    </div>
  );
};
