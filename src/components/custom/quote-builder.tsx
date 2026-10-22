// @polsia:user-owned — interactive quote builder island.

'use client';

import { ArrowLeft, ArrowRight, Check, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type FieldPath, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import {
  calculateQuoteTotals,
  createQuoteSchema,
  decimalToCents,
  percentageToBasisPoints,
  quoteIssuesToFieldErrors,
  quoteResponseSchema,
} from '@/lib/contracts/quotes';
import { applyServerErrors } from '@/lib/forms';

type QuoteFormValues = {
  businessName: string;
  businessContactPerson: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessWebsite: string;
  clientName: string;
  clientCompany: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  validUntil: string;
  depositMode: 'fixed' | 'percentage';
  depositValue: string;
  depositPercentage: string;
  conditionsPaymentTerms: string;
  conditionsDeadlines: string;
  conditionsDelivery: string;
  conditionsValidity: string;
  observations: string;
  additionalInfo: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
  }>;
};

const emptyItem: QuoteFormValues['items'][number] = {
  description: '',
  quantity: 1,
  unitPrice: '',
};

const STEPS = [
  { label: 'Negocio', eyebrow: 'Paso 01', fields: ['businessName'] },
  { label: 'Cliente', eyebrow: 'Paso 02', fields: ['clientName'] },
  { label: 'Partidas', eyebrow: 'Paso 03', fields: ['items'] },
  {
    label: 'Condiciones',
    eyebrow: 'Paso 04',
    fields: ['depositMode', 'depositValue', 'depositPercentage'],
  },
  { label: 'Revisión', eyebrow: 'Paso 05', fields: [] },
] satisfies Array<{ label: string; eyebrow: string; fields: Array<FieldPath<QuoteFormValues>> }>;

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 2,
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function safeQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 0 ? quantity : 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function errorCause(error: unknown) {
  return error instanceof Error ? error.cause : undefined;
}

function stepForField(field: string) {
  if (field === 'items' || field.startsWith('items.')) return 2;
  if (
    field === 'validUntil' ||
    field.startsWith('deposit') ||
    field.startsWith('conditions') ||
    field === 'observations' ||
    field === 'additionalInfo'
  )
    return 3;
  if (field.startsWith('client')) return 1;
  return 0;
}

