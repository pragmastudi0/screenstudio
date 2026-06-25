"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectForm } from "@/components/projects/project-form";
import { DEMO_TYPES, DURATIONS } from "@/lib/constants";
import type { ProjectDTO } from "@/components/projects/types";

export function OverviewTab({ project }: { project: ProjectDTO }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Editar proyecto</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
          </div>
          <ProjectForm
            mode="edit"
            projectId={project.id}
            initial={{
              softwareName: project.softwareName,
              client: project.client,
              industry: project.industry,
              description: project.description,
              systemUrl: project.systemUrl,
              videoGoal: project.videoGoal,
              demoType: project.demoType,
              duration: project.duration,
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const demo = DEMO_TYPES.find((d) => d.value === project.demoType)?.label;
  const dur = DURATIONS.find((d) => d.value === project.duration)?.label;

  const rows: [string, string | null][] = [
    ["Cliente", project.client],
    ["Industria", project.industry],
    ["Tipo de demo", demo ?? null],
    ["Duración", dur ?? null],
    ["URL del sistema", project.systemUrl],
  ];

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{project.softwareName}</h3>
            {project.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>

        <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="bg-card p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 text-sm">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        {project.videoGoal && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Objetivo del video</p>
            <p className="text-sm">{project.videoGoal}</p>
          </div>
        )}

        {project.analysis && (
          <div className="flex flex-wrap gap-1.5">
            {project.analysis.features.slice(0, 6).map((f, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {f}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
