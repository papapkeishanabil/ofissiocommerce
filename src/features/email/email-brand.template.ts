// impeccable-disable overused-font -- Transactional email needs a web-safe Arial/Helvetica stack for Gmail and Outlook consistency.

type EmailStatusTone = "brand" | "success" | "warning" | "neutral";

interface EmailAction {
  label: string;
  href: string;
}

interface OfissioEmailLayoutInput {
  preheader: string;
  title: string;
  lead: string;
  statusLabel: string;
  statusTone?: EmailStatusTone;
  bodyHtml: string;
  primaryAction?: EmailAction;
  secondaryAction?: EmailAction;
  footerNote?: string;
}

interface EmailMetaItem {
  label: string;
  value: string;
}

interface EmailItemCardInput {
  title: string;
  subtitle?: string | null;
  quantity?: string | null;
  size?: string | null;
  customization?: string | null;
  customizationItems?: EmailCustomizationItem[];
  customizationTotal?: string | null;
  amount?: string | null;
}

interface EmailCustomizationItem {
  zone: string;
  technique: string;
  dimensions: string;
  rotation: string;
  fileName: string;
  notes?: string | null;
  priceFormula?: string | null;
  subtotal?: string | null;
}

interface EmailSummaryRow {
  label: string;
  value: string;
  muted?: boolean;
}

