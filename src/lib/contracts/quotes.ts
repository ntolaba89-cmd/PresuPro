// @polsia:user-owned — shared quote creation and response contract.

import { z } from 'zod';

export const MAX_QUOTE_ITEMS = 20;
export const MAX_DESCRIPTION_LENGTH = 160;
export const MAX_NAME_LENGTH = 120;
export const MAX_TEXT_LENGTH = 500;
export const MAX_QUANTITY = 1_000;
export const MAX_UNIT_PRICE_CENTS = 100_000_000;
// Prisma Int is a signed 32-bit integer; keep stored amounts below its limit.
export const MAX_LINE_TOTAL_CENTS = 2_000_000_000;
export const MAX_TOTAL_CENTS = 2_000_000_000;
export const MAX_DEPOSIT_PERCENTAGE_BPS = 10_000;

const optionalText = (label: string, max = MAX_TEXT_LENGTH) =>
  z.string().trim().max(max, `${label} no puede superar ${max} caracteres.`).optional();

export const quoteItemInputSchema = z.object({
  description: z
    .string({ required_error: 'Indica el servicio.' })
    .trim()
    .min(1, 'Indica el servicio.')
    .max(
      MAX_DESCRIPTION_LENGTH,
      `El servicio no puede superar ${MAX_DESCRIPTION_LENGTH} caracteres.`,
    ),
  quantity: z
    .number({ required_error: 'Indica una cantidad.' })
    .int('La cantidad debe ser un número entero.')
    .nonnegative('La cantidad no puede ser negativa.')
    .max(MAX_QUANTITY, `La cantidad máxima es ${MAX_QUANTITY}.`),
  unitPriceCents: z
    .number({ required_error: 'Indica un precio.' })
    .int('El precio debe expresarse en céntimos enteros.')
    .nonnegative('El precio no puede ser negativo.')
    .max(MAX_UNIT_PRICE_CENTS, 'El precio indicado supera el límite permitido.'),
});

export const createQuoteSchema = z
  .object({
    businessName: z
      .string({ required_error: 'Indica tu negocio.' })
      .trim()
      .min(1, 'Indica tu negocio.')
      .max(MAX_NAME_LENGTH, `El negocio no puede superar ${MAX_NAME_LENGTH} caracteres.`),
    businessContactPerson: optionalText('La persona de contacto', MAX_NAME_LENGTH),
    businessPhone: optionalText('El teléfono', 40),
    businessEmail: z
      .string()
      .trim()
      .email('Indica un email válido.')
      .max(160, 'El email no puede superar 160 caracteres.')
      .optional()
      .or(z.literal('')),
    businessAddress: optionalText('La dirección'),
    businessWebsite: optionalText('La web', 200),
    clientName: z
      .string({ required_error: 'Indica el cliente.' })
      .trim()
      .min(1, 'Indica el cliente.')
      .max(MAX_NAME_LENGTH, `El cliente no puede superar ${MAX_NAME_LENGTH} caracteres.`),
    clientCompany: optionalText('La empresa del cliente', MAX_NAME_LENGTH),
    clientPhone: optionalText('El teléfono del cliente', 40),
    clientEmail: z
      .string()
      .trim()
      .email('Indica un email válido.')
      .max(160, 'El email no puede superar 160 caracteres.')
      .optional()
      .or(z.literal('')),
    clientAddress: optionalText('La dirección del cliente'),
    currency: z.literal('ARS').default('ARS'),
    validUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica una fecha válida.')
      .refine(
        (value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()),
        'Indica una fecha válida.',
      )
      .optional()
      .or(z.literal('')),
    depositMode: z.enum(['fixed', 'percentage']).default('fixed'),
    depositValueCents: z
      .number()
      .int()
      .nonnegative('El depósito no puede ser negativo.')
      .max(MAX_TOTAL_CENTS, 'El depósito indicado supera el límite permitido.')
      .default(0),
    depositPercentageBps: z
      .number()
      .int()
      .nonnegative('El porcentaje no puede ser negativo.')
      .max(MAX_DEPOSIT_PERCENTAGE_BPS, 'El porcentaje máximo es 100%.')
      .default(0),
    conditionsPaymentTerms: optionalText('Las condiciones de pago'),
    conditionsDeadlines: optionalText('Los plazos'),
    conditionsDelivery: optionalText('La entrega'),
    conditionsValidity: optionalText('La validez'),
    observations: optionalText('Las observaciones'),
    additionalInfo: optionalText('La información adicional'),
    items: z
      .array(quoteItemInputSchema)
      .min(1, 'Añade al menos un servicio.')
      .max(MAX_QUOTE_ITEMS, `Puedes añadir hasta ${MAX_QUOTE_ITEMS} servicios.`),
  })
  .strict()
  .superRefine((quote, context) => {
    const { subtotalCents } = calculateQuoteTotals(quote.items, quote);

    quote.items.forEach((item, index) => {
      const lineTotalCents = item.quantity * item.unitPriceCents;
      if (lineTotalCents > MAX_LINE_TOTAL_CENTS) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'unitPriceCents'],
          message: 'El importe de esta línea supera el límite permitido.',
        });
      }
    });

    if (subtotalCents > MAX_TOTAL_CENTS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'El total del presupuesto supera el límite permitido.',
      });
    }

    if (quote.depositMode === 'fixed' && quote.depositValueCents > subtotalCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['depositValueCents'],
        message: 'El depósito no puede superar el subtotal.',
      });
    }
  });

