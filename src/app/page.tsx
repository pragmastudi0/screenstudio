import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  FileText,
  Clapperboard,
  Wand2,
  Mic,
  KanbanSquare,
  Download,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

const features = [
  { icon: FileText, title: "Resumen y propuesta de valor", desc: "La IA sintetiza tu software en un pitch claro." },
  { icon: Clapperboard, title: "Guion y storyboard", desc: "Escenas, narración y textos en pantalla listos." },
  { icon: Wand2, title: "Prompts para Veo, Kling, Runway", desc: "Listos para copiar y pegar en cada modelo." },
  { icon: Mic, title: "Voz en off multi-tono", desc: "Formal, comercial, corporativo y emocional." },
  { icon: KanbanSquare, title: "Tablero Kanban", desc: "Organiza la producción escena por escena." },
  { icon: Download, title: "Exporta a PDF, DOCX, MD, JSON", desc: "Lleva todo a tu flujo de producción." },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold">Demo Generator AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          Potenciado por Google Gemini
        </div>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Crea <span className="gradient-text">videos de demo</span> de tu software con IA
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Sube tus capturas y deja que la IA genere el guion, el storyboard, los prompts de
          video, la voz en off y la lista de grabaciones. Para ventas, onboarding y capacitación.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">
              Empezar gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card/50 p-5 backdrop-blur transition-colors hover:border-primary/40"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t py-6 text-center text-sm text-muted-foreground">
        Demo Generator AI · MVP · Desplegable en tu propio Mac Mini
      </footer>
    </div>
  );
}
