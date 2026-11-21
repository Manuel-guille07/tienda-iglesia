import { ShiftClose } from '../types';
import { roundMoney } from '../utils/finance';

export interface GoogleSheetsCloseoutPayload {
  fecha: string;
  horaCierre: string;
  responsable: string;
  efectivo: number;
  tarjetaBizum: number;
  abonosFiados: number;
  fiadosNuevos: number;
  descuadre: number;
  notas: string;
}

export interface GoogleSheetsSyncResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

const SHEETS_TIMEOUT_MS = 15000;

function getWebhookUrl(): string {
  const raw = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : '';
  } catch {
    return '';
  }
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(getWebhookUrl());
}

function formatDateParts(timestamp?: string): { fecha: string; horaCierre: string } {
  const parsed = timestamp ? new Date(timestamp) : new Date();
  const date = isNaN(parsed.getTime()) ? new Date() : parsed;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    fecha: `${day}/${month}/${year}`,
    horaCierre: `${hours}:${minutes}`,
  };
}

export function buildCloseoutSheetsPayload(closeout: ShiftClose): GoogleSheetsCloseoutPayload {
  const { fecha, horaCierre } = formatDateParts(closeout.timestamp);
  const abonosFiados =
    closeout.totalTabPayments ??
    Number(closeout.tabPaymentsCash ?? 0) + Number(closeout.tabPaymentsCard ?? 0);

  return {
    fecha,
    horaCierre,
    responsable: String(closeout.closedBy || 'Usuario').trim(),
    efectivo: roundMoney(Number(closeout.actualCash ?? closeout.expectedCash ?? 0)),
    tarjetaBizum: roundMoney(Number(closeout.totalCard ?? 0)),
    abonosFiados: roundMoney(Number(abonosFiados || 0)),
    fiadosNuevos: roundMoney(Number(closeout.totalFiados ?? 0)),
    descuadre: roundMoney(Number(closeout.difference ?? 0)),
    notas: String(closeout.notes ?? '').trim(),
  };
}

/**
 * Envía el resumen de un cierre de caja al webhook de Google Apps Script.
 * Usa mode: 'no-cors' y Content-Type 'text/plain;charset=utf-8' para evitar bloqueos CORS.
 * Al devolver una respuesta opaca (type === 'opaque', status === 0), si fetch completa
 * sin lanzar excepción de red se considera enviado correctamente.
 */
export async function syncCloseoutToSheets(
  payload: GoogleSheetsCloseoutPayload
): Promise<GoogleSheetsSyncResult> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return { success: false, skipped: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHEETS_TIMEOUT_MS);

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    return { success: true };
  } catch (err: any) {
    const errMsg =
      err?.name === 'AbortError'
        ? 'Tiempo de espera agotado al conectar con Google Sheets'
        : err?.message || 'Error de red al sincronizar con Google Sheets';
    console.warn('[GoogleSheets] Error enviando cierre al webhook:', errMsg);
    return { success: false, error: errMsg };
  } finally {
    clearTimeout(timeoutId);
  }
}
