export type InvoiceHistoryRow = {
  id: string;
  invoiceNumber: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  sellingDate: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
};

export type InvoicePrintLanguage = 'ar' | 'en';

type InvoiceDocumentLabels = {
  toolbarPrint: string;
  toolbarClose: string;
  companyName: string;
  companySubtitle: string;
  companyMeta: string;
  customerSection: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  invoiceSection: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTime: string;
  invoiceTotal: string;
  tableIndex: string;
  tableCode: string;
  tableProduct: string;
  tableCategory: string;
  tableUnit: string;
  tableQuantity: string;
  tableUnitPrice: string;
  tableTotal: string;
  subtotal: string;
  discount: string;
  invoiceNote: string;
};

export function buildInvoiceDocument(params: {
  selling: InvoiceHistoryRow;
  language: InvoicePrintLanguage;
  logoUrl: string;
  fontUrl: string;
}): string {
  const { selling, language, logoUrl, fontUrl } = params;
  const isArabic = language === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';
  const labels = getInvoiceLabels(language);
  const invoiceNumber = escapeHtml(selling.invoiceNumber || buildFallbackInvoiceNumber(selling.id));
  const customerName = escapeHtml(selling.customerName || getInvoiceFallbackValue(language));
  const customerPhone = escapeHtml(selling.customerPhone || getInvoiceFallbackValue(language));
  const customerAddress = escapeHtml(selling.customerAddress || getInvoiceFallbackValue(language));
  const productCode = escapeHtml(selling.productCode || getInvoiceFallbackValue(language));
  const productName = escapeHtml(selling.productName || getInvoiceFallbackValue(language));
  const categoryName = escapeHtml(selling.categoryName || getInvoiceFallbackValue(language));
  const invoiceDate = formatInvoiceDate(selling.sellingDate, language);
  const invoiceTime = formatInvoiceTime(selling.sellingDate, language);
  const quantity = formatInvoiceMetric(selling.quantity, language);
  const unitPrice = formatInvoiceMetric(selling.unitPrice, language);
  const totalPrice = formatInvoiceMetric(selling.totalPrice, language);
  const unitLabel = isArabic ? 'قطعة' : 'Piece';
  const title = isArabic ? `فاتورة ${invoiceNumber}` : `Invoice ${invoiceNumber}`;
  const escapedFontUrl = escapeCssString(fontUrl);

  return `<!DOCTYPE html>
<html lang="${language}" dir="${direction}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      @font-face {
        font-family: 'Azonix';
        src: url("${escapedFontUrl}") format('opentype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }

      :root {
        color-scheme: light;
        --invoice-blue: #0d6efd;
        --invoice-red: #8b0b1a;
        --invoice-border: #c9d3e6;
        --invoice-muted: #566074;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 24px;
        background: #eef2f8;
        color: #132238;
        font-family: 'Azonix', Arial, Tahoma, sans-serif;
      }

      .screen-toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-bottom: 18px;
      }

      .screen-toolbar button {
        border: 0;
        border-radius: 999px;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .screen-toolbar .primary {
        background: var(--invoice-blue);
        color: #fff;
      }

      .screen-toolbar .secondary {
        background: #d9e1ef;
        color: #132238;
      }

      .invoice-sheet {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid var(--invoice-border);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 18px 45px rgba(15, 35, 60, 0.12);
      }

      .invoice-body {
        padding: 28px;
      }

      .invoice-header {
        display: grid;
        direction: ltr;
        grid-template-columns: 160px 1fr;
        gap: 24px;
        align-items: center;
        padding-bottom: 22px;
        border-bottom: 1px solid var(--invoice-border);
      }

      .logo-box {
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        border: 1px solid var(--invoice-border);
        border-radius: 20px;
        background:
          linear-gradient(135deg, rgba(13, 110, 253, 0.06), rgba(255, 255, 255, 0.85)),
          linear-gradient(45deg, rgba(139, 11, 26, 0.04), rgba(255, 255, 255, 0.96));
      }

      .logo-box img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .company-heading {
        display: flex;
        flex-direction: column;
        gap: 8px;
        direction: ${direction};
        text-align: ${isArabic ? 'right' : 'left'};
      }

      .company-name {
        margin: 0;
        color: var(--invoice-red);
        font-size: 44px;
        line-height: 1;
        font-weight: 800;
      }

      .company-subtitle,
      .company-meta {
        margin: 0;
        color: #233248;
        font-size: 16px;
      }

      .company-meta {
        color: var(--invoice-muted);
      }

      .info-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
        gap: 18px;
        margin-top: 22px;
      }

      .info-card {
        border: 1px solid var(--invoice-border);
        border-radius: 18px;
        overflow: hidden;
        background: #fff;
      }

      .info-card h2 {
        margin: 0;
        padding: 14px 18px;
        background: linear-gradient(135deg, #0d6efd, #2b7cff);
        color: #fff;
        font-size: 18px;
        font-weight: 800;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 190px 1fr;
      }

      .info-label,
      .info-value {
        padding: 13px 18px;
        border-top: 1px solid var(--invoice-border);
      }

      .info-label {
        background: #f5f8fd;
        color: #20314b;
        font-weight: 700;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .summary-item {
        padding: 18px;
        border-top: 1px solid var(--invoice-border);
        border-inline-start: 1px solid var(--invoice-border);
      }

      .summary-item:nth-child(odd) {
        border-inline-start: 0;
      }

      .summary-label {
        margin: 0 0 8px;
        color: var(--invoice-muted);
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .summary-value {
        margin: 0;
        color: #10233f;
        font-size: 22px;
        font-weight: 800;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 22px;
      }

      th,
      td {
        border: 1px solid var(--invoice-border);
        padding: 14px 12px;
        text-align: ${isArabic ? 'right' : 'left'};
      }

      thead th {
        background: linear-gradient(135deg, #0d6efd, #2b7cff);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
      }

      tbody td {
        font-size: 15px;
      }

      tbody tr:nth-child(even) td {
        background: #f7faff;
      }

      .total-row {
        display: flex;
        justify-content: ${isArabic ? 'flex-start' : 'flex-end'};
        margin-top: 18px;
      }

      .total-box {
        min-width: 320px;
        border: 1px solid var(--invoice-border);
        border-radius: 18px;
        overflow: hidden;
      }

      .total-box div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        font-size: 16px;
      }

      .total-box div + div {
        border-top: 1px solid var(--invoice-border);
      }

      .total-box .grand-total {
        background: #f5f8fd;
        font-size: 20px;
        font-weight: 800;
      }

      .invoice-note {
        margin-top: 18px;
        color: var(--invoice-muted);
        font-size: 14px;
        text-align: center;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      @media print {
        body {
          padding: 0;
          background: #fff;
        }

        .screen-toolbar {
          display: none;
        }

        .invoice-sheet {
          max-width: none;
          border-radius: 0;
          box-shadow: none;
          border: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="screen-toolbar">
      <button class="primary" type="button" onclick="window.print()">${labels.toolbarPrint}</button>
      <button class="secondary" type="button" onclick="window.close()">${labels.toolbarClose}</button>
    </div>

    <main class="invoice-sheet">
      <section class="invoice-body">
        <header class="invoice-header">
          <div class="logo-box">
            <img src="${logoUrl}" alt="Kapomatic logo" />
          </div>

          <div class="company-heading">
            <h1 class="company-name">Kapomatic</h1>
            <p class="company-subtitle">${labels.companySubtitle}</p>
            <p class="company-meta">${labels.companyMeta}</p>
          </div>
        </header>

        <section class="info-layout">
          <article class="info-card">
            <h2>${labels.customerSection}</h2>
            <div class="info-grid">
              <div class="info-label">${labels.customerName}</div>
              <div class="info-value">${customerName}</div>
              <div class="info-label">${labels.customerPhone}</div>
              <div class="info-value">${customerPhone}</div>
              <div class="info-label">${labels.customerAddress}</div>
              <div class="info-value">${customerAddress}</div>
            </div>
          </article>

          <article class="info-card">
            <h2>${labels.invoiceSection}</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <p class="summary-label">${labels.invoiceNumber}</p>
                <p class="summary-value">${invoiceNumber}</p>
              </div>
              <div class="summary-item">
                <p class="summary-label">${labels.invoiceDate}</p>
                <p class="summary-value">${invoiceDate}</p>
              </div>
              <div class="summary-item">
                <p class="summary-label">${labels.invoiceTime}</p>
                <p class="summary-value">${invoiceTime}</p>
              </div>
              <div class="summary-item">
                <p class="summary-label">${labels.invoiceTotal}</p>
                <p class="summary-value">${totalPrice}</p>
              </div>
            </div>
          </article>
        </section>

        <table>
          <thead>
            <tr>
              <th>${labels.tableIndex}</th>
              <th>${labels.tableCode}</th>
              <th>${labels.tableProduct}</th>
              <th>${labels.tableCategory}</th>
              <th>${labels.tableUnit}</th>
              <th>${labels.tableQuantity}</th>
              <th>${labels.tableUnitPrice}</th>
              <th>${labels.tableTotal}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${productCode}</td>
              <td>${productName}</td>
              <td>${categoryName}</td>
              <td>${unitLabel}</td>
              <td>${quantity}</td>
              <td>${unitPrice}</td>
              <td>${totalPrice}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-row">
          <div class="total-box">
            <div>
              <span>${labels.subtotal}</span>
              <strong>${totalPrice}</strong>
            </div>
            <div>
              <span>${labels.discount}</span>
              <strong>0.00</strong>
            </div>
            <div class="grand-total">
              <span>${labels.invoiceTotal}</span>
              <strong>${totalPrice}</strong>
            </div>
          </div>
        </div>

        <p class="invoice-note">${labels.invoiceNote}</p>
      </section>
    </main>

    <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          window.print();
        }, 250);
      });
    </script>
  </body>
</html>`;
}

