import React from 'react';
import { DesignStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: DesignStyle;
  onSelect: (style: DesignStyle) => void;
  onConfirm: () => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelect, onConfirm }) => {
  
  // Mapping enum to visual descriptions
  const styleDescriptions: Record<DesignStyle, string> = {
    [DesignStyle.MODERN]: "Clean lines, minimalism, neutral colors, and functional furniture.",
    [DesignStyle.SCANDINAVIAN]: "Cozy, bright, wood textures, hygge elements, and simplicity.",
    [DesignStyle.INDUSTRIAL]: "Raw materials, exposed ducts, brick, metal, and utilitarian vibes.",
    [DesignStyle.BOHEMIAN]: "Eclectic, artistic, patterns, plants, and relaxed atmosphere.",
    [DesignStyle.MID_CENTURY]: "Retro 50s/60s, organic shapes, tapered legs, and bold accents.",
    [DesignStyle.LUXURY]: "High-end finishes, sophisticated palettes, marble, and velvet."
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-gray-900">Choose Your Aesthetic</h2>
        <p className="text-gray-500">How should the AI envision your space?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(DesignStyle).map((style) => (
          <div
            key={style}
            onClick={() => onSelect(style)}
            className={`
              cursor-pointer p-6 rounded-xl border-2 transition-all duration-200
              ${selectedStyle === style 
                ? 'border-accent bg-white shadow-lg ring-2 ring-accent/20' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{style}</h3>
              {selectedStyle === style && (
                <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {styleDescriptions[style]}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onConfirm}
          className="bg-arch-900 hover:bg-black text-white px-8 py-4 rounded-full font-medium text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
        >
          <span>Generate Design Concept</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};