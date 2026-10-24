'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function FeedbackDialog({ user }: { user?: any }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('Feedback').insert({
      id: crypto.randomUUID(),
      userId: user?.id || null,
      email: user?.email || null,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    });

    if (error) {
      toast.error('No se pudo enviar el feedback. Intentá de nuevo.');
    } else {
      toast.success('¡Gracias! Tu comentario nos ayuda a mejorar.');
      setMessage('');
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Enviar feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Tenés una idea o sugerencia?</DialogTitle>
          <DialogDescription>
            Contanos qué te gustaría ver en PresuPro. Leemos todos los comentarios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Ej: Me gustaría poder duplicar los datos de un cliente..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar comentario'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}