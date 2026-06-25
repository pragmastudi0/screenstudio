"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTemplateAction } from "@/server/actions/templates";

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await applyTemplateAction(templateId);
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Usar plantilla
    </Button>
  );
}
