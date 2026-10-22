// @polsia:user-owned — saved quote view shell.

import type { Metadata } from 'next';
import { QuoteView } from '@/components/custom/quote-view';

export const metadata: Metadata = {
  title: 'Presupuesto generado',
  description: 'Consulta y descarga tu presupuesto profesional de PresuPro.',
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteView id={id} />;
}
