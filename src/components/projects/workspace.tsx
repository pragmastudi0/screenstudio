"use client";

import {
  FileText,
  Upload,
  Sparkles,
  Wand2,
  Mic,
  KanbanSquare,
  Download,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/projects/tabs/overview-tab";
import { CapturesTab } from "@/components/projects/tabs/captures-tab";
import { GeneratorTab } from "@/components/projects/tabs/generator-tab";
import { PromptsTab } from "@/components/projects/tabs/prompts-tab";
import { VoiceTab } from "@/components/projects/tabs/voice-tab";
import { StoryboardTab } from "@/components/projects/tabs/storyboard-tab";
import { ExportTab } from "@/components/projects/tabs/export-tab";
import type { ProjectDTO } from "@/components/projects/types";

const tabs = [
  { value: "overview", label: "Datos", icon: FileText },
  { value: "captures", label: "Capturas", icon: Upload },
  { value: "generator", label: "Generador IA", icon: Sparkles },
  { value: "prompts", label: "Prompts", icon: Wand2 },
  { value: "voice", label: "Voz en off", icon: Mic },
  { value: "storyboard", label: "Storyboard", icon: KanbanSquare },
  { value: "export", label: "Exportar", icon: Download },
];

export function Workspace({ project }: { project: ProjectDTO }) {
  const ready = !!project.generation;
  return (
    <Tabs defaultValue="overview" className="p-6">
      <div className="overflow-x-auto pb-1">
        <TabsList className="w-max">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview">
        <OverviewTab project={project} />
      </TabsContent>
      <TabsContent value="captures">
        <CapturesTab
          projectId={project.id}
          assets={project.assets}
          analysis={project.analysis}
        />
      </TabsContent>
      <TabsContent value="generator">
        <GeneratorTab projectId={project.id} generation={project.generation} />
      </TabsContent>
      <TabsContent value="prompts">
        <PromptsTab prompts={project.prompts} />
      </TabsContent>
      <TabsContent value="voice">
        <VoiceTab voiceovers={project.voiceovers} />
      </TabsContent>
      <TabsContent value="storyboard">
        <StoryboardTab scenes={project.scenes} />
      </TabsContent>
      <TabsContent value="export">
        <ExportTab projectId={project.id} ready={ready} />
      </TabsContent>
    </Tabs>
  );
}
