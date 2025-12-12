# ArchiCraft
AI-Driven Conceptual Architecture & Interior Design

## Overview
ArchiCraft is a web-based platform that leverages multimodal generative AI to accelerate the early stages of architectural planning and interior design. The application serves two primary functions: transforming existing floor plan images into detailed design concepts, and generating new architectural layouts based on raw constraints (plot size, room requirements). It is designed to bridge the gap between abstract requirements and visual schematics, providing instant feedback for spatial exploration.

## Live Demo
**URL**: https://archicraft-250712192556.us-west1.run.app

## Key Features
*   **Floor Plan Analysis**: Uploads 2D floor plans to identifying distinct rooms, approximate dimensions, and spatial flow.
*   **Interior Concept Generation**: Automatically suggests furniture layouts, color palettes, and material finishes based on user-selected styles (e.g., Modern, Scandinavian, Industrial).
*   **Generative Layouts**: Creates structural floor plan schematics (SVG) from text-based inputs, such as plot width/depth and required room counts.
*   **Photorealistic Visualization**: Transforms vector schematics into high-fidelity top-down architectural renders.
*   **Technical Specifications**: Outputs structured JSON data for room schedules and supports dynamic unit switching (Meters/Feet).
*   **Professional Export**: Built-in CSS print styling for exporting "Design Reports" to PDF.

## Technology Stack
*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI SDK**: Google GenAI SDK (`@google/genai`)
*   **Visualization**: React-DOM for SVG generation, HTML5 Canvas for rasterization
*   **Hosting**: Google Cloud Run

## AI & Google Gemini Usage
This project was built using **Google AI Studio** to orchestrate multimodal workflows.

*   **Gemini 3 Pro Image (Nano Banana Pro 3)**:
    Used for the "Visualize Interiors" feature. The application rasterizes the generated SVG schematic and prompts the Gemini 3 vision model to "texture" the floor plan, adding realistic lighting, flooring, and furniture while respecting the structural boundaries defined by the code.

*   **Gemini 2.5 Flash**:
    Utilized for the core architectural reasoning engine. Flash was selected for the `analyzeFloorPlan` and `generateArchitecturalConcept` functions due to its low latency and superior adherence to complex JSON schemas, which is critical for rendering accurate coordinate-based drawings on the frontend.

## Project Scope & Limitations
ArchiCraft is a conceptual design tool intended for ideation and exploration.
*   **Conceptual Only**: Generated layouts do not account for local zoning laws, load-bearing structural engineering, or MEP (Mechanical, Electrical, Plumbing) constraints.
*   **Accuracy**: Dimensions are estimates based on standard door widths and pixel-to-meter ratios.
*   **Professional Review**: All outputs should be reviewed by a licensed architect or structural engineer before being used for construction.

## Getting Started
To run this project locally:

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    *   Create a `.env` file.
    *   Add your Google Gemini API key: `API_KEY=your_key_here`.
    *   *Note: For full functionality, the API key must be associated with a Google Cloud project with billing enabled to access the Gemini 3 Pro Image model.*
4.  Run the development server:
    ```bash
    npm start
    ```

## Hackathon Context
This project was built for the Google AI Hackathon to demonstrate the practical application of Multimodal LLMs in the AEC (Architecture, Engineering, and Construction) industry. It showcases how generative models can move beyond text chat to produce structured, visual, and spatial data.
