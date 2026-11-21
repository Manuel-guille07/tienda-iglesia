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

const ES_NUMBER_FORMATTER = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ES_INT_FORMATTER = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

export interface FormatCurrencyOptions {
  /** Muestra el signo '+' explícito para importes positivos */
  showSign?: boolean;
  /** Incluye el símbolo '€' (por defecto true) */
  withSymbol?: boolean;
}

/**
 * Formateador único de moneda en formato español con espacio duro ('0,00 €').
 * Evita '-0,00 €' y garantiza homogeneidad visual con tabular-nums en todo el TPV.
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const { showSign = false, withSymbol = true } = options;
  const safe = roundMoney(amount);
  const normalized = Object.is(safe, -0) || safe === 0 ? 0 : safe;
  const sign = normalized < 0 ? '-' : showSign && normalized > 0 ? '+' : '';
  const formatted = ES_NUMBER_FORMATTER.format(Math.abs(normalized));
  return withSymbol ? `${sign}${formatted}\u00A0€` : `${sign}${formatted}`;
}

export interface CurrencyParts {
  sign: string;
  integer: string;
  decimal: string;
  symbol: string;
  full: string;
}

/**
 * Separa un importe en partes ('12', ',50', '€') para renderizar jerarquía
 * tipográfica editorial (entero protagonista, decimales y símbolo sutiles).
 */
export function formatCurrencyParts(
  amount: number,
  options: Pick<FormatCurrencyOptions, 'showSign'> = {}
): CurrencyParts {
  const { showSign = false } = options;
  const safe = roundMoney(amount);
  const normalized = Object.is(safe, -0) || safe === 0 ? 0 : safe;
  const sign = normalized < 0 ? '-' : showSign && normalized > 0 ? '+' : '';
  const formatted = ES_NUMBER_FORMATTER.format(Math.abs(normalized));
  const [integer, decimals = '00'] = formatted.split(',');
  return {
    sign,
    integer,
    decimal: `,${decimals}`,
    symbol: '€',
    full: `${sign}${formatted}\u00A0€`,
  };
}

/**
 * Formatea contadores enteros en español ('0', '14', '1.250').
 */
export function formatInteger(value: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
    return '0';
  }
  return ES_INT_FORMATTER.format(Math.round(value));
}
