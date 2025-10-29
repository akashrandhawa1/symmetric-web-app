import React from 'react';
import { BackIcon } from '../constants';
import { SensorCard } from '../components/SensorCard';
import type { SensorStatus } from '../types';

interface ConnectScreenProps {
  onConnect: (side: 'left' | 'right') => void;
  sensorStatus: SensorStatus;
  onComplete: () => void;
  onBack: () => void;
  sensorError: string | null;
}
export const ConnectScreen: React.FC<ConnectScreenProps> = ({ onConnect, sensorStatus, onComplete, onBack, sensorError }) => {
    const isAnyConnected = sensorStatus.left.status === 'connected' || sensorStatus.right.status === 'connected';

    return (
        <div className="h-full flex flex-col p-6 pt-12 animate-screen-in text-center bg-transparent">
            <div className="flex justify-start">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-300 button-press"><BackIcon/></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <h1 className="text-2xl font-bold tracking-tight">Let's pair your sensors</h1>
                <p className="text-gray-400 max-w-sm">Press the button on your sensor, then tap its icon to connect.</p>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <SensorCard side="Left" status={sensorStatus.left.status} onConnect={() => onConnect('left')} />
                    <SensorCard side="Right" status={sensorStatus.right.status} onConnect={() => onConnect('right')} />
                </div>
                <div className="text-center text-gray-400 h-10">
                    {sensorError && <p className="text-red-400 text-sm mt-1">{sensorError}</p>}
                </div>
            </div>
            <div className="pb-4">
                <button onClick={onComplete} disabled={!isAnyConnected} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none hover:bg-blue-700 transition-all shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                    Next: Strap Sensors
                </button>
            </div>
        </div>
    );
};