export function QuoteBuilder() {
  const router = useRouter();
  const form = useForm<QuoteFormValues>({
    defaultValues: {
      businessName: '',
      businessContactPerson: '',
      businessPhone: '',
      businessEmail: '',
      businessAddress: '',
      businessWebsite: '',
      clientName: '',
      clientCompany: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      validUntil: '',
      depositMode: 'fixed',
      depositValue: '0',
      depositPercentage: '0',
      conditionsPaymentTerms: '',
      conditionsDeadlines: '',
      conditionsDelivery: '',
      conditionsValidity: '',
      observations: '',
      additionalInfo: '',
      items: [emptyItem],
    },
  });
  const { control, handleSubmit, setError, trigger, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = watch();
  const watchedItems = watched.items ?? [];
  const depositValueCents = decimalToCents(watched.depositValue ?? '') ?? 0;
  const depositPercentageBps = percentageToBasisPoints(watched.depositPercentage ?? '') ?? 0;
  const calculationItems = watchedItems.map((item) => ({
    description: item.description.trim() || 'Sin descripción',
    quantity: safeQuantity(item.quantity),
    unitPriceCents: decimalToCents(item.unitPrice ?? '') ?? 0,
  }));
  const totals = calculateQuoteTotals(calculationItems, {
    depositMode: watched.depositMode ?? 'fixed',
    depositValueCents,
    depositPercentageBps,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const fallbackStep = {
    label: 'Negocio',
    eyebrow: 'Paso 01',
    fields: [] as FieldPath<QuoteFormValues>[],
  };
  const currentStep = STEPS[stepIndex] ?? STEPS[0] ?? fallbackStep;

  async function goNext() {
    const valid = await trigger(currentStep.fields);
    if (valid) setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function onSubmit(values: QuoteFormValues) {
    setSubmitError(null);
    let hasInvalidValue = false;
    let firstErrorStep = STEPS.length - 1;
    const itemPayload = values.items.map((item, index) => {
      const unitPriceCents = decimalToCents(item.unitPrice);
      if (unitPriceCents === null) {
        hasInvalidValue = true;
        firstErrorStep = Math.min(firstErrorStep, 2);
        setError(`items.${index}.unitPrice` as FieldPath<QuoteFormValues>, {
          type: 'validate',
          message: 'Escribe un precio válido con hasta dos decimales.',
        });
      }
      return {
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: unitPriceCents ?? 0,
      };
    });
    const parsedDeposit = decimalToCents(values.depositValue);
    const parsedPercentage = percentageToBasisPoints(values.depositPercentage);

    if (values.depositMode === 'fixed' && parsedDeposit === null) {
      hasInvalidValue = true;
      firstErrorStep = Math.min(firstErrorStep, 3);
      setError('depositValue', { type: 'validate', message: 'Indica un importe válido.' });
    }
    if (values.depositMode === 'percentage' && parsedPercentage === null) {
      hasInvalidValue = true;
      firstErrorStep = Math.min(firstErrorStep, 3);
      setError('depositPercentage', { type: 'validate', message: 'Indica un porcentaje válido.' });
    }

    if (hasInvalidValue) {
      setStepIndex(firstErrorStep);
      toast.error('Revisa los importes indicados.');
      return;
    }

    const payload = createQuoteSchema.safeParse({
      businessName: values.businessName,
      businessContactPerson: values.businessContactPerson,
      businessPhone: values.businessPhone,
      businessEmail: values.businessEmail,
      businessAddress: values.businessAddress,
      businessWebsite: values.businessWebsite,
      clientName: values.clientName,
      clientCompany: values.clientCompany,
      clientPhone: values.clientPhone,
      clientEmail: values.clientEmail,
      clientAddress: values.clientAddress,
      validUntil: values.validUntil,
      currency: 'ARS',
      depositMode: values.depositMode,
      depositValueCents: parsedDeposit ?? 0,
      depositPercentageBps: parsedPercentage ?? 0,
      conditionsPaymentTerms: values.conditionsPaymentTerms,
      conditionsDeadlines: values.conditionsDeadlines,
      conditionsDelivery: values.conditionsDelivery,
      conditionsValidity: values.conditionsValidity,
      observations: values.observations,
      additionalInfo: values.additionalInfo,
      items: itemPayload,
    });

        if (!payload.success) {
      const fieldErrors = quoteIssuesToFieldErrors(payload.error.issues);
      let payloadErrorStep = STEPS.length - 1;
      Object.entries(fieldErrors).forEach(([field, message]) => {
        payloadErrorStep = Math.min(payloadErrorStep, stepForField(field));
        if (field === 'form' || field === 'items') {
          setSubmitError(message);
          return;
        }
        setError(field as FieldPath<QuoteFormValues>, { type: 'validate', message });
      });
      setStepIndex(payloadErrorStep);
      toast.error('Revisa los datos del presupuesto.');
      return;
    }

    // --- INICIO LÓGICA LÍMITE FREEMIUM ---
    const LIMITE_GRATIS = 3;
    const mesActual = new Date().getMonth(); // 0 = Enero, 11 = Diciembre
    const contadorGuardado = localStorage.getItem('presupro_contador');
    
    let contador = contadorGuardado ? JSON.parse(contadorGuardado) : { mes: mesActual, cantidad: 0 };

    // Si cambió el mes, reiniciamos el contador
    if (contador.mes !== mesActual) {
      contador = { mes: mesActual, cantidad: 0 };
    }

     // Si ya superó el límite, bloqueamos y mostramos el error
    if (contador.cantidad >= LIMITE_GRATIS) {
      setMostrarPago(true); // <-- ¡ESTA ES LA CLAVE!
      setSubmitError("Llegaste al límite de 3 presupuestos gratuitos este mes.");
      toast.error("Límite alcanzado. Actualizá a Pro.");
      return;
    }
    // --- FIN LÓGICA LÍMITE FREEMIUM ---

    try {
      const response = await apiFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(payload.data),
        schema: quoteResponseSchema,
      });
      
      // --- SI SE GUARDÓ BIEN, SUMAMOS 1 AL CONTADOR ---
      contador.cantidad += 1;
      localStorage.setItem('presupro_contador', JSON.stringify(contador));
      // -----------------------------------------------

      toast.success('Presupuesto generado');
      router.push(`/presupuesto/${response.id}`);
        } catch (error) {
      const applied = applyServerErrors(errorCause(error), setError);
      const message = applied
        ? 'Revisá los campos marcados antes de generar.'
        : 'No hemos podido generar el presupuesto. Inténtalo de nuevo.';
      setSubmitError(message);
      toast.error(message);
    }
  } // <-- ¡AGREGÁ ESTA LLAVE ACÁ!

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-48 top-20 size-[32rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="container-page section relative">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 max-w-3xl">
            <div className="mb-5 flex items-center gap-3 text-eyebrow">
              <span className="h-px w-8 bg-primary" />
              <span>Nuevo presupuesto · {todayIso()}</span>
            </div>
            <h1 className="font-display text-h1 text-balance tracking-tight">
              Ponle números claros a tu próximo sí.
            </h1>
            <p className="mt-5 max-w-2xl text-body-lg text-muted-foreground">
              Completa los datos paso a paso. Tus importes se recalculan en tiempo real y el
              documento queda listo para compartir.
            </p>
          </div>

          <div className="mb-8 grid gap-2 sm:grid-cols-5">
            {STEPS.map((step, index) => (
              <button
                key={step.label}
                type="button"
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  index === stepIndex
                    ? 'border-primary bg-primary/10 text-foreground'
                    : index < stepIndex
                      ? 'border-primary/30 bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground'
                }`}
                onClick={() => index < stepIndex && setStepIndex(index)}
                disabled={index > stepIndex}
              >
                <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.12em]">
                  {index < stepIndex ? <Check className="size-3.5 text-primary" /> : null}
                  {step.eyebrow}
                </span>
                <span className="mt-1 block text-sm font-medium">{step.label}</span>
              </button>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
              {stepIndex === 0 ? (
                <Card className="border-border/80 shadow-md">
                  <CardHeader className="border-b border-border/70 pb-5">
                    <CardTitle className="font-display text-h3 tracking-tight">
                      Tu negocio
                    </CardTitle>
                    <CardDescription className="mt-2">
                      La identidad que aparecerá en el encabezado del documento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name="businessName"
                      rules={{ required: 'Indica tu negocio.' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del negocio</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nombre comercial"
                              autoComplete="organization"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="businessContactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Persona de contacto</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu nombre" autoComplete="name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+54 11 5555 5555"
                              autoComplete="tel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="businessEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="hola@tu-negocio.com"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ciudad, provincia"
                              autoComplete="street-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="businessWebsite"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>
                            Website{' '}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="url" placeholder="https://tu-negocio.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ) : null}

              {stepIndex === 1 ? (
                <Card className="border-border/80 shadow-md">
                  <CardHeader className="border-b border-border/70 pb-5">
                    <CardTitle className="font-display text-h3 tracking-tight">
                      Tu cliente
                    </CardTitle>
                    <CardDescription className="mt-2">
                      A quién va dirigido este presupuesto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name="clientName"
                      rules={{ required: 'Indica el cliente.' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del cliente</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nombre de la persona"
                              autoComplete="name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="clientCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Empresa{' '}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Empresa o proyecto"
                              autoComplete="organization"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Teléfono{' '}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+54 11 5555 5555"
                              autoComplete="tel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email{' '}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="cliente@email.com"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="clientAddress"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>
                            Dirección{' '}
                            <span className="font-normal text-muted-foreground">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ciudad, provincia"
                              autoComplete="street-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ) : null}

              {stepIndex === 2 ? (
                <Card className="border-border/80 shadow-md">
                  <CardHeader className="border-b border-border/70 pb-5">
                    <CardTitle className="font-display text-h3 tracking-tight">
                      Productos y servicios
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Añade todas las líneas que necesites. Los valores pueden ser cero.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="rounded-lg border border-border/80 bg-muted/30 p-4 transition-colors focus-within:border-primary/50 sm:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span className="text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Partida {String(index + 1).padStart(2, '0')}
                          </span>
                          {fields.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              aria-label={`Quitar partida ${index + 1}`}
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_9rem] sm:items-start">
                          <FormField
                            control={control}
                            name={`items.${index}.description` as const}
                            rules={{ required: 'Indica el servicio.' }}
                            render={({ field: itemField }) => (
                              <FormItem>
                                <FormLabel>Descripción</FormLabel>
                                <FormControl>
                                  <Input placeholder="Diseño de identidad" {...itemField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`items.${index}.quantity` as const}
                            rules={{ required: 'Indica una cantidad.' }}
                            render={({ field: itemField }) => (
                              <FormItem>
                                <FormLabel>Cantidad</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    inputMode="numeric"
                                    {...itemField}
                                    value={Number.isNaN(itemField.value) ? '' : itemField.value}
                                    onChange={(event) =>
                                      itemField.onChange(event.target.valueAsNumber)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`items.${index}.unitPrice` as const}
                            rules={{ required: 'Indica un precio.' }}
                            render={({ field: itemField }) => (
                              <FormItem>
                                <FormLabel>Precio unitario</FormLabel>
                                <FormControl>
                                  <Input inputMode="decimal" placeholder="$ 0,00" {...itemField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-sm">
                          <span className="text-muted-foreground">Importe de línea</span>
                          <span className="font-semibold">
                            {formatCurrency(totals.items[index]?.lineTotalCents ?? 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed bg-background/60"
                      onClick={() => append({ ...emptyItem })}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Añadir otra partida
                    </Button>
                    <div className="flex items-center justify-between border-t border-border pt-5">
                      <span className="text-muted-foreground">Subtotal en ARS</span>
                      <span className="font-display text-2xl font-semibold">
                        {formatCurrency(totals.subtotalCents)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {stepIndex === 3 ? (
                <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-border/80 shadow-md">
                    <CardHeader className="border-b border-border/70 pb-5">
                      <CardTitle className="font-display text-h3 tracking-tight">
                        Depósito y condiciones
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Aclara cómo y cuándo se paga el trabajo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={control}
                          name="depositMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de depósito</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="fixed">Importe fijo</SelectItem>
                                  <SelectItem value="percentage">Porcentaje</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {watched.depositMode === 'percentage' ? (
                          <FormField
                            control={control}
                            name="depositPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Porcentaje</FormLabel>
                                <FormControl>
                                  <Input inputMode="decimal" placeholder="25" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={control}
                            name="depositValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Importe del depósito</FormLabel>
                                <FormControl>
                                  <Input inputMode="decimal" placeholder="$ 0,00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatCurrency(totals.subtotalCents)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Deposito inicial</span>
                          <span className="font-semibold">
                            {formatCurrency(totals.depositCents)}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between gap-4">
                          <span className="font-medium">Saldo restante</span>
                          <span className="font-semibold">
                            {formatCurrency(totals.balanceCents)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-base">
                          <span className="font-medium">Total</span>
                          <span className="font-display text-xl font-semibold">
                            {formatCurrency(totals.totalCents)}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-5">
                        <FormField
                          control={control}
                          name="validUntil"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Valido hasta{' '}
                                <span className="font-normal text-muted-foreground">
                                  (opcional)
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="conditionsPaymentTerms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Condiciones de pago</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="50% al comenzar, 50% contra entrega"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="conditionsDeadlines"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plazos</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Entrega estimada: 15 días hábiles"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="conditionsDelivery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entrega</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Entrega digital por email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="conditionsValidity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Validez</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Este presupuesto es válido por 15 días"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="observations"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observaciones</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Un detalle adicional para tu cliente"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="additionalInfo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Información adicional</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Información que quieras dejar por escrito"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="h-fit border-primary/20 bg-primary text-primary-foreground shadow-lg">
                    <CardHeader>
                      <p className="text-eyebrow text-primary-foreground/70">Resumen vivo</p>
                      <CardTitle className="font-display text-h3">Lo que verá tu cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <p className="text-primary-foreground/80">
                        {watched.businessName || 'Tu negocio'} para{' '}
                        {watched.clientName || 'tu cliente'}.
                      </p>
                      <div className="space-y-2 border-t border-primary-foreground/20 pt-4">
                        {totals.items.map((item, index) => (
                          <div
                            key={fields[index]?.id ?? item.description}
                            className="flex justify-between gap-3"
                          >
                            <span className="min-w-0 truncate text-primary-foreground/80">
                              {item.description} × {item.quantity}
                            </span>
                            <span>{formatCurrency(item.lineTotalCents)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between border-t border-primary-foreground/20 pt-4 text-base">
                        <span>Total</span>
                        <span className="font-display text-xl">
                          {formatCurrency(totals.totalCents)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {stepIndex === 4 ? (
                <Card className="border-primary/25 shadow-lg">
                  <CardHeader className="bg-primary text-primary-foreground">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-eyebrow text-primary-foreground/70">Revisión final</p>
                        <CardTitle className="mt-2 font-display text-h2">
                          Comprueba tu presupuesto
                        </CardTitle>
                      </div>
                      <ReceiptText
                        className="size-7 text-primary-foreground/70"
                        aria-hidden="true"
                      />
                    </div>
                    <CardDescription className="mt-3 text-primary-foreground/80">
                      Todo lo que ves aquí es el contenido actual que se guardará.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-7 p-6 sm:p-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-eyebrow">De</p>
                        <p className="mt-2 font-display text-xl font-semibold">
                          {watched.businessName || '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {watched.businessContactPerson || 'Sin persona de contacto'}
                        </p>
                        {watched.businessPhone ? (
                          <p className="text-sm text-muted-foreground">{watched.businessPhone}</p>
                        ) : null}
                        {watched.businessEmail ? (
                          <p className="text-sm text-muted-foreground">{watched.businessEmail}</p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          {watched.businessAddress || 'Sin dirección'}
                        </p>
                        {watched.businessWebsite ? (
                          <p className="text-sm text-primary">{watched.businessWebsite}</p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-eyebrow">Para</p>
                        <p className="mt-2 font-display text-xl font-semibold">
                          {watched.clientName || '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {watched.clientCompany || 'Sin empresa'}
                        </p>
                        {watched.clientPhone ? (
                          <p className="text-sm text-muted-foreground">{watched.clientPhone}</p>
                        ) : null}
                        {watched.clientEmail ? (
                          <p className="text-sm text-muted-foreground">{watched.clientEmail}</p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          {watched.clientAddress || 'Sin dirección'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">N.º </span>Se asigna al generar
                      </span>
                      <span>
                        <span className="text-muted-foreground">Fecha </span>
                        {todayIso()}
                      </span>
                      <span>
                        <span className="text-muted-foreground">Moneda </span>ARS ($)
                      </span>
                      {watched.validUntil ? (
                        <span>
                          <span className="text-muted-foreground">Valido hasta </span>
                          {watched.validUntil}
                        </span>
                      ) : null}
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_5.5rem] gap-2 bg-muted/50 px-3 py-3 text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_4rem_7rem_7rem] sm:px-4">
                        <span>Concepto</span>
                        <span>Cant.</span>
                        <span>Precio</span>
                        <span className="text-right">Importe</span>
                      </div>
                      {totals.items.map((item, index) => (
                        <div
                          key={fields[index]?.id ?? item.description}
                          className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_5.5rem] gap-2 border-t border-border px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_4rem_7rem_7rem] sm:px-4"
                        >
                          <span className="min-w-0 break-words">{item.description}</span>
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
                        <span>{formatCurrency(totals.subtotalCents)}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-muted-foreground">
                          Depósito{' '}
                          {watched.depositMode === 'percentage'
                            ? `(${watched.depositPercentage || 0}%)`
                            : ''}
                        </span>
                        <span>{formatCurrency(totals.depositCents)}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-muted-foreground">Saldo restante</span>
                        <span>{formatCurrency(totals.balanceCents)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-3 text-lg">
                        <span className="font-medium">Total</span>
                        <span className="font-display text-2xl font-semibold">
                          {formatCurrency(totals.totalCents)}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
                      {[
                        ['Pago', watched.conditionsPaymentTerms],
                        ['Plazos', watched.conditionsDeadlines],
                        ['Entrega', watched.conditionsDelivery],
                        ['Validez', watched.conditionsValidity],
                        ['Observaciones', watched.observations],
                        ['Información adicional', watched.additionalInfo],
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
                  </CardContent>
                </Card>
              ) : null}

                            {/* --- BOTÓN DE MERCADO PAGO --- */}
              {mostrarPago ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
                  <p className="text-sm font-medium">
                    Llegaste al límite de 3 presupuestos gratuitos este mes.
                  </p>
                  <a
                    href="https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=a9d8e0545f6d45f9b56ae7e57e4c9ee"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Hazte Pro ahora por $9.90 USD/mes
                  </a>
                </div>
              ) : null}
              {/* --- FIN BOTÓN DE MERCADO PAGO --- */}
            
              <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
                <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Anterior
                </Button>
                {stepIndex < STEPS.length - 1 ? (
                  <Button type="button" size="lg" onClick={goNext}>
                    Continuar
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Generando…' : 'Generar presupuesto'}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}