"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, LayoutTemplate, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/templates", label: "Plantillas", icon: LayoutTemplate },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/30 md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">Demo Generator AI</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        <p>MVP v0.1</p>
      </div>
    </aside>
  );
}