const quoteItemResponseSchema = quoteItemInputSchema.extend({
  id: z.string(),
  lineTotalCents: z.number().int().nonnegative(),
});

export const quoteResponseSchema = z.object({
  id: z.string(),
  quoteNumber: z.string(),
  quoteDate: z.string().datetime(),
  validUntil: z.string().nullable(),
  businessName: z.string(),
  businessContactPerson: z.string().nullable(),
  businessPhone: z.string().nullable(),
  businessEmail: z.string().nullable(),
  businessAddress: z.string().nullable(),
  businessWebsite: z.string().nullable(),
  clientName: z.string(),
  clientCompany: z.string().nullable(),
  clientPhone: z.string().nullable(),
  clientEmail: z.string().nullable(),
  clientAddress: z.string().nullable(),
  currency: z.literal('ARS'),
  depositMode: z.enum(['fixed', 'percentage']),
  depositValueCents: z.number().int().nonnegative(),
  depositPercentageBps: z.number().int().nonnegative(),
  depositCents: z.number().int().nonnegative(),
  balanceCents: z.number().int().nonnegative(),
  subtotalCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  conditionsPaymentTerms: z.string().nullable(),
  conditionsDeadlines: z.string().nullable(),
  conditionsDelivery: z.string().nullable(),
  conditionsValidity: z.string().nullable(),
  observations: z.string().nullable(),
  additionalInfo: z.string().nullable(),
  createdAt: z.string().datetime(),
  items: z.array(quoteItemResponseSchema),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

type DepositInput = Pick<
  CreateQuoteInput,
  'depositMode' | 'depositValueCents' | 'depositPercentageBps'
>;

export function calculateQuoteTotals(
  items: readonly QuoteItemInput[],
  deposit: DepositInput = {
    depositMode: 'fixed',
    depositValueCents: 0,
    depositPercentageBps: 0,
  },
) {
  const normalizedItems = items.map((item) => ({
    ...item,
    lineTotalCents: item.quantity * item.unitPriceCents,
  }));
  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const depositCents =
    deposit.depositMode === 'percentage'
      ? Math.round((subtotalCents * deposit.depositPercentageBps) / 10_000)
      : deposit.depositValueCents;
  const balanceCents = Math.max(subtotalCents - depositCents, 0);

  return {
    items: normalizedItems,
    subtotalCents,
    depositCents,
    balanceCents,
    totalCents: subtotalCents,
  };
}

/** Convert decimal ARS text used by the browser into exact integer cents. */
export function decimalToCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole = '', fraction = ''] = normalized.split('.');
  const cents = Number(`${whole}${fraction.padEnd(2, '0')}`);
  return Number.isSafeInteger(cents) && cents <= MAX_UNIT_PRICE_CENTS ? cents : null;
}

/** Convert a percentage such as 25 or 25,5 into integer basis points. */
export function percentageToBasisPoints(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole = '', fraction = ''] = normalized.split('.');
  const basisPoints = Number(`${whole}${fraction.padEnd(2, '0')}`);
  return Number.isSafeInteger(basisPoints) && basisPoints <= MAX_DEPOSIT_PERCENTAGE_BPS
    ? basisPoints
    : null;
}

/** Turn Zod paths into the flat error map consumed by applyServerErrors. */
export function quoteIssuesToFieldErrors(issues: readonly z.ZodIssue[]): Record<string, string> {
  return Object.fromEntries(
    issues.map((issue) => {
      const path = issue.path
        .map(String)
        .join('.')
        .replace(/\.unitPriceCents$/, '.unitPrice')
        .replace(/^depositValueCents$/, 'depositValue')
        .replace(/^depositPercentageBps$/, 'depositPercentage');
      return [path || 'form', issue.message];
    }),
  );
}
