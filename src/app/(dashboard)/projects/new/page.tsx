import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata = { title: "Nuevo proyecto · Demo Generator AI" };

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader
        title="Nuevo proyecto"
        description="Define el software y el objetivo del video de demo."
      />
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="pt-6">
            <ProjectForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
