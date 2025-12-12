
import React, { useEffect, useState } from 'react';
import { AppMode } from '../types';

interface LoadingScreenProps {
  mode: AppMode;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ mode }) => {
  const [stage, setStage] = useState(0);
  
  const stagesA = [
    "Analyzing floor plan geometry...",
    "Identifying room boundaries...",
    "Applying interior design style...",
    "Generating furniture layout...",
    "Finalizing color palettes..."
  ];

  const stagesB = [
    "Analyzing plot constraints...",
    "Optimizing public vs private zones...",
    "Arranging room adjacencies...",
    "Calculating circulation flows...",
    "Drafting conceptual layout..."
  ];

  const currentStages = mode === 'MODE_B' ? stagesB : stagesA;

  useEffect(() => {
    // Rotation speed at 800ms for responsiveness
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % currentStages.length);
    }, 800);
    return () => clearInterval(interval);
  }, [currentStages]);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
        {/* Spinner Color matched to screenshot orange */}
        <div className="absolute inset-0 border-4 border-[#f97316] rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
             <svg className="w-8 h-8 text-[#f97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
             </svg>
        </div>
      </div>
      <h2 className="text-xl font-serif font-medium text-gray-900 mb-2">
          {mode === 'MODE_B' ? 'Developing Architectural Concept' : 'Designing Your Space'}
      </h2>
      <p className="text-sm text-gray-500 font-mono min-h-[1.5rem] transition-all duration-300">
        {currentStages[stage]}
      </p>
    </div>
  );
};
