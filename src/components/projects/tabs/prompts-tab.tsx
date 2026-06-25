"use client";

import { Wand2, Video, Image as ImageIcon, Type } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { PROMPT_TARGETS } from "@/lib/constants";
import type { PromptDTO } from "@/components/projects/types";

const kindIcon = { VIDEO: Video, IMAGE: ImageIcon, TEXT: Type };

export function PromptsTab({ prompts }: { prompts: PromptDTO[] }) {
  if (prompts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Wand2 className="h-8 w-8" />
          <p className="text-sm">
            Genera los materiales primero para obtener los prompts por modelo.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Agrupa por modelo destino, respetando el orden de PROMPT_TARGETS.
  const order = PROMPT_TARGETS.map((t) => t.value);
  const grouped = [...prompts].sort(
    (a, b) => order.indexOf(a.target as never) - order.indexOf(b.target as never),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {grouped.map((p) => {
        const meta = PROMPT_TARGETS.find((t) => t.value === p.target);
        const Icon = kindIcon[p.kind] ?? Type;
        return (
          <Card key={p.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">{meta?.label ?? p.target}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                </div>
              </div>
              <Badge variant="outline">{p.kind}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-relaxed">
                {p.content}
              </pre>
              <CopyButton text={p.content} className="w-full" label="Copiar prompt" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
