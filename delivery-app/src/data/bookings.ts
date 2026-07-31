import { useSyncExternalStore } from 'react';
import { Booking, ServiceProvider } from '@/types';

// --- Helpers de tempo ---
export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function parseHHMM(s: string) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
export function fmtHHMM(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
export function generateSlots(avail: { from: string; to: string; slotDurationMin?: number }) {
  const dur = avail.slotDurationMin || 30;
  const start = parseHHMM(avail.from);
  const end = parseHHMM(avail.to);
  const out: string[] = [];
  for (let m = start; m + dur <= end; m += dur) out.push(fmtHHMM(m));
  return out;
}

// --- Store em memória ---
let bookings: Booking[] = [
  {
    id: 'bk-seed-1',
    providerId: 'p1',
    clientName: 'Marina Costa',
    clientPhone: '(11) 98877-1234',
    service: 'Poda de árvores e manutenção de jardim',
    address: 'Rua das Acácias, 120 — Vila Madalena',
    date: ymd(addDays(new Date(), 1)),
    slot: '10:00',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    note: 'Portão azul, tocar interfone 12.',
  },
  {
    id: 'bk-seed-2',
    providerId: 'p1',
    clientName: 'Rafael Souza',
    clientPhone: '(11) 99123-4567',
    service: 'Paisagismo — projeto para varanda',
    address: 'Av. Rebouças, 3400, ap. 82',
    date: ymd(new Date()),
    slot: '14:30',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600e3).toISOString(),
    note: 'Preciso de orçamento antes de confirmar.',
  },
  {
    id: 'bk-seed-3',
    providerId: 'p1',
    clientName: 'Juliana Prado',
    clientPhone: '(11) 97654-3210',
    service: 'Corte de grama',
    address: 'Rua dos Ipês, 55 — Perdizes',
    date: ymd(new Date()),
    slot: '09:00',
    status: 'pending',
    createdAt: new Date(Date.now() - 7200e3).toISOString(),
  },
  {
    id: 'bk-seed-4',
    providerId: 'p1',
    clientName: 'Carlos Andrade',
    clientPhone: '(11) 98765-0011',
    service: 'Manutenção mensal de jardim',
    address: 'Rua Harmonia, 88',
    date: ymd(addDays(new Date(), -2)),
    slot: '11:00',
    status: 'done',
    createdAt: new Date(Date.now() - 3 * 86400e3).toISOString(),
  },
  {
    id: 'bk-seed-5',
    providerId: 'p1',
    clientName: 'Beatriz Lima',
    clientPhone: '(11) 91234-5678',
    service: 'Plantio de mudas',
    address: 'Rua Cardeal Arcoverde, 900',
    date: ymd(addDays(new Date(), -1)),
    slot: '16:00',
    status: 'cancelled',
    createdAt: new Date(Date.now() - 2 * 86400e3).toISOString(),
    note: 'Cliente remarcou.',
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function getBookings(): Booking[] {
  return bookings;
}
export function getProviderBookings(providerId: string): Booking[] {
  return bookings.filter(b => b.providerId === providerId);
}
export function addBooking(b: Omit<Booking, 'id' | 'createdAt' | 'status'> & { status?: Booking['status'] }): Booking {
  const created: Booking = {
    ...b,
    status: b.status || 'confirmed',
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  bookings = [...bookings, created];
  emit();
  return created;
}
export function setBookingStatus(id: string, status: Booking['status']) {
  bookings = bookings.map(b => (b.id === id ? { ...b, status } : b));
  emit();
}
export function removeBooking(id: string) {
  bookings = bookings.filter(b => b.id !== id);
  emit();
}

export function useBookings(): Booking[] {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => bookings,
    () => bookings,
  );
}

// --- Google busy (mock determinístico por prestador) ---
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface BusyBlock {
  date: string;
  slot: string;
  source: 'google';
  label: string;
}

export function getGoogleBusy(provider: ServiceProvider, days = 14): BusyBlock[] {
  if (!provider.externalCalendar?.connected) return [];
  const slots = generateSlots(provider.availability);
  if (slots.length === 0) return [];
  const out: BusyBlock[] = [];
  const today = new Date();
  for (let d = 0; d < days; d++) {
    const day = addDays(today, d);
    if (!provider.availability.days.includes(day.getDay())) continue;
    const seed = hash(provider.id + ':' + d);
    out.push({ date: ymd(day), slot: slots[seed % slots.length], source: 'google', label: 'Ocupado (Google)' });
    if (slots.length > 4 && seed % 3 === 0) {
      out.push({ date: ymd(day), slot: slots[(seed + 3) % slots.length], source: 'google', label: 'Reunião (Google)' });
    }
  }
  return out;
}

export function nextAvailableSlot(provider: ServiceProvider, days = 7): { date: string; slot: string; isToday: boolean } | null {
  const slots = generateSlots(provider.availability);
  if (slots.length === 0 || provider.availability.onDemand) return null;
  const busy = new Set(getGoogleBusy(provider, days).map(b => `${b.date}|${b.slot}`));
  const booked = new Set(
    getProviderBookings(provider.id)
      .filter(b => b.status !== 'cancelled')
      .map(b => `${b.date}|${b.slot}`),
  );
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let d = 0; d < days; d++) {
    const day = addDays(now, d);
    if (!provider.availability.days.includes(day.getDay())) continue;
    const date = ymd(day);
    for (const s of slots) {
      if (d === 0 && parseHHMM(s) <= nowMin) continue;
      const key = `${date}|${s}`;
      if (busy.has(key) || booked.has(key)) continue;
      return { date, slot: s, isToday: d === 0 };
    }
  }
  return null;
}
