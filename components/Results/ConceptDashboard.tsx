
import React, { useState, useRef } from 'react';
import { ConceptResponse, UnitSystem } from '../../types';
import { ConceptVisualizer } from './ConceptVisualizer';
import { generateInteriorPreview } from '../../services/geminiService';
import { AccessModal } from '../AccessModal';
import { isSessionUnlocked } from '../../utils/accessControl';

interface ConceptDashboardProps {
  data: ConceptResponse;
  unitSystem: UnitSystem;
  onReset: () => void;
  onChangeKey: () => void;
}

export const ConceptDashboard: React.FC<ConceptDashboardProps> = ({ data, unitSystem, onReset, onChangeKey }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'list'>('visual');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Access Control
  const [showAccessModal, setShowAccessModal] = useState(false);

  const performInteriorGeneration = async () => {
    setIsGeneratingImage(true);
    setImageError(null);
    try {
        const svgElement = document.getElementById('concept-plan-svg');
        if (!svgElement) throw new Error("Could not find drawing source.");

        // Serialize SVG to XML string
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);

        // Convert to Base64 Image via Canvas
        const canvas = document.createElement('canvas');
        const bbox = svgElement.getBoundingClientRect();
        
        // High resolution for better AI analysis
        const scale = 2; 
        canvas.width = bbox.width * scale;
        canvas.height = bbox.height * scale;
        
        const ctx = canvas.getContext('2d');
        if(!ctx) throw new Error("Canvas context failed");

        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        ctx.fillStyle = "#ffffff"; // Ensure white background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const base64Jpeg = canvas.toDataURL('image/jpeg').split(',')[1];
        
        // Call Nano Banana Pro 3 (Gemini 3 Pro Image)
        const resultBase64 = await generateInteriorPreview(base64Jpeg, data.concept_description || "Modern Interior");
        setGeneratedImage(`data:image/png;base64,${resultBase64}`);

    } catch (err: any) {
        console.error(err);
        const errStr = JSON.stringify(err);
        if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED') || err.message?.includes('403')) {
            setImageError("PERMISSION_DENIED");
        } else {
            setImageError("Failed to generate interior visualization. Please try again.");
        }
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleVisualizeClick = () => {
    if (isSessionUnlocked()) {
        performInteriorGeneration();
    } else {
        setShowAccessModal(true);
    }
  };

  const handleAccessSuccess = () => {
    setShowAccessModal(false);
    performInteriorGeneration();
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
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
            <div>
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold tracking-wide mb-2">
                CONCEPTUAL PLAN
            </span>
            <h1 className="text-3xl font-serif font-bold text-gray-900">{data.project_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
                Estimated Plot Size: {data.plot.display_size || `${data.plot.width_m}m x ${data.plot.depth_m}m`}
            </p>
            </div>
            <div className="flex gap-3">
            <button 
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                Start New Concept
            </button>
            <button 
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium text-white bg-arch-900 rounded-lg hover:bg-black transition-colors"
            >
                Export PDF
            </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column: Summary & Controls */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-arch-50 p-6 rounded-xl border border-gray-100">
                    <h3 className="font-serif font-bold text-gray-900 mb-3">Architect's Concept</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
                        {data.concept_description}
                    </p>
                    
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Circulation Strategy</h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {data.circulation.notes}
                    </p>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 text-xs text-gray-500 mb-6">
                        <p className="font-bold mb-1">Assumptions & Disclaimers:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            {data.assumptions.map((note, i) => <li key={i}>{note}</li>)}
                            <li>This is an AI-generated concept. Dimensions are approximate.</li>
                            <li>Selected Unit System: {unitSystem === 'm' ? 'Meters' : 'Feet'}.</li>
                        </ul>
                    </div>

                    {/* AI VISUALIZE ACTION */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-serif font-bold text-gray-900 mb-2">Visualize Interiors</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Use "Gemini 3 Pro Image" to turn this schematic into a fully furnished, realistic floor plan.
                        </p>
                        <button
                            onClick={handleVisualizeClick}
                            disabled={isGeneratingImage}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white transition-all 
                                ${isGeneratingImage ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg'}`}
                        >
                            {isGeneratingImage ? (
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
                        {imageError === "PERMISSION_DENIED" ? (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                <p className="text-xs text-red-600 mb-2 font-medium">Access Denied: Paid API Key Required</p>
                                <p className="text-xs text-gray-600 mb-3">The model "Gemini 3 Pro Image" requires a Google Cloud project with billing enabled.</p>
                                <button onClick={onChangeKey} className="text-xs bg-white border border-gray-300 px-3 py-1 rounded shadow-sm hover:bg-gray-50 text-gray-700">
                                    Switch API Key
                                </button>
                            </div>
                        ) : (
                            imageError && <p className="text-xs text-red-500 mt-2 text-center">{imageError}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Visualization & Details */}
            <div className="lg:col-span-2">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setActiveTab('visual')} className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'visual' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Layout Diagram
                    </button>
                    <button onClick={() => setActiveTab('list')} className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Room Schedule
                    </button>
                </div>

                {activeTab === 'visual' && (
                    <div className="space-y-6">
                        {/* Show Generated Image if available */}
                        {generatedImage && (
                            <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-purple-100 animate-fade-in relative">
                                <span className="absolute top-4 right-4 bg-purple-600 text-white text-xs px-2 py-1 rounded font-bold shadow">
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
                        )}

                        {/* Main Schematic Diagram */}
                        <div className={generatedImage ? "opacity-75 hover:opacity-100 transition-opacity" : ""}>
                            <ConceptVisualizer data={data} />
                        </div>
                        
                        <div className="flex justify-center gap-6 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-200 rounded"></div> Public / Guest</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-200 rounded"></div> Semi-Private / Family</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-200 rounded"></div> Private / Bed</div>
                        </div>
                    </div>
                )}

                {activeTab === 'list' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.rooms.map((room, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{room.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {/* Prefer display string, fallback to manual calc if needed */}
                                            {room.dimensions_display || 
                                            (unitSystem === 'ft' 
                                                ? `${(room.approx_dimensions_m.width * 3.28084).toFixed(1)}ft x ${(room.approx_dimensions_m.length * 3.28084).toFixed(1)}ft`
                                                : `${room.approx_dimensions_m.width}m x ${room.approx_dimensions_m.length}m`)
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${room.privacy_level === 'public' ? 'bg-orange-100 text-orange-800' : 
                                                room.privacy_level === 'semi_private' ? 'bg-blue-100 text-blue-800' : 
                                                'bg-green-100 text-green-800'}`}>
                                                {room.privacy_level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{room.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- PROFESSIONAL PRINT VIEW (A4 PDF EXPORT) --- */}
      <div className="print-only">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold font-serif text-black uppercase tracking-wide">Concept Layout Report</h1>
                <h2 className="text-xl text-gray-600 mt-2">{data.project_name}</h2>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-accent">ArchiCraft</div>
                <div className="text-sm text-gray-500">AI-Powered Architectural Planning</div>
                <div className="text-sm text-gray-400 mt-1">{new Date().toLocaleDateString()}</div>
            </div>
        </div>
        
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 avoid-break">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Concept Narrative</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{data.concept_description}</p>
        </div>

        {/* Scaled Images/Diagrams */}
        <div className="mb-8 avoid-break">
            <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Architectural Diagram</h3>
            <div className="border border-gray-300 p-4 flex justify-center bg-white">
                {/* Re-using Visualizer but ensuring width is constrained for print */}
                <div className="w-[80%]">
                    <ConceptVisualizer data={data} />
                </div>
            </div>
        </div>

        {generatedImage && (
             <div className="mb-8 avoid-break page-break-before">
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">3D Visualization Render</h3>
                <div className="border border-gray-300 p-2">
                    <img src={generatedImage} className="w-full h-auto object-contain max-h-[500px]" alt="Render" />
                </div>
             </div>
        )}

        <div className="page-break"></div>
        
        {/* Full Schedule */}
        <h3 className="text-2xl font-bold mb-6">Room Schedule & Specifications</h3>
        <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Room</th>
                    <th className="border border-gray-300 p-2 text-left">Dimensions</th>
                    <th className="border border-gray-300 p-2 text-left">Zone</th>
                    <th className="border border-gray-300 p-2 text-left">Notes</th>
                </tr>
            </thead>
            <tbody>
                {data.rooms.map((room, idx) => (
                    <tr key={idx}>
                        <td className="border border-gray-300 p-2 font-bold">{room.name}</td>
                        <td className="border border-gray-300 p-2">
                             {room.dimensions_display || 
                                (unitSystem === 'ft' 
                                ? `${(room.approx_dimensions_m.width * 3.28084).toFixed(1)}ft x ${(room.approx_dimensions_m.length * 3.28084).toFixed(1)}ft`
                                : `${room.approx_dimensions_m.width}m x ${room.approx_dimensions_m.length}m`)
                            }
                        </td>
                        <td className="border border-gray-300 p-2">{room.privacy_level}</td>
                        <td className="border border-gray-300 p-2">{room.notes}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        <div className="mt-8 text-xs text-gray-400 border-t pt-4">
            <p>Generated by ArchiCraft using Google Gemini 3 Pro Models. All dimensions are approximate concepts.</p>
        </div>

      </div>

    </div>
  );
};
