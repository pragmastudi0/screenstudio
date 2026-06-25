import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div className="text-sm text-muted-foreground md:hidden">
            Demo Generator AI
          </div>
          <div className="ml-auto">
            <UserMenu name={session.name} email={session.email} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
