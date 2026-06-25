import { LayoutTemplate } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTemplates } from "@/server/actions/templates";
import { TEMPLATE_CATEGORIES } from "@/lib/constants";
import { UseTemplateButton } from "@/components/templates/use-template-button";

export const metadata = { title: "Plantillas · Demo Generator AI" };
// Consulta la BD en cada petición; no prerenderizar en build.
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div>
      <PageHeader
        title="Biblioteca de plantillas"
        description="Arranca un proyecto con una base optimizada por sector."
      />
      <div className="p-6">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <LayoutTemplate className="h-8 w-8" />
              <p className="text-sm">
                No hay plantillas. Ejecuta <code>npm run db:seed</code> para cargarlas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader>
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="secondary">{TEMPLATE_CATEGORIES[t.category]}</Badge>
                  </div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <UseTemplateButton templateId={t.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
