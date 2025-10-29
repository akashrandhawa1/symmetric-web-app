import React from 'react';
import { BackIcon, SitUprightIcon, SqueezeIcon, RepeatIcon } from '../constants';

interface MVCScreenProps {
    onBegin: () => void;
    onBack: () => void;
}
export const MVCScreen: React.FC<MVCScreenProps> = ({ onBegin, onBack }) => {
    return (
        <div className="h-full relative flex flex-col animate-screen-in bg-black text-white overflow-hidden">
            <video 
                src="https://ia801002.us.archive.org/18/items/untitled_20250912_2248/Untitled.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            ></video>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-gray-950/60 to-transparent z-10"></div>
            <div className="relative z-20 h-full flex flex-col p-6">
                <div className="pt-6 flex items-center flex-shrink-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-white button-press z-10"><BackIcon /></button>
                    <h1 className="text-2xl font-bold tracking-tight text-center w-full -ml-8 text-shadow-lg">Peak Strength Test</h1>
                </div>
                <div className="w-full grid grid-cols-3 gap-3 text-center py-6 flex-shrink-0">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <SitUprightIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">Sit Upright</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <SqueezeIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">Max Squeeze</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <RepeatIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">3x Per Leg</p>
                    </div>
                </div>
                <div className="flex-1"></div>
                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="w-full bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center backdrop-blur-sm">
                        <p className="text-sm text-amber-300 font-medium">For best results, test only when you feel fresh.</p>
                    </div>
                    <button onClick={onBegin} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                        Begin Test
                    </button>
                </div>
            </div>
        </div>
    );
};
