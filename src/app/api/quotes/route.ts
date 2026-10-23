// @polsia:user-owned — quote creation endpoint.

import 'server-only';

import { NextResponse } from 'next/server';
import { createQuoteNumber, normalizeQuote, parseDateOnly } from '@/lib/business/quotes';
import {
  type CreateQuoteInput,
  calculateQuoteTotals,
  createQuoteSchema,
  quoteIssuesToFieldErrors,
} from '@/lib/contracts/quotes';
import { prisma } from '@/lib/db';

function validationResponse(issues: Parameters<typeof quoteIssuesToFieldErrors>[0]) {
  return NextResponse.json({ errors: quoteIssuesToFieldErrors(issues) }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido.' }, { status: 400 });
  }

  const parsed = createQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return validationResponse(parsed.error.issues);
  }

  const input: CreateQuoteInput = parsed.data;
  const quoteDate = new Date();
  const totals = calculateQuoteTotals(input.items, input);

  try {
    const quote = await prisma.quote.create({
      data: {
        userId: input.userId,
        quoteNumber: createQuoteNumber(quoteDate),
        quoteDate,
        validUntil: parseDateOnly(input.validUntil),
        businessName: input.businessName,
        businessContactPerson: input.businessContactPerson || null,
        businessPhone: input.businessPhone || null,
        businessEmail: input.businessEmail || null,
        businessAddress: input.businessAddress || null,
        businessWebsite: input.businessWebsite || null,
        clientName: input.clientName,
        clientCompany: input.clientCompany || null,
        clientPhone: input.clientPhone || null,
        clientEmail: input.clientEmail || null,
        clientAddress: input.clientAddress || null,
        currency: input.currency,
        depositMode: input.depositMode,
        depositValueCents: input.depositValueCents,
        depositPercentageBps: input.depositPercentageBps,
        depositCents: totals.depositCents,
        balanceCents: totals.balanceCents,
        subtotalCents: totals.subtotalCents,
        totalCents: totals.totalCents,
        conditionsPaymentTerms: input.conditionsPaymentTerms || null,
        conditionsDeadlines: input.conditionsDeadlines || null,
        conditionsDelivery: input.conditionsDelivery || null,
        conditionsValidity: input.conditionsValidity || null,
        observations: input.observations || null,
        additionalInfo: input.additionalInfo || null,
        items: {
          create: totals.items,
        },
      },
      include: { items: true },
    });

    return NextResponse.json(normalizeQuote(quote), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'No hemos podido guardar el presupuesto. Inténtalo de nuevo.' },
      { status: 500 },
    );
  }
}
