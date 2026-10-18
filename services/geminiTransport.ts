import type { Schema } from '@google/genai';

interface Part {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
}

interface GenerateRequest {
  model: string;
  contents: { text: string } | { parts: Part[] };
  config?: {
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: string;
    responseSchema?: Schema;
  };
}

export const generateContent = async (request: GenerateRequest): Promise<{
  candidates?: { content?: { parts?: Part[] } }[];
  text?: string;
}> => {
  const contents = 'text' in request.contents
    ? { parts: [{ text: request.contents.text }] }
    : request.contents;
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, contents }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('archicraft:session-expired'));
      throw new Error('Your session has expired. Please sign in again.');
    }
    // Provider bodies and configuration details never enter browser error logs.
    if (response.status === 429) throw new Error('AI service is busy. Please try again shortly.');
    if (response.status === 503) throw new Error('AI service is temporarily unavailable. Please contact the administrator.');
    throw new Error('AI generation failed. Please try again.');
  }
  const result = await response.json();
  const parts: Part[] = result.candidates?.[0]?.content?.parts || [];
  return {
    candidates: result.candidates,
    text: parts.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join(''),
  };
};
