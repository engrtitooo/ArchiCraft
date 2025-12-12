
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DesignStyle, DesignResponse, ConceptInputData, ConceptResponse, UnitSystem } from "../types";

// Note: We instantiate GoogleGenAI inside each function to ensure it picks up the 
// latest API key if the user selects one during the session.

const SYSTEM_INSTRUCTION_A = `
You are a world-class Interior Architect and Spatial Planner powered by Google Gemini.
Your goal is to analyze architectural floor plans and generate detailed, professional interior design specifications.
You possess deep knowledge of color theory, furniture ergonomics, and architectural flows.
When analyzing images, be precise about room identification and approximate dimensions.
`;

const SYSTEM_INSTRUCTION_B = `
You are a Senior Architectural Technologist and Lead Space Planner.
Your goal is to generate professional-grade conceptual floor plans.
You do not just place boxes; you design *flow*.
You must specify exact locations for doors (to ensure logical circulation between rooms) and windows (to ensure natural light on exterior walls).
Your output must be a highly structured JSON capable of being rendered into a technical drawing.
`;

export const analyzeFloorPlan = async (
  base64Image: string,
  style: DesignStyle,
  unitSystem: UnitSystem
): Promise<DesignResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Upgraded to Gemini 3 Pro for advanced spatial reasoning
  const modelId = "gemini-3-pro-preview"; 

  const prompt = `
    Analyze this architectural floor plan image. 
    1. Identify all distinct rooms.
    2. For each room, generate a design concept based strictly on the "${style}" style.
    3. Suggest a specific furniture layout that optimizes flow and usage.
    4. Propose a color palette (hex codes) and materials (flooring, lighting).
    5. Estimate dimensions relative to standard door widths. 
       CRITICAL: Provide dimension estimates in **${unitSystem === 'm' ? 'METERS' : 'FEET'}**.
       Also include the converted value in parenthesis (e.g., "4m (13ft)" or "16ft (4.9m)").

    Return the data in a strict JSON structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: base64Image } },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_A,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mode: { type: Type.STRING, enum: ["A_INTERIOR_FROM_PLAN"] },
            project_name: { type: Type.STRING, description: "A creative name for this renovation project" },
            architectural_summary: { type: Type.STRING, description: "Brief analysis of the structural flow and walls" },
            overall_style_notes: { type: Type.STRING, description: "How the selected style applies to this specific layout" },
            rooms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  room_type: { type: Type.STRING },
                  dimensions_estimate: { type: Type.STRING, description: `Estimated dimensions in ${unitSystem} with conversion.` },
                  design_concept: { type: Type.STRING },
                  color_palette: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of Hex codes" 
                  },
                  flooring_suggestion: { type: Type.STRING },
                  lighting_suggestion: { type: Type.STRING },
                  furniture_layout: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        dimensions_estimate: { type: Type.STRING },
                        color_material: { type: Type.STRING },
                        placement_reasoning: { type: Type.STRING }
                      }
                    }
                  }
                },
                required: ["id", "room_type", "design_concept", "furniture_layout", "color_palette"]
              }
            }
          },
          required: ["project_name", "rooms", "architectural_summary"]
        }
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as DesignResponse;
      data.mode = "A_INTERIOR_FROM_PLAN";
      return data;
    } else {
      throw new Error("No JSON response received from Gemini.");
    }
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateArchitecturalConcept = async (
  inputs: ConceptInputData,
  unitSystem: UnitSystem
): Promise<ConceptResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Upgraded to Gemini 3 Pro for superior complex schema adherence and logical planning
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    Create a professional architectural concept plan (Ground Floor) for a residential plot.
    
    UNIT SYSTEM: ${unitSystem === 'm' ? 'METERS' : 'FEET'}.
    The input values below are provided in **${unitSystem === 'm' ? 'METERS' : 'FEET'}**.

    Inputs:
    - Plot: ${inputs.plotWidth} ${unitSystem} x ${inputs.plotDepth} ${unitSystem}
    - Program: ${inputs.bedrooms} Beds, ${inputs.bathrooms} Baths, ${inputs.livingRooms} Living, ${inputs.kitchenType} Kitchen.
    - Extras: ${[
      inputs.hasMaidRoom ? "Maid Room" : "",
      inputs.hasStorage ? "Storage" : "",
      inputs.hasLaundry ? "Laundry" : "",
      inputs.hasGarage ? "Garage" : ""
    ].filter(Boolean).join(", ")}
    - Brief: "${inputs.preferences}"

    Directives for "Professional Architectural Layout":
    1. **Strict Geometry**: Rooms must align cleanly. Minimize wasted corridors.
    2. **Door Logic (CRITICAL)**: 
       - **NEVER** place doors at corners (0.0 or 1.0). 
       - **MANDATORY**: 'offset_ratio' must be between 0.2 and 0.8.
       - **Connectivity**: Every room must have a door leading to a valid adjacent space (e.g., Bedroom -> Hall, Kitchen -> Dining).
       - Main Entrance: Must be on an exterior wall.
    3. **Window Logic**: Place windows on exterior walls only. Bathrooms need small windows. Living areas need large windows.
    4. **Coordinates & Output Units**:
       - The internal coordinate system for drawing MUST remain in METERS (approx_dimensions_m, position_on_plot, etc.).
       - HOWEVER, for the display text fields (like 'dimensions_display'), providing values in **${unitSystem}** is required.
    5. **Output**: Generate a precise JSON describing the walls, doors (with wall location and offset ratio), and windows.

    IMPORTANT: 
    - Keep output concise.
    - Do not produce duplicate rooms. 
    - Ensure the JSON is syntactically correct and complete.
  `;

  // Define Schema for Mode B
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      mode: { type: Type.STRING, enum: ["B_CONCEPT_PLAN"] },
      unit_system: { type: Type.STRING, enum: ["m", "ft"] },
      project_name: { type: Type.STRING },
      concept_description: { type: Type.STRING },
      plot: {
        type: Type.OBJECT,
        properties: {
          width_m: { type: Type.NUMBER },
          depth_m: { type: Type.NUMBER },
          display_size: { type: Type.STRING, description: `Size string in ${unitSystem} (e.g. 15m x 20m or 50ft x 65ft)` },
          assumptions: { type: Type.STRING }
        }
      },
      rooms: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            function: { type: Type.STRING },
            approx_dimensions_m: {
               type: Type.OBJECT,
               properties: { width: { type: Type.NUMBER }, length: { type: Type.NUMBER } }
            },
            dimensions_display: { type: Type.STRING, description: `Dimensions string in ${unitSystem}` },
            position_on_plot: {
              type: Type.OBJECT,
              properties: {
                x_start_m: { type: Type.NUMBER },
                y_start_m: { type: Type.NUMBER },
                x_end_m: { type: Type.NUMBER },
                y_end_m: { type: Type.NUMBER }
              },
              required: ["x_start_m", "y_start_m", "x_end_m", "y_end_m"]
            },
            adjacent_to: { type: Type.ARRAY, items: { type: Type.STRING } },
            privacy_level: { type: Type.STRING, enum: ["public", "semi_private", "private"] },
            notes: { type: Type.STRING },
            features: {
                type: Type.OBJECT,
                properties: {
                    doors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                wall: { type: Type.STRING, enum: ["north", "south", "east", "west"] },
                                offset_ratio: { type: Type.NUMBER, description: "MUST be between 0.2 and 0.8" },
                                type: { type: Type.STRING, enum: ["single", "double", "sliding", "opening"] }
                            },
                            required: ["wall", "offset_ratio", "type"]
                        }
                    },
                    windows: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                wall: { type: Type.STRING, enum: ["north", "south", "east", "west"] },
                                offset_ratio: { type: Type.NUMBER },
                                width_m: { type: Type.NUMBER }
                            },
                            required: ["wall", "offset_ratio", "width_m"]
                        }
                    }
                },
                required: ["doors", "windows"]
            }
          },
          required: ["name", "position_on_plot", "features"]
        }
      },
      circulation: {
        type: Type.OBJECT,
        properties: {
          main_entry: { type: Type.STRING },
          stairs_location: { type: Type.STRING },
          notes: { type: Type.STRING }
        }
      },
      assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["mode", "project_name", "concept_description", "plot", "rooms"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: prompt },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_B,
        temperature: 0.1, // Low temperature for precision
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as ConceptResponse;
      data.unit_system = unitSystem;
      return data;
    } else {
      throw new Error("No JSON response for Concept Plan.");
    }
  } catch (error) {
    console.error("Concept Generation Failed:", error);
    throw error;
  }
};

export const generateInteriorPreview = async (
  schematicBase64: string,
  styleDescription: string = "Modern minimalist"
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using Nano Banana Pro 3 (Gemini 3 Pro Image) for high-quality visualization
  const modelId = "gemini-3-pro-image-preview";

  const prompt = `
    Transform this schematic floor plan into a professional, photorealistic architectural top-down 2D render.
    
    Style: ${styleDescription}.
    
    Requirements:
    1. **FURNISH**: Add realistic furniture appropriate for each room (e.g., King bed in Master, Dining table in Dining area, Sofas in Living).
    2. **TEXTURE**: Apply realistic flooring textures (wood, tile, carpet) and wall finishes.
    3. **LIGHTING**: Add soft ambient lighting and shadows to create depth.
    4. **ACCURACY**: Respect the exact wall layout, window positions, and door locations from the input schematic.
    
    The output should look like a high-end real estate marketing floor plan.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: schematicBase64 } },
          { text: prompt }
        ]
      },
      config: {
        // Image generation config
      }
    });

    // Find the image part in the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Interior Preview Generation Failed:", error);
    throw error;
  }
};
