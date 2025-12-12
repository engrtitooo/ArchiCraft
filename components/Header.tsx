
import React from 'react';

interface HeaderProps {
  onNavigate: (section: 'how-it-works' | 'showcase' | 'pricing') => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-arch-900 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-serif text-xl font-bold text-arch-900 tracking-tight">
              Archi<span className="text-accent">Craft</span>
            </span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <button onClick={() => onNavigate('how-it-works')} className="text-sm font-medium text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
              How it works
            </button>
            <button onClick={() => onNavigate('showcase')} className="text-sm font-medium text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
              Showcase
            </button>
            <button onClick={() => onNavigate('pricing')} className="text-sm font-medium text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">
              Pricing
            </button>
          </nav>
          <div className="flex items-center gap-4">
             <span className="text-xs font-mono text-gray-400">v1.0.0 (Hackathon)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
