import React, { useState } from 'react';
import { introSlides } from '../constants';

interface IntroScreenProps {
  onComplete: () => void;
}
export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlide = introSlides[slideIndex];
  const handleNext = () => { slideIndex < introSlides.length - 1 ? setSlideIndex(slideIndex + 1) : onComplete(); };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-950 animate-screen-in">
      <img key={slideIndex} src={currentSlide.imageUrl} alt={currentSlide.headline} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative h-full flex flex-col p-6 pt-12 text-center text-white">
        <div className="flex-1 flex flex-col items-center justify-end space-y-4 pb-16">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-shadow-lg">{currentSlide.headline}</h1>
            <p className="text-base text-gray-200 max-w-md mx-auto text-shadow-lg leading-relaxed">{currentSlide.subtext}</p>
          </div>
        </div>
        <div className="pb-4 space-y-4">
          <div className="flex justify-center space-x-2">
            {introSlides.map((_, index) => (
              <div key={index} className={`w-2 h-2 rounded-full transition-all ${index === slideIndex ? 'bg-blue-500 scale-125' : 'bg-gray-400'}`} />
            ))}
          </div>
          <button onClick={handleNext} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
            {slideIndex === introSlides.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};
