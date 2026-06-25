// Semilla de la biblioteca de plantillas (Módulo 8).
// Ejecuta: npm run db:seed
import { PrismaClient, Prisma, type TemplateCategory } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  name: string;
  category: TemplateCategory;
  description: string;
  structure: Prisma.InputJsonValue;
};

const templates: Seed[] = [
  {
    name: "ERP Empresarial",
    category: "ERP",
    description:
      "Demo de un ERP que integra finanzas, inventario y operaciones en una sola plataforma.",
    structure: {
      industry: "Manufactura",
      demoType: "COMMERCIAL",
      duration: "MIN_3",
      videoGoal: "Mostrar cómo el ERP unifica procesos y reduce costos operativos.",
      focusModules: ["Finanzas", "Inventario", "Compras", "Producción", "Reportes"],
      tone: "corporativo",
    },
  },
  {
    name: "CRM de Ventas",
    category: "CRM",
    description:
      "Demo de un CRM enfocado en pipeline de ventas, seguimiento de leads y automatización.",
    structure: {
      industry: "Servicios B2B",
      demoType: "COMMERCIAL",
      duration: "SEC_60",
      videoGoal: "Convencer a equipos comerciales de adoptar el CRM para cerrar más ventas.",
      focusModules: ["Pipeline", "Contactos", "Automatizaciones", "Reportes de ventas"],
      tone: "comercial",
    },
  },
  {
    name: "Plataforma de Logística",
    category: "LOGISTICS",
    description:
      "Demo de un sistema de gestión logística: rutas, flota, almacenes y trazabilidad.",
    structure: {
      industry: "Transporte y distribución",
      demoType: "ONBOARDING",
      duration: "MIN_3",
      videoGoal: "Guiar a nuevos operadores en el uso del sistema de logística.",
      focusModules: ["Rutas", "Flota", "Almacén", "Trazabilidad"],
      tone: "formal",
    },
  },
  {
    name: "Suite Financiera",
    category: "FINANCE",
    description:
      "Demo de software financiero: contabilidad, facturación, conciliación y tablero de KPIs.",
    structure: {
      industry: "Finanzas",
      demoType: "COMMERCIAL",
      duration: "MIN_3",
      videoGoal: "Resaltar control financiero en tiempo real y cumplimiento.",
      focusModules: ["Contabilidad", "Facturación", "Conciliación", "KPIs"],
      tone: "corporativo",
    },
  },
  {
    name: "Sistema de RRHH",
    category: "HR",
    description:
      "Demo de plataforma de recursos humanos: nómina, asistencia, evaluaciones y portal del empleado.",
    structure: {
      industry: "Recursos Humanos",
      demoType: "TRAINING",
      duration: "MIN_5",
      videoGoal: "Capacitar al personal de RRHH en los módulos clave de la plataforma.",
      focusModules: ["Nómina", "Asistencia", "Evaluaciones", "Portal del empleado"],
      tone: "formal",
    },
  },
  {
    name: "Tienda E-commerce",
    category: "ECOMMERCE",
    description:
      "Demo de una plataforma de comercio electrónico: catálogo, carrito, pagos y analítica.",
    structure: {
      industry: "Retail / E-commerce",
      demoType: "LAUNCH",
      duration: "SEC_60",
      videoGoal: "Anunciar el lanzamiento de la nueva tienda online.",
      focusModules: ["Catálogo", "Carrito", "Pagos", "Analítica"],
      tone: "comercial",
    },
  },
  {
    name: "Producto SaaS Genérico",
    category: "SAAS",
    description:
      "Demo de un producto SaaS B2B con dashboard, colaboración y planes de suscripción.",
    structure: {
      industry: "Tecnología / SaaS",
      demoType: "COMMERCIAL",
      duration: "SEC_60",
      videoGoal: "Generar leads mostrando el valor del producto en menos de un minuto.",
      focusModules: ["Dashboard", "Colaboración", "Integraciones", "Suscripciones"],
      tone: "comercial",
    },
  },
  {
    name: "Plataforma de IA",
    category: "AI",
    description:
      "Demo de un producto basado en IA: automatización inteligente, copilotos y análisis predictivo.",
    structure: {
      industry: "Inteligencia Artificial",
      demoType: "LAUNCH",
      duration: "MIN_3",
      videoGoal: "Comunicar el impacto de la IA en la productividad del cliente.",
      focusModules: ["Copiloto", "Automatización", "Análisis predictivo", "Integraciones"],
      tone: "emocional",
    },
  },
];

async function main() {
  console.log("Sembrando plantillas...");
  for (const t of templates) {
    // Evita duplicados por nombre.
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.template.update({ where: { id: existing.id }, data: t });
    } else {
      await prisma.template.create({ data: t });
    }
  }
  console.log(`Listo: ${templates.length} plantillas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
