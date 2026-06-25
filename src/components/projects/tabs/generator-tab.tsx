"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, FileText, Target, Mic, Megaphone, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { runGenerationAction } from "@/server/actions/generate";
import type { GenerationDTO } from "@/components/projects/types";

export function GeneratorTab({
  projectId,
  generation,
}: {
  projectId: string;
  generation: GenerationDTO | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function generate() {
    start(async () => {
      const t = toast.loading("Generando el paquete completo con IA...");
      const res = await runGenerationAction(projectId);
      toast.dismiss(t);
      if (res.ok) {
        toast.success("¡Materiales generados!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h3 className="font-medium">Generador IA</h3>
            <p className="text-sm text-muted-foreground">
              Crea resumen, propuesta de valor, guion, storyboard, escenas, textos,
              CTA, lista de grabaciones, prompts y voz en off.
            </p>
          </div>
          <Button onClick={generate} disabled={pending} size="lg">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generation ? "Regenerar todo" : "Generar todo"}
          </Button>
        </CardContent>
      </Card>

      {!generation ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8" />
            <p className="text-sm">
              Aún no hay materiales. Pulsa <strong>Generar todo</strong> para crearlos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Block icon={FileText} title="Resumen ejecutivo" text={generation.executiveSummary} />
          <Block icon={Target} title="Propuesta de valor" text={generation.valueProposition} />
          <Block icon={Mic} title="Guion narrado" text={generation.narrationScript} />
          <Block icon={Megaphone} title="CTA final" text={generation.ctaFinal} />

          {generation.recordingList?.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <ListChecks className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Lista de grabaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {generation.recordingList.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{r.title}.</strong>{" "}
                        <span className="text-muted-foreground">{r.description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  if (!text) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CopyButton text={text} variant="ghost" />
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}
