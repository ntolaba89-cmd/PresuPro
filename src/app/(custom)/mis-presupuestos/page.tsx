import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata: Metadata = {
  title: 'Mis Presupuestos',
  description: 'Historial de todos los presupuestos que generaste.',
  alternates: { canonical: '/mis-presupuestos' },
};

export default async function MisPresupuestosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Buscamos los presupuestos del usuario en la base de datos
  const quotes = await prisma.quote.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });

  return (
    <main className="container-page section max-w-5xl py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-h2 tracking-tight">Mis Presupuestos</h1>
          <p className="text-muted-foreground mt-2">
            Historial de todos los presupuestos que generaste.
          </p>
        </div>
        <Button asChild>
          <Link href="/presupuesto">Crear nuevo</Link>
        </Button>
      </div>

      {quotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Todavía no generaste ningún presupuesto.
            </p>
            <Button asChild>
              <Link href="/presupuesto">Crear mi primer presupuesto</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {quote.quoteNumber || 'Presupuesto sin número'}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(quote.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                  <span className="text-lg font-semibold">
                    ${(quote.totalCents / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Para: <strong>{quote.clientName}</strong> ({quote.items.length} ítems)
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/presupuesto/${quote.id}`}>Ver</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}