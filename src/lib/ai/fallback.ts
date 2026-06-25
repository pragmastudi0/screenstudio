// Generadores deterministas usados cuando GEMINI_API_KEY no está configurada.
// Permiten que el MVP funcione de extremo a extremo sin costo ni red.
import { DEMO_TYPES, DURATIONS, PROMPT_TARGETS, VOICE_VARIANTS } from "@/lib/constants";
import type { ProjectContext } from "./prompts";
import type { Analysis, DemoPackage, ModelPrompts, VoiceoverDraft } from "./schemas";

export function fallbackAnalysis(c: { softwareName: string }, text: string): Analysis {
  const words = Array.from(
    new Set(text.toLowerCase().match(/[a-záéíóúñ]{5,}/g) ?? []),
  ).slice(0, 6);
  return {
    features: [
      `Gestión centralizada en ${c.softwareName}`,
      "Panel con métricas en tiempo real",
      "Flujos de trabajo automatizados",
      ...words.map((w) => `Soporte para "${w}"`),
    ].slice(0, 6),
    benefits: [
      "Ahorra tiempo operativo",
      "Reduce errores manuales",
      "Mejora la visibilidad del negocio",
    ],
    useCases: [
      "Equipos que necesitan coordinar tareas diarias",
      "Direcciones que requieren reportes consolidados",
    ],
    modules: ["Dashboard", "Reportes", "Configuración", "Usuarios"],
  };
}

export function fallbackDemoPackage(c: ProjectContext): DemoPackage {
  const dur = DURATIONS.find((d) => d.value === c.duration);
  const demo = DEMO_TYPES.find((d) => d.value === c.demoType);
  const seconds = dur?.seconds ?? 60;
  const sceneCount = Math.max(3, Math.round(seconds / 12));
  const features = c.analysis?.features ?? [];

  const scenes = Array.from({ length: sceneCount }).map((_, i) => {
    const order = i + 1;
    const feature = features[i % Math.max(features.length, 1)] ?? `Función clave ${order}`;
    if (order === 1)
      return {
        order,
        title: "Apertura",
        description: `Plano del logo de ${c.softwareName} con animación de entrada.`,
        narration: `Te presentamos ${c.softwareName}, la solución que ${
          c.industry ? `transforma la industria de ${c.industry}` : "transforma tu operación"
        }.`,
        onScreenText: c.softwareName,
        requiredAction: "Grabar pantalla de inicio / login del sistema.",
      };
    if (order === sceneCount)
      return {
        order,
        title: "Cierre y CTA",
        description: "Pantalla final con propuesta de valor y llamada a la acción.",
        narration: `Descubre todo lo que ${c.softwareName} puede hacer por ti. Agenda una demo hoy.`,
        onScreenText: "Agenda tu demo →",
        requiredAction: "Mostrar pantalla de contacto / formulario.",
      };
    return {
      order,
      title: `Función: ${feature}`,
      description: `Recorrido por la pantalla relacionada con ${feature}.`,
      narration: `Con ${feature}, tu equipo trabaja de forma más simple y rápida.`,
      onScreenText: feature,
      requiredAction: `Grabar el flujo de "${feature}" en ${c.systemUrl ?? "el sistema"}.`,
    };
  });

  return {
    executiveSummary: `${c.softwareName} es ${
      c.description ?? "una plataforma de software"
    } orientada a ${c.industry ?? "empresas"}. Centraliza la operación y entrega resultados medibles.`,
    valueProposition: `${c.softwareName} ayuda a ${
      c.client ?? "tu organización"
    } a operar con más eficiencia, menos errores y mejor visibilidad. Una sola plataforma para todo el ciclo.`,
    narrationScript: scenes.map((s) => s.narration).join(" "),
    ctaFinal: `Lleva ${c.softwareName} a tu equipo. Agenda una demostración personalizada hoy mismo.`,
    scenes,
    onScreenTexts: scenes.map((s) => ({ scene: s.order, text: s.onScreenText })),
    recordingList: scenes.map((s) => ({ title: s.title, description: s.requiredAction })),
    videoPrompts: [
      {
        target: "VEO",
        content: `Cinematic product demo of ${c.softwareName}, modern SaaS dashboard UI, smooth camera dolly-in, soft studio lighting, dark mode interface, 16:9, professional ${
          demo?.label ?? "demo"
        } mood.`,
      },
    ],
    imagePrompts: [
      {
        target: "MIDJOURNEY",
        content: `Hero shot of ${c.softwareName} SaaS dashboard, clean dark UI, neon accents, glassmorphism, marketing render --ar 16:9 --v 6`,
      },
    ],
  };
}

export function fallbackModelPrompts(c: ProjectContext): ModelPrompts {
  return {
    prompts: PROMPT_TARGETS.map((t) => ({
      target: t.value,
      kind: t.kind,
      label: `${t.label} · ${c.softwareName}`,
      content:
        t.kind === "VIDEO"
          ? `Create a ${t.description.toLowerCase()} clip for "${c.softwareName}", a ${
              c.industry ?? "business"
            } software. Show the dashboard in action, smooth UI transitions, dark theme, professional lighting, 16:9.`
          : t.kind === "IMAGE"
            ? `High-quality marketing render of "${c.softwareName}" dashboard, modern dark UI, ${
                c.industry ?? "enterprise"
              } context, glassmorphism --ar 16:9`
            : `Refina el guion de un video de demo de "${c.softwareName}" (${
                c.demoType
              }). Hazlo más persuasivo, claro y con un gancho inicial fuerte. Mantén el tono profesional.`,
    })),
  };
}

export function fallbackVoiceover(c: ProjectContext, variant: string): VoiceoverDraft {
  const v = VOICE_VARIANTS.find((x) => x.value === variant);
  const pkg = fallbackDemoPackage(c);
  const intro = {
    FORMAL: `Le presentamos ${c.softwareName}.`,
    COMMERCIAL: `¡Descubre ${c.softwareName}!`,
    CORPORATE: `${c.softwareName}: tecnología para su organización.`,
    EMOTIONAL: `Imagina trabajar sin fricciones. Eso es ${c.softwareName}.`,
  }[variant as "FORMAL"];
  return {
    variant: variant as VoiceoverDraft["variant"],
    fullText: `${intro} ${pkg.narrationScript} ${pkg.ctaFinal}`,
    segments: pkg.scenes.map((s) => ({ scene: s.order, text: s.narration })),
  };
}
