
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { StyleSelector } from './components/StyleSelector';
import { ConceptInputForm } from './components/ConceptInputForm';
import { Dashboard } from './components/Results/Dashboard';
import { ConceptDashboard } from './components/Results/ConceptDashboard';
import { LoadingScreen } from './components/LoadingScreen';
import { InfoModal, ModalType } from './components/InfoModal';
import { AppState, DesignStyle, ConceptInputData, DesignResponse, ConceptResponse, AppMode, UnitSystem } from './types';
import { analyzeFloorPlan, generateArchitecturalConcept } from './services/geminiService';

const App: React.FC = () => {
  // --- API Key State ---
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // --- Modal State ---
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // --- App State ---
  const [state, setState] = useState<AppState>({
    mode: null,
    step: 'SELECT_MODE',
    unitSystem: 'm', // Default unit
    selectedFile: null,
    previewUrl: null,
    selectedStyle: DesignStyle.MODERN,
    conceptInputs: {
        plotWidth: 15,
        plotDepth: 20,
        bedrooms: 3,
        bathrooms: 3,
        livingRooms: 2,
        kitchenType: 'Closed',
        hasMaidRoom: false,
        hasStorage: true,
        hasLaundry: true,
        hasGarage: true,
        preferences: ''
    },
    result: null,
    error: null,
  });

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
        if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
            const has = await (window as any).aistudio.hasSelectedApiKey();
            setHasApiKey(has);
        } else {
            // If not in the specific environment with the key selector, assume env var is set
            setHasApiKey(true);
        }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          setHasApiKey(true);
      } else {
          // Fallback if running outside of AI Studio environment
          alert("Key selection is only available in the AI Studio environment.");
      }
  };

  const handleModeSelect = (mode: AppMode) => {
      setState(prev => ({
          ...prev,
          mode: mode,
          step: mode === 'MODE_A' ? 'INPUT' : 'INPUT', 
          error: null
      }));
  };

  const toggleUnitSystem = (unit: UnitSystem) => {
      setState(prev => ({ ...prev, unitSystem: unit }));
  };

  // --- MODE A HANDLERS ---
  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setState(prev => ({ 
      ...prev, 
      selectedFile: file, 
      previewUrl: url,
      error: null
    }));
  };

  const handleStyleSelect = (style: DesignStyle) => {
    setState(prev => ({ ...prev, selectedStyle: style }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
          if (typeof reader.result === 'string') {
              const base64Content = reader.result.split(',')[1];
              resolve(base64Content);
          } else {
              reject(new Error("Failed to read file"));
          }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerateModeA = async () => {
    if (!state.selectedFile) return;
    setState(prev => ({ ...prev, step: 'ANALYZING', error: null }));
    try {
      const base64 = await fileToBase64(state.selectedFile);
      // Pass unit system to analysis
      const result = await analyzeFloorPlan(base64, state.selectedStyle, state.unitSystem);
      setState(prev => ({ ...prev, step: 'RESULTS', result: result }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, step: 'INPUT', error: "Analysis failed. Please try again." }));
    }
  };

  // --- MODE B HANDLERS ---
  const handleConceptInputChange = (data: ConceptInputData) => {
      setState(prev => ({ ...prev, conceptInputs: data }));
  };

  const handleUnitChangeInForm = (newUnit: UnitSystem, newData: ConceptInputData) => {
      setState(prev => ({ ...prev, unitSystem: newUnit, conceptInputs: newData }));
  };

  const handleGenerateModeB = async () => {
      setState(prev => ({ ...prev, step: 'ANALYZING', error: null }));
      try {
          // Pass unit system to generation
          const result = await generateArchitecturalConcept(state.conceptInputs, state.unitSystem);
          setState(prev => ({ ...prev, step: 'RESULTS', result: result }));
      } catch (err: any) {
          console.error(err);
          setState(prev => ({ ...prev, step: 'INPUT', error: "Concept generation failed. Please try again." }));
      }
  };

  const handleReset = () => {
      setState(prev => ({
        ...prev,
        mode: null,
        step: 'SELECT_MODE',
        selectedFile: null,
        previewUrl: null,
        result: null,
        error: null,
      }));
  };

  const handleBackToMode = () => {
       setState(prev => ({ ...prev, step: 'SELECT_MODE', mode: null }));
  };

  // --- RENDER API KEY SELECTION SCREEN IF NEEDED ---
  if (!hasApiKey) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans text-gray-900 p-4">
             <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
                 <div className="flex justify-center items-center gap-2 mb-8">
                    <div className="bg-arch-900 text-white p-3 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                 </div>
                 <h1 className="text-4xl font-serif font-bold text-gray-900">
                    Welcome to Archi<span className="text-accent">Craft</span>
                 </h1>
                 <p className="text-gray-500 text-lg">
                    AI-Powered Architectural & Interior Design Concepts.
                 </p>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-left animate-fade-in-up">
                    <h3 className="font-bold text-gray-900 mb-2">Requires Gemini API Key</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        To generate professional renders using <strong>Gemini 3 Pro Image</strong>, you must connect a Google Cloud Project with billing enabled.
                    </p>
                    <button 
                        onClick={handleSelectKey}
                        className="w-full bg-arch-900 text-white font-bold py-3 px-4 rounded-lg hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        <span>Connect API Key</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-4">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                            Read about API billing
                        </a>
                    </p>
                 </div>
             </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Header onNavigate={setActiveModal} />

      <InfoModal type={activeModal} onClose={() => setActiveModal(null)} />

      <main className="flex-grow">
        {/* LANDING / MODE SELECTION */}
        {state.step === 'SELECT_MODE' && (
             <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-arch-900 mb-6 leading-tight">
                Architectural Intelligence <br />
                <span className="text-accent">Made Simple</span>
                </h1>
                
                {/* Unit Selector */}
                <div className="flex justify-center mb-10">
                    <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex shadow-sm">
                        <button 
                            onClick={() => toggleUnitSystem('m')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${state.unitSystem === 'm' ? 'bg-arch-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Meters (m)
                        </button>
                        <button 
                            onClick={() => toggleUnitSystem('ft')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${state.unitSystem === 'ft' ? 'bg-arch-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Feet (ft)
                        </button>
                    </div>
                </div>

                <p className="text-lg text-gray-500 mb-16 max-w-2xl mx-auto">
                    Select how you want to start your design journey.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Card Mode A */}
                    <div 
                        onClick={() => handleModeSelect('MODE_A')}
                        className="group cursor-pointer bg-white p-10 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-accent/50 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent group-hover:via-accent transition-all"></div>
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:bg-accent/10 transition-colors">
                             <svg className="w-8 h-8 text-gray-600 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold font-serif mb-2">Existing Floor Plan</h3>
                        <p className="text-sm text-gray-500">Upload an image of a floor plan. We'll identify rooms and generate interior design concepts.</p>
                    </div>

                    {/* Card Mode B */}
                    <div 
                        onClick={() => handleModeSelect('MODE_B')}
                        className="group cursor-pointer bg-white p-10 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-accent/50 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent group-hover:via-accent transition-all"></div>
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:bg-accent/10 transition-colors">
                            <svg className="w-8 h-8 text-gray-600 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-xl font-bold font-serif mb-2">Architectural Concept</h3>
                        <p className="text-sm text-gray-500">No plan? No problem. Describe your plot and needs, and we'll generate a layout for you.</p>
                    </div>
                </div>
             </div>
        )}

        {/* INPUT PHASE */}
        {state.step === 'INPUT' && (
            <div className="max-w-7xl mx-auto px-4 py-12">
                 {/* Mode A Input */}
                 {state.mode === 'MODE_A' && (
                    <>
                        <div className="mb-8 flex items-center justify-between">
                            <button onClick={handleBackToMode} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back to Selection
                            </button>
                            <span className="text-xs font-mono text-gray-400">Unit: {state.unitSystem === 'm' ? 'Meters' : 'Feet'}</span>
                        </div>
                        
                        {!state.selectedFile ? (
                             <div className="text-center animate-fade-in">
                                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Upload Your Plan</h2>
                                <UploadZone onFileSelect={handleFileSelect} />
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in">
                                <div className="lg:col-span-1">
                                    <div className="sticky top-24">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Your Floor Plan</h3>
                                        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                            <img src={state.previewUrl!} alt="Preview" className="w-full h-auto rounded-lg" />
                                        </div>
                                        <button onClick={() => setState(prev => ({...prev, selectedFile: null}))} className="mt-4 text-sm text-red-500 hover:text-red-700 underline">Remove Image</button>
                                        {state.error && <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{state.error}</div>}
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <StyleSelector 
                                        selectedStyle={state.selectedStyle} 
                                        onSelect={handleStyleSelect}
                                        onConfirm={handleGenerateModeA}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                 )}

                 {/* Mode B Input */}
                 {state.mode === 'MODE_B' && (
                     <ConceptInputForm 
                        data={state.conceptInputs}
                        unitSystem={state.unitSystem}
                        onChange={handleConceptInputChange}
                        onUnitChange={handleUnitChangeInForm}
                        onSubmit={handleGenerateModeB}
                        onBack={handleBackToMode}
                     />
                 )}
            </div>
        )}

        {/* LOADING PHASE */}
        {state.step === 'ANALYZING' && (
          <LoadingScreen mode={state.mode!} />
        )}

        {/* RESULTS PHASE */}
        {state.step === 'RESULTS' && state.result && (
            <>
                {state.mode === 'MODE_A' ? (
                     <Dashboard 
                        data={state.result as DesignResponse} 
                        originalImage={state.previewUrl!} 
                        onReset={handleReset}
                        onChangeKey={handleSelectKey}
                    />
                ) : (
                    <ConceptDashboard 
                        data={state.result as ConceptResponse}
                        unitSystem={state.unitSystem}
                        onReset={handleReset}
                        onChangeKey={handleSelectKey}
                    />
                )}
            </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-400">Powered by Gemini 3 Pro • Built for Google AI Hackathon</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
