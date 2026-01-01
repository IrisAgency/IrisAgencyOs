import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the client. The API key is injected via import.meta.env
// In a real production app, ensure this is handled securely (e.g., via backend proxy).
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''; 
const genAI = new GoogleGenerativeAI(apiKey);

export const generateCreativeContent = async (prompt: string, context: string = ''): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Construct a rich prompt combining context and user request
    const fullPrompt = `
      You are an expert Creative Assistant for IRIS, a high-end marketing and production agency.
      Your tone should be professional, creative, and insightful.
      
      Context: ${context}
      
      Task: ${prompt}
      
      Provide a concise and actionable response.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text() || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
};
