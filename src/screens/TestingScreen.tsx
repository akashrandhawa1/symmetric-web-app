import React from 'react';
import { SideCard } from '../components/SideCard';
import type { SensorStatus } from '../types';

interface TestingScreenProps {
    onCancel: () => void;
    leftDone: number;
    rightDone: number;
    repsPerSide: number;
    isComplete: boolean;
    isAnalyzing: boolean;
    onSimulateSqueeze: (side: 'left' | 'right') => void;
    sensorStatus: SensorStatus;
}
export const TestingScreen: React.FC<TestingScreenProps> = ({ onCancel, leftDone, rightDone, repsPerSide, isComplete, isAnalyzing, onSimulateSqueeze, sensorStatus }) => {
    const isLeftActive = sensorStatus.left.status === 'connected';
    const isRightActive = sensorStatus.right.status === 'connected';
    const showAnalyzing = isComplete || isAnalyzing;

    let promptText = "Squeeze as hard as you can!";
    if (isLeftActive && leftDone < repsPerSide) { promptText = "Squeeze Left Leg"; }
    else if (isRightActive && rightDone < repsPerSide) { promptText = "Squeeze Right Leg"; }
    else if (isLeftActive || isRightActive) { promptText = "All reps recorded!"; }

    return (
        <div className="h-full flex flex-col animate-screen-in p-4">
            <div className="pt-8">
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">Cancel</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {showAnalyzing ? (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-emerald-900/40 rounded-full flex items-center justify-center border-2 border-emerald-500/50">
                            <span className="text-3xl">{isComplete ? '✓' : '⏳'}</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-light">{isComplete ? 'Check Complete!' : 'Analyzing Readiness…'}</h3>
                            <p className="text-gray-400 text-sm">Hang tight, crunching the numbers.</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                        <div className="text-center space-y-2"> <h3 className="text-xl font-semibold">{promptText}</h3> <p className="text-sm text-gray-400">Give it your maximum effort!</p> </div>
                        <div className="w-full flex-1 flex items-center justify-center gap-4">
                            {isLeftActive && <SideCard label="Left" color="blue" done={leftDone} total={repsPerSide} onSimulateSqueeze={() => onSimulateSqueeze('left')} />}
                            {isRightActive && <SideCard label="Right" color="emerald" done={rightDone} total={repsPerSide} onSimulateSqueeze={() => onSimulateSqueeze('right')} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
