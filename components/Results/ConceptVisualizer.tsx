
import React from 'react';
import { ConceptResponse, ConceptRoom, ArchDoor, ArchWindow } from '../../types';

interface ConceptVisualizerProps {
  data: ConceptResponse;
}

export const ConceptVisualizer: React.FC<ConceptVisualizerProps> = ({ data }) => {
  const paddingMeters = 2;
  const scale = 40; // Pixels per meter
  const wallThickness = 6; // Pixels
  
  const plotWidth = data.plot.width_m;
  const plotDepth = data.plot.depth_m;
  
  const svgWidth = (plotWidth + paddingMeters * 2) * scale;
  const svgHeight = (plotDepth + paddingMeters * 2) * scale;

  // Helper to convert meters to pixels including padding
  const toPx = (m: number) => m * scale;
  const toX = (m: number) => (m + paddingMeters) * scale;
  const toY = (m: number) => (m + paddingMeters) * scale;

  const getDimText = (room: ConceptRoom) => {
      if (room.dimensions_display) return room.dimensions_display;
      const w = room.approx_dimensions_m.width;
      const l = room.approx_dimensions_m.length;
      if (data.unit_system === 'ft') {
          return `${(w * 3.28084).toFixed(1)}ft x ${(l * 3.28084).toFixed(1)}ft`;
      }
      return `${w.toFixed(1)}m x ${l.toFixed(1)}m`;
  };

  const getPlotDimText = (meters: number, isWidth: boolean) => {
      if (data.unit_system === 'ft') {
           return `${(meters * 3.28084).toFixed(1)}ft`;
      }
      return `${meters}m`;
  };

  // 1. Room Fills (Bottom Layer)
  const roomFills = data.rooms.map((room, idx) => {
      const x = toX(room.position_on_plot.x_start_m);
      const y = toY(room.position_on_plot.y_start_m);
      const w = toPx(room.position_on_plot.x_end_m - room.position_on_plot.x_start_m);
      const h = toPx(room.position_on_plot.y_end_m - room.position_on_plot.y_start_m);

      const isWetArea = room.function.toLowerCase().includes('bath') || room.function.toLowerCase().includes('kitchen') || room.function.toLowerCase().includes('laundry');
      
      return (
          <g key={`fill-${idx}`}>
             <rect x={x} y={y} width={w} height={h} fill="white" stroke="none" />
             {isWetArea && (
                  <rect x={x} y={y} width={w} height={h} fill="url(#hatch)" opacity="0.1" pointerEvents="none"/>
             )}
          </g>
      );
  });

  // 2. Room Walls (Middle Layer) - Drawn as solid strokes
  const roomWalls = data.rooms.map((room, idx) => {
      const x = toX(room.position_on_plot.x_start_m);
      const y = toY(room.position_on_plot.y_start_m);
      const w = toPx(room.position_on_plot.x_end_m - room.position_on_plot.x_start_m);
      const h = toPx(room.position_on_plot.y_end_m - room.position_on_plot.y_start_m);
      return (
          <rect
              key={`wall-${idx}`}
              x={x} y={y} width={w} height={h}
              fill="none" stroke="#111827" strokeWidth={wallThickness}
              vectorEffect="non-scaling-stroke"
          />
      );
  });

  // 3. Openings & Cuts (Mask Layer) - White lines thicker than walls
  const wallCuts: React.ReactElement[] = [];
  const fixtureSymbols: React.ReactElement[] = [];

  data.rooms.forEach((room, rIdx) => {
      const x = toX(room.position_on_plot.x_start_m);
      const y = toY(room.position_on_plot.y_start_m);
      const w = toPx(room.position_on_plot.x_end_m - room.position_on_plot.x_start_m);
      const h = toPx(room.position_on_plot.y_end_m - room.position_on_plot.y_start_m);

      // Doors
      room.features.doors.forEach((door, dIdx) => {
          let dx = 0, dy = 0, rotation = 0;
          const doorSizeM = door.type === 'double' ? 1.6 : door.type === 'opening' ? 1.8 : 0.9;
          const doorPx = toPx(doorSizeM);
          
          // Ensure valid offset
          const safeOffset = Math.max(0.2, Math.min(0.8, door.offset_ratio));

          if (door.wall === 'north') { dx = x + w * safeOffset; dy = y; rotation = 0; }
          else if (door.wall === 'south') { dx = x + w * safeOffset; dy = y + h; rotation = 180; }
          else if (door.wall === 'west') { dx = x; dy = y + h * safeOffset; rotation = 90; }
          else if (door.wall === 'east') { dx = x + w; dy = y + h * safeOffset; rotation = -90; }

          // The Cut (White line wider than wall thickness)
          wallCuts.push(
              <line 
                key={`d-cut-${rIdx}-${dIdx}`}
                x1={-doorPx/2} y1={0} x2={doorPx/2} y2={0}
                stroke="white" strokeWidth={wallThickness + 2}
                transform={`translate(${dx}, ${dy}) rotate(${rotation})`}
              />
          );

          // The Symbol
          let symbol;
          if (door.type === 'opening') {
              symbol = <g />;
          } else if (door.type === 'sliding') {
             symbol = (
                <g transform={`translate(${dx}, ${dy}) rotate(${rotation})`}>
                    <line x1={-doorPx/2} y1={-4} x2={0} y2={-4} stroke="black" strokeWidth="2" />
                    <line x1={0} y1={4} x2={doorPx/2} y2={4} stroke="black" strokeWidth="2" />
                    <line x1={-doorPx/2} y1={0} x2={doorPx/2} y2={0} stroke="black" strokeWidth="1" strokeDasharray="2,2"/>
                </g>
            );
          } else if (door.type === 'double') {
             symbol = (
                <g transform={`translate(${dx}, ${dy}) rotate(${rotation})`}>
                     <path d={`M ${-doorPx/2} 0 Q ${-doorPx/2} ${doorPx/2} 0 ${doorPx/2}`} fill="none" stroke="black" strokeWidth="1" />
                     <line x1={-doorPx/2} y1={0} x2={-doorPx/2} y2={doorPx/2} stroke="black" strokeWidth="2" />
                     <path d={`M ${doorPx/2} 0 Q ${doorPx/2} ${doorPx/2} 0 ${doorPx/2}`} fill="none" stroke="black" strokeWidth="1" />
                     <line x1={doorPx/2} y1={0} x2={doorPx/2} y2={doorPx/2} stroke="black" strokeWidth="2" />
                </g>
             );
          } else {
             // Single Swing
             symbol = (
                <g transform={`translate(${dx}, ${dy}) rotate(${rotation})`}>
                    {/* Quarter circle arc for swing */}
                    <path d={`M ${-doorPx/2} 0 Q ${-doorPx/2} ${doorPx} ${doorPx/2} ${doorPx}`} fill="none" stroke="black" strokeWidth="1" strokeOpacity="0.5" />
                    <line x1={-doorPx/2} y1={0} x2={-doorPx/2} y2={doorPx} stroke="black" strokeWidth="2" />
                </g>
            );
          }
          fixtureSymbols.push(<g key={`d-sym-${rIdx}-${dIdx}`}>{symbol}</g>);
      });

      // Windows
      room.features.windows.forEach((win, wIdx) => {
          let wx = 0, wy = 0, rotation = 0;
          const widthPx = toPx(win.width_m);

          if (win.wall === 'north') { wx = x + w * win.offset_ratio; wy = y; rotation = 0; }
          else if (win.wall === 'south') { wx = x + w * win.offset_ratio; wy = y + h; rotation = 0; }
          else if (win.wall === 'west') { wx = x; wy = y + h * win.offset_ratio; rotation = 90; }
          else if (win.wall === 'east') { wx = x + w; wy = y + h * win.offset_ratio; rotation = 90; }

          // Window Cut
          wallCuts.push(
               <line 
                key={`w-cut-${rIdx}-${wIdx}`}
                x1={-widthPx/2} y1={0} x2={widthPx/2} y2={0}
                stroke="white" strokeWidth={wallThickness + 2}
                transform={`translate(${wx}, ${wy}) rotate(${rotation})`}
              />
          );

          // Window Symbol
          fixtureSymbols.push(
            <g key={`w-sym-${rIdx}-${wIdx}`} transform={`translate(${wx}, ${wy}) rotate(${rotation})`}>
                <rect x={-widthPx/2} y={-wallThickness/2} width={widthPx} height={wallThickness} stroke="black" strokeWidth="1" fill="none" />
                <line x1={-widthPx/2} y1={0} x2={widthPx/2} y2={0} stroke="black" strokeWidth="1" />
            </g>
          );
      });
  });

  // 4. Labels (Top Layer)
  const labels = data.rooms.map((room, idx) => {
    const x = toX(room.position_on_plot.x_start_m);
    const y = toY(room.position_on_plot.y_start_m);
    const w = toPx(room.position_on_plot.x_end_m - room.position_on_plot.x_start_m);
    const h = toPx(room.position_on_plot.y_end_m - room.position_on_plot.y_start_m);
    
    const fontSize = Math.max(10, Math.min(14, w/8));
    return (
        <g key={`label-${idx}`} transform={`translate(${x + w/2}, ${y + h/2})`} pointerEvents="none">
             <text textAnchor="middle" y={-2} className="font-serif font-bold fill-gray-900" style={{ fontSize: `${fontSize}px` }}>
                {room.name}
            </text>
            <text textAnchor="middle" y={fontSize + 2} className="font-mono fill-gray-500" style={{ fontSize: `${fontSize * 0.7}px` }}>
                {getDimText(room)}
            </text>
        </g>
    );
  });

  return (
    <div className="overflow-x-auto flex justify-center bg-white p-0 rounded-none border-0">
      <div className="bg-white p-0 rounded-none">
        <svg 
            id="concept-plan-svg"
            width={svgWidth} 
            height={svgHeight} 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="max-w-full h-auto"
            style={{ backgroundColor: 'white' }}
        >
            <defs>
                <pattern id="grid" width={toPx(1)} height={toPx(1)} patternUnits="userSpaceOnUse">
                    <path d={`M ${toPx(1)} 0 L 0 0 0 ${toPx(1)}`} fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                </pattern>
                <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="2" height="4" transform="translate(0,0)" fill="#1f2937"></rect>
                </pattern>
            </defs>

            {/* Plot Background - Explicit White */}
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="white" />
            
            {/* Grid Area */}
            <rect x={paddingMeters * scale} y={paddingMeters * scale} width={plotWidth * scale} height={plotDepth * scale} fill="url(#grid)" />
            
            {/* Plot Boundary Line */}
            <rect 
                x={paddingMeters * scale} 
                y={paddingMeters * scale} 
                width={plotWidth * scale} 
                height={plotDepth * scale} 
                fill="none" 
                stroke="#9ca3af" 
                strokeWidth="2" 
                strokeDasharray="10,5"
            />

            {/* LAYER 1: Fills */}
            {roomFills}

            {/* LAYER 2: Walls */}
            {roomWalls}

            {/* LAYER 3: Cuts (Masks overlapping walls) */}
            {wallCuts}

            {/* LAYER 4: Symbols (Doors, Windows) */}
            {fixtureSymbols}

            {/* LAYER 5: Labels */}
            {labels}

            {/* External Dimensions (Top) */}
            <g transform={`translate(${toX(0)}, ${toY(0) - 20})`}>
                <line x1={0} y1={0} x2={toPx(plotWidth)} y2={0} stroke="black" strokeWidth="1" />
                <line x1={0} y1={-5} x2={0} y2={5} stroke="black" strokeWidth="1" />
                <line x1={toPx(plotWidth)} y1={-5} x2={toPx(plotWidth)} y2={5} stroke="black" strokeWidth="1" />
                <text x={toPx(plotWidth)/2} y={-10} textAnchor="middle" className="text-xs font-mono">{getPlotDimText(plotWidth, true)}</text>
            </g>

            {/* External Dimensions (Left) */}
            <g transform={`translate(${toX(0) - 20}, ${toY(0)})`}>
                <line x1={0} y1={0} x2={0} y2={toPx(plotDepth)} stroke="black" strokeWidth="1" />
                <line x1={-5} y1={0} x2={5} y2={0} stroke="black" strokeWidth="1" />
                <line x1={-5} y1={toPx(plotDepth)} x2={5} y2={toPx(plotDepth)} stroke="black" strokeWidth="1" />
                <text x={-10} y={toPx(plotDepth)/2} textAnchor="middle" transform={`rotate(-90, -10, ${toPx(plotDepth)/2})`} className="text-xs font-mono">{getPlotDimText(plotDepth, false)}</text>
            </g>

            {/* Title Block in Drawing */}
            <g transform={`translate(${svgWidth - 200}, ${svgHeight - 40})`}>
                <rect x={0} y={0} width={180} height={30} fill="none" stroke="black" strokeWidth="1"/>
                <text x={10} y={20} className="font-sans text-xs uppercase tracking-widest font-bold">PROJECT: {data.project_name.substring(0, 15)}</text>
            </g>

        </svg>
      </div>
    </div>
  );
};
