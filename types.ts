
export enum DesignStyle {
  MODERN = 'Modern Minimalist',
  SCANDINAVIAN = 'Scandinavian Hygge',
  INDUSTRIAL = 'Industrial Loft',
  BOHEMIAN = 'Bohemian Chic',
  MID_CENTURY = 'Mid-Century Modern',
  LUXURY = 'Contemporary Luxury'
}

export type UnitSystem = 'm' | 'ft';

// --- Mode A Interfaces ---
export interface FurnitureItem {
  name: string;
  dimensions_estimate: string;
  color_material: string;
  placement_reasoning: string;
}

export interface RoomAnalysis {
  id: string;
  room_type: string;
  dimensions_estimate: string;
  design_concept: string;
  color_palette: string[];
  flooring_suggestion: string;
  lighting_suggestion: string;
  furniture_layout: FurnitureItem[];
}

export interface DesignResponse {
  mode?: "A_INTERIOR_FROM_PLAN";
  project_name: string;
  architectural_summary: string;
  overall_style_notes: string;
  rooms: RoomAnalysis[];
}

// --- Mode B Interfaces ---
export interface ConceptInputData {
  plotWidth: number;
  plotDepth: number;
  bedrooms: number;
  bathrooms: number;
  livingRooms: number;
  kitchenType: 'Open' | 'Closed';
  hasMaidRoom: boolean;
  hasStorage: boolean;
  hasLaundry: boolean;
  hasGarage: boolean;
  preferences: string;
}

export interface ArchDoor {
  wall: 'north' | 'south' | 'east' | 'west';
  offset_ratio: number; // 0.1 to 0.9 position along the wall
  type: 'single' | 'double' | 'sliding' | 'opening';
}

export interface ArchWindow {
  wall: 'north' | 'south' | 'east' | 'west';
  offset_ratio: number;
  width_m: number;
}

export interface ConceptRoom {
  name: string;
  function: string;
  // AI should return meter dimensions for drawing, and a display string for UI
  approx_dimensions_m: { width: number; length: number }; 
  dimensions_display: string; // e.g. "4m x 5m" or "12ft x 16ft"
  position_on_plot: {
    x_start_m: number;
    y_start_m: number;
    x_end_m: number;
    y_end_m: number;
  };
  adjacent_to: string[];
  privacy_level: 'public' | 'semi_private' | 'private';
  notes: string;
  features: {
    doors: ArchDoor[];
    windows: ArchWindow[];
  };
}

export interface ConceptResponse {
  mode: "B_CONCEPT_PLAN";
  unit_system: UnitSystem;
  project_name: string;
  concept_description: string;
  plot: {
    width_m: number;
    depth_m: number;
    display_size: string; // e.g. "15m x 20m (50ft x 65ft)"
    assumptions: string;
  };
  rooms: ConceptRoom[];
  circulation: {
    main_entry: string;
    stairs_location: string;
    notes: string;
  };
  assumptions: string[];
}

// --- App State ---
export type AppMode = 'MODE_A' | 'MODE_B' | null;

export interface AppState {
  mode: AppMode;
  step: 'SELECT_MODE' | 'INPUT' | 'ANALYZING' | 'RESULTS';
  
  // Global Settings
  unitSystem: UnitSystem;

  // Mode A Data
  selectedFile: File | null;
  previewUrl: string | null;
  selectedStyle: DesignStyle;
  
  // Mode B Data
  conceptInputs: ConceptInputData;

  // Results (Union)
  result: DesignResponse | ConceptResponse | null;
  error: string | null;
}
