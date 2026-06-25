"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KanbanSquare, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { SCENE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateSceneStatusAction } from "@/server/actions/scenes";
import type { SceneDTO } from "@/components/projects/types";

type Status = SceneDTO["status"];

export function StoryboardTab({ scenes: initial }: { scenes: SceneDTO[] }) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);

  if (initial.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <KanbanSquare className="h-8 w-8" />
          <p className="text-sm">Genera los materiales para construir el storyboard.</p>
        </CardContent>
      </Card>
    );
  }

  async function move(id: string, status: Status) {
    const prev = scenes;
    setScenes((s) => s.map((sc) => (sc.id === id ? { ...sc, status } : sc)));
    const res = await updateSceneStatusAction(id, status);
    if (!res.ok) {
      setScenes(prev);
      toast.error("No se pudo mover la escena");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SCENE_STATUSES.map((col) => {
        const items = scenes
          .filter((s) => s.status === col.value)
          .sort((a, b) => a.order - b.order);
        return (
          <div
            key={col.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) move(dragId, col.value);
              setDragId(null);
            }}
            className="flex flex-col gap-3 rounded-lg border bg-card/40 p-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", col.color)} />
                <span className="text-sm font-medium">{col.label}</span>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDragId(s.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "group cursor-grab rounded-lg border bg-background p-3 shadow-sm transition active:cursor-grabbing",
                    dragId === s.id && "opacity-50",
                  )}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">
                      Escena {s.order}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{s.title}</p>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  {s.onScreenText && (
                    <Badge variant="outline" className="mt-2 font-normal">
                      {s.onScreenText}
                    </Badge>
                  )}
                  <div className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                    {s.narration && (
                      <p>
                        <span className="font-medium text-foreground">Narración:</span>{" "}
                        {s.narration}
                      </p>
                    )}
                    {s.requiredAction && (
                      <p>
                        <span className="font-medium text-foreground">Acción:</span>{" "}
                        {s.requiredAction}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                    <CopyButton
                      text={`Escena ${s.order}: ${s.title}\nDescripción: ${s.description}\nNarración: ${s.narration}\nTexto en pantalla: ${s.onScreenText}\nAcción: ${s.requiredAction}`}
                      variant="ghost"
                      size="icon"
                    />
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                  Arrastra escenas aquí
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
