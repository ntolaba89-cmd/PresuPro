// @polsia:user-owned — quote detail endpoint.

import 'server-only';

import { NextResponse } from 'next/server';
import { normalizeQuote } from '@/lib/business/quotes';
import { prisma } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(normalizeQuote(quote));
  } catch {
    return NextResponse.json(
      { error: 'No hemos podido cargar el presupuesto. Inténtalo de nuevo.' },
      { status: 500 },
    );
  }
}