export function renderOfissioEmail(input: OfissioEmailLayoutInput) {
  const status = statusPalette(input.statusTone ?? "brand");
  const actions = renderActions(input.primaryAction, input.secondaryAction);

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      @media screen and (max-width: 640px) {
        .of-email-outer { padding: 16px 0 !important; }
        .of-email-shell { width: 100% !important; }
        .of-email-gutter { padding-left: 20px !important; padding-right: 20px !important; }
        .of-email-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
        .of-email-stack + .of-email-stack { padding-top: 12px !important; }
        .of-email-brand, .of-email-status { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: left !important; }
        .of-email-status { padding-top: 14px !important; }
        .of-email-amount { padding-top: 14px !important; text-align: left !important; }
        .of-email-cta { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef2f8;color:#172033;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
      ${escapeHtml(input.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef2f8;border-collapse:collapse;">
      <tr>
        <td class="of-email-outer" align="center" style="padding:28px 12px;">
          <table role="presentation" class="of-email-shell" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background:#ffffff;border-collapse:collapse;table-layout:fixed;box-shadow:0 14px 38px rgba(6,26,86,0.10);">
            <tr><td style="height:6px;background:#f6c900;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td class="of-email-gutter" style="padding:24px 34px;background:#ffffff;border-bottom:1px solid #e3e8f2;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td class="of-email-brand" style="vertical-align:middle;">
                      <div style="font-size:28px;line-height:30px;font-weight:800;letter-spacing:-0.8px;color:#061a56;">OFISSIO</div>
                      <div style="padding-top:4px;font-size:10px;line-height:14px;font-weight:700;letter-spacing:1.6px;color:#667085;">WORKWEAR &amp; UNIFORM</div>
                    </td>
                    <td class="of-email-status" align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;padding:7px 11px;border:1px solid ${status.border};background:${status.background};color:${status.color};font-size:10px;line-height:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">
                        ${escapeHtml(input.statusLabel)}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="of-email-gutter" style="padding:38px 34px 34px;background:#061a56;">
                <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:37px;font-weight:800;letter-spacing:-0.6px;">${escapeHtml(input.title)}</h1>
                <p style="margin:14px 0 0;color:#d7def0;font-size:15px;line-height:24px;">${escapeHtml(input.lead)}</p>
              </td>
            </tr>
            <tr>
              <td class="of-email-gutter" style="padding:32px 34px 10px;background:#ffffff;">
                ${input.bodyHtml}
              </td>
            </tr>
            ${actions}
            <tr>
              <td class="of-email-gutter" style="padding:24px 34px;background:#f7f9fc;border-top:1px solid #e3e8f2;">
                <p style="margin:0;color:#596579;font-size:12px;line-height:19px;">${escapeHtml(
                  input.footerNote ??
                    "Butuh bantuan? Balas email ini dan tim Ofissio akan membantu Anda.",
                )}</p>
              </td>
            </tr>
            <tr>
              <td class="of-email-gutter" style="padding:22px 34px;background:#020d35;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td class="of-email-stack" style="color:#ffffff;font-size:13px;line-height:19px;font-weight:700;">Ofissio Workwear &amp; Uniform</td>
                    <td class="of-email-stack" align="right" style="color:#aeb9d4;font-size:11px;line-height:18px;">Procurement workspace untuk kebutuhan seragam perusahaan</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#7a8598;font-size:11px;line-height:17px;">Email transaksional ini dikirim terkait aktivitas akun atau pesanan Anda di Ofissio.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailMetaTable(items: EmailMetaItem[]) {
  const rows: string[] = [];
  for (let index = 0; index < items.length; index += 2) {
    const left = items[index];
    const right = items[index + 1];
    if (!left) continue;
    rows.push(`
      <tr>
        ${renderMetaCell(left)}
        ${right ? renderMetaCell(right) : '<td class="of-email-stack" width="50%" style="width:50%;padding:0 0 14px;"></td>'}
      </tr>
    `);
  }
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;table-layout:fixed;background:#f5f7fb;border:1px solid #e1e7f0;">
      <tr><td colspan="2" style="height:5px;background:#f6c900;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td colspan="2" style="padding:20px 20px 6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;table-layout:fixed;">
            ${rows.join("")}
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function renderEmailSectionHeading(title: string, description?: string) {
  return `
    <div style="padding:28px 0 14px;">
      <h2 style="margin:0;color:#101828;font-size:18px;line-height:24px;font-weight:800;">${escapeHtml(title)}</h2>
      ${
        description
          ? `<p style="margin:6px 0 0;color:#667085;font-size:13px;line-height:20px;">${escapeHtml(description)}</p>`
          : ""
      }
    </div>
  `;
}

export function renderEmailItemCard(input: EmailItemCardInput) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;border-top:1px solid #dfe5ef;">
      <tr>
        <td style="padding:18px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td class="of-email-stack" style="vertical-align:top;padding-right:20px;">
                <div style="color:#101828;font-size:15px;line-height:21px;font-weight:800;">${escapeHtml(input.title)}</div>
                ${input.subtitle ? `<div style="padding-top:3px;color:#667085;font-size:12px;line-height:18px;">${escapeHtml(input.subtitle)}</div>` : ""}
                ${input.quantity ? renderItemLine("Jumlah", input.quantity) : ""}
                ${input.size ? renderItemLine("Ukuran", input.size) : ""}
              </td>
              ${
                input.amount
                  ? `<td class="of-email-stack of-email-amount" width="145" align="right" style="width:145px;vertical-align:top;color:#061a56;font-size:15px;line-height:21px;font-weight:800;white-space:nowrap;">${escapeHtml(input.amount)}</td>`
                  : ""
              }
            </tr>
          </table>
          ${renderEmailCustomization(input)}
        </td>
      </tr>
    </table>
  `;
}

function renderEmailCustomization(input: EmailItemCardInput) {
  const items = input.customizationItems ?? [];
  if (items.length === 0) {
    return input.customization
      ? renderItemLine("Bordir / customization", input.customization)
      : "";
  }

  const rows = items
    .map((item, index) => {
      const hasPricing = Boolean(item.priceFormula || item.subtotal);
      const divider = index === items.length - 1 ? "" : "border-bottom:1px solid #e3e8f2;";
      return `
        <tr>
          <td class="of-email-stack" ${hasPricing ? 'width="68%"' : 'colspan="2"'} style="${hasPricing ? "width:68%;" : ""}padding:14px 16px;vertical-align:top;${divider}">
            <div style="color:#061a56;font-size:13px;line-height:18px;font-weight:800;">${escapeHtml(item.zone)}</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:9px;border-collapse:collapse;table-layout:fixed;">
              <tr>
                ${renderCustomizationMetric("Teknik", item.technique)}
                ${renderCustomizationMetric("Ukuran", item.dimensions)}
                ${renderCustomizationMetric("Rotasi", item.rotation)}
              </tr>
            </table>
            <div style="padding-top:9px;color:#667085;font-size:11px;line-height:17px;overflow-wrap:anywhere;word-break:break-word;word-wrap:break-word;">
              <strong style="color:#475467;">File logo:</strong> ${escapeHtml(item.fileName)}
            </div>
            ${item.notes ? `<div style="padding-top:3px;color:#667085;font-size:11px;line-height:17px;"><strong style="color:#475467;">Catatan:</strong> ${escapeHtml(item.notes)}</div>` : ""}
          </td>
          ${
            hasPricing
              ? `<td class="of-email-stack of-email-amount" width="32%" style="width:32%;padding:14px 16px;vertical-align:top;background:#fbfcfe;${divider}">
                  <div style="color:#667085;font-size:10px;line-height:14px;font-weight:700;text-transform:uppercase;">Biaya bordir</div>
                  ${item.priceFormula ? `<div style="padding-top:5px;color:#475467;font-size:11px;line-height:17px;">${escapeHtml(item.priceFormula)}</div>` : ""}
                  ${item.subtotal ? `<div style="padding-top:5px;color:#061a56;font-size:13px;line-height:18px;font-weight:800;">${escapeHtml(item.subtotal)}</div>` : ""}
                </td>`
              : ""
          }
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:13px;border-collapse:collapse;background:#f5f7fb;border:1px solid #e1e7f0;">
      <tr>
        <td colspan="2" style="padding:10px 16px;background:#eef2f8;color:#344054;font-size:10px;line-height:14px;font-weight:800;text-transform:uppercase;">
          Bordir &amp; customization
        </td>
      </tr>
      ${rows}
      ${
        input.customizationTotal
          ? `<tr>
              <td style="padding:11px 16px;border-top:1px solid #d5ddea;color:#344054;font-size:12px;line-height:18px;font-weight:700;">Total bordir</td>
              <td align="right" style="padding:11px 16px;border-top:1px solid #d5ddea;color:#061a56;font-size:14px;line-height:18px;font-weight:800;">${escapeHtml(input.customizationTotal)}</td>
            </tr>`
          : ""
      }
    </table>
  `;
}

function renderCustomizationMetric(label: string, value: string) {
  return `
    <td width="33.33%" style="width:33.33%;padding-right:8px;vertical-align:top;">
      <div style="color:#7a8598;font-size:9px;line-height:13px;font-weight:700;text-transform:uppercase;">${escapeHtml(label)}</div>
      <div style="padding-top:2px;color:#344054;font-size:11px;line-height:16px;font-weight:700;">${escapeHtml(value)}</div>
    </td>
  `;
}

export function renderEmailSummary(input: {
  rows: EmailSummaryRow[];
  totalLabel: string;
  totalValue: string;
}) {
  const rows = input.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:5px 0;color:${row.muted ? "#667085" : "#344054"};font-size:13px;line-height:18px;">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:5px 0;color:${row.muted ? "#667085" : "#101828"};font-size:13px;line-height:18px;font-weight:700;">${escapeHtml(row.value)}</td>
        </tr>
      `,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:18px;border-collapse:collapse;background:#f5f7fb;">
      <tr>
        <td style="padding:18px 20px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">${rows}</table>
        </td>
      </tr>
      <tr>
        <td style="padding:0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td width="42%" style="width:42%;padding:15px 20px;background:#f6c900;color:#020d35;font-size:13px;line-height:18px;font-weight:800;text-transform:uppercase;">${escapeHtml(input.totalLabel)}</td>
              <td align="right" style="padding:15px 20px;background:#061a56;color:#ffffff;font-size:20px;line-height:24px;font-weight:800;">${escapeHtml(input.totalValue)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function renderEmailNotice(input: {
  title: string;
  text: string;
  tone?: "brand" | "warning" | "success";
}) {
  const palette = noticePalette(input.tone ?? "brand");
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:20px;border-collapse:collapse;background:${palette.background};border:1px solid ${palette.border};">
      <tr>
        <td style="padding:16px 18px;">
          <div style="color:${palette.title};font-size:13px;line-height:18px;font-weight:800;">${escapeHtml(input.title)}</div>
          <div style="padding-top:5px;color:${palette.text};font-size:13px;line-height:20px;">${escapeHtml(input.text)}</div>
        </td>
      </tr>
    </table>
  `;
}

function renderActions(primary?: EmailAction, secondary?: EmailAction) {
  if (!primary && !secondary) return "";
  return `
    <tr>
      <td class="of-email-gutter" style="padding:22px 34px 32px;background:#ffffff;">
        ${
          primary
            ? `<a class="of-email-cta" href="${escapeHtml(primary.href)}" style="display:inline-block;padding:14px 22px;background:#f6c900;color:#020d35;text-decoration:none;font-size:14px;line-height:18px;font-weight:800;">${escapeHtml(primary.label)}</a>`
            : ""
        }
        ${
          secondary
            ? `<div style="padding-top:16px;"><a href="${escapeHtml(secondary.href)}" style="color:#061a56;text-decoration:underline;font-size:13px;line-height:19px;font-weight:700;">${escapeHtml(secondary.label)}</a></div>`
            : ""
        }
      </td>
    </tr>
  `;
}

function renderMetaCell(item: EmailMetaItem) {
  return `
    <td class="of-email-stack" width="50%" style="width:50%;padding:0 14px 14px 0;vertical-align:top;">
      <div style="color:#667085;font-size:10px;line-height:14px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">${escapeHtml(item.label)}</div>
      <div style="padding-top:4px;color:#101828;font-size:13px;line-height:19px;font-weight:700;overflow-wrap:anywhere;word-break:break-word;word-wrap:break-word;">${escapeHtml(item.value || "-")}</div>
    </td>
  `;
}

function renderItemLine(label: string, value: string) {
  return `<div style="padding-top:7px;color:#475467;font-size:12px;line-height:18px;"><strong style="color:#344054;">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`;
}

function statusPalette(tone: EmailStatusTone) {
  if (tone === "success") return { background: "#ecfdf3", border: "#abefc6", color: "#067647" };
  if (tone === "warning") return { background: "#fffaeb", border: "#fedf89", color: "#b54708" };
  if (tone === "neutral") return { background: "#f2f4f7", border: "#d0d5dd", color: "#475467" };
  return { background: "#eef4ff", border: "#c7d7fe", color: "#1849a9" };
}

function noticePalette(tone: "brand" | "warning" | "success") {
  if (tone === "success") {
    return { background: "#ecfdf3", border: "#abefc6", title: "#067647", text: "#05603a" };
  }
  if (tone === "warning") {
    return { background: "#fffaeb", border: "#fedf89", title: "#b54708", text: "#7a2e0e" };
  }
  return { background: "#eef4ff", border: "#c7d7fe", title: "#1849a9", text: "#253b71" };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
