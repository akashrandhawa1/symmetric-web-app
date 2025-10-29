import React from 'react';

export const Confetti: React.FC = () => {
    const confettiCount = 50;
    const colors = ['#facc15', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {Array.from({ length: confettiCount }).map((_, i) => (
                <div
                    key={i}
                    className="confetti-particle"
                    style={{
                        '--color': colors[i % colors.length],
                        '--x-start': `${Math.random() * 100}%`,
                        '--delay': `${Math.random() * 1}s`,
                        '--duration': `${Math.random() * 2 + 3}s`,
                        '--rotation': `${Math.random() * 720 - 360}deg`,
                    } as React.CSSProperties}
                ></div>
            ))}
        </div>
    );
};
