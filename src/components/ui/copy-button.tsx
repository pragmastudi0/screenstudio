"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copiar",
  className,
  size = "sm",
  variant = "outline",
}: {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  }

  return (
    <Button type="button" size={size} variant={variant} className={cn(className)} onClick={copy}>
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      {size !== "icon" && (copied ? "Copiado" : label)}
    </Button>
  );
}
