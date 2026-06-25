import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workspace } from "@/components/projects/workspace";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { PROJECT_STATUSES } from "@/lib/constants";
import type {
  ProjectDTO,
  AnalysisDTO,
  GenerationDTO,
} from "@/components/projects/types";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      generation: true,
      assets: { orderBy: { createdAt: "desc" } },
      scenes: { orderBy: { order: "asc" } },
      prompts: true,
      voiceovers: true,
    },
  });
  if (!project) notFound();

  // Resuelve URLs de los assets (firma o ruta local).
  const assets = await Promise.all(
    project.assets.map(async (a) => ({
      id: a.id,
      kind: a.kind,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
      url: await storage().url(a.storageKey),
    })),
  );

  const g = project.generation;
  const dto: ProjectDTO = {
    id: project.id,
    softwareName: project.softwareName,
    client: project.client,
    industry: project.industry,
    description: project.description,
    systemUrl: project.systemUrl,
    videoGoal: project.videoGoal,
    demoType: project.demoType,
    duration: project.duration,
    status: project.status,
    analysis: (project.analysis as AnalysisDTO | null) ?? null,
    generation: g
      ? ({
          executiveSummary: g.executiveSummary ?? "",
          valueProposition: g.valueProposition ?? "",
          narrationScript: g.narrationScript ?? "",
          ctaFinal: g.ctaFinal ?? "",
          recordingList: (g.recordingList as GenerationDTO["recordingList"]) ?? [],
          videoPrompts: (g.videoPrompts as GenerationDTO["videoPrompts"]) ?? [],
          imagePrompts: (g.imagePrompts as GenerationDTO["imagePrompts"]) ?? [],
        } satisfies GenerationDTO)
      : null,
    assets,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      description: s.description ?? "",
      narration: s.narration ?? "",
      onScreenText: s.onScreenText ?? "",
      requiredAction: s.requiredAction ?? "",
      status: s.status,
    })),
    prompts: project.prompts.map((p) => ({
      id: p.id,
      target: p.target,
      kind: p.kind,
      label: p.label,
      content: p.content,
    })),
    voiceovers: project.voiceovers.map((v) => ({
      id: v.id,
      variant: v.variant,
      fullText: v.fullText,
      segments: (v.segments as { scene: number; text: string }[]) ?? [],
    })),
  };

  const st = PROJECT_STATUSES[project.status];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/projects">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{project.softwareName}</h1>
              <Badge variant="secondary" className="gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${st.color}`} />
                {st.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {project.client ?? project.industry ?? "Sin cliente"}
            </p>
          </div>
        </div>
        <DeleteProjectButton projectId={project.id} />
      </div>

      <Workspace project={dto} />
    </div>
  );
}
