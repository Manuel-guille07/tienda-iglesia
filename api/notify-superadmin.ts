import nodemailer from 'nodemailer';

interface IncomingRequest {
  method?: string;
  body?: unknown;
}

interface OutgoingResponse {
  status: (code: number) => OutgoingResponse;
  json: (payload: Record<string, unknown>) => void;
  setHeader?: (name: string, value: string) => void;
}

interface NotifyPayload {
  productName?: string;
  category?: string;
  price?: number;
  createdBy?: string;
  createdByRole?: string;
  action?: 'created' | 'updated';
  createdAt?: string;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatEuro(price?: number): string {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 'Sin precio';
  return `${price.toFixed(2).replace('.', ',')} €`;
}

export default async function handler(req: IncomingRequest, res: OutgoingResponse) {
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const superadminEmail = process.env.SUPERADMIN_EMAIL?.trim();

  // Si aún no están configuradas las credenciales SMTP, responder silenciosamente sin fallo
  if (!gmailUser || !gmailPass || !superadminEmail) {
    return res.status(200).json({
      ok: false,
      skipped: true,
      reason: 'Gmail SMTP environment variables are not configured',
    });
  }

  let payload: NotifyPayload = {};
  try {
    payload =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as NotifyPayload)
        : ((req.body || {}) as NotifyPayload);
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
  }

  const productName = String(payload.productName || '').trim();
  if (!productName) {
    return res.status(400).json({ ok: false, error: 'Missing productName' });
  }

  const category = String(payload.category || 'Cafetería').trim();
  const createdBy = String(payload.createdBy || 'Usuario POS').trim();
  const createdByRole = String(payload.createdByRole || '').trim();
  const actionLabel = payload.action === 'updated' ? 'actualizado' : 'creado';
  const priceLabel = formatEuro(payload.price);
  const dateObj = payload.createdAt ? new Date(payload.createdAt) : new Date();
  const dateLabel = isNaN(dateObj.getTime())
    ? new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    : dateObj.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  const subject = `[El Chiringuito] Producto sin imagen 3D: ${productName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#EFECE6; padding:24px; color:#141210;">
      <div style="max-width:520px; margin:0 auto; background:#FAF8F5; border:1px solid #E2DDD5; border-radius:20px; padding:24px;">
        <p style="margin:0 0 6px; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#675F57; font-weight:600;">
          El Chiringuito · Catálogo Maestro 3D
        </p>
        <h2 style="margin:0 0 12px; font-size:20px; font-weight:600; color:#141210;">
          Producto pendiente de imagen 3D
        </h2>
        <p style="margin:0 0 18px; font-size:14px; line-height:1.5; color:#4A433D;">
          Se ha ${escapeHtml(actionLabel)} un producto vendible sin foto PNG/WebP transparente asignada. Puedes preparar su imagen 3D y guardarla en el Catálogo Predefinido.
        </p>

        <table style="width:100%; border-collapse:collapse; background:#F2EFE9; border-radius:12px; overflow:hidden; font-size:13px;">
          <tr>
            <td style="padding:10px 14px; color:#675F57; border-bottom:1px solid #E2DDD5;">Producto</td>
            <td style="padding:10px 14px; font-weight:600; text-align:right; border-bottom:1px solid #E2DDD5;">${escapeHtml(productName)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; color:#675F57; border-bottom:1px solid #E2DDD5;">Categoría</td>
            <td style="padding:10px 14px; font-weight:600; text-align:right; border-bottom:1px solid #E2DDD5;">${escapeHtml(category)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; color:#675F57; border-bottom:1px solid #E2DDD5;">Precio de venta</td>
            <td style="padding:10px 14px; font-weight:600; text-align:right; border-bottom:1px solid #E2DDD5;">${escapeHtml(priceLabel)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; color:#675F57; border-bottom:1px solid #E2DDD5;">Registrado por</td>
            <td style="padding:10px 14px; font-weight:600; text-align:right; border-bottom:1px solid #E2DDD5;">${escapeHtml(createdBy)}${createdByRole ? ` (${escapeHtml(createdByRole)})` : ''}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; color:#675F57;">Fecha</td>
            <td style="padding:10px 14px; font-weight:600; text-align:right;">${escapeHtml(dateLabel)}</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `"El Chiringuito POS" <${gmailUser}>`,
      to: superadminEmail,
      subject,
      text: `Producto sin imagen 3D (${actionLabel}): ${productName} | Categoría: ${category} | Precio: ${priceLabel} | Usuario: ${createdBy} | Fecha: ${dateLabel}`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/notify-superadmin] Error enviando correo:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send notification email' });
  }
}
