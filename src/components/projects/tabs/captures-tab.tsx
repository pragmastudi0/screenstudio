"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_KINDS } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import {
  uploadAssetsAction,
  deleteAssetAction,
  analyzeProjectAction,
} from "@/server/actions/assets";
import type { AssetDTO, AnalysisDTO } from "@/components/projects/types";

const kindIcon: Record<string, React.ElementType> = {
  IMAGE: ImageIcon,
  SCREENSHOT: ImageIcon,
  PDF: FileText,
  MANUAL: FileText,
  VIDEO: Video,
};

export function CapturesTab({
  projectId,
  assets,
  analysis,
}: {
  projectId: string;
  assets: AssetDTO[];
  analysis: AnalysisDTO | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, startAnalyze] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const res = await uploadAssetsAction(projectId, fd);
      if (res.ok) {
        toast.success(`${res.count} archivo(s) subido(s)`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function analyze() {
    startAnalyze(async () => {
      const res = await analyzeProjectAction(projectId);
      if (res.ok) {
        toast.success("Material analizado por IA");
        router.refresh();
      } else {
        toast.error("Error al analizar");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                Arrastra archivos o haz clic para subir
              </p>
              <p className="text-xs text-muted-foreground">
                Imágenes, screenshots, PDFs, manuales y videos (máx. 25 MB)
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Lista */}
      {assets.length > 0 && (
        <div className="space-y-2">
          {assets.map((a) => {
            const Icon = kindIcon[a.kind] ?? FileText;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ASSET_KINDS[a.kind]} · {formatBytes(a.size)}
                  </p>
                </div>
                <DeleteAsset assetId={a.id} />
              </div>
            );
          })}
        </div>
      )}

      {/* Análisis IA */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Análisis con IA</h3>
              <p className="text-sm text-muted-foreground">
                Extrae funcionalidades, beneficios, casos de uso y módulos.
              </p>
            </div>
            <Button onClick={analyze} disabled={analyzing} variant="secondary">
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Analizar material
            </Button>
          </div>

          {analysis && (
            <div className="grid gap-4 sm:grid-cols-2">
              <AnalysisList title="Funcionalidades" items={analysis.features} />
              <AnalysisList title="Beneficios" items={analysis.benefits} />
              <AnalysisList title="Casos de uso" items={analysis.useCases} />
              <AnalysisList title="Módulos" items={analysis.modules} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <Badge key={i} variant="secondary" className="font-normal">
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function DeleteAsset({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteAssetAction(assetId);
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
