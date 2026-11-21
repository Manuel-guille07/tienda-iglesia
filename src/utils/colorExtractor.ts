/**
 * Utilidad de procesamiento ligero de imágenes 3D (PNG/WebP transparente)
 * y extracción automática de color dominante equilibrado para Quiet Luxury.
 */

export interface ProcessedProductImage {
  dataUrl: string;
  dominantColor: string | null;
  width: number;
  height: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h >= 0 && h < 60) {
    rn = c;
    gn = x;
  } else if (h >= 60 && h < 120) {
    rn = x;
    gn = c;
  } else if (h >= 120 && h < 180) {
    gn = c;
    bn = x;
  } else if (h >= 180 && h < 240) {
    gn = x;
    bn = c;
  } else if (h >= 240 && h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(rn)}${toHex(gn)}${toHex(bn)}`.toUpperCase();
}

/**
 * Calibra un RGB extraído a un tono mineral equilibrado y legible en claro y oscuro.
 */
function calibrateToQuietLuxuryHex(r: number, g: number, b: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);
  const balancedS = s < 14 ? Math.max(12, s) : Math.max(30, Math.min(66, s * 0.85));
  const balancedL = Math.max(34, Math.min(54, l));
  return hslToHex(h, balancedS, balancedL);
}

/**
 * Analiza píxeles no transparentes ni blancos puros en un canvas y devuelve el color dominante HEX.
 */
export function extractDominantColorFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return null;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const buckets = new Map<
    string,
    { rSum: number; gSum: number; bSum: number; weight: number; count: number }
  >();

  let fallbackR = 0;
  let fallbackG = 0;
  let fallbackB = 0;
  let fallbackCount = 0;

  // Muestreo eficiente cada 2 píxeles para mantener <5ms incluso en móvil
  const step = width * height > 20000 ? 8 : 4;

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignorar píxeles transparentes o casi transparentes
    if (a < 48) continue;

    // Ignorar blancos / casi blancos
    const isNearWhite = r > 235 && g > 235 && b > 235;
    if (isNearWhite) continue;

    fallbackR += r;
    fallbackG += g;
    fallbackB += b;
    fallbackCount += 1;

    // Ignorar negros absolutos sin matiz para priorizar el color real del objeto
    const isNearBlack = r < 22 && g < 22 && b < 22;
    if (isNearBlack) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = (max - min) / 255;

    // Cuantización en cubos de 24 niveles por canal
    const qr = Math.floor(r / 24);
    const qg = Math.floor(g / 24);
    const qb = Math.floor(b / 24);
    const key = `${qr}-${qg}-${qb}`;

    // Dar ligeramente más peso a píxeles con croma perceptible y opacidad completa
    const weight = (0.35 + chroma * 1.8) * (a / 255);
    const entry = buckets.get(key);
    if (entry) {
      entry.rSum += r * weight;
      entry.gSum += g * weight;
      entry.bSum += b * weight;
      entry.weight += weight;
      entry.count += 1;
    } else {
      buckets.set(key, {
        rSum: r * weight,
        gSum: g * weight,
        bSum: b * weight,
        weight,
        count: 1,
      });
    }
  }

  let best: { rSum: number; gSum: number; bSum: number; weight: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) {
      best = bucket;
    }
  }

  if (best && best.weight > 0) {
    const avgR = best.rSum / best.weight;
    const avgG = best.gSum / best.weight;
    const avgB = best.bSum / best.weight;
    return calibrateToQuietLuxuryHex(avgR, avgG, avgB);
  }

  if (fallbackCount > 0) {
    return calibrateToQuietLuxuryHex(
      fallbackR / fallbackCount,
      fallbackG / fallbackCount,
      fallbackB / fallbackCount
    );
  }

  return null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada'));
    img.src = src;
  });
}

/**
 * Redimensiona y comprime una imagen PNG/WebP transparente a WebP ligero (máx. 256 px)
 * y extrae automáticamente su color dominante calibrado.
 */
export async function processProductImageFile(
  file: File,
  maxDimension = 256
): Promise<ProcessedProductImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const naturalW = img.naturalWidth || img.width || maxDimension;
    const naturalH = img.naturalHeight || img.height || maxDimension;
    const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
    const targetW = Math.max(1, Math.round(naturalW * scale));
    const targetH = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('No se pudo inicializar el lienzo de imagen');
    }

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const dominantColor = extractDominantColorFromCanvas(canvas);

    // Exportar a WebP con transparencia; fallback seguro a PNG si el navegador no soporta WebP
    let dataUrl = canvas.toDataURL('image/webp', 0.84);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/png');
    }

    return {
      dataUrl,
      dominantColor,
      width: targetW,
      height: targetH,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Recalcula el color dominante desde una imagen ya guardada (data URL o URL).
 */
export async function extractDominantColorFromImageUrl(
  imageUrl: string
): Promise<string | null> {
  if (!imageUrl || !imageUrl.trim()) return null;
  try {
    const img = await loadImageElement(imageUrl);
    const size = 96;
    const scale = Math.min(1, size / Math.max(img.naturalWidth || size, img.naturalHeight || size));
    const w = Math.max(1, Math.round((img.naturalWidth || size) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || size) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return extractDominantColorFromCanvas(canvas);
  } catch {
    return null;
  }
}
