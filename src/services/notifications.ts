export interface MissingProductImagePayload {
  productName: string;
  category: string;
  price?: number;
  createdBy: string;
  createdByRole?: string;
  action: 'created' | 'updated';
  createdAt?: string;
}

/**
 * Dispara una notificación en segundo plano (fire-and-forget) al superadmin vía Vercel Function
 * cuando se guarda un producto sin imagen 3D asignada.
 * Nunca bloquea ni muestra errores al usuario si SMTP aún no está configurado.
 */
export function notifySuperadminMissingProductImage(
  payload: MissingProductImagePayload
): void {
  if (typeof fetch === 'undefined') return;

  const body = JSON.stringify({
    ...payload,
    createdAt: payload.createdAt || new Date().toISOString(),
  });

  fetch('/api/notify-superadmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Silencioso por diseño (entorno local sin Vercel Functions o SMTP no configurado)
  });
}
