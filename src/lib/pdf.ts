import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type PdfLineItem = {
  name: string;
  description?: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type SalesPdfOptions = {
  title: string;
  number: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  createdAt: Date;
  dueDate?: Date | null;
  subtitle?: string;
  notes?: string | null;
  lines: PdfLineItem[];
  subtotalCents: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmountCents: number;
  totalCents: number;
};

type PurchasePdfOptions = {
  title: string;
  number: string;
  supplierName: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  createdAt: Date;
  dueDate?: Date | null;
  notes?: string | null;
  lines: PdfLineItem[];
  subtotalCents: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmountCents: number;
  totalCents: number;
};

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function generateSalesPdf(options: SalesPdfOptions) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const accent = rgb(0.59, 0.45, 0.31);
  const dark = rgb(0.12, 0.10, 0.09);
  const muted = rgb(0.42, 0.38, 0.34);

  page.drawRectangle({
    x: 0,
    y: height - 170,
    width,
    height: 170,
    color: dark,
  });

  try {
    const logoPath = join(process.cwd(), "public", "brand", "logo.jpg");
    const logoBytes = await readFile(logoPath);
    const logoImage = await pdf.embedJpg(logoBytes);
    page.drawImage(logoImage, {
      x: 48,
      y: height - 128,
      width: 68,
      height: 68,
    });
  } catch {
    // Ignore logo loading failure and render the document without it.
  }

  page.drawText("Art Home", {
    x: 130,
    y: height - 82,
    size: 28,
    font: headingFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(options.title, {
    x: 48,
    y: height - 205,
    size: 26,
    font: headingFont,
    color: dark,
  });

  page.drawText(options.number, {
    x: width - 180,
    y: height - 84,
    size: 16,
    font: headingFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(options.subtitle ?? "Furniture manufacturing", {
    x: 130,
    y: height - 106,
    size: 11,
    font: bodyFont,
    color: rgb(0.86, 0.84, 0.81),
  });

  const details = [
    `Client: ${options.clientName}`,
    `Email: ${options.clientEmail ?? "—"}`,
    `Phone: ${options.clientPhone ?? "—"}`,
    `Created: ${formatDate(options.createdAt)}`,
    `Due: ${formatDate(options.dueDate)}`,
  ];

  let y = height - 245;
  for (const item of details) {
    page.drawText(item, {
      x: 48,
      y,
      size: 11,
      font: bodyFont,
      color: muted,
    });
    y -= 18;
  }

  const tableTop = height - 360;
  page.drawRectangle({
    x: 48,
    y: tableTop,
    width: width - 96,
    height: 34,
    color: accent,
  });

  const columns = [
    { label: "Item", x: 60 },
    { label: "Qty", x: 330 },
    { label: "Unit", x: 390 },
    { label: "Line", x: 470 },
  ];

  for (const column of columns) {
    page.drawText(column.label, {
      x: column.x,
      y: tableTop + 11,
      size: 10,
      font: headingFont,
      color: rgb(1, 1, 1),
    });
  }

  let rowY = tableTop - 28;
  for (const line of options.lines) {
    page.drawText(line.name, {
      x: 60,
      y: rowY,
      size: 11,
      font: headingFont,
      color: dark,
    });

    if (line.description) {
      page.drawText(line.description, {
        x: 60,
        y: rowY - 14,
        size: 9,
        font: bodyFont,
        color: muted,
        maxWidth: 240,
      });
    }

    page.drawText(String(line.quantity), {
      x: 334,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: dark,
    });

    page.drawText(formatCurrency(line.unitPriceCents), {
      x: 390,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: dark,
    });

    page.drawText(formatCurrency(line.lineTotalCents), {
      x: 470,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: dark,
    });

    rowY -= line.description ? 40 : 28;
    page.drawLine({
      start: { x: 48, y: rowY + 10 },
      end: { x: width - 48, y: rowY + 10 },
      thickness: 0.6,
      color: rgb(0.88, 0.86, 0.83),
    });
  }

  const summaryTop = Math.max(rowY - 20, 150);
  const summaryRows = [
    { label: "Subtotal", value: formatCurrency(options.subtotalCents) },
    {
      label: options.vatEnabled ? `VAT ${options.vatRate}%` : "VAT disabled",
      value: options.vatEnabled ? formatCurrency(options.vatAmountCents) : "€0",
    },
    { label: "Total", value: formatCurrency(options.totalCents) },
  ];

  page.drawRectangle({
    x: 340,
    y: summaryTop - 72,
    width: width - 388,
    height: 92,
    color: rgb(0.97, 0.95, 0.92),
    borderColor: rgb(0.88, 0.86, 0.83),
    borderWidth: 1,
  });

  let summaryY = summaryTop;
  for (const row of summaryRows) {
    page.drawText(row.label, {
      x: 356,
      y: summaryY,
      size: row.label === "Total" ? 12 : 10,
      font: row.label === "Total" ? headingFont : bodyFont,
      color: dark,
    });
    page.drawText(row.value, {
      x: 454,
      y: summaryY,
      size: row.label === "Total" ? 12 : 10,
      font: row.label === "Total" ? headingFont : bodyFont,
      color: dark,
    });
    summaryY -= 24;
  }

  if (options.notes) {
    page.drawText("Notes", {
      x: 48,
      y: 124,
      size: 11,
      font: headingFont,
      color: dark,
    });
    page.drawText(options.notes, {
      x: 48,
      y: 106,
      size: 10,
      font: bodyFont,
      color: muted,
      maxWidth: 260,
    });
  }

  page.drawText("Art Home - furniture manufacturing", {
    x: 48,
    y: 38,
    size: 9,
    font: bodyFont,
    color: muted,
  });

  return pdf.save();
}

export async function generatePurchasePdf(options: PurchasePdfOptions) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.09, 0.16, 0.15);
  const teal = rgb(0.08, 0.36, 0.34);
  const sand = rgb(0.95, 0.91, 0.84);
  const muted = rgb(0.37, 0.43, 0.41);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 34,
    height,
    color: teal,
  });

  page.drawRectangle({
    x: 34,
    y: height - 132,
    width: width - 34,
    height: 132,
    color: sand,
  });

  page.drawText("Art Home", {
    x: 58,
    y: height - 70,
    size: 24,
    font: headingFont,
    color: ink,
  });

  page.drawText("Purchase document", {
    x: 58,
    y: height - 94,
    size: 11,
    font: bodyFont,
    color: muted,
  });

  page.drawText(options.title, {
    x: 58,
    y: height - 164,
    size: 27,
    font: headingFont,
    color: teal,
  });

  page.drawText(options.number, {
    x: width - 190,
    y: height - 70,
    size: 16,
    font: headingFont,
    color: ink,
  });

  const details = [
    `Supplier: ${options.supplierName}`,
    `Email: ${options.supplierEmail ?? "â€”"}`,
    `Phone: ${options.supplierPhone ?? "â€”"}`,
    `Issued: ${formatDate(options.createdAt)}`,
    `Due: ${formatDate(options.dueDate)}`,
  ];

  let y = height - 206;
  for (const item of details) {
    page.drawText(item, {
      x: 58,
      y,
      size: 11,
      font: bodyFont,
      color: muted,
    });
    y -= 18;
  }

  const tableTop = height - 330;
  page.drawRectangle({
    x: 58,
    y: tableTop,
    width: width - 106,
    height: 34,
    color: teal,
  });

  const columns = [
    { label: "Inventory item", x: 70 },
    { label: "Qty", x: 330 },
    { label: "Cost", x: 390 },
    { label: "Line", x: 470 },
  ];

  for (const column of columns) {
    page.drawText(column.label, {
      x: column.x,
      y: tableTop + 11,
      size: 10,
      font: headingFont,
      color: rgb(1, 1, 1),
    });
  }

  let rowY = tableTop - 28;
  for (const line of options.lines) {
    page.drawText(line.name, {
      x: 70,
      y: rowY,
      size: 11,
      font: headingFont,
      color: ink,
    });

    if (line.description) {
      page.drawText(line.description, {
        x: 70,
        y: rowY - 14,
        size: 9,
        font: bodyFont,
        color: muted,
        maxWidth: 240,
      });
    }

    page.drawText(String(line.quantity), {
      x: 334,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: ink,
    });

    page.drawText(formatCurrency(line.unitPriceCents), {
      x: 390,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: ink,
    });

    page.drawText(formatCurrency(line.lineTotalCents), {
      x: 470,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: ink,
    });

    rowY -= line.description ? 40 : 28;
    page.drawLine({
      start: { x: 58, y: rowY + 10 },
      end: { x: width - 48, y: rowY + 10 },
      thickness: 0.6,
      color: rgb(0.82, 0.86, 0.83),
    });
  }

  const summaryTop = Math.max(rowY - 20, 150);
  const summaryRows = [
    { label: "Subtotal", value: formatCurrency(options.subtotalCents) },
    {
      label: options.vatEnabled ? `VAT ${options.vatRate}%` : "VAT disabled",
      value: options.vatEnabled ? formatCurrency(options.vatAmountCents) : "â‚¬0",
    },
    { label: "Total", value: formatCurrency(options.totalCents) },
  ];

  page.drawRectangle({
    x: 334,
    y: summaryTop - 72,
    width: width - 382,
    height: 92,
    color: rgb(0.94, 0.97, 0.95),
    borderColor: rgb(0.68, 0.78, 0.73),
    borderWidth: 1,
  });

  let summaryY = summaryTop;
  for (const row of summaryRows) {
    page.drawText(row.label, {
      x: 350,
      y: summaryY,
      size: row.label === "Total" ? 12 : 10,
      font: row.label === "Total" ? headingFont : bodyFont,
      color: ink,
    });
    page.drawText(row.value, {
      x: 454,
      y: summaryY,
      size: row.label === "Total" ? 12 : 10,
      font: row.label === "Total" ? headingFont : bodyFont,
      color: ink,
    });
    summaryY -= 24;
  }

  if (options.notes) {
    page.drawText("Purchase notes", {
      x: 58,
      y: 124,
      size: 11,
      font: headingFont,
      color: ink,
    });
    page.drawText(options.notes, {
      x: 58,
      y: 106,
      size: 10,
      font: bodyFont,
      color: muted,
      maxWidth: 260,
    });
  }

  page.drawText("Art Home - purchase invoice", {
    x: 58,
    y: 38,
    size: 9,
    font: bodyFont,
    color: muted,
  });

  return pdf.save();
}
