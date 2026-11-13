import { supabase } from '../lib/supabase';
import { fromRawMaterialSnake, fromSaleSnake } from './db';
import { RawMaterial, Sale } from '../types';

export interface RealtimeCallbacks {
  onRawMaterialChange?: (material: RawMaterial, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  onSaleChange?: (sale: Partial<Sale>, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  onTabChange?: () => void;
  onProfileChange?: () => void;
  onCloseoutChange?: (payload?: any) => void;
}

let activeChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Suscribe la aplicación a los eventos en tiempo real de Supabase (postgres_changes)
 * en el canal 'elarx-realtime-sync' para sincronizar múltiples dispositivos sin recargar (F5):
 * - raw_materials (inventario / productos)
 * - sales (ventas POS)
 * - tabs y tab_payments (fiados y abonos)
 * - profiles (usuarios y roles)
 * - closeouts y audit_logs (cierres e incidencias)
 */
export function setupRealtimeSync(callbacks: RealtimeCallbacks) {
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {
      // ignore
    }
  }

  const channel = supabase
    .channel('elarx-realtime-sync')
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'raw_materials' },
      (payload: any) => {
        if (!callbacks.onRawMaterialChange) return;

        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id ? String(payload.old.id) : '';
          callbacks.onRawMaterialChange({ id } as RawMaterial, 'DELETE');
        } else if (payload.new) {
          const mapped = fromRawMaterialSnake(payload.new);
          const ev = (payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE') as 'INSERT' | 'UPDATE';
          callbacks.onRawMaterialChange(mapped, ev);
        }
      }
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'sales' },
      (payload: any) => {
        if (!callbacks.onSaleChange) return;

        if (payload.eventType === 'DELETE') {
          const id = payload.old ? String(payload.old.id) : '';
          callbacks.onSaleChange({ id }, 'DELETE');
        } else if (payload.new) {
          const mapped = fromSaleSnake(payload.new);
          callbacks.onSaleChange(mapped, payload.eventType as 'INSERT' | 'UPDATE');
        }
      }
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'tabs' },
      () => {
        callbacks.onTabChange?.();
      }
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'tab_payments' },
      () => {
        callbacks.onTabChange?.();
      }
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'profiles' },
      () => {
        callbacks.onProfileChange?.();
      }
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'closeouts' },
      (payload: any) => {
        callbacks.onCloseoutChange?.(payload);
      }
    )
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'audit_logs' },
      () => {
        callbacks.onCloseoutChange?.();
      }
    )
    .subscribe();

  activeChannel = channel;

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