export function buildFallbackInvoiceNumber(id: string): string {
  const normalizedId = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!normalizedId) {
    return 'INV-0000';
  }

  return `INV-${normalizedId.slice(-6)}`;
}

function getInvoiceLabels(language: InvoicePrintLanguage): InvoiceDocumentLabels {
  if (language === 'ar') {
    return {
      toolbarPrint: 'طباعة / حفظ PDF',
      toolbarClose: 'إغلاق',
      companyName: 'كابوماتيك',
      companySubtitle: 'لتجارة وتوزيع قطع غيار السيارات',
      companyMeta: 'سجل فاتورة مبيعات صادر من نظام Kapomatic',
      customerSection: 'بيانات العميل',
      customerName: 'الاسم',
      customerPhone: 'التليفون',
      customerAddress: 'العنوان',
      invoiceSection: 'الفاتورة',
      invoiceNumber: 'رقم الفاتورة',
      invoiceDate: 'التاريخ',
      invoiceTime: 'الوقت',
      invoiceTotal: 'الإجمالي',
      tableIndex: 'م',
      tableCode: 'الكود',
      tableProduct: 'الصنف',
      tableCategory: 'الفئة',
      tableUnit: 'الوحدة',
      tableQuantity: 'الكمية',
      tableUnitPrice: 'السعر',
      tableTotal: 'الإجمالي',
      subtotal: 'الإجمالي الفرعي',
      discount: 'الخصم',
      invoiceNote: 'هذه الفاتورة تم إنشاؤها إلكترونيًا من نظام كابوماتيك.'
    };
  }

  return {
    toolbarPrint: 'Print / Save PDF',
    toolbarClose: 'Close',
    companyName: 'Kapomatic',
    companySubtitle: 'Auto spare parts trading and distribution',
    companyMeta: 'Sales invoice generated from the Kapomatic system',
    customerSection: 'Customer Details',
    customerName: 'Name',
    customerPhone: 'Phone',
    customerAddress: 'Address',
    invoiceSection: 'Invoice',
    invoiceNumber: 'Invoice Number',
    invoiceDate: 'Date',
    invoiceTime: 'Time',
    invoiceTotal: 'Total',
    tableIndex: '#',
    tableCode: 'Code',
    tableProduct: 'Product',
    tableCategory: 'Category',
    tableUnit: 'Unit',
    tableQuantity: 'Qty',
    tableUnitPrice: 'Unit Price',
    tableTotal: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    invoiceNote: 'This invoice was generated electronically from the Kapomatic system.'
  };
}

function formatInvoiceDate(value: string | null, language: InvoicePrintLanguage): string {
  const parsedDate = parseInvoiceDate(value);
  if (!parsedDate) {
    return getInvoiceFallbackValue(language);
  }

  return parsedDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatInvoiceTime(value: string | null, language: InvoicePrintLanguage): string {
  if (!value || !/[T ]\d{2}:\d{2}/.test(value)) {
    return getInvoiceFallbackValue(language);
  }

  const parsedDate = parseInvoiceDate(value);
  if (!parsedDate) {
    return getInvoiceFallbackValue(language);
  }

  return parsedDate.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parseInvoiceDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getInvoiceFallbackValue(language: InvoicePrintLanguage): string {
  return language === 'ar' ? 'غير متوفر' : 'N/A';
}

function formatInvoiceNumber(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0.00';
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function formatInvoiceMetric(value: number | null, language: InvoicePrintLanguage): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return getInvoiceFallbackValue(language);
  }

  return formatInvoiceNumber(value);
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCssString(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}
