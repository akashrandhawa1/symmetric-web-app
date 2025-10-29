import React from 'react';

interface SensorCardProps {
  side: 'Left' | 'Right';
  status: 'disconnected' | 'connecting' | 'connected';
  onConnect: () => void;
}
export const SensorCard: React.FC<SensorCardProps> = ({ side, status, onConnect }) => {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const accentStyles = side === 'Left'
    ? { borderClass: 'border-green-500', textClass: 'text-green-400', glowColor: '#22c55e' }
    : { borderClass: 'border-blue-500', textClass: 'text-blue-400', glowColor: '#3b82f6' };
  const yellowColorHex = '#facc15';

  const imagePath = "https://i.postimg.cc/pV4tpj0p/20250915-0152-Minimalist-Device-Icon-remix-01k55a5h3sfgzt89dxm5a1rj49.png";
  const cardStateClass = isConnecting
    ? 'border-yellow-500'
    : isConnected
      ? accentStyles.borderClass
      : 'bg-black/20 border-gray-700';

  return (
    <div
      onClick={onConnect}
      className={`rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm border-2 relative group cursor-pointer ${cardStateClass}`}
    >
      <div className="flex flex-col space-y-3 items-center justify-center relative z-10">
        {(isConnecting || isConnected) && (
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full blur-3xl opacity-60 transition-opacity duration-1000`}
            style={{
              animation: isConnecting ? 'pulse-bg 3s infinite ease-in-out' : 'none',
              backgroundColor: isConnecting ? yellowColorHex : accentStyles.glowColor
            }}
          ></div>
        )}
        <img
          src={imagePath}
          alt={`${side} Sensor Icon`}
          className={`w-32 h-auto mx-auto object-contain transition-transform duration-300 z-10 scale-110`}
        />
        <p className="font-semibold text-white z-10">{side} Sensor</p>
        {isConnected && <p className={`text-sm font-semibold ${accentStyles.textClass} z-10`}>Connected</p>}
        {isConnecting && <p className="text-sm font-semibold text-yellow-400 z-10">Connecting...</p>}
      </div>
    </div>
  );
};
