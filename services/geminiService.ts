import { httpsCallable } from 'firebase/functions';
import { cloudFunctions } from '../lib/firebase';

// Gemini AI calls are proxied through a Cloud Function to keep the API key server-side.
// Set the key with: firebase functions:config:set gemini.api_key="YOUR_KEY"

const generateContentFn = httpsCallable<{ prompt: string; context?: string }, { text: string }>(cloudFunctions, 'generateContent');

export const generateCreativeContent = async (prompt: string, context: string = ''): Promise<string> => {
  try {
    const result = await generateContentFn({ prompt, context });
    return result.data.text || "No response generated.";
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    if (message.includes('not configured')) {
      return "AI service is not configured. Please contact your administrator.";
    }
    return "I encountered an error while processing your request. Please try again.";
  }
};
