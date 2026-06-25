import Link from "next/link";
import { Plus, FolderKanban, Sparkles, LayoutTemplate, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listProjects } from "@/server/actions/projects";
import { PROJECT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Inicio · Demo Generator AI" };

export default async function DashboardPage() {
  const projects = await listProjects();
  const ready = projects.filter((p) => p.status === "READY").length;

  return (
    <div>
      <PageHeader title="Inicio" description="Resumen de tu actividad reciente.">
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" /> Nuevo proyecto
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={FolderKanban} label="Proyectos" value={projects.length} />
          <StatCard icon={Sparkles} label="Demos listas" value={ready} />
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">Empezar rápido</p>
                <p className="font-medium">Desde una plantilla</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/templates">
                  <LayoutTemplate className="h-4 w-4" /> Ver
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Proyectos recientes
            </h2>
            <Link href="/projects" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aún no tienes proyectos. Crea el primero.
                </p>
                <Button asChild size="sm">
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4" /> Nuevo proyecto
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 6).map((p) => (
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
                      <p className="mt-3 text-xs text-muted-foreground">
                        {p._count.assets} capturas · {formatDate(p.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
