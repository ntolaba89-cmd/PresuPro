// @polsia:user-owned — global navigation rendered from src/lib/nav.ts.

'use client';

import { ChevronDown, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { type NavGroup, type NavItem, navItems } from '@/lib/nav';
import { siteName } from '@/lib/site';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';
import { FeedbackDialog } from '@/components/custom/feedback-dialog';

function useIsAuthenticated(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  return isAuthenticated;
}

function visibleItems(group: NavGroup, isAuthenticated: boolean): NavItem[] {
  return navItems
    .filter((item) => item.group === group && (!item.requiresAuth || isAuthenticated))
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.label.localeCompare(b.label),
    );
}

const MAX_PRIMARY_SLOTS = 5;

type NavSlot =
  | { readonly type: 'link'; readonly item: NavItem }
  | { readonly type: 'menu'; readonly label: string; readonly items: readonly NavItem[] };

const itemOrder = (i: NavItem) => i.order ?? Number.MAX_SAFE_INTEGER;
const slotOrder = (s: NavSlot) =>
  s.type === 'link' ? itemOrder(s.item) : Math.min(...s.items.map(itemOrder));
const slotLabel = (s: NavSlot) => (s.type === 'link' ? s.item.label : s.label);

function buildPrimarySlots(items: readonly NavItem[]): NavSlot[] {
  const links: NavSlot[] = [];
  const menus = new Map<string, NavItem[]>();
  for (const item of items) {
    if (item.menu) {
      const bucket = menus.get(item.menu);
      if (bucket) bucket.push(item);
      else menus.set(item.menu, [item]);
    } else {
      links.push({ type: 'link', item });
    }
  }
  const menuSlots: NavSlot[] = [...menus].map(([label, its]) => ({
    type: 'menu',
    label,
    items: [...its].sort((a, b) => itemOrder(a) - itemOrder(b) || a.label.localeCompare(b.label)),
  }));
  return [...links, ...menuSlots].sort(
    (a, b) => slotOrder(a) - slotOrder(b) || slotLabel(a).localeCompare(slotLabel(b)),
  );
}

function splitPrimarySlots(slots: NavSlot[]): { inline: NavSlot[]; overflow: NavSlot[] } {
  if (slots.length <= MAX_PRIMARY_SLOTS) return { inline: slots, overflow: [] };
  return {
    inline: slots.slice(0, MAX_PRIMARY_SLOTS - 1),
    overflow: slots.slice(MAX_PRIMARY_SLOTS - 1),
  };
}

