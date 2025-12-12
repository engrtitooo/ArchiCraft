import React from 'react';
import { RoomAnalysis } from '../../types';

interface RoomCardProps {
  room: RoomAnalysis;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-start">
        <div>
          <h3 className="font-serif text-xl font-semibold text-gray-900">{room.room_type}</h3>
          <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wider">{room.id}</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {room.dimensions_estimate}
        </span>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Design Concept</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{room.design_concept}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Flooring</h4>
                <p className="text-xs text-gray-500">{room.flooring_suggestion}</p>
            </div>
            <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Lighting</h4>
                <p className="text-xs text-gray-500">{room.lighting_suggestion}</p>
            </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Color Palette</h4>
          <div className="flex gap-2">
            {room.color_palette.map((color, idx) => (
              <div key={idx} className="group relative">
                <div 
                  className="w-10 h-10 rounded-full shadow-sm border border-gray-100 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Furniture Layout</h4>
          <ul className="space-y-3">
            {room.furniture_layout.map((item, idx) => (
              <li key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between font-medium text-gray-800">
                  <span>{item.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.placement_reasoning}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};