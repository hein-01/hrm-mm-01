/**
 * Gemini API Wrapper with Subscription Tier Gating
 * 
 * Only 'premium' tier users may initialise the Gemini 1.5 Pro client.
 * Standard-tier callers receive `null`, and components must handle that
 * gracefully (e.g. hide the AI button, show an upgrade prompt).
 *
 * Usage in a component:
 *   const { subscriptionTier } = useUserAccess();
 *   const client = getGeminiClient(subscriptionTier);
 *   if (!client) { /* show upgrade prompt *\/ }
 */

const GEMINI_MODEL = 'gemini-1.5-pro';

export interface GeminiClient {
  model: string;
  generateContent: (prompt: string) => Promise<{ text: string }>;
}

/**
 * Returns a Gemini client if the caller's subscription tier is 'premium'.
 * Returns `null` for 'standard' tier — callers MUST handle this.
 */
export const getGeminiClient = (
  subscriptionTier: 'premium' | 'standard'
): GeminiClient | null => {
  if (subscriptionTier !== 'premium') {
    console.info('[GeminiAPI] Access denied — subscription tier is "%s". Upgrade to Premium to use AI features.', subscriptionTier);
    return null;
  }

  // In production, initialise the real @google/generative-ai SDK here using
  // the API key from import.meta.env.VITE_GEMINI_API_KEY.
  // For now we return a mock client that mirrors the SDK shape.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[GeminiAPI] VITE_GEMINI_API_KEY is not set. Returning mock client.');
  }

  const client: GeminiClient = {
    model: GEMINI_MODEL,
    generateContent: async (prompt: string) => {
      if (!apiKey) {
        return { text: `[Mock ${GEMINI_MODEL}] Response for: "${prompt.slice(0, 80)}…"` };
      }

      // Real SDK call placeholder:
      // const genAI = new GoogleGenerativeAI(apiKey);
      // const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      // const result = await model.generateContent(prompt);
      // return { text: result.response.text() };

      return { text: `[Mock ${GEMINI_MODEL}] Response for: "${prompt.slice(0, 80)}…"` };
    }
  };

  return client;
};

/**
 * Convenience helper: checks whether AI features are available for the
 * current subscription tier without constructing the full client.
 */
export const isAIAvailable = (subscriptionTier: 'premium' | 'standard'): boolean => {
  return subscriptionTier === 'premium';
};
