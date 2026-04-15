// Simple wrapper for Google Gemini API using the BYOK key from environment variables
// @ts-ignore
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * System preamble injected before every user prompt.
 * Ensures the AI acts as an HRMS assistant with garment-factory context.
 */
const SYSTEM_PREAMBLE = `You are an intelligent HRMS AI Assistant for TechDance HR, deployed at a garment manufacturing company in Myanmar. 
You specialize in: workforce analytics, payroll compliance (SSB & PIT under Myanmar Labor Law), attendance anomaly detection, and HR operations.
Be concise, data-focused, and professional. Do NOT make up employee data — analyze only what is provided in the prompt context.
Default currency is MMK. Working calendar is Gregorian. Regulatory context: Sector C garment factory compliance.`;

export async function generateGeminiResponse(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    // Graceful fallback — renders StandardDataWidget in calling component
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  // gemini-1.5-pro: superior policy-aware reasoning for compliance and workforce analysis
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PREAMBLE}\n\n---\n\nUser Query: ${prompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.3,        // Lower temp for factual HR responses
        maxOutputTokens: 1024,
        topP: 0.8,
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  } catch (err: any) {
    if (err?.message === 'GEMINI_API_KEY_MISSING') throw err;
    console.error('Gemini API Fallback Triggered:', err);
    return 'AI analysis is temporarily unavailable. Core HRMS data and compliance reports continue to operate normally via Standard SQL Logic.';
  }
}

