"use client";

import { Mic } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { VOICE_VARIANTS } from "@/lib/constants";
import type { VoiceoverDTO } from "@/components/projects/types";

export function VoiceTab({ voiceovers }: { voiceovers: VoiceoverDTO[] }) {
  if (voiceovers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Mic className="h-8 w-8" />
          <p className="text-sm">
            Genera los materiales para obtener las versiones de voz en off.
          </p>
        </CardContent>
      </Card>
    );
  }

  const byVariant = (v: string) => voiceovers.find((x) => x.variant === v);
  const first = voiceovers[0].variant;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Guiones optimizados para locución (compatibles con ElevenLabs). Elige el tono.
      </p>
      <Tabs defaultValue={first}>
        <TabsList>
          {VOICE_VARIANTS.filter((v) => byVariant(v.value)).map((v) => (
            <TabsTrigger key={v.value} value={v.value}>
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {VOICE_VARIANTS.map((v) => {
          const vo = byVariant(v.value);
          if (!vo) return null;
          return (
            <TabsContent key={v.value} value={v.value} className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Guion completo · {v.label}</p>
                    <CopyButton text={vo.fullText} variant="ghost" />
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {vo.fullText}
                  </p>
                </CardContent>
              </Card>

              {vo.segments?.length > 0 && (
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <p className="text-sm font-medium">Segmentado por escena</p>
                    <div className="space-y-2">
                      {vo.segments.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-md border bg-background p-3"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {s.scene}
                          </span>
                          <p className="flex-1 text-sm text-muted-foreground">{s.text}</p>
                          <CopyButton text={s.text} variant="ghost" size="icon" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
