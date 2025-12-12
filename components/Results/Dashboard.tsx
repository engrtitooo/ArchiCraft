
import React, { useState } from 'react';
import { DesignResponse } from '../../types';
import { RoomCard } from './RoomCard';
import { generateInteriorPreview } from '../../services/geminiService';
import { AccessModal } from '../AccessModal';
import { isSessionUnlocked } from '../../utils/accessControl';

interface DashboardProps {
  data: DesignResponse;
  originalImage: string;
  onReset: () => void;
  onChangeKey: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, originalImage, onReset, onChangeKey }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'render'>('visual');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Access Control State
  const [showAccessModal, setShowAccessModal] = useState(false);

  const performGeneration = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Convert the Blob URL (originalImage) back to Base64 for the API
      const response = await fetch(originalImage);
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data:image/png;base64, prefix
            const base64Clean = result.split(',')[1];
            resolve(base64Clean);
        };
        reader.onerror = reject;
      });

      // Call Gemini 3 Pro Image (Nano Banana Pro 3)
      const imageBase64 = await generateInteriorPreview(
          base64, 
          `Interior Design Style: ${data.overall_style_notes}. Ensure high fidelity to the original walls.`
      );
      
      setGeneratedImage(`data:image/png;base64,${imageBase64}`);
      setActiveTab('render'); // Auto-switch to the new tab

    } catch (err: any) {
      console.error(err);
      const errStr = JSON.stringify(err);
      if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED') || err.message?.includes('403')) {
          setError("PERMISSION_DENIED");
      } else {
          setError("Failed to generate interior visualization. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVisualizeClick = () => {
      if (isSessionUnlocked()) {
          performGeneration();
      } else {
          setShowAccessModal(true);
      }
  };

  const handleAccessSuccess = () => {
      setShowAccessModal(false);
      performGeneration();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      <AccessModal 
        isOpen={showAccessModal} 
        onSuccess={handleAccessSuccess} 
        onClose={() => setShowAccessModal(false)} 
      />

      {/* --- SCREEN VIEW --- */}
      <div className="screen-only">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
            <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">{data.project_name}</h1>
            <p className="text-gray-500 mt-1">AI Generated Design Concept</p>
            </div>
            <div className="flex gap-3">
            <button 
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                Upload New Plan
            </button>
            <button 
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium text-white bg-arch-900 rounded-lg hover:bg-black transition-colors"
            >
                Export PDF
            </button>
            </div>
        </div>

        {/* Project Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-1 space-y-6">
                {/* Image Preview */}
                <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <img src={originalImage} alt="Floor Plan" className="w-full h-auto rounded-lg" />
                    <p className="text-xs text-center text-gray-400 mt-2">Analyzed Floor Plan</p>
                </div>
                
                {/* Architect Notes */}
                <div className="bg-arch-50 p-6 rounded-xl border border-gray-100">
                    <h3 className="font-serif font-bold text-gray-900 mb-2">Architect's Summary</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {data.architectural_summary}
                    </p>
                    <div className="h-px bg-gray-200 my-4"></div>
                    <h3 className="font-serif font-bold text-gray-900 mb-2">Style Notes</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {data.overall_style_notes}
                    </p>

                    {/* VISUALIZE ACTION */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                        <h3 className="font-serif font-bold text-gray-900 mb-2">Visualize Interiors</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Use "Nano Banana Pro 3" to turn this uploaded plan into a photorealistic render.
                        </p>
                        <button
                            onClick={handleVisualizeClick}
                            disabled={isGenerating}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white transition-all 
                                ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg'}`}
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Rendering...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Generate AI Render
                                </>
                            )}
                        </button>
                        {error === "PERMISSION_DENIED" ? (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                <p className="text-xs text-red-600 mb-2 font-medium">Access Denied: Paid API Key Required</p>
                                <p className="text-xs text-gray-600 mb-3">The model "Nano Banana Pro 3" requires a Google Cloud project with billing enabled.</p>
                                <button onClick={onChangeKey} className="text-xs bg-white border border-gray-300 px-3 py-1 rounded shadow-sm hover:bg-gray-50 text-gray-700">
                                    Switch API Key
                                </button>
                            </div>
                        ) : (
                            error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'visual' 
                            ? 'border-accent text-accent' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Room Concepts
                    </button>
                    <button
                        onClick={() => setActiveTab('render')}
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'render' 
                            ? 'border-accent text-accent' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        AI Render
                    </button>
                </div>

                {activeTab === 'visual' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        {data.rooms.map((room) => (
                            <RoomCard key={room.id} room={room} />
                        ))}
                    </div>
                )}

                {activeTab === 'render' && (
                    <div className="animate-fade-in">
                        {generatedImage ? (
                            <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-purple-100 relative">
                                <span className="absolute top-6 right-6 bg-purple-600 text-white text-xs px-2 py-1 rounded font-bold shadow z-10">
                                    AI RENDER
                                </span>
                                <img src={generatedImage} alt="AI Interior Render" className="w-full h-auto rounded-lg" />
                                <div className="mt-4 flex justify-between items-center">
                                    <span className="text-xs text-gray-500">generated by ArchiCraft</span>
                                    <a 
                                        href={generatedImage} 
                                        download={`${data.project_name.replace(/\s+/g, '_')}_render.png`}
                                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                    >
                                        Download Image
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No Render Generated Yet</h3>
                                <p className="text-gray-500 mt-1 mb-6">Click the "Generate AI Render" button in the sidebar to visualize this plan.</p>
                                <button
                                    onClick={handleVisualizeClick}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                                >
                                    Generate Now
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- PROFESSIONAL PRINT VIEW (A4 PDF EXPORT) --- */}
      <div className="print-only">
        {/* Print Header */}
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold font-serif text-black uppercase tracking-wide">Renovation Design Report</h1>
                <h2 className="text-xl text-gray-600 mt-2">{data.project_name}</h2>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-accent">ArchiCraft</div>
                <div className="text-sm text-gray-500">AI-Powered Interior Architecture</div>
                <div className="text-sm text-gray-400 mt-1">{new Date().toLocaleDateString()}</div>
            </div>
        </div>

        {/* Print Image Grid */}
        <div className="print-grid mb-8">
             <div className="avoid-break">
                 <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Original Floor Plan</h3>
                 <div className="border border-gray-300 p-2">
                     <img src={originalImage} className="w-full h-auto object-contain max-h-[400px]" alt="Original Plan" />
                 </div>
             </div>
             {generatedImage && (
                 <div className="avoid-break">
                    <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">AI-Generated Concept</h3>
                     <div className="border border-gray-300 p-2">
                        <img src={generatedImage} className="w-full h-auto object-contain max-h-[400px]" alt="Render" />
                     </div>
                 </div>
             )}
        </div>

        {/* Print Executive Summary */}
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 avoid-break">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Architectural Summary</h3>
            <p className="text-sm text-gray-700 mb-4">{data.architectural_summary}</p>
            
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Design Style Strategy</h3>
            <p className="text-sm text-gray-700 italic">{data.overall_style_notes}</p>
        </div>

        <div className="page-break"></div>

        {/* Print Room Details */}
        <h3 className="text-2xl font-bold mb-6">Detailed Room Specifications</h3>
        <div className="grid grid-cols-1 gap-6">
            {data.rooms.map((room, idx) => (
                <div key={idx} className="border border-gray-300 rounded p-4 avoid-break">
                    <div className="flex justify-between border-b border-gray-100 pb-2 mb-3">
                        <span className="font-bold text-lg">{room.room_type}</span>
                        <span className="text-gray-500 text-sm">{room.dimensions_estimate}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <p className="text-sm text-gray-600 mb-2"><strong>Concept:</strong> {room.design_concept}</p>
                             <p className="text-sm text-gray-600 mb-2"><strong>Flooring:</strong> {room.flooring_suggestion}</p>
                             <p className="text-sm text-gray-600"><strong>Lighting:</strong> {room.lighting_suggestion}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-1">Furniture:</p>
                            <ul className="list-disc pl-4 text-sm text-gray-600 mb-2">
                                {room.furniture_layout.map((f, i) => (
                                    <li key={i}>{f.name} <span className="text-gray-400 text-xs">({f.placement_reasoning})</span></li>
                                ))}
                            </ul>
                            <div className="flex gap-2 mt-2">
                                {room.color_palette.map((c, i) => (
                                    <span key={i} className="inline-block w-6 h-6 rounded-full border border-gray-200" style={{backgroundColor: c}}></span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};
