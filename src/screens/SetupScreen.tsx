import React from 'react';
import { BackIcon } from '../constants';

interface SetupScreenProps {
    onBack: () => void;
    repsPerSide: number;
    onBegin: () => void;
    onStartWorkoutDirectly: () => void;
}
export const SetupScreen: React.FC<SetupScreenProps> = ({ onBack, repsPerSide, onBegin, onStartWorkoutDirectly }) => {
  return (
    <div className="h-full flex flex-col animate-screen-in p-6">
      <div className="pt-6"><button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 button-press"><BackIcon /></button></div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-8 w-full">
          <div className="space-y-2"> <h2 className="text-3xl font-bold">Readiness Check</h2> <p className="text-base text-gray-300">Perform {repsPerSide} max squeezes per leg.</p> </div>
          <div className="text-5xl">💪</div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-left space-y-2 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-white">Instructions</h3>
            <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
              <li>Sit comfortably, sensor on your thigh.</li> <li>Extend one leg and squeeze as hard as you can.</li> <li>Relax, then repeat for the other leg.</li>
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onBegin} className="w-full bg-blue-600 text-white py-4 text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">Begin Check</button>
            <button onClick={onStartWorkoutDirectly} className="w-full bg-white/10 text-white py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors button-press">
              Start Workout Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
