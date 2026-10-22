// @polsia:user-owned — starter home served at /. Replace it in place, or delete
// this route group before adding another page that resolves to /.

import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  MessageCircle,
  Send,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteDescription, siteName } from '@/lib/site';

// Keep this a Server Component so it can export metadata.
export const metadata: Metadata = {
  title: { absolute: siteName },
  description: siteDescription,
  // Do not export an explicit openGraph object here; that suppresses the
  // file-based opengraph-image.tsx for the home route.
  alternates: { canonical: '/' },
};

const STEPS = [
  {
    number: '01',
    title: 'Cuenta tu trabajo',
    description: 'Añade tu negocio, el cliente y lo que vas a entregar.',
  },
  {
    number: '02',
    title: 'Ponlo bonito',
    description: 'Ajusta cantidades, precios y condiciones sin pelearte con una hoja de cálculo.',
  },
  {
    number: '03',
    title: 'Envíalo hoy',
    description: 'Previsualiza el resultado, genera el PDF y compártelo por WhatsApp.',
  },
];

const AUDIENCES = [
  'Freelancers',
  'Profesionales independientes',
  'Pequeños negocios',
  'Estudios y equipos pequeños',
];

const QUOTE_LINES = [
  ['Identidad visual', '1 × $ 48.000'],
  ['Diseño de piezas', '3 × $ 12.000'],
  ['Entrega y ajustes', '1 × $16.000'],
];

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <section className="relative border-b border-border bg-muted/30">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-1/2 bg-primary/50" />
        <div className="container-page section-lg relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-7 flex items-center gap-3 text-eyebrow">
              <span className="h-px w-8 bg-primary" />
              <span>Tu trabajo, bien presentado</span>
            </div>
            <h1 className="max-w-2xl font-display text-display text-balance tracking-tight sm:text-[4.8rem]">
              Que tu próximo sí empiece con un buen presupuesto.
            </h1>
            <p className="mt-7 max-w-xl text-body-lg text-muted-foreground">
              PresuPro convierte tus ideas, precios y condiciones en un documento profesional listo
              para enviar. Sin plantillas imposibles. Sin perder una tarde.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="group h-12 px-6">
                <Link href="/presupuesto">
                  Crear mi primer presupuesto
                  <ArrowUpRight className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Link
                href="#como-funciona"
                className="group inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors duration-200 hover:text-primary"
              >
                Ver cómo funciona
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-caption text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-primary" /> Un presupuesto gratis
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="size-4 text-primary" /> En minutos, no en horas
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl animate-in fade-in slide-in-from-bottom-6 duration-1000 lg:mr-0">
            <div className="absolute -left-5 top-14 z-10 hidden -rotate-6 items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-caption shadow-md sm:flex">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageCircle className="size-4" />
              </span>
              <span>
                <span className="block font-semibold">Listo para WhatsApp</span>
                <span className="text-muted-foreground">Un toque y se va</span>
              </span>
            </div>
            <div className="absolute -bottom-5 -right-4 z-10 flex rotate-3 items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-caption shadow-md sm:-right-8">
              <Send className="size-4 text-primary" />
              <span className="font-semibold">PDF profesional</span>
            </div>
            <Card className="relative rotate-1 overflow-hidden border-border/80 bg-card shadow-2xl transition-transform duration-500 ease-out hover:rotate-0">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3 text-caption">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2 rounded-full bg-primary/70" />
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                </div>
                <span className="font-medium text-muted-foreground">Vista previa</span>
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <CardContent className="p-6 sm:p-9">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="font-display text-2xl font-semibold tracking-tight">PRESUPRO</p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      Diseño que deja huella
                    </p>
                  </div>
                  <div className="text-right text-caption">
                    <p className="font-semibold text-foreground">PRESUPUESTO</p>
                    <p className="mt-1 text-muted-foreground">N.º 024 · 12 JUN 2024</p>
                  </div>
                </div>
                <div className="my-7 grid grid-cols-2 gap-5 border-y border-border py-5 text-caption">
                  <div>
                    <p className="mb-1 uppercase tracking-[0.12em] text-muted-foreground">Para</p>
                    <p className="font-semibold">Estudio Nómada</p>
                    <p className="text-muted-foreground">Madrid, España</p>
                  </div>
                  <div>
                    <p className="mb-1 uppercase tracking-[0.12em] text-muted-foreground">
                      Valido hasta
                    </p>
                    <p className="font-semibold">26 junio 2024</p>
                    <Badge variant="secondary" className="mt-2 text-[0.65rem]">
                      Pendiente de respuesta
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-[1fr_auto] border-b border-border pb-2 text-caption uppercase tracking-[0.1em] text-muted-foreground">
                    <span>Concepto</span>
                    <span>Importe</span>
                  </div>
                  {QUOTE_LINES.map(([label, price]) => (
                    <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-4">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-end justify-between border-t border-border pt-5">
                  <span className="text-sm text-muted-foreground">Total estimado</span>
                  <span className="font-display text-3xl font-semibold tracking-tight">
                    $116.000
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="container-page section scroll-mt-20">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
          <div className="max-w-md">
            <div className="mb-5 flex items-center gap-3 text-eyebrow">
              <span>Así de sencillo</span>
              <span className="h-px w-8 bg-primary" />
            </div>
            <h2 className="font-display text-h2 text-balance tracking-tight">
              Del dato al “adelante” en tres movimientos.
            </h2>
            <p className="mt-5 text-body text-muted-foreground">
              PresuPro está hecho para ese momento entre una conversación y una oportunidad: cuando
              solo necesitas ordenar lo que ya sabes y enviarlo con confianza.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {STEPS.map((step) => (
              <div key={step.number} className="grid gap-3 py-7 sm:grid-cols-[5rem_1fr] sm:gap-8">
                <span className="font-display text-3xl font-semibold text-primary">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-display text-h4 tracking-tight">{step.title}</h3>
                  <p className="mt-2 max-w-lg text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="para-quien" className="container-page section scroll-mt-20">
        <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-xl">
          <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[3rem] border-primary-foreground/10" />
          <div className="pointer-events-none absolute -bottom-32 left-1/2 size-72 rounded-full border border-primary-foreground/10" />
          <div className="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:gap-16 lg:p-16">
            <div>
              <div className="mb-5 flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
                <CircleDollarSign className="size-4" />
                <span>Para quien hace que las cosas pasen</span>
              </div>
              <h2 className="max-w-2xl font-display text-h2 text-balance tracking-tight">
                Tu oficio ya es complejo. Hacer un presupuesto no tiene por qué serlo.
              </h2>
            </div>
            <div>
              <p className="max-w-md text-body-lg text-primary-foreground/80">
                Una herramienta ágil para trabajar con una imagen a la altura de lo que entregas.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {AUDIENCES.map((audience) => (
                  <Badge
                    key={audience}
                    variant="outline"
                    className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground"
                  >
                    {audience}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="empezar" className="container-page section-lg scroll-mt-20">
        <Card className="overflow-hidden border-primary/20 shadow-lg">
          <div className="grid lg:grid-cols-[1fr_0.8fr]">
            <CardHeader className="p-7 sm:p-10 lg:p-14">
              <Badge variant="secondary" className="w-fit">
                Empieza gratis
              </Badge>
              <CardTitle className="mt-5 max-w-xl font-display text-h2 text-balance tracking-tight">
                Cada propuesta clara abre una puerta.
              </CardTitle>
              <CardDescription className="mt-4 max-w-lg text-body-lg">
                Crea tu primer presupuesto sin tarjeta y descubre lo fácil que puede ser presentarte
                bien.
              </CardDescription>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="group h-12 px-6">
                  <Link href="/presupuesto">
                    Crear mi presupuesto
                    <ArrowUpRight className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <span className="text-caption text-muted-foreground">
                  Un presupuesto gratis para empezar.
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col justify-between border-t border-border bg-muted/40 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
              <div>
                <p className="text-eyebrow">Cuando necesites más</p>
                <p className="mt-3 font-display text-h3 tracking-tight">PRO, sin límites.</p>
                <p className="mt-3 max-w-sm text-muted-foreground">
                  Presupuestos ilimitados, siempre listos para compartir y con la imagen de tu
                  negocio.
                </p>
              </div>
              <div className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Sin letra pequeña en tu primer
                  presupuesto
                </p>
                <p className="mt-3 flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Hecho para móvil, listo para enviar
                </p>
              </div>
            </CardContent>
          </div>
        </Card>
      </section>
    </main>
  );
}
