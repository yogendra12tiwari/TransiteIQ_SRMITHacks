/**
 * Gemini / Genkit API Client wrapper with timeout, mock hook, and kill switch.
 */

export type MockAiHandler = (prompt: string, context?: unknown) => Promise<string>;

let currentMockHandler: MockAiHandler | null = null;

export function setMockAiHandler(handler: MockAiHandler | null): void {
  currentMockHandler = handler;
}

export function getApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GENKIT_API_KEY ||
    null
  );
}

export function isAiEnabled(): boolean {
  if (process.env.AI_ENABLED === "false" || process.env.AI_ENABLED === "0") {
    return false;
  }
  // Active if mock is registered
  if (currentMockHandler !== null) {
    return true;
  }
  // In automated test environments (vitest), only invoke real API if AI_ENABLED === "true"
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return process.env.AI_ENABLED === "true" && Boolean(getApiKey());
  }
  return Boolean(getApiKey());
}

export interface CallGeminiOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number; // Default 4000ms per PRD M6-18
  context?: unknown;
}

/**
 * Invokes Gemini LLM (or mock handler) with strict 4s timeout.
 */
export async function callGemini(
  prompt: string,
  options: CallGeminiOptions = {},
): Promise<{ text: string; model: string; latencyMs: number }> {
  if (!isAiEnabled()) {
    throw new Error("AI is disabled or API key is missing");
  }

  const model = options.model ?? "gemini-2.5-flash";
  const timeoutMs = options.timeoutMs ?? 4000;
  const start = Date.now();

  if (currentMockHandler) {
    // Run mock handler with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("Timeout")), timeoutMs);
    try {
      const promise = currentMockHandler(prompt, options.context);
      const text = await Promise.race([
        promise,
        new Promise<string>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error("Timeout (4s limit exceeded)"));
          });
        }),
      ]);
      clearTimeout(timer);
      return { text, model, latencyMs: Date.now() - start };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 512,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }
  const data = (await response.json()) as GeminiResponse;
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) {
    throw new Error("Empty candidate received from Gemini");
  }

  return {
    text: candidate.trim(),
    model,
    latencyMs: Date.now() - start,
  };
}
