import { GoogleGenAI, Type } from "@google/genai";
import { GeminiMappingResponse } from '../types';

// NOTE: In a production environment, never expose keys on client side.
// This is for demonstration as requested by the user prompt structure.
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Gemini to look at CSV headers and a sample row to determine
 * which columns represent the Candidate Name and Phone Number.
 */
export const analyzeCsvHeaders = async (
  headers: string[],
  sampleRow: Record<string, string>
): Promise<GeminiMappingResponse> => {
  try {
    const ai = getClient();
    
    const prompt = `
      I have a CSV file with the following headers: ${JSON.stringify(headers)}.
      Here is a sample row of data: ${JSON.stringify(sampleRow)}.
      
      Please identify which column header most likely represents the "Candidate Name" and which represents the "Phone Number".
      If you can't find a perfect match, make your best guess based on the data format (e.g., digits for phone, text for name).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name_column: { type: Type.STRING, description: "The exact header name for the candidate's name" },
            phone_column: { type: Type.STRING, description: "The exact header name for the candidate's phone number" },
            reasoning: { type: Type.STRING, description: "Why you chose these columns" }
          },
          required: ["name_column", "phone_column"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}') as GeminiMappingResponse;
    return result;

  } catch (error) {
    console.error("Gemini analysis failed", error);
    // Fallback if AI fails: try to find headers that contain 'name' or 'phone' case-insensitive
    const nameFallback = headers.find(h => h.toLowerCase().includes('name')) || headers[0];
    const phoneFallback = headers.find(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile') || h.toLowerCase().includes('contact')) || headers[1];
    
    return {
      name_column: nameFallback,
      phone_column: phoneFallback,
      reasoning: "Fallback logic due to API error"
    };
  }
};

export const refineMessageTone = async (currentMessage: string, tone: 'professional' | 'friendly' | 'urgent'): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `Rewrite the following recruitment message to be more ${tone}, but keep the core questions exactly the same. Message: "${currentMessage}"`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text || currentMessage;
  } catch (error) {
    console.error("Tone refinement failed", error);
    return currentMessage;
  }
};
