import React from 'react';

interface TutorialPopUpProps {
    step: number;
    onNext: () => void;
    onSkip: () => void;
    steps: {id: number, title: string, description: string}[];
}
export const TutorialPopUp: React.FC<TutorialPopUpProps> = ({ step, onNext, onSkip, steps }) => {
    const currentStep = steps.find(s => s.id === step);
    if (!currentStep) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white/5 backdrop-blur-xl shadow-xl border border-white/20 rounded-xl p-6 text-center w-full max-w-sm space-y-4">
                <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
                <p className="text-sm text-gray-300">{currentStep.description}</p>
                <div className="flex space-x-2 justify-center pt-2">
                    {steps.map((_, index) => (
                        <div key={index} className={`w-2.5 h-2.5 rounded-full ${index === step - 1 ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
                    ))}
                </div>
                <div className="flex space-x-4 mt-4">
                    <button onClick={onSkip} className="flex-1 bg-white/10 text-white py-2 rounded-xl font-semibold button-press">Skip</button>
                    <button onClick={onNext} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-semibold button-press">
                        {step < steps.length ? "Next" : "Got It"}
                    </button>
                </div>
            </div>
        </div>
    );
};
