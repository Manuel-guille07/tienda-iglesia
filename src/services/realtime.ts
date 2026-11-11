import { supabase } from '../lib/supabase';
import { fromRawMaterialSnake, fromSaleSnake } from './db';
import { RawMaterial, Sale } from '../types';

export interface RealtimeCallbacks {
  onRawMaterialChange?: (material: RawMaterial, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  onSaleChange?: (sale: Partial<Sale>, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

let activeChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Suscribe la aplicación a los eventos en tiempo real de Supabase (postgres_changes)
 * para mantener sincronizadas las tablas de raw_materials y sales.
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
    .channel('elarx-pos-realtime')
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'raw_materials' },
      (payload: any) => {
        if (!callbacks.onRawMaterialChange) return;

        if (payload.eventType === 'DELETE') {
          const id = payload.old ? String(payload.old.id) : '';
          callbacks.onRawMaterialChange({ id } as RawMaterial, 'DELETE');
        } else if (payload.new) {
          const mapped = fromRawMaterialSnake(payload.new);
          callbacks.onRawMaterialChange(mapped, payload.eventType as 'INSERT' | 'UPDATE');
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
    .subscribe();

  activeChannel = channel;

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
