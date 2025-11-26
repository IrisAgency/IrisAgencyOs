import { GoogleGenAI } from "@google/genai";

// Initialize the client. The API key is injected via process.env.API_KEY
// In a real production app, ensure this is handled securely (e.g., via backend proxy).
// For this demo, we assume the environment variable is available.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const generateCreativeContent = async (prompt: string, context: string = ''): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const modelId = 'gemini-2.5-flash';
    
    // Construct a rich prompt combining context and user request
    const fullPrompt = `
      You are an expert Creative Assistant for IRIS, a high-end marketing and production agency.
      Your tone should be professional, creative, and insightful.
      
      Context: ${context}
      
      Task: ${prompt}
      
      Provide a concise and actionable response.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
};
