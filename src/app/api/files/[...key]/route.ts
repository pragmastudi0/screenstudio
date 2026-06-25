import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

// Sirve archivos del almacenamiento local de forma autenticada.
// Solo el dueño del proyecto puede acceder a sus capturas.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  // La clave empieza por el projectId: verifica propiedad.
  const projectId = keyParts[0];
  const asset = await prisma.asset.findFirst({
    where: { storageKey: key, project: { id: projectId, userId: session.userId } },
  });
  if (!asset) return new NextResponse("No encontrado", { status: 404 });

  try {
    const buf = await storage().get(key);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
