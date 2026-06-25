import Link from "next/link";
import { Plus, FolderKanban, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listProjects } from "@/server/actions/projects";
import { PROJECT_STATUSES, DEMO_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Proyectos · Demo Generator AI" };

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div>
      <PageHeader title="Proyectos" description="Todos tus videos de demo.">
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" /> Nuevo proyecto
          </Link>
        </Button>
      </PageHeader>

      <div className="p-6">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tienes proyectos todavía.
              </p>
              <Button asChild size="sm">
                <Link href="/projects/new">
                  <Plus className="h-4 w-4" /> Crear el primero
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const demo = DEMO_TYPES.find((d) => d.value === p.demoType)?.label;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardContent className="p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="secondary" className="gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${PROJECT_STATUSES[p.status].color}`}
                          />
                          {PROJECT_STATUSES[p.status].label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="font-medium">{p.softwareName}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.client ?? p.industry ?? "Sin cliente"}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{demo}</Badge>
                        <span>{p._count.assets} capturas</span>
                        <span>·</span>
                        <span>{formatDate(p.updatedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
