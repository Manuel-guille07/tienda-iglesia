/**
 * Utilidades deterministas de aritmética monetaria y validación estricta de entradas.
 * Evita errores de coma flotante (0.1 + 0.2 !== 0.3), NaN, Infinity, negativos y
 * el truncado silencioso de comas decimales europeas (ej. "5,50" -> 5 en parseFloat).
 */

export function toCents(amount: number): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || Number.isNaN(amount)) {
    return 0;
  }
  return Math.round((amount + Number.EPSILON) * 100);
}

export function roundMoney(amount: number): number {
  return Math.round((toCents(amount) / 100) * 100) / 100;
}

export function fromCents(cents: number): number {
  if (typeof cents !== 'number' || !Number.isFinite(cents) || Number.isNaN(cents)) {
    return 0;
  }
  return Math.round(cents) / 100;
}

export function isValidPositiveMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value) && value > 0;
}

export function isValidNonNegativeMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value) && value >= 0;
}

/**
 * Parsea texto numérico aceptando tanto '.' como ',' decimal (teclados europeos/móviles).
 * Rechaza signos negativos, notación científica ('e'), NaN, Infinity o múltiples separadores.
 * Devuelve null si el campo está vacío o en edición parcial inválida, o el número saneado.
 */
export function parseMoneyInput(raw: string | number): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || Number.isNaN(raw) || raw < 0) return null;
    return roundMoney(raw);
  }

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Normalizar coma europea a punto decimal
  const normalized = trimmed.replace(',', '.');

  // Solo dígitos positivos y como máximo un punto decimal (sin '-', '+', 'e', letras)
  if (!/^\d*(\.\d*)?$/.test(normalized) || normalized === '.') {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return roundMoney(parsed);
}
