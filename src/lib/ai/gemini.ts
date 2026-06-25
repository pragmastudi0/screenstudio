import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, isGeminiConfigured } from "@/lib/env";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
}

export { isGeminiConfigured };

/**
 * Llama a Gemini y devuelve texto plano.
 */
export async function geminiText(
  prompt: string,
  opts?: { system?: string; temperature?: number },
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: opts?.system,
    generationConfig: { temperature: opts?.temperature ?? 0.7 },
  });
  const res = await model.generateContent(prompt);
  return res.response.text();
}

/**
 * Llama a Gemini forzando salida JSON y la parsea.
 * Tolera bloques markdown ```json ... ```.
 */
export async function geminiJson<T>(
  prompt: string,
  opts?: { system?: string; temperature?: number },
): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: opts?.system,
    generationConfig: {
      temperature: opts?.temperature ?? 0.6,
      responseMimeType: "application/json",
    },
  });
  const res = await model.generateContent(prompt);
  const text = res.response.text();
  return parseJson<T>(text);
}

export function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Intenta extraer el primer objeto/array JSON del texto.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("La respuesta de Gemini no es un JSON válido.");
  }
}
