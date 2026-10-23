// @polsia:user-owned — quote creation page.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { QuoteBuilder } from '@/components/custom/quote-builder';

export const metadata: Metadata = {
  title: 'Crear presupuesto',
  description: 'Crea un presupuesto profesional con totales automáticos en pocos minutos.',
  alternates: { canonical: '/presupuesto' },
};

export default async function PresupuestoPage() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return <QuoteBuilder user={session.user} />;
}