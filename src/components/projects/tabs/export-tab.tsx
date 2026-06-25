"use client";

import { FileText, FileCode, FileType, Braces, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formats = [
  { format: "pdf", label: "PDF", desc: "Documento para imprimir / compartir", icon: FileType, blank: true },
  { format: "docx", label: "Word (DOCX)", desc: "Editable en Word / Google Docs", icon: FileText, blank: false },
  { format: "md", label: "Markdown", desc: "Para Notion, GitHub o docs", icon: FileCode, blank: false },
  { format: "json", label: "JSON", desc: "Datos estructurados para integraciones", icon: Braces, blank: false },
];

export function ExportTab({ projectId, ready }: { projectId: string; ready: boolean }) {
  if (!ready) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">Genera los materiales antes de exportar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {formats.map((f) => (
        <Card key={f.format}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{f.label}</p>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/export/${projectId}?format=${f.format}`}
                target={f.blank ? "_blank" : undefined}
                rel="noopener"
              >
                {f.blank ? <ExternalLink className="h-4 w-4" /> : null}
                {f.blank ? "Abrir" : "Descargar"}
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground sm:col-span-2">
        El PDF se genera abriendo la vista de impresión: usa <strong>Cmd/Ctrl + P → Guardar
        como PDF</strong>.
      </p>
    </div>
  );
}
