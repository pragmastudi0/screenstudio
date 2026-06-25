"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_TYPES, DURATIONS } from "@/lib/constants";
import { createProjectAction, updateProjectAction } from "@/server/actions/projects";

type Values = {
  softwareName?: string;
  client?: string | null;
  industry?: string | null;
  description?: string | null;
  systemUrl?: string | null;
  videoGoal?: string | null;
  demoType?: string;
  duration?: string;
};

export function ProjectForm({
  mode = "create",
  projectId,
  initial,
}: {
  mode?: "create" | "edit";
  projectId?: string;
  initial?: Values;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [demoType, setDemoType] = useState(initial?.demoType ?? "COMMERCIAL");
  const [duration, setDuration] = useState(initial?.duration ?? "SEC_60");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("demoType", demoType);
    formData.set("duration", duration);

    startTransition(async () => {
      if (mode === "edit" && projectId) {
        const res = await updateProjectAction(projectId, formData);
        if (res?.ok) {
          toast.success("Proyecto actualizado");
          router.refresh();
        } else {
          toast.error(res?.error ?? "Error al guardar");
        }
      } else {
        const res = await createProjectAction(formData);
        // createProjectAction redirige en éxito; solo llega aquí si hay error.
        if (res && !res.ok) toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="softwareName">Nombre del software *</Label>
          <Input
            id="softwareName"
            name="softwareName"
            defaultValue={initial?.softwareName ?? ""}
            placeholder="p.ej. Acme ERP"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Cliente</Label>
          <Input id="client" name="client" defaultValue={initial?.client ?? ""} placeholder="Empresa cliente" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">Industria</Label>
          <Input id="industry" name="industry" defaultValue={initial?.industry ?? ""} placeholder="p.ej. Manufactura" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder="¿Qué hace el software? ¿Qué problema resuelve?"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="systemUrl">URL del sistema</Label>
          <Input id="systemUrl" name="systemUrl" type="url" defaultValue={initial?.systemUrl ?? ""} placeholder="https://app.ejemplo.com" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="videoGoal">Objetivo del video</Label>
          <Textarea
            id="videoGoal"
            name="videoGoal"
            defaultValue={initial?.videoGoal ?? ""}
            placeholder="¿Qué quieres lograr con este video?"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de demo</Label>
          <Select value={demoType} onValueChange={setDemoType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEMO_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duración</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Guardar cambios" : "Crear proyecto"}
        </Button>
      </div>
    </form>
  );
}
