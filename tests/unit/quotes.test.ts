// @polsia:user-owned — quote calculation and input-boundary tests.

import { describe, expect, it } from 'vitest';
import {
  calculateQuoteTotals,
  createQuoteSchema,
  decimalToCents,
  MAX_QUOTE_ITEMS,
  percentageToBasisPoints,
  quoteIssuesToFieldErrors,
} from '@/lib/contracts/quotes';

describe('quote calculations', () => {
  it('converts decimal ARS text to exact cents', () => {
    expect(decimalToCents('480')).toBe(48_000);
    expect(decimalToCents('120,50')).toBe(12_050);
    expect(decimalToCents('9.9')).toBe(990);
  });

  it('converts percentages to stable basis points', () => {
    expect(percentageToBasisPoints('25')).toBe(2_500);
    expect(percentageToBasisPoints('25,5')).toBe(2_550);
    expect(percentageToBasisPoints('100,01')).toBeNull();
  });

  it('rejects malformed or overly precise prices', () => {
    expect(decimalToCents('')).toBeNull();
    expect(decimalToCents('-10')).toBeNull();
    expect(decimalToCents('12.345')).toBeNull();
  });

  it('calculates line totals, subtotal, and total in cents', () => {
    const result = calculateQuoteTotals([
      { description: 'Diseño', quantity: 1, unitPriceCents: 48_000 },
      { description: 'Piezas', quantity: 3, unitPriceCents: 12_000 },
    ]);

    expect(result.items.map((item) => item.lineTotalCents)).toEqual([48_000, 36_000]);
    expect(result.subtotalCents).toBe(84_000);
    expect(result.totalCents).toBe(84_000);
  });

  it('accepts zero values and calculates fixed and percentage deposits', () => {
    const items = [
      { description: 'Servicio', quantity: 2, unitPriceCents: 100_000 },
      { description: 'Sin coste', quantity: 0, unitPriceCents: 0 },
    ];
    expect(
      calculateQuoteTotals(items, {
        depositMode: 'fixed',
        depositValueCents: 0,
        depositPercentageBps: 0,
      }),
    ).toMatchObject({
      subtotalCents: 200_000,
      depositCents: 0,
      balanceCents: 200_000,
      totalCents: 200_000,
    });
    expect(
      calculateQuoteTotals(items, {
        depositMode: 'percentage',
        depositValueCents: 0,
        depositPercentageBps: 2_500,
      }),
    ).toMatchObject({
      subtotalCents: 200_000,
      depositCents: 50_000,
      balanceCents: 150_000,
      totalCents: 200_000,
    });
  });
});

describe('quote input limits', () => {
  const validItem = {
    description: 'Diseño',
    quantity: 1,
    unitPriceCents: 48_000,
  };
  const validQuote = {
    businessName: 'PresuPro',
    clientName: 'Estudio Nómada',
    currency: 'ARS' as const,
    items: [validItem],
  };

  it('requires a non-negative integer quantity and non-negative price', () => {
    expect(
      createQuoteSchema.safeParse({
        ...validQuote,
        items: [{ ...validItem, quantity: -1 }],
      }).success,
    ).toBe(false);
    expect(
      createQuoteSchema.safeParse({
        ...validQuote,
        items: [{ ...validItem, unitPriceCents: -1 }],
      }).success,
    ).toBe(false);

    expect(
      createQuoteSchema.safeParse({
        ...validQuote,
        items: [{ ...validItem, quantity: 0, unitPriceCents: 0 }],
        businessWebsite: 'https://presupro.example',
      }).success,
    ).toBe(true);

    expect(
      createQuoteSchema.safeParse({
        ...validQuote,
        depositMode: 'fixed',
        depositValueCents: 48_001,
      }).success,
    ).toBe(false);
  });

  it('keeps nested item errors addressable by the form', () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      items: [{ ...validItem, unitPriceCents: -1 }],
    });
    if (result.success) throw new Error('Expected invalid quote');
    expect(quoteIssuesToFieldErrors(result.error.issues)).toMatchObject({
      'items.0.unitPrice': expect.any(String),
    });
  });

  it('limits the number of service lines', () => {
    const items = Array.from({ length: MAX_QUOTE_ITEMS + 1 }, (_, index) => ({
      description: `Servicio ${index}`,
      quantity: 1,
      unitPriceCents: 100,
    }));

    expect(createQuoteSchema.safeParse({ ...validQuote, items }).success).toBe(false);
  });
});
