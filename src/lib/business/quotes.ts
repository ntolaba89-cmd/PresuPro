// @polsia:user-owned — pure quote persistence normalization helpers.

import type { QuoteResponse } from '@/lib/contracts/quotes';
import { quoteResponseSchema } from '@/lib/contracts/quotes';

type PersistedQuote = {
  id: string;
  quoteNumber: string;
  quoteDate: Date;
  validUntil: Date | null;
  businessName: string;
  businessContactPerson: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessAddress: string | null;
  businessWebsite: string | null;
  clientName: string;
  clientCompany: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  currency: string;
  depositMode: string;
  depositValueCents: number;
  depositPercentageBps: number;
  depositCents: number;
  balanceCents: number;
  subtotalCents: number;
  totalCents: number;
  conditionsPaymentTerms: string | null;
  conditionsDeadlines: string | null;
  conditionsDelivery: string | null;
  conditionsValidity: string | null;
  observations: string | null;
  additionalInfo: string | null;
  createdAt: Date;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
};

export function normalizeQuote(quote: PersistedQuote): QuoteResponse {
  return quoteResponseSchema.parse({
    ...quote,
    quoteDate: quote.quoteDate.toISOString(),
    validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : null,
    createdAt: quote.createdAt.toISOString(),
    depositMode: quote.depositMode === 'percentage' ? 'percentage' : 'fixed',
  });
}

export function createQuoteNumber(date = new Date()) {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniquePart = String(Date.now()).slice(-4);
  return `PP-${datePart}-${uniquePart}`;
}

export function parseDateOnly(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
