
import React, { useState, useEffect, useRef } from 'react';
import { ConceptResponse, UnitSystem } from '../../types';
import { ConceptVisualizer } from './ConceptVisualizer';
import { generateInteriorPreview, generateCadDrawing } from '../../services/geminiService';
import { AccessModal } from '../AccessModal';
import { isSessionUnlocked } from '../../utils/accessControl';

interface ConceptDashboardProps {
  data: ConceptResponse;
  unitSystem: UnitSystem;
  onReset: () => void;
  onChangeKey: () => void;
}

export const ConceptDashboard: React.FC<ConceptDashboardProps> = ({ data, unitSystem, onReset, onChangeKey }) => {
  // We no longer toggle between "Layout Diagram" (SVG) and "Room Schedule".
  // The User only sees the "CAD Drawing" (Image) and "Room Schedule".
  const [activeTab, setActiveTab] = useState<'cad' | 'interior' | 'list'>('cad');
  
  // Images
  const [cadImage, setCadImage] = useState<string | null>(null);
  const [interiorImage, setInteriorImage] = useState<string | null>(null);
  
  // Statuses
  const [isGeneratingCad, setIsGeneratingCad] = useState(false);
  const [isGeneratingInterior, setIsGeneratingInterior] = useState(false);
  const [cadError, setCadError] = useState<string | null>(null);
  const [interiorError, setInteriorError] = useState<string | null>(null);
  
  // Access Control
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Hidden Ref for capturing the internal SVG
  const hiddenSvgRef = useRef<HTMLDivElement>(null);

  // STEP 3 AUTOMATION: Generate CAD Drawing immediately on mount
  useEffect(() => {
    const initCadGeneration = async () => {
        if (cadImage || isGeneratingCad) return; // Already done or doing

        setIsGeneratingCad(true);
        setCadError(null);

        try {
            // Short delay to ensure SVG renders in hidden DOM
            await new Promise(r => setTimeout(r, 500)); 

            const svgElement = document.getElementById('concept-plan-svg');
            if (!svgElement) throw new Error("Internal schematic missing.");

            // Capture SVG to Base64
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            
            const canvas = document.createElement('canvas');
            const bbox = svgElement.getBoundingClientRect();
            // High resolution capture
            const scale = 2; 
            canvas.width = (bbox.width || 800) * scale;
            canvas.height = (bbox.height || 600) * scale;
            
            const ctx = canvas.getContext('2d');
            if(!ctx) throw new Error("Canvas context failed");

            const img = new Image();
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const base64Jpeg = canvas.toDataURL('image/jpeg').split(',')[1];

            // CALL API: Generate Professional CAD Drawing using Nano Banana Pro 3
            // This is "Step 3" from requirements
            const drawingBase64 = await generateCadDrawing(base64Jpeg);
            setCadImage(`data:image/png;base64,${drawingBase64}`);

        } catch (err: any) {
            console.error(err);
             const errStr = JSON.stringify(err);
            if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED') || err.message?.includes('403')) {
                setCadError("PERMISSION_DENIED");
            } else {
                setCadError("Failed to generate architectural drawing. Please try resetting.");
            }
        } finally {
            setIsGeneratingCad(false);
        }
    };

    initCadGeneration();
  }, [data]); // Run once when data is available

  // Interior Design Generation (Triggered by user)
  const performInteriorGeneration = async () => {
    setIsGeneratingInterior(true);
    setInteriorError(null);
    try {
        // We use the SAME source SVG to ensure wall alignment match with the CAD drawing
        // (Since both CAD and Interior are generated from the same schematic source)
        const svgElement = document.getElementById('concept-plan-svg');
        if (!svgElement) throw new Error("Internal schematic source lost.");

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        const canvas = document.createElement('canvas');
        const bbox = svgElement.getBoundingClientRect();
        const scale = 2; 
        canvas.width = (bbox.width || 800) * scale;
        canvas.height = (bbox.height || 600) * scale;
        
        const ctx = canvas.getContext('2d');
        if(!ctx) throw new Error("Canvas context failed");

        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const base64Jpeg = canvas.toDataURL('image/jpeg').split(',')[1];
        
        // Call Nano Banana Pro 3 for Interior
        const resultBase64 = await generateInteriorPreview(base64Jpeg, data.concept_description || "Modern Interior");
        setInteriorImage(`data:image/png;base64,${resultBase64}`);
        setActiveTab('interior');

    } catch (err: any) {
        console.error(err);
        const errStr = JSON.stringify(err);
        if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED') || err.message?.includes('403')) {
            setInteriorError("PERMISSION_DENIED");
        } else {
            setInteriorError("Failed to generate interior visualization. Please try again.");
        }
    } finally {
        setIsGeneratingInterior(false);
    }
  };

  const handleInteriorClick = () => {
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in relative">
      
      {/* HIDDEN SVG CONTAINER - Used for Internal Capture Only */}
      <div 
        ref={hiddenSvgRef} 
        style={{ position: 'absolute', top: 0, left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <ConceptVisualizer data={data} />
      </div>

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
            <span className="inline-block px-3 py-1 rounded-full bg-black text-white text-xs font-bold tracking-wide mb-2">
                ARCHITECTURAL PLAN
            </span>
            <h1 className="text-3xl font-serif font-bold text-gray-900">{data.project_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
                AI Generated • {data.plot.display_size || `${data.plot.width_m}m x ${data.plot.depth_m}m`}
            </p>
            </div>
            <div className="flex gap-3">
            <button 
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                Start New Project
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
                    <h3 className="font-serif font-bold text-gray-900 mb-3">Architect's Statement</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
                        {data.concept_description}
                    </p>
                    
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Circulation Strategy</h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {data.circulation.notes}
                    </p>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 text-xs text-gray-500 mb-6">
                        <p className="font-bold mb-1">Project Notes:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            {data.assumptions.map((note, i) => <li key={i}>{note}</li>)}
                            <li>Unit System: {unitSystem === 'm' ? 'Meters' : 'Feet'}.</li>
                        </ul>
                    </div>

                    {/* INTERIOR DESIGN ACTION */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-serif font-bold text-gray-900 mb-2">Interior Design</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Generate a photorealistic interior render based on this locked architectural layout.
                        </p>
                        <button
                            onClick={handleInteriorClick}
                            disabled={!cadImage || isGeneratingInterior || isGeneratingCad}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white transition-all 
                                ${(!cadImage || isGeneratingInterior || isGeneratingCad)
                                    ? 'bg-gray-300 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg'}`}
                        >
                            {isGeneratingInterior ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Designing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Generate Interior Design
                                </>
                            )}
                        </button>
                        
                        {!cadImage && isGeneratingCad && (
                             <p className="text-xs text-orange-500 mt-2 text-center animate-pulse">Wait for floor plan generation...</p>
                        )}

                        {interiorError === "PERMISSION_DENIED" ? (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                <p className="text-xs text-red-600 mb-2 font-medium">Access Denied: Paid API Key Required</p>
                                <button onClick={onChangeKey} className="text-xs bg-white border border-gray-300 px-3 py-1 rounded shadow-sm hover:bg-gray-50 text-gray-700">
                                    Switch API Key
                                </button>
                            </div>
                        ) : (
                            interiorError && <p className="text-xs text-red-500 mt-2 text-center">{interiorError}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Visualization & Details */}
            <div className="lg:col-span-2">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setActiveTab('cad')} className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'cad' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Floor Plan Drawing
                    </button>
                    <button 
                        onClick={() => interiorImage && setActiveTab('interior')} 
                        disabled={!interiorImage}
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'interior' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}
                    >
                        Interior Design
                    </button>
                    <button onClick={() => setActiveTab('list')} className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Room Schedule
                    </button>
                </div>

                {activeTab === 'cad' && (
                    <div className="space-y-6">
                        {isGeneratingCad ? (
                             <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl h-96 flex flex-col items-center justify-center text-center p-8 animate-pulse">
                                <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
                                <h3 className="text-lg font-bold text-gray-400">Drafting Architectural Plan...</h3>
                                <p className="text-sm text-gray-400 mt-2">Using Nano Banana Pro 3 to generate high-definition CAD drawing.</p>
                             </div>
                        ) : cadImage ? (
                            <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-200 animate-fade-in">
                                <img src={cadImage} alt="Architectural CAD Drawing" className="w-full h-auto rounded-lg border border-gray-100" />
                                <div className="mt-4 px-2 pb-2 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 font-mono uppercase">Status: Layout Locked</span>
                                    <a 
                                        href={cadImage} 
                                        download={`${data.project_name.replace(/\s+/g, '_')}_floorplan.png`}
                                        className="text-sm text-black hover:underline font-bold"
                                    >
                                        Download CAD Plan
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 p-8 rounded-xl text-center text-red-600">
                                <p>Failed to generate floor plan drawing.</p>
                                {cadError === "PERMISSION_DENIED" && (
                                    <button onClick={onChangeKey} className="mt-4 underline text-sm">Check API Key Billing</button>
                                )}
                            </div>
                        )}
                        
                        <p className="text-xs text-gray-400 text-center">
                            *This drawing is AI-generated for conceptual use only. Do not use for construction.
                        </p>
                    </div>
                )}

                {activeTab === 'interior' && interiorImage && (
                    <div className="bg-white p-2 rounded-xl shadow-lg border-2 border-purple-100 animate-fade-in relative">
                        <span className="absolute top-6 right-6 bg-purple-600 text-white text-xs px-2 py-1 rounded font-bold shadow z-10">
                            AI RENDER
                        </span>
                        <img src={interiorImage} alt="Interior Design Render" className="w-full h-auto rounded-lg" />
                        <div className="mt-4 px-2 pb-2 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Based on Locked Layout</span>
                            <a 
                                href={interiorImage} 
                                download={`${data.project_name.replace(/\s+/g, '_')}_interior.png`}
                                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                            >
                                Download Render
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === 'list' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
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
                <h1 className="text-3xl font-bold font-serif text-black uppercase tracking-wide">Architectural Design Report</h1>
                <h2 className="text-xl text-gray-600 mt-2">{data.project_name}</h2>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-accent">ArchiCraft</div>
                <div className="text-sm text-gray-500">AI-Powered Architectural Planning</div>
                <div className="text-sm text-gray-400 mt-1">{new Date().toLocaleDateString()}</div>
            </div>
        </div>
        
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 avoid-break">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Architect's Concept</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{data.concept_description}</p>
        </div>

        {cadImage && (
            <div className="mb-8 avoid-break">
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Floor Plan Drawing</h3>
                <div className="border border-gray-300 p-4 flex justify-center bg-white">
                    <img src={cadImage} className="w-full h-auto max-h-[600px] object-contain" alt="Floor Plan" />
                </div>
            </div>
        )}

        {interiorImage && (
             <div className="mb-8 avoid-break page-break-before">
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Interior Visualization</h3>
                <div className="border border-gray-300 p-2">
                    <img src={interiorImage} className="w-full h-auto object-contain max-h-[500px]" alt="Render" />
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
            <p>Generated by ArchiCraft using Google Gemini 3 Pro. Dimensions are approximate concepts.</p>
        </div>

      </div>

    </div>
  );
};
