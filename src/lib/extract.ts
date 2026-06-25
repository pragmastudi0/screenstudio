import "server-only";
import { storage } from "@/lib/storage";
import type { Asset } from "@prisma/client";

/**
 * Extrae texto del material subido para alimentar el análisis IA.
 * - PDF: extrae el texto con pdf-parse.
 * - Otros tipos: aporta el nombre como pista de contexto.
 *
 * (El análisis de imágenes/video por visión se deja preparado para una
 * iteración futura con Gemini Vision; ver Módulo 9 del roadmap.)
 */
export async function extractTextFromAssets(assets: Asset[]): Promise<string> {
  const parts: string[] = [];

  for (const asset of assets) {
    if (asset.kind === "PDF") {
      try {
        const buf = await storage().get(asset.storageKey);
        // Import dinámico: pdf-parse solo en servidor y bajo demanda.
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(buf);
        parts.push(`# ${asset.originalName}\n${data.text}`);
      } catch (e) {
        console.error("[extract] PDF fallo:", asset.originalName, e);
        parts.push(`# ${asset.originalName} (PDF, no se pudo leer)`);
      }
    } else {
      parts.push(`# Material: ${asset.originalName} (${asset.kind})`);
    }
  }

  return parts.join("\n\n");
}