export function SiteNav() {
  const isAuthenticated = useIsAuthenticated();
  const primary = visibleItems('primary', isAuthenticated).filter((item) => item.href !== '/');
  const secondary = visibleItems('secondary', isAuthenticated);

  const slots = buildPrimarySlots(primary);
  const { inline, overflow } = splitPrimarySlots(slots);
  const collapsedCount = primary.length + secondary.length;

  const [open, setOpen] = React.useState(false);

  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  const isSlotActive = (slot: NavSlot) =>
    slot.type === 'link' ? isActive(slot.item.href) : slot.items.some((i) => isActive(i.href));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-screen-xl items-center gap-2 px-4"
      >
        <Link href="/" className="mr-2 shrink-0 truncate text-base font-semibold tracking-tight">
          {siteName}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {inline.map((slot) =>
            slot.type === 'link' ? (
              <Button
                key={slot.item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(isActive(slot.item.href) && 'bg-accent text-accent-foreground')}
              >
                <Link
                  href={slot.item.href}
                  aria-current={isActive(slot.item.href) ? 'page' : undefined}
                >
                  {slot.item.label}
                </Link>
              </Button>
            ) : (
              <DropdownMenu key={`menu:${slot.label}`}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(isSlotActive(slot) && 'bg-accent text-accent-foreground')}
                  >
                    {slot.label}
                    <ChevronDown className="ml-1 size-4 opacity-60" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {slot.items.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          )}

          {overflow.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(overflow.some(isSlotActive) && 'bg-accent text-accent-foreground')}
                >
                  More
                  <ChevronDown className="ml-1 size-4 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflow.map((slot, index) => {
                  const fenced =
                    index > 0 && (slot.type === 'menu' || overflow[index - 1]?.type === 'menu');
                  return (
                    <React.Fragment
                      key={slot.type === 'link' ? slot.item.href : `menu:${slot.label}`}
                    >
                      {fenced && <DropdownMenuSeparator />}
                      {slot.type === 'link' ? (
                        <DropdownMenuItem asChild>
                          <Link
                            href={slot.item.href}
                            aria-current={isActive(slot.item.href) ? 'page' : undefined}
                          >
                            {slot.item.label}
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>{slot.label}</DropdownMenuLabel>
                          {slot.items.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link
                                href={item.href}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                              >
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      )}
                    </React.Fragment>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <Button asChild variant="secondary" size="sm">
              <Link href="/presupuesto">Crear presupuesto</Link>
            </Button>
            {isAuthenticated && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/mis-presupuestos">Mis presupuestos</Link>
              </Button>
            )}
            {isAuthenticated ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
              >
                Cerrar sesión
              </Button>
            ) : (
              <Button asChild variant="secondary" size="sm">
                <Link href="/login">Ingresar</Link>
              </Button>
            )}
          </div>

          <ThemeToggle />

          {collapsedCount > 0 && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" aria-describedby={undefined} className="flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-left">{siteName}</SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1 overflow-y-auto">
                  {slots.map((slot) =>
                    slot.type === 'link' ? (
                      <Button
                        key={slot.item.href}
                        asChild
                        variant="ghost"
                        className={cn(
                          'w-full justify-start',
                          isActive(slot.item.href) && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <Link
                          href={slot.item.href}
                          aria-current={isActive(slot.item.href) ? 'page' : undefined}
                          onClick={() => setOpen(false)}
                        >
                          {slot.item.label}
                        </Link>
                      </Button>
                    ) : (
                      <div key={`menu:${slot.label}`} className="flex flex-col gap-1">
                        <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">
                          {slot.label}
                        </p>
                        {slot.items.map((item) => (
                          <Button
                            key={item.href}
                            asChild
                            variant="ghost"
                            className={cn(
                              'w-full justify-start pl-6',
                              isActive(item.href) && 'bg-accent text-accent-foreground',
                            )}
                          >
                            <Link
                              href={item.href}
                              aria-current={isActive(item.href) ? 'page' : undefined}
                              onClick={() => setOpen(false)}
                            >
                              {item.label}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    ),
                  )}
                  <div className="mt-2 flex flex-col gap-1 border-t border-border pt-4">
                    <Button asChild variant="secondary" className="w-full justify-start">
                      <Link href="/presupuesto" onClick={() => setOpen(false)}>
                        Crear presupuesto
                      </Link>
                    </Button>
                    {isAuthenticated && (
                      <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/mis-presupuestos" onClick={() => setOpen(false)}>
                          Mis presupuestos
                        </Link>
                      </Button>
                    )}
                    {isAuthenticated ? (
                      <Button
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase.auth.signOut();
                          window.location.reload();
                        }}
                      >
                        Cerrar sesión
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" className="w-full justify-start">
                        <Link href="/login" onClick={() => setOpen(false)}>
                          Ingresar
                        </Link>
                      </Button>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const isAuthenticated = useIsAuthenticated();
  const footer = visibleItems('footer', isAuthenticated);
  if (footer.length === 0) return null;
  

  return (
    <footer className="border-t border-border">
      <nav
        aria-label="Footer"
        className="mx-auto flex max-w-screen-xl flex-wrap items-center gap-1 px-4 py-6 text-sm"
      >
                {footer.map((item) => (
          <Button key={item.href} asChild variant="link" size="sm">
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
        
        {/* --- BOTÓN DE FEEDBACK --- */}
        <FeedbackDialog />
        {/* --- FIN BOTÓN DE FEEDBACK --- */}
      </nav>
    </footer>
  );
}