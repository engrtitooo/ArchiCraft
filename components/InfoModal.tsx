
import React from 'react';

export type ModalType = 'how-it-works' | 'showcase' | 'pricing' | null;

interface InfoModalProps {
  type: ModalType;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="bg-white/80 backdrop-blur rounded-full p-2 text-gray-400 hover:text-gray-600 focus:outline-none hover:bg-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            
            {/* --- HOW IT WORKS CONTENT --- */}
            {type === 'how-it-works' && (
              <div className="space-y-12 p-4 md:p-8">
                <div className="text-center max-w-3xl mx-auto animate-fade-in">
                    <span className="text-accent font-bold tracking-wider text-xs uppercase mb-2 block">The Technology</span>
                    <h3 className="text-4xl font-serif font-bold text-gray-900 mb-6">Generative Architectural Intelligence</h3>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        ArchiCraft leverages <strong>Gemini 3 Pro</strong>'s multimodal vision capabilities to bridge the gap between technical schematics and spatial experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                    {/* Step 1 */}
                    <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute -right-4 -top-4 text-9xl font-serif font-bold text-gray-100 opacity-50 group-hover:text-gray-200 transition-colors">1</div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Semantic Analysis</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                The engine ingests 2D raster data (floor plan images). It performs edge detection and semantic segmentation to identify:
                            </p>
                            <ul className="mt-4 space-y-2 text-sm text-gray-500">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>Structural Walls vs. Partitions</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>Fenestration (Windows/Doors)</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>Room Functionality & Zones</li>
                            </ul>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all">
                         <div className="absolute -right-4 -top-4 text-9xl font-serif font-bold text-gray-100 opacity-50 group-hover:text-gray-200 transition-colors">2</div>
                        <div className="relative z-10">
                             <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Style Injection</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                User preferences are translated into high-dimensional vector embeddings. The prompt engineering layer synthesizes:
                            </p>
                             <ul className="mt-4 space-y-2 text-sm text-gray-500">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>Material Physics (PBR Textures)</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>Lighting Simulations</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>Furniture Ergonomics</li>
                            </ul>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute -right-4 -top-4 text-9xl font-serif font-bold text-gray-100 opacity-50 group-hover:text-gray-200 transition-colors">3</div>
                        <div className="relative z-10">
                             <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                 <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Neural Rendering</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                The <strong>Nano Banana Pro 3</strong> diffusion model generates the final raster. It maintains architectural fidelity (walls don't move) while hallucinating photorealistic details.
                            </p>
                             <ul className="mt-4 space-y-2 text-sm text-gray-500">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>1024x1024 High-Res Output</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>&lt; 10s Latency</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>Scale-Accurate Furnishing</li>
                            </ul>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {/* --- SHOWCASE CONTENT --- */}
            {type === 'showcase' && (
              <div className="space-y-8 p-4 md:p-8">
                 <div className="text-center max-w-3xl mx-auto mb-8">
                    <span className="text-accent font-bold tracking-wider text-xs uppercase mb-2 block">Case Study</span>
                    <h3 className="text-4xl font-serif font-bold text-gray-900 mb-4">Transforming Abstraction into Reality</h3>
                    <p className="text-gray-500">See how ArchiCraft interprets a basic schematic and breathes life into it.</p>
                </div>

                <div className="bg-gray-900 rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                        {/* INPUT: BLUEPRINT */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white font-bold text-sm ring-1 ring-white/20">A</span>
                                <h4 className="text-white font-bold tracking-wide text-sm uppercase">Input: 2D Schematic</h4>
                            </div>
                            
                            <div className="bg-white rounded-xl p-6 shadow-lg border border-white/10 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                                {/* SVG Blueprint - Guaranteed to show */}
                                <svg viewBox="0 0 400 300" className="w-full h-auto drop-shadow-sm">
                                    <defs>
                                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                                        </pattern>
                                    </defs>
                                    <rect width="400" height="300" fill="white"/>
                                    <rect width="400" height="300" fill="url(#grid)"/>
                                    
                                    {/* Walls */}
                                    <g stroke="#1f2937" strokeWidth="4" fill="none">
                                        <path d="M 50 50 L 350 50 L 350 250 L 50 250 Z" /> {/* Outer */}
                                        <path d="M 180 50 L 180 250" /> {/* Vertical split */}
                                        <path d="M 50 150 L 180 150" /> {/* Horizontal split left */}
                                        <path d="M 260 150 L 350 150" /> {/* Horizontal split right */}
                                    </g>

                                    {/* Doors */}
                                    <g stroke="#1f2937" strokeWidth="2" fill="none">
                                        <path d="M 180 100 L 160 120 A 20 20 0 0 0 180 140" strokeDasharray="4,2"/> {/* Door swing */}
                                        <line x1="180" y1="100" x2="180" y2="140" stroke="white" strokeWidth="6"/> {/* Wall gap */}
                                    </g>

                                    {/* Labels */}
                                    <text x="115" y="100" textAnchor="middle" fontSize="12" fontFamily="sans-serif" fill="#6b7280" fontWeight="bold">LIVING</text>
                                    <text x="115" y="200" textAnchor="middle" fontSize="12" fontFamily="sans-serif" fill="#6b7280" fontWeight="bold">DINING</text>
                                    <text x="265" y="100" textAnchor="middle" fontSize="12" fontFamily="sans-serif" fill="#6b7280" fontWeight="bold">MASTER BED</text>
                                    <text x="265" y="200" textAnchor="middle" fontSize="12" fontFamily="sans-serif" fill="#6b7280" fontWeight="bold">KITCHEN</text>
                                    
                                    {/* Dimensions */}
                                    <line x1="40" y1="50" x2="40" y2="250" stroke="#9ca3af" strokeWidth="1"/>
                                    <text x="30" y="150" textAnchor="middle" transform="rotate(-90, 30, 150)" fontSize="10" fill="#9ca3af">12.0m</text>
                                </svg>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed border-l-2 border-gray-700 pl-4">
                                The AI identifies the geometry, room types ("Master Bed", "Kitchen"), and scale context from simple vector lines.
                            </p>
                        </div>

                        {/* Arrow */}
                        <div className="hidden lg:flex justify-center items-center">
                             <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/20">
                                <svg className="w-8 h-8 text-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                             </div>
                        </div>

                        {/* OUTPUT: RENDER */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white font-bold text-sm ring-1 ring-accent/50">B</span>
                                <h4 className="text-white font-bold tracking-wide text-sm uppercase">Output: Photorealistic Render</h4>
                            </div>
                            
                            <div className="bg-white rounded-xl p-2 shadow-2xl border border-white/10 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                                {/* Reliable Image from Unsplash - Architecture/Interior */}
                                <img 
                                    src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000" 
                                    alt="AI Generated Render" 
                                    className="w-full h-auto rounded-lg object-cover aspect-[4/3]"
                                />
                            </div>
                             <p className="text-gray-400 text-sm leading-relaxed border-l-2 border-accent pl-4">
                                The model applies "Modern Minimalist" styling: chevron wood flooring, neutral textiles, and warm 3000K lighting, while strictly adhering to the original floor plan layout.
                            </p>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {/* --- PRICING CONTENT --- */}
            {type === 'pricing' && (
              <div className="space-y-12 p-4 md:p-8">
                <div className="text-center max-w-2xl mx-auto">
                    <span className="text-accent font-bold tracking-wider text-xs uppercase mb-2 block">Flexible Plans</span>
                    <h3 className="text-4xl font-serif font-bold text-gray-900 mb-4">Pay As You Design</h3>
                    <p className="text-gray-500 text-lg">No monthly subscriptions. No hidden fees. Just pure architectural value.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Tier */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900">Concept Studio</h4>
                                <p className="text-gray-500 text-xs uppercase tracking-wide mt-1">For Exploration</p>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-serif font-bold text-gray-900">$0</span>
                            </div>
                        </div>
                        
                        <div className="h-px bg-gray-100 my-6"></div>
                        
                        <ul className="space-y-4 text-sm text-gray-600 mb-8">
                            <li className="flex gap-3 items-center">
                                <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                                <span><strong>Unlimited</strong> Floor Plan Analysis</span>
                            </li>
                            <li className="flex gap-3 items-center">
                                <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                                <span><strong>Unlimited</strong> 2D Concept Layouts</span>
                            </li>
                             <li className="flex gap-3 items-center">
                                <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                                <span>JSON Data Export</span>
                            </li>
                        </ul>
                        <button onClick={onClose} className="w-full py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
                            Start Designing Free
                        </button>
                    </div>

                    {/* Paid Tier */}
                    <div className="bg-gray-900 text-white rounded-2xl p-8 relative shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-800">
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-accent to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-xl shadow-lg">
                            PROFESSIONAL GRADE
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-white">Nano Render</h4>
                                <p className="text-gray-400 text-xs uppercase tracking-wide mt-1">For Visualization</p>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-serif font-bold text-white">$2.99</span>
                                <span className="text-gray-400 text-sm block">per image</span>
                            </div>
                        </div>

                         <div className="h-px bg-gray-800 my-6"></div>

                        <ul className="space-y-4 text-sm text-gray-300 mb-8">
                            <li className="flex gap-3 items-center">
                                <div className="bg-accent/20 p-1 rounded-full"><svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                                <span><strong>Nano Banana Pro 3</strong> Generation</span>
                            </li>
                            <li className="flex gap-3 items-center">
                                <div className="bg-accent/20 p-1 rounded-full"><svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                                <span>4K Resolution Download</span>
                            </li>
                             <li className="flex gap-3 items-center">
                                <div className="bg-accent/20 p-1 rounded-full"><svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                                <span>Commercial Use License</span>
                            </li>
                        </ul>
                        <button onClick={onClose} className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-orange-600 text-white font-bold shadow-lg hover:shadow-orange-500/25 transition-all">
                            Generate HD Render
                        </button>
                    </div>
                </div>
                
                <p className="text-center text-xs text-gray-400 mt-6">
                    * Rendering requires a connected payment method via Google Cloud Billing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
