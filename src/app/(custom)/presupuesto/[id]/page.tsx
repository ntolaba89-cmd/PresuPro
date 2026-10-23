import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { QuoteView } from '@/components/custom/quote-view';

export default async function QuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // <-- Acá desenvolvemos la promesa
  
  const quote = await prisma.quote.findUnique({
    where: { id: id }, // <-- Usamos el id ya obtenido
    include: { items: true },
  });

  if (!quote) {
    notFound();
  }

  return <QuoteView id={id} />; // <-- O el componente que corresponda
}