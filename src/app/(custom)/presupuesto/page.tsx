// @polsia:user-owned — quote creation page.

import type { Metadata } from 'next';
import { QuoteBuilder } from '@/components/custom/quote-builder';

export const metadata: Metadata = {
  title: 'Crear presupuesto',
  description: 'Crea un presupuesto profesional con totales automáticos en pocos minutos.',
  alternates: { canonical: '/presupuesto' },
};

export default function PresupuestoPage() {
  return <QuoteBuilder />;
}
