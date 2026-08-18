import { formatPrice } from './formatPrice';
import { BRAND_NAME } from './constants';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '—';
  const lines = [
    addr.name || addr.full_name,
    addr.address_line1,
    addr.address_line2,
    [addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
    addr.country || 'India',
    addr.phone ? `Phone: ${addr.phone}` : '',
  ].filter(Boolean);
  return lines.map(esc).join('<br>');
}

function money(amount) {
  return esc(formatPrice(amount ?? 0, 'INR', 2));
}

/**
 * Build a print-ready HTML invoice from GET /orders/{id}/invoice payload.
 */
export function buildOrderInvoiceHtml(order) {
  if (!order) return '';

  const orderNumber = esc(order.order_number || order.id);
  const date = order.created_at
    ? esc(new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))
    : '—';
  const status = esc(String(order.status || '').replace(/_/g, ' '));
  const paymentMethod = esc(order.payment_method || '—');
  const paymentStatus = esc(order.payment_status || '—');
  const shipping = order.shipping_address && typeof order.shipping_address === 'object'
    ? order.shipping_address
    : (() => {
        try {
          return JSON.parse(order.shipping_address || '{}');
        } catch {
          return {};
        }
      })();
  const billing = order.billing_address && typeof order.billing_address === 'object'
    ? order.billing_address
    : (() => {
        try {
          return JSON.parse(order.billing_address || '{}');
        } catch {
          return {};
        }
      })();

  const items = Array.isArray(order.items) ? order.items : [];
  const itemRows = items
    .map((item) => {
      const title = esc(item.product_name || item.name || 'Item');
      const meta = [item.color && `Color: ${item.color}`, item.size && `Size: ${item.size}`]
        .filter(Boolean)
        .map(esc)
        .join(' · ');
      const metaHtml = meta
        ? `<div style="font-size:12px;color:#888;margin-top:4px;">${meta}</div>`
        : '';
      const qty = Number(item.quantity) || 0;
      const line = money(item.total ?? Number(item.price || 0) * qty);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">${title}${metaHtml}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${line}</td>
      </tr>`;
    })
    .join('');

  const subtotal = money(order.subtotal);
  const discount = money(order.discount ?? order.discount_amount ?? 0);
  const shippingCharge = money(order.shipping_charge ?? order.shipping_amount ?? 0);
  const tax = money(order.tax ?? 0);
  const total = money(order.total ?? order.total_amount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${BRAND_NAME} Invoice — ${orderNumber}</title>
  <style>
    @media print {
      body { background: #fff !important; }
      .no-print { display: none !important; }
      .sheet { border: none !important; margin: 0 !important; box-shadow: none !important; }
    }
    body { margin: 0; padding: 24px; background: #f6f6f6; font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
    .sheet { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e8e8e8; }
    .actions { max-width: 720px; margin: 0 auto 16px; display: flex; gap: 8px; justify-content: flex-end; }
    .btn { appearance: none; border: 1px solid #111; background: #111; color: #fff; padding: 10px 16px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; }
    .btn-outline { background: #fff; color: #111; }
  </style>
</head>
<body>
  <div class="actions no-print">
    <button type="button" class="btn btn-outline" onclick="window.close()">Close</button>
    <button type="button" class="btn" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="sheet">
    <div style="padding:28px 28px 16px;border-bottom:2px solid #111;">
      <div style="font-size:22px;letter-spacing:0.18em;font-weight:700;">${esc(BRAND_NAME)}</div>
      <div style="margin-top:8px;font-size:14px;color:#666;">Tax invoice / order receipt</div>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;font-size:13px;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#666;">Invoice / Order</td><td style="padding:4px 0;text-align:right;font-weight:600;">#${orderNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Date</td><td style="padding:4px 0;text-align:right;">${date}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Status</td><td style="padding:4px 0;text-align:right;text-transform:capitalize;">${status}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Payment</td><td style="padding:4px 0;text-align:right;text-transform:capitalize;">${paymentMethod} · ${paymentStatus}</td></tr>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
        <div>
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;margin-bottom:8px;">Bill to</div>
          <div style="font-size:13px;color:#444;line-height:1.5;">${formatAddress(Object.keys(billing || {}).length ? billing : shipping)}</div>
        </div>
        <div>
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;margin-bottom:8px;">Ship to</div>
          <div style="font-size:13px;color:#444;line-height:1.5;">${formatAddress(shipping)}</div>
        </div>
      </div>

      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:1px solid #111;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Item</th>
            <th style="text-align:center;padding:8px 0;border-bottom:1px solid #111;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Qty</th>
            <th style="text-align:right;padding:8px 0;border-bottom:1px solid #111;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows || '<tr><td colspan="3" style="padding:12px 0;color:#888;">No items</td></tr>'}</tbody>
      </table>

      <table style="width:100%;font-size:13px;margin-top:12px;">
        <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="padding:4px 0;text-align:right;">${subtotal}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Discount</td><td style="padding:4px 0;text-align:right;">-${discount}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Shipping</td><td style="padding:4px 0;text-align:right;">${shippingCharge}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Tax</td><td style="padding:4px 0;text-align:right;">${tax}</td></tr>
        <tr><td style="padding:10px 0 0;font-weight:700;border-top:1px solid #111;">Total</td><td style="padding:10px 0 0;text-align:right;font-weight:700;border-top:1px solid #111;">${total}</td></tr>
      </table>
    </div>
    <div style="padding:16px 28px;background:#fafafa;font-size:12px;color:#888;">
      ${esc(BRAND_NAME)} · System-generated invoice. Use Print → Save as PDF to keep a copy.
    </div>
  </div>
</body>
</html>`;
}

/** Write invoice HTML into an already-opened window (must be opened in the click handler). */
export function writeInvoiceToWindow(win, order) {
  if (!win || win.closed) {
    throw new Error('Invoice window is not available.');
  }
  const html = buildOrderInvoiceHtml(order);
  win.document.open();
  win.document.write(html);
  win.document.close();
  try {
    win.focus();
  } catch {
    // ignore
  }
}

/**
 * Open a blank tab synchronously (call this inside the click handler, before await).
 * Returns null if the browser blocked it.
 */
export function openBlankInvoiceWindow() {
  try {
    return window.open('about:blank', '_blank');
  } catch {
    return null;
  }
}

/** Open invoice in a new window for Print / Save as PDF. Prefer openBlank + write after fetch. */
export function openInvoicePrintWindow(order) {
  const win = openBlankInvoiceWindow();
  if (!win) {
    downloadInvoiceHtmlFile(order);
    return { mode: 'download' };
  }
  writeInvoiceToWindow(win, order);
  return { mode: 'window' };
}

/** Download invoice as an .html file (no popup required). */
export function downloadInvoiceHtmlFile(order) {
  const html = buildOrderInvoiceHtml(order);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${BRAND_NAME}-Invoice-${order.order_number || order.id}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fetch-safe invoice delivery: pass a window opened in the click handler, or fall back to file download.
 * @returns {'window'|'download'}
 */
export function deliverInvoice(order, preOpenedWindow = null) {
  if (preOpenedWindow && !preOpenedWindow.closed) {
    writeInvoiceToWindow(preOpenedWindow, order);
    return 'window';
  }
  downloadInvoiceHtmlFile(order);
  return 'download';
}
