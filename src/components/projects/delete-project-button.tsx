"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteProjectAction } from "@/server/actions/projects";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar proyecto?</DialogTitle>
          <DialogDescription>
            Esta acción es permanente. Se borrarán las capturas, el guion, el storyboard
            y todos los materiales generados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await deleteProjectAction(projectId);
                } catch {
                  toast.error("No se pudo eliminar");
                }
              })
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
