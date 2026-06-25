import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildExportDoc } from "@/lib/export/document";
import { toMarkdown, toHtml, toDocx, toJson } from "@/lib/export/renderers";
import { slugify } from "@/lib/utils";

// Módulo 7 — exportación: PDF (HTML para imprimir), Markdown, DOCX, JSON.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const { projectId } = await params;
  const format = (req.nextUrl.searchParams.get("format") ?? "json").toLowerCase();

  const doc = await buildExportDoc(projectId, session.userId);
  if (!doc) return new NextResponse("Proyecto no encontrado", { status: 404 });

  const base = slugify(doc.title) || "demo";

  switch (format) {
    case "md":
    case "markdown":
      return new NextResponse(toMarkdown(doc), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.md"`,
        },
      });
    case "json":
      return new NextResponse(toJson(doc), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.json"`,
        },
      });
    case "docx": {
      const buf = await toDocx(doc);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}.docx"`,
        },
      });
    }
    case "pdf":
    case "html":
    default:
      // PDF se obtiene imprimiendo este HTML (Cmd/Ctrl+P → Guardar como PDF).
      return new NextResponse(toHtml(doc), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
  }
}
