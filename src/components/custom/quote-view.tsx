// @polsia:user-owned — saved quote document island.

'use client';

import { ArrowLeft, Download, FileText, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PdfDownloadButton } from '@/components/custom/pdf-download-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api-client';
import { type QuoteResponse, quoteResponseSchema } from '@/lib/contracts/quotes';
import type { DocumentSpec } from '@/lib/pdf/schema';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 2,
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date(value));
}

function makeDocumentSpec(quote: QuoteResponse): DocumentSpec {
  const conditions = [
    quote.conditionsPaymentTerms ? `Condiciones de pago: ${quote.conditionsPaymentTerms}` : '',
    quote.conditionsDeadlines ? `Plazos: ${quote.conditionsDeadlines}` : '',
    quote.conditionsDelivery ? `Entrega: ${quote.conditionsDelivery}` : '',
    quote.conditionsValidity ? `Validez: ${quote.conditionsValidity}` : '',
    quote.observations ? `Observaciones: ${quote.observations}` : '',
    quote.additionalInfo ? `Información adicional: ${quote.additionalInfo}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: `Presupuesto ${quote.quoteNumber}`,
    subtitle: `${quote.businessName} · para ${quote.clientName}`,
    meta: [
      { label: 'Fecha', value: formatDate(quote.quoteDate) },
      ...(quote.validUntil ? [{ label: 'Valido hasta', value: quote.validUntil }] : []),
      { label: 'Moneda', value: 'ARS ($)' },
      { label: 'Deposito inicial', value: formatCurrency(quote.depositCents) },
      { label: 'Saldo restante', value: formatCurrency(quote.balanceCents) },
    ],
    lineItems: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmountCents: item.unitPriceCents,
    })),
    totalCents: quote.totalCents,
    notes: conditions || undefined,
    footer: `PresuPro · ${quote.businessName}`,
  };
}

export function QuoteView({ id }: { id: string }) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQuote = useCallback(() => {
    setError(null);
    return apiFetch(`/api/quotes/${id}`, { schema: quoteResponseSchema })
      .then(setQuote)
      .catch(() => setError('No hemos podido cargar este presupuesto.'));
  }, [id]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  if (error) {
    return (
      <main className="container-page section">
        <Card className="mx-auto max-w-xl border-destructive/30">
          <CardHeader>
            <CardTitle className="font-display text-h3">No encontramos el presupuesto</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/presupuesto">
                <ArrowLeft className="size-4" />
                Crear otro
              </Link>
            </Button>
            <Button type="button" onClick={() => void loadQuote()}>
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="container-page section">
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Cargando tu presupuesto…
          </CardContent>
        </Card>
      </main>
    );
  }

  const documentSpec = makeDocumentSpec(quote);
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-48 top-16 size-[30rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="container-page section relative">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3 text-eyebrow">
                <span className="h-px w-8 bg-primary" />
                <span>Presupuesto generado</span>
              </div>
              <h1 className="font-display text-h1 tracking-tight">{quote.quoteNumber}</h1>
              <p className="mt-2 text-muted-foreground">
                Creado el {formatDate(quote.quoteDate)} · en ARS ($)
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/presupuesto">
                  <ArrowLeft className="size-4" />
                  Nuevo presupuesto
                </Link>
              </Button>
              <PdfDownloadButton
                documentSpec={documentSpec}
                fileName={`${quote.quoteNumber}.pdf`}
                size="lg"
              >
                <Download className="size-4" />
                Descargar PDF
              </PdfDownloadButton>
            </div>
          </div>

          <Card className="overflow-hidden border-border/80 shadow-xl">
            <CardHeader className="border-b border-border bg-primary text-primary-foreground">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-eyebrow text-primary-foreground/70">PresuPro</p>
                  <CardTitle className="mt-2 font-display text-h2">Presupuesto</CardTitle>
                  <CardDescription className="mt-2 text-primary-foreground/80">
                    {quote.businessName}
                  </CardDescription>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-primary-foreground/70">N.º</p>
                  <p className="font-display text-2xl font-semibold">{quote.quoteNumber}</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    {formatDate(quote.quoteDate)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 p-6 sm:p-10">
              <div className="grid gap-7 sm:grid-cols-2">
                <div>
                  <p className="text-eyebrow">De</p>
                  <p className="mt-2 font-display text-xl font-semibold">{quote.businessName}</p>
                  {quote.businessContactPerson ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {quote.businessContactPerson}
                    </p>
                  ) : null}
                  {quote.businessPhone ? (
                    <p className="text-sm text-muted-foreground">{quote.businessPhone}</p>
                  ) : null}
                  {quote.businessEmail ? (
                    <p className="text-sm text-muted-foreground">{quote.businessEmail}</p>
                  ) : null}
                  {quote.businessAddress ? (
                    <p className="text-sm text-muted-foreground">{quote.businessAddress}</p>
                  ) : null}
                  {quote.businessWebsite ? (
                    <p className="text-sm text-primary">{quote.businessWebsite}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-eyebrow">Para</p>
                  <p className="mt-2 font-display text-xl font-semibold">{quote.clientName}</p>
                  {quote.clientCompany ? (
                    <p className="mt-1 text-sm text-muted-foreground">{quote.clientCompany}</p>
                  ) : null}
                  {quote.clientPhone ? (
                    <p className="text-sm text-muted-foreground">{quote.clientPhone}</p>
                  ) : null}
                  {quote.clientEmail ? (
                    <p className="text-sm text-muted-foreground">{quote.clientEmail}</p>
                  ) : null}
                  {quote.clientAddress ? (
                    <p className="text-sm text-muted-foreground">{quote.clientAddress}</p>
                  ) : null}
                  {quote.validUntil ? (
                    <Badge variant="secondary" className="mt-3">
                      Valido hasta {quote.validUntil}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <div className="grid min-w-[38rem] grid-cols-[minmax(0,1fr)_5rem_9rem_9rem] gap-3 bg-muted/50 px-4 py-3 text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <span>Concepto</span>
                  <span>Cant.</span>
                  <span>Precio unitario</span>
                  <span className="text-right">Importe</span>
                </div>
                {quote.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid min-w-[38rem] grid-cols-[minmax(0,1fr)_5rem_9rem_9rem] gap-3 border-t border-border px-4 py-4 text-sm"
                  >
                    <span className="break-words">{item.description}</span>
                    <span>{item.quantity}</span>
                    <span>{formatCurrency(item.unitPriceCents)}</span>
                    <span className="text-right font-medium">
                      {formatCurrency(item.lineTotalCents)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ml-auto grid max-w-sm gap-3 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(quote.subtotalCents)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">
                    Deposito inicial{' '}
                    {quote.depositMode === 'percentage'
                      ? `(${quote.depositPercentageBps / 100}%)`
                      : ''}
                  </span>
                  <span>{formatCurrency(quote.depositCents)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Saldo restante</span>
                  <span>{formatCurrency(quote.balanceCents)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-4 text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-display text-2xl font-semibold">
                    {formatCurrency(quote.totalCents)}
                  </span>
                </div>
              </div>
              {[
                quote.conditionsPaymentTerms,
                quote.conditionsDeadlines,
                quote.conditionsDelivery,
                quote.conditionsValidity,
                quote.observations,
                quote.additionalInfo,
              ].some(Boolean) ? (
                <>
                  <Separator />
                  <div className="grid gap-5 sm:grid-cols-2">
                    {[
                      ['Pago', quote.conditionsPaymentTerms],
                      ['Plazos', quote.conditionsDeadlines],
                      ['Entrega', quote.conditionsDelivery],
                      ['Validez', quote.conditionsValidity],
                      ['Observaciones', quote.observations],
                      ['Información adicional', quote.additionalInfo],
                    ].map(([label, value]) =>
                      value ? (
                        <div key={label} className="space-y-1">
                          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                            {label}
                          </p>
                          <p className="whitespace-pre-wrap text-sm">{value}</p>
                        </div>
                      ) : null,
                    )}
                  </div>
                </>
              ) : null}
              <div className="flex items-center gap-2 border-t border-border pt-5 text-caption text-muted-foreground">
                <FileText className="size-4 text-primary" />
                Documento profesional listo para descargar.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
