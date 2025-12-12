
import React from 'react';
import { ConceptInputData, UnitSystem } from '../types';

interface ConceptInputFormProps {
  data: ConceptInputData;
  unitSystem: UnitSystem;
  onChange: (data: ConceptInputData) => void;
  onUnitChange: (unit: UnitSystem, data: ConceptInputData) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const ConceptInputForm: React.FC<ConceptInputFormProps> = ({ 
    data, 
    unitSystem, 
    onChange, 
    onUnitChange,
    onSubmit, 
    onBack 
}) => {
  
  const update = (field: keyof ConceptInputData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleUnitToggle = () => {
      const newUnit = unitSystem === 'm' ? 'ft' : 'm';
      
      // Convert Dimensions
      // m to ft: val * 3.28084
      // ft to m: val * 0.3048
      const convert = (val: number) => {
          if (newUnit === 'ft') return Math.round(val * 3.28084);
          else return parseFloat((val * 0.3048).toFixed(2));
      };

      const newData = {
          ...data,
          plotWidth: convert(data.plotWidth),
          plotDepth: convert(data.plotDepth)
      };

      onUnitChange(newUnit, newData);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-2xl font-serif font-bold text-gray-900">Concept Requirements</h2>
        </div>
        
        {/* Quick Unit Toggle in Form */}
        <button 
            onClick={handleUnitToggle}
            className="text-xs font-mono font-medium text-accent hover:text-accent-dark border border-accent/20 bg-accent/5 px-3 py-1 rounded-full transition-colors"
        >
            Switch to {unitSystem === 'm' ? 'Feet' : 'Meters'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Plot Dimensions */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Plot Width ({unitSystem})</label>
            <input 
              type="number" 
              value={data.plotWidth}
              onChange={(e) => update('plotWidth', Number(e.target.value))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Plot Depth ({unitSystem})</label>
            <input 
              type="number" 
              value={data.plotDepth}
              onChange={(e) => update('plotDepth', Number(e.target.value))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Room Counters */}
        <div className="grid grid-cols-3 gap-6">
           <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Bedrooms</label>
            <div className="flex items-center gap-3">
               <button onClick={() => update('bedrooms', Math.max(1, data.bedrooms - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">-</button>
               <span className="font-mono text-lg w-4 text-center">{data.bedrooms}</span>
               <button onClick={() => update('bedrooms', data.bedrooms + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">+</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Bathrooms</label>
             <div className="flex items-center gap-3">
               <button onClick={() => update('bathrooms', Math.max(1, data.bathrooms - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">-</button>
               <span className="font-mono text-lg w-4 text-center">{data.bathrooms}</span>
               <button onClick={() => update('bathrooms', data.bathrooms + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">+</button>
            </div>
          </div>
           <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Living Areas</label>
             <div className="flex items-center gap-3">
               <button onClick={() => update('livingRooms', Math.max(1, data.livingRooms - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">-</button>
               <span className="font-mono text-lg w-4 text-center">{data.livingRooms}</span>
               <button onClick={() => update('livingRooms', data.livingRooms + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">+</button>
            </div>
          </div>
        </div>

        {/* Features & Amenities */}
        <div className="space-y-3">
           <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Additional Spaces</label>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${data.hasMaidRoom ? 'bg-accent/10 border-accent text-accent-dark' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={data.hasMaidRoom} onChange={(e) => update('hasMaidRoom', e.target.checked)} className="hidden" />
                <span className="text-sm font-medium">Maid Room</span>
              </label>
              <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${data.hasStorage ? 'bg-accent/10 border-accent text-accent-dark' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={data.hasStorage} onChange={(e) => update('hasStorage', e.target.checked)} className="hidden" />
                <span className="text-sm font-medium">Storage</span>
              </label>
              <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${data.hasLaundry ? 'bg-accent/10 border-accent text-accent-dark' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={data.hasLaundry} onChange={(e) => update('hasLaundry', e.target.checked)} className="hidden" />
                <span className="text-sm font-medium">Laundry</span>
              </label>
              <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${data.hasGarage ? 'bg-accent/10 border-accent text-accent-dark' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={data.hasGarage} onChange={(e) => update('hasGarage', e.target.checked)} className="hidden" />
                <span className="text-sm font-medium">Garage</span>
              </label>
           </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Kitchen Preference</label>
          <div className="flex gap-4">
             {['Open', 'Closed'].map((type) => (
               <button 
                key={type}
                onClick={() => update('kitchenType', type)}
                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${data.kitchenType === type ? 'bg-arch-900 text-white border-arch-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
               >
                 {type} Kitchen
               </button>
             ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wide">Design Brief & Preferences</label>
            <textarea
                value={data.preferences}
                onChange={(e) => update('preferences', e.target.value)}
                placeholder={`E.g., I want the guest area completely separated from family living. Large windows facing North. (Input values are in ${unitSystem === 'm' ? 'Meters' : 'Feet'})`}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg h-32 resize-none focus:ring-2 focus:ring-accent focus:outline-none"
            />
        </div>

        <button
            onClick={onSubmit}
            className="w-full bg-arch-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black hover:shadow-lg transform transition-all active:scale-[0.99]"
        >
            Generate Architectural Floor Plan
        </button>
      </div>
    </div>
  );
};
