import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { COMPANY } from "@/lib/company";
import { calculatePercentageCents, centsToDecimalString } from "@/lib/money";

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
  clientAddress?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientNui?: string | null;
  clientVatNumber?: string | null;
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
  supplierAddress?: string | null;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierNui?: string | null;
  supplierVatNumber?: string | null;
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

type ExpensePdfOptions = {
  title: string;
  number: string;
  supplierName: string;
  category: string;
  date: Date;
  description?: string | null;
  amountCents: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmountCents: number;
  totalCents: number;
};

type DeliveryPdfOptions = {
  title: string;
  number: string;
  typeLabel: string;
  partyLabel: string;
  partyName: string;
  partyEmail?: string | null;
  partyPhone?: string | null;
  issuedAt: Date;
  notes?: string | null;
  lines: Array<{
    name: string;
    description?: string | null;
    quantity: number;
  }>;
};

type DebitNotePdfOptions = {
  title: string;
  number: string;
  clientName: string;
  clientAddress?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientNui?: string | null;
  clientVatNumber?: string | null;
  invoiceNumber: string;
  reason: string;
  issuedAt: Date;
  notes?: string | null;
  lines: PdfLineItem[];
  subtotalCents: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmountCents: number;
  totalCents: number;
};

function formatMoneyValue(amountCents: number) {
  return centsToDecimalString(amountCents);
}

function formatCurrency(amountCents: number) {
  return `€ ${formatMoneyValue(amountCents)}`;
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

const A4_SIZE: [number, number] = [595.92, 842.88];
const tableBorder = rgb(0.05, 0.05, 0.05);
const textColor = rgb(0.08, 0.08, 0.08);
const companyDocumentInfo = COMPANY.documents;

type PdfColor = ReturnType<typeof rgb>;
type PdfFonts = {
  body: PDFFont;
  bold: PDFFont;
};

function formatDocumentDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function formatQuantity(quantity: number) {
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  return quantity.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatVatRate(rate: number) {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/\.?0+$/, "");
}

function getVatInclusiveUnitPriceCents(line: PdfLineItem, vatEnabled: boolean, vatRate: number) {
  if (!vatEnabled) {
    return line.unitPriceCents;
  }

  return line.unitPriceCents + calculatePercentageCents(line.unitPriceCents, vatRate);
}

function topToY(page: PDFPage, top: number, size = 0) {
  return page.getSize().height - top - size;
}

function drawTextTop(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  {
    font,
    size,
    color = textColor,
    width,
    align = "left",
  }: {
    font: PDFFont;
    size: number;
    color?: PdfColor;
    width?: number;
    align?: "left" | "center" | "right";
  },
) {
  const value = text || "-";
  let textX = x;

  if (width) {
    const textWidth = font.widthOfTextAtSize(value, size);
    if (align === "right") {
      textX = x + width - textWidth;
    } else if (align === "center") {
      textX = x + (width - textWidth) / 2;
    }
  }

  page.drawText(value, {
    x: textX,
    y: topToY(page, top, size),
    size,
    font,
    color,
  });
}

function drawRectangleTop(
  page: PDFPage,
  x: number,
  top: number,
  width: number,
  height: number,
  options: {
    color?: PdfColor;
    borderColor?: PdfColor;
    borderWidth?: number;
  } = {},
) {
  page.drawRectangle({
    x,
    y: topToY(page, top + height),
    width,
    height,
    ...options,
  });
}

function drawLineTop(
  page: PDFPage,
  x1: number,
  top1: number,
  x2: number,
  top2: number,
  thickness = 0.8,
) {
  page.drawLine({
    start: { x: x1, y: topToY(page, top1) },
    end: { x: x2, y: topToY(page, top2) },
    thickness,
    color: tableBorder,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = String(text || "-").split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
        current = "";
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }

      let chunk = "";
      for (const char of word) {
        const nextChunk = `${chunk}${char}`;
        if (font.widthOfTextAtSize(nextChunk, size) <= maxWidth) {
          chunk = nextChunk;
        } else {
          if (chunk) {
            lines.push(chunk);
          }
          chunk = char;
        }
      }
      current = chunk;
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : ["-"];
}

function drawWrappedTextTop(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  {
    font,
    size,
    maxWidth,
    lineHeight = size + 3,
    color = textColor,
    align = "left",
  }: {
    font: PDFFont;
    size: number;
    maxWidth: number;
    lineHeight?: number;
    color?: PdfColor;
    align?: "left" | "center" | "right";
  },
) {
  const lines = wrapText(text, font, size, maxWidth);

  lines.forEach((line, index) => {
    drawTextTop(page, line, x, top + index * lineHeight, {
      font,
      size,
      color,
      width: maxWidth,
      align,
    });
  });

  return top + lines.length * lineHeight;
}

async function loadBrandLogo(pdf: PDFDocument) {
  const logoPath = join(process.cwd(), "public", "images", "brand", "logo.png");
  const logoBytes = await readFile(logoPath);

  return pdf.embedPng(logoBytes);
}

async function embedDocumentFonts(pdf: PDFDocument): Promise<PdfFonts> {
  pdf.registerFontkit(fontkit);

  const fallbackFontPath = join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "compiled",
    "@vercel",
    "og",
    "Geist-Regular.ttf",
  );
  const [bodyFontBytes, boldFontBytes] = await Promise.all([
    readFirstAvailableFont(["C:\\Windows\\Fonts\\arial.ttf", fallbackFontPath]),
    readFirstAvailableFont(["C:\\Windows\\Fonts\\arialbd.ttf", fallbackFontPath]),
  ]);

  return {
    body: await pdf.embedFont(bodyFontBytes, { subset: true }),
    bold: await pdf.embedFont(boldFontBytes, { subset: true }),
  };
}

async function readFirstAvailableFont(paths: string[]) {
  for (const path of paths) {
    try {
      return await readFile(path);
    } catch {
      // Try the next font candidate.
    }
  }

  throw new Error("No invoice PDF font could be loaded.");
}

function drawLogoTop(page: PDFPage, logoImage: PDFImage | null, x: number, top: number, width: number, height: number) {
  if (!logoImage) {
    return;
  }

  const scaledLogo = logoImage.scaleToFit(width, height);
  const boxY = topToY(page, top + height);

  page.drawImage(logoImage, {
    x: x + (width - scaledLogo.width) / 2,
    y: boxY + (height - scaledLogo.height) / 2,
    width: scaledLogo.width,
    height: scaledLogo.height,
  });
}

function buildPartyDetails({
  address,
  phone,
  email,
  nui,
  vatNumber,
}: {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  nui?: string | null;
  vatNumber?: string | null;
}) {
  return [
    address ? `Adresa: ${address}` : null,
    phone ? `Tel : ${phone}` : null,
    email ? `E-mail: ${email}` : null,
    nui ? `NUI:${nui}` : null,
    vatNumber ? `TVSH ${vatNumber}` : null,
  ].filter((line): line is string => Boolean(line));
}

function drawPartyBlock(
  page: PDFPage,
  fonts: PdfFonts,
  {
    name,
    details,
    x,
    top,
    width,
    nameSize = 10,
    detailSize = 10,
  }: {
    name: string;
    details: string[];
    x: number;
    top: number;
    width: number;
    nameSize?: number;
    detailSize?: number;
  },
) {
  let nextTop = drawWrappedTextTop(page, name, x, top, {
    font: fonts.bold,
    size: nameSize,
    maxWidth: width,
    lineHeight: nameSize + 3,
  });

  for (const detail of details) {
    nextTop = drawWrappedTextTop(page, detail, x, nextTop + 3, {
      font: fonts.body,
      size: detailSize,
      maxWidth: width,
      lineHeight: detailSize + 3,
    });
  }

  return nextTop;
}

function drawCompanyBlock(
  page: PDFPage,
  fonts: PdfFonts,
  x: number,
  top: number,
  width: number,
) {
  return drawPartyBlock(page, fonts, {
    name: companyDocumentInfo.legalName,
    details: [
      `Adresa: ${companyDocumentInfo.address}`,
      `Tel : ${companyDocumentInfo.phone}`,
      `E-mail: ${companyDocumentInfo.email}`,
      companyDocumentInfo.nui ? `NUI ${companyDocumentInfo.nui}` : null,
      companyDocumentInfo.vatNumber ? `TVSH ${companyDocumentInfo.vatNumber}` : null,
    ].filter((detail): detail is string => Boolean(detail)),
    x,
    top,
    width,
    nameSize: 10,
    detailSize: 10,
  });
}

function drawInvoiceMeta(
  page: PDFPage,
  fonts: PdfFonts,
  {
    x,
    top,
    width,
    issuedAt,
    dueDate,
    number,
  }: {
    x: number;
    top: number;
    width: number;
    issuedAt: Date;
    dueDate?: Date | null;
    number: string;
  },
) {
  const rows = [
    ["Data e Faturës", formatDocumentDate(issuedAt)],
    ["Afati i Pagesës", formatDocumentDate(dueDate)],
    ["Numri i Faturës", number],
  ];

  rows.forEach(([label, value], index) => {
    const rowTop = top + index * 28.5;
    drawTextTop(page, label, x, rowTop, {
      font: fonts.bold,
      size: 10,
      width,
      align: "right",
    });
    drawTextTop(page, value, x, rowTop + 10.5, {
      font: fonts.body,
      size: 10,
      width,
      align: "right",
    });
  });
}

function drawDebitNoteMeta(
  page: PDFPage,
  fonts: PdfFonts,
  {
    x,
    top,
    width,
    issuedAt,
    invoiceNumber,
    number,
  }: {
    x: number;
    top: number;
    width: number;
    issuedAt: Date;
    invoiceNumber: string;
    number: string;
  },
) {
  const rows = [
    ["Data", formatDocumentDate(issuedAt)],
    ["Fatura", invoiceNumber],
    ["Debit Note", number],
  ];

  rows.forEach(([label, value], index) => {
    const rowTop = top + index * 28.5;
    drawTextTop(page, label, x, rowTop, {
      font: fonts.bold,
      size: 10,
      width,
      align: "right",
    });
    drawTextTop(page, value, x, rowTop + 10.5, {
      font: fonts.body,
      size: 10,
      width,
      align: "right",
    });
  });
}

type PdfTableRenderResult = {
  page: PDFPage;
  bottom: number;
};

const tablePageBottomLimit = 735;

function addContinuationPage(
  pdf: PDFDocument,
  fonts: PdfFonts,
  logoImage: PDFImage | null,
  title: string,
  number: string,
) {
  const page = pdf.addPage(A4_SIZE);

  drawTextTop(page, title, 45, 48, { font: fonts.bold, size: 18 });
  drawTextTop(page, number, 45, 70, { font: fonts.body, size: 10 });
  drawLogoTop(page, logoImage, 426, 28, 124, 92);

  return page;
}

function drawPaginatedSalesInvoiceTable(
  pdf: PDFDocument,
  firstPage: PDFPage,
  fonts: PdfFonts,
  options: SalesPdfOptions,
  logoImage: PDFImage | null,
  displayTitle: string,
  tableTop = 274,
): PdfTableRenderResult {
  const tableX = 45;
  const headerHeight = 41;
  const continuationTableTop = 142;
  const widths = [116, 44, 55, 66, 56, 47, 56, 66];
  const columnStarts = widths.reduce<number[]>(
    (starts, width) => [...starts, starts[starts.length - 1] + width],
    [tableX],
  );
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const lineItems =
    options.lines.length > 0
      ? options.lines
      : [{ name: "-", quantity: 0, unitPriceCents: 0, lineTotalCents: 0 }];
  const rowHeights = lineItems.map((line) => {
    const itemText = [line.name, line.description].filter(Boolean).join("\n");
    const lineCount = wrapText(itemText, fonts.body, 9.5, widths[0] - 14).length;
    return Math.max(50, 18 + lineCount * 11);
  });
  const totals = [
    ["Nëntotali", formatCurrency(options.subtotalCents), false],
    [
      options.vatEnabled ? `TVSH ${formatVatRate(options.vatRate)}%` : "Pa TVSH",
      formatCurrency(options.vatAmountCents),
      false,
    ],
    ["Gjithsejt", formatCurrency(options.totalCents), true],
  ] as const;
  const totalRowHeight = 18.8;
  const totalsHeight = totalRowHeight * totals.length;
  const valueX = tableX + tableWidth - widths[7];
  const valueWidth = widths[7];
  const labelWidth = 93;

  const drawHeader = (page: PDFPage, segmentTop: number) => {
    const headers = [
      "Artikulli",
      "Cope",
      "Çmimi për\nnjësi",
      "Çmimi për\nnjësi me\nTVSH",
      "Vlera",
      "Tatimi",
      "Vlera e\ntatimit",
      "Gjithsejt",
    ];

    headers.forEach((header, index) => {
      header.split("\n").forEach((line, lineIndex) => {
        drawTextTop(page, line, columnStarts[index] + 4, segmentTop + 7 + lineIndex * 10, {
          font: fonts.bold,
          size: 8.1,
          width: widths[index] - 8,
          align: index === 0 ? "left" : "center",
        });
      });
    });
  };

  const drawTotals = (page: PDFPage, totalsTop: number) => {
    drawRectangleTop(page, valueX, totalsTop, valueWidth, totalsHeight, {
      borderColor: tableBorder,
      borderWidth: 0.8,
    });
    for (let index = 1; index < totals.length; index += 1) {
      drawLineTop(page, valueX, totalsTop + totalRowHeight * index, valueX + valueWidth, totalsTop + totalRowHeight * index);
    }

    totals.forEach(([label, value, isTotal], index) => {
      const totalTop = totalsTop + totalRowHeight * index + 4.5;
      drawTextTop(page, label, valueX - labelWidth - 8, totalTop, {
        font: isTotal ? fonts.bold : fonts.body,
        size: 10,
        width: labelWidth,
        align: "right",
      });
      drawTextTop(page, value, valueX + 6, totalTop, {
        font: isTotal ? fonts.bold : fonts.body,
        size: 10,
        width: valueWidth - 12,
        align: "right",
      });
    });
  };

  let currentPage = firstPage;
  let currentTop = tableTop;
  let rowIndex = 0;

  while (rowIndex < lineItems.length) {
    let rowsOnPage = 0;
    let rowsHeight = 0;

    while (rowIndex + rowsOnPage < lineItems.length) {
      const candidateHeight = rowHeights[rowIndex + rowsOnPage];
      const isLastCandidate = rowIndex + rowsOnPage === lineItems.length - 1;
      const reservedHeight = isLastCandidate ? totalsHeight + 8 : 0;
      const candidateBottom = currentTop + headerHeight + rowsHeight + candidateHeight + reservedHeight;

      if (rowsOnPage > 0 && candidateBottom > tablePageBottomLimit) {
        break;
      }

      rowsOnPage += 1;
      rowsHeight += candidateHeight;

      if (candidateBottom > tablePageBottomLimit) {
        break;
      }
    }

    const segmentBottom = currentTop + headerHeight + rowsHeight;
    const isLastSegment = rowIndex + rowsOnPage >= lineItems.length;

    drawRectangleTop(currentPage, tableX, currentTop, tableWidth, segmentBottom - currentTop, {
      borderColor: tableBorder,
      borderWidth: 0.8,
    });
    for (const start of columnStarts.slice(1, -1)) {
      drawLineTop(currentPage, start, currentTop, start, segmentBottom);
    }
    drawLineTop(currentPage, tableX, currentTop + headerHeight, tableX + tableWidth, currentTop + headerHeight);
    drawHeader(currentPage, currentTop);

    let rowTop = currentTop + headerHeight;
    for (let offset = 0; offset < rowsOnPage; offset += 1) {
      const line = lineItems[rowIndex + offset];
      const rowHeight = rowHeights[rowIndex + offset];
      const itemText = [line.name, line.description].filter(Boolean).join("\n");
      const lineVatCents = options.vatEnabled
        ? calculatePercentageCents(line.lineTotalCents, options.vatRate)
        : 0;
      const lineGrossCents = line.lineTotalCents + lineVatCents;
      const rowCenterTop = rowTop + rowHeight / 2 - 4.5;
      const numericValues = [
        formatQuantity(line.quantity),
        formatMoneyValue(line.unitPriceCents),
        formatMoneyValue(getVatInclusiveUnitPriceCents(line, options.vatEnabled, options.vatRate)),
        formatMoneyValue(line.lineTotalCents),
        options.vatEnabled ? `TVSH ${formatVatRate(options.vatRate)}%` : "Pa TVSH",
        formatMoneyValue(lineVatCents),
        formatMoneyValue(lineGrossCents),
      ];

      drawWrappedTextTop(currentPage, itemText, columnStarts[0] + 7, rowTop + 10, {
        font: fonts.body,
        size: 9.5,
        maxWidth: widths[0] - 14,
        lineHeight: 10.5,
      });

      numericValues.forEach((value, valueIndex) => {
        const columnIndex = valueIndex + 1;
        drawTextTop(currentPage, value, columnStarts[columnIndex] + 5, rowCenterTop, {
          font: fonts.body,
          size: columnIndex === 5 ? 8.2 : 8.8,
          width: widths[columnIndex] - 10,
          align: columnIndex === 5 ? "center" : "right",
        });
      });

      rowTop += rowHeight;
      if (offset < rowsOnPage - 1) {
        drawLineTop(currentPage, tableX, rowTop, tableX + tableWidth, rowTop, 0.6);
      }
    }

    rowIndex += rowsOnPage;

    if (isLastSegment) {
      drawTotals(currentPage, segmentBottom);
      return { page: currentPage, bottom: segmentBottom + totalsHeight };
    }

    currentPage = addContinuationPage(pdf, fonts, logoImage, displayTitle, options.number);
    currentTop = continuationTableTop;
  }

  return { page: currentPage, bottom: currentTop };
}

function drawSalesInvoiceFooter(
  page: PDFPage,
  fonts: PdfFonts,
  options: SalesPdfOptions,
  startTop: number,
) {
  let top = Math.max(startTop + 34, 435);
  top = drawWrappedTextTop(
    page,
    `Mënyrat e pagesës: ${companyDocumentInfo.bankAccounts
      .map((account) => `[${account}]`)
      .join(" - ")}`,
    45,
    top,
    { font: fonts.body, size: 10, maxWidth: 506, lineHeight: 12 },
  );

  top += 42;
  drawTextTop(
    page,
    "Faturoi: _______________________________________ Pranoi: __________________________________________",
    45,
    top,
    { font: fonts.bold, size: 10 },
  );

  top += 36;
  const defaultNotice =
    "Vërejtje : Fatura duhet te paguhet brenda afatit te paraparë me kontratë. Në qoftëse me blerësin nuk kemi kontratë atëher afati për pagesë është 15 ditë nga data e faturës. Pas skadimit të këtij afati llogaritet kamata sipas stopave bankare 0.5% në ditë.";
  const notice = options.notes?.trim() ? `Vërejtje : ${options.notes.trim()}` : defaultNotice;
  drawWrappedTextTop(page, notice, 45, top, {
    font: fonts.body,
    size: 10,
    maxWidth: 506,
    lineHeight: 11.5,
  });
}

function drawPaginatedPurchaseInvoiceTable(
  pdf: PDFDocument,
  firstPage: PDFPage,
  fonts: PdfFonts,
  options: PurchasePdfOptions,
  logoImage: PDFImage | null,
  displayTitle: string,
): PdfTableRenderResult {
  const tableX = 28.5;
  const tableTop = 286.5;
  const continuationTableTop = 142;
  const headerHeight = 36;
  const widths = [190, 54, 96, 104, 96];
  const columnStarts = widths.reduce<number[]>(
    (starts, width) => [...starts, starts[starts.length - 1] + width],
    [tableX],
  );
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const lineItems =
    options.lines.length > 0
      ? options.lines
      : [{ name: "-", quantity: 0, unitPriceCents: 0, lineTotalCents: 0 }];
  const rowHeights = lineItems.map((line) => {
    const itemText = [line.name, line.description].filter(Boolean).join("\n");
    const lineCount = wrapText(itemText, fonts.body, 9.5, widths[0] - 12).length;
    return Math.max(35, 14 + lineCount * 10.8);
  });
  const totals = [
    ["Nëntotali", formatCurrency(options.subtotalCents), false],
    [
      options.vatEnabled ? `TVSH ${formatVatRate(options.vatRate)}%` : "Pa TVSH",
      formatCurrency(options.vatAmountCents),
      false,
    ],
    ["Gjithsejt", formatCurrency(options.totalCents), true],
  ] as const;
  const totalRowHeight = 18.8;
  const totalsHeight = totalRowHeight * totals.length;
  const valueX = columnStarts[4];
  const valueWidth = widths[4];
  const labelWidth = 120;

  const drawHeader = (page: PDFPage, segmentTop: number) => {
    const headers = ["Llogaria kontabël", "Sasia", "Çmimi për\nnjësi", "Çmimi për\nnjësi me TVSH", "Gjithsejt"];

    headers.forEach((header, index) => {
      header.split("\n").forEach((line, lineIndex) => {
        drawTextTop(page, line, columnStarts[index] + 6, segmentTop + 6 + lineIndex * 10.5, {
          font: fonts.bold,
          size: 8.8,
          width: widths[index] - 12,
          align: index === 0 ? "left" : "right",
        });
      });
    });
  };

  const drawTotals = (page: PDFPage, totalsTop: number) => {
    drawRectangleTop(page, valueX, totalsTop, valueWidth, totalsHeight, {
      borderColor: tableBorder,
      borderWidth: 0.8,
    });
    for (let index = 1; index < totals.length; index += 1) {
      drawLineTop(page, valueX, totalsTop + totalRowHeight * index, valueX + valueWidth, totalsTop + totalRowHeight * index);
    }

    totals.forEach(([label, value, isTotal], index) => {
      const totalTop = totalsTop + totalRowHeight * index + 4.5;
      drawTextTop(page, label, valueX - labelWidth - 8, totalTop, {
        font: isTotal ? fonts.bold : fonts.body,
        size: 10,
        width: labelWidth,
        align: "right",
      });
      drawTextTop(page, value, valueX + 6, totalTop, {
        font: isTotal ? fonts.bold : fonts.body,
        size: 10,
        width: valueWidth - 12,
        align: "right",
      });
    });
  };

  let currentPage = firstPage;
  let currentTop = tableTop;
  let rowIndex = 0;

  while (rowIndex < lineItems.length) {
    let rowsOnPage = 0;
    let rowsHeight = 0;

    while (rowIndex + rowsOnPage < lineItems.length) {
      const candidateHeight = rowHeights[rowIndex + rowsOnPage];
      const isLastCandidate = rowIndex + rowsOnPage === lineItems.length - 1;
      const reservedHeight = isLastCandidate ? totalsHeight + 8 : 0;
      const candidateBottom = currentTop + headerHeight + rowsHeight + candidateHeight + reservedHeight;

      if (rowsOnPage > 0 && candidateBottom > tablePageBottomLimit) {
        break;
      }

      rowsOnPage += 1;
      rowsHeight += candidateHeight;

      if (candidateBottom > tablePageBottomLimit) {
        break;
      }
    }

    const segmentBottom = currentTop + headerHeight + rowsHeight;
    const isLastSegment = rowIndex + rowsOnPage >= lineItems.length;

    drawRectangleTop(currentPage, tableX, currentTop, tableWidth, segmentBottom - currentTop, {
      borderColor: tableBorder,
      borderWidth: 0.8,
    });
    for (const start of columnStarts.slice(1, -1)) {
      drawLineTop(currentPage, start, currentTop, start, segmentBottom);
    }
    drawLineTop(currentPage, tableX, currentTop + headerHeight, tableX + tableWidth, currentTop + headerHeight);
    drawHeader(currentPage, currentTop);

    let rowTop = currentTop + headerHeight;
    for (let offset = 0; offset < rowsOnPage; offset += 1) {
      const line = lineItems[rowIndex + offset];
      const rowHeight = rowHeights[rowIndex + offset];
      const itemText = [line.name, line.description].filter(Boolean).join("\n");
      const rowCenterTop = rowTop + rowHeight / 2 - 5;

      drawWrappedTextTop(currentPage, itemText, columnStarts[0] + 6, rowTop + 8, {
        font: fonts.body,
        size: 9.5,
        maxWidth: widths[0] - 12,
        lineHeight: 10.8,
      });
      drawTextTop(currentPage, formatQuantity(line.quantity), columnStarts[1] + 6, rowCenterTop, {
        font: fonts.body,
        size: 9,
        width: widths[1] - 12,
        align: "center",
      });
      drawTextTop(currentPage, formatMoneyValue(line.unitPriceCents), columnStarts[2] + 6, rowCenterTop, {
        font: fonts.body,
        size: 9,
        width: widths[2] - 12,
        align: "right",
      });
      drawTextTop(
        currentPage,
        formatMoneyValue(getVatInclusiveUnitPriceCents(line, options.vatEnabled, options.vatRate)),
        columnStarts[3] + 6,
        rowCenterTop,
        {
          font: fonts.body,
          size: 9,
          width: widths[3] - 12,
          align: "right",
        },
      );
      drawTextTop(currentPage, formatMoneyValue(line.lineTotalCents), columnStarts[4] + 6, rowCenterTop, {
        font: fonts.body,
        size: 9,
        width: widths[4] - 12,
        align: "right",
      });

      rowTop += rowHeight;
      if (offset < rowsOnPage - 1) {
        drawLineTop(currentPage, tableX, rowTop, tableX + tableWidth, rowTop, 0.6);
      }
    }

    rowIndex += rowsOnPage;

    if (isLastSegment) {
      drawTotals(currentPage, segmentBottom);
      return { page: currentPage, bottom: segmentBottom + totalsHeight };
    }

    currentPage = addContinuationPage(pdf, fonts, logoImage, displayTitle, options.number);
    currentTop = continuationTableTop;
  }

  return { page: currentPage, bottom: currentTop };
}

function drawDebitNoteFooter(
  page: PDFPage,
  fonts: PdfFonts,
  options: DebitNotePdfOptions,
  startTop: number,
) {
  let top = Math.max(startTop + 34, 435);

  drawTextTop(page, "Arsyeja", 45, top, { font: fonts.bold, size: 10 });
  top += 13;
  top = drawWrappedTextTop(page, options.reason, 45, top, {
    font: fonts.body,
    size: 10,
    maxWidth: 506,
    lineHeight: 12,
  });

  top += 34;
  drawTextTop(
    page,
    "Pergatiti: _____________________________________ Pranoi: __________________________________________",
    45,
    top,
    { font: fonts.bold, size: 10 },
  );

  top += 36;
  const defaultNotice =
    "Verejtje : Ky dokument rregullon faturen e lidhur dhe duhet te arkivohet bashke me dokumentacionin perkates.";
  const notice = options.notes?.trim() ? `Verejtje : ${options.notes.trim()}` : defaultNotice;
  drawWrappedTextTop(page, notice, 45, top, {
    font: fonts.body,
    size: 10,
    maxWidth: 506,
    lineHeight: 11.5,
  });
}

export async function generateSalesPdf(options: SalesPdfOptions) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4_SIZE);
  const fonts = await embedDocumentFonts(pdf);
  let logoImage: PDFImage | null = null;

  try {
    logoImage = await loadBrandLogo(pdf);
  } catch {
    logoImage = null;
  }

  const displayTitle = options.title === "Sales Invoice" ? "Faturë" : options.title;
  drawTextTop(page, displayTitle, 45, 88, { font: fonts.bold, size: 28 });
  drawLogoTop(page, logoImage, 420, 60, 130, 96);

  const clientBottom = drawPartyBlock(page, fonts, {
    name: options.clientName,
    details: buildPartyDetails({
      address: options.clientAddress,
      phone: options.clientPhone,
      email: options.clientEmail,
      nui: options.clientNui,
      vatNumber: options.clientVatNumber,
    }),
    x: 45,
    top: 205,
    width: 210,
    nameSize: 10,
    detailSize: 10,
  });

  drawInvoiceMeta(page, fonts, {
    x: 292,
    top: 173,
    width: 65,
    issuedAt: options.createdAt,
    dueDate: options.dueDate,
    number: options.number,
  });
  drawLineTop(page, 372, 172, 372, 258, 0.8);
  const companyBottom = drawCompanyBlock(page, fonts, 388, 184, 178);

  const tableTop = Math.max(274, clientBottom + 14, companyBottom + 14);
  const tableResult = drawPaginatedSalesInvoiceTable(pdf, page, fonts, options, logoImage, displayTitle, tableTop);
  if (tableResult.bottom > 640) {
    const footerPage = addContinuationPage(pdf, fonts, logoImage, displayTitle, options.number);
    drawSalesInvoiceFooter(footerPage, fonts, options, 150);
  } else {
    drawSalesInvoiceFooter(tableResult.page, fonts, options, tableResult.bottom);
  }

  return pdf.save();
}

function drawPurchaseInvoiceFooter(
  page: PDFPage,
  fonts: PdfFonts,
  options: PurchasePdfOptions,
  startTop: number,
) {
  const identifiers = [
    options.supplierNui ? `NRF: ${options.supplierNui}` : null,
    options.supplierVatNumber ? `TVSH : ${options.supplierVatNumber}` : null,
  ].filter((identifier): identifier is string => Boolean(identifier));

  if (identifiers.length === 0) {
    return;
  }

  const top = Math.max(startTop + 25, 404);
  drawTextTop(page, "Identifikuesi i Biznesit", 28.5, top, {
    font: fonts.bold,
    size: 10,
  });
  drawWrappedTextTop(page, identifiers.join(" "), 172, top, {
    font: fonts.body,
    size: 10,
    maxWidth: 380,
    lineHeight: 12,
  });
}

export async function generatePurchasePdf(options: PurchasePdfOptions) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4_SIZE);
  const fonts = await embedDocumentFonts(pdf);
  let logoImage: PDFImage | null = null;

  try {
    logoImage = await loadBrandLogo(pdf);
  } catch {
    logoImage = null;
  }

  const displayTitle = options.title === "Purchase Invoice" ? "Faturë Blerje" : options.title;
  drawTextTop(page, displayTitle, 28.5, 28.5, { font: fonts.bold, size: 18 });
  drawLogoTop(page, logoImage, 446, 46, 122, 90);

  drawPartyBlock(page, fonts, {
    name: options.supplierName,
    details: buildPartyDetails({
      address: options.supplierAddress,
      phone: options.supplierPhone,
      email: options.supplierEmail,
      nui: options.supplierNui,
      vatNumber: options.supplierVatNumber,
    }),
    x: 28.5,
    top: 140,
    width: 205,
    nameSize: 10,
    detailSize: 10,
  });

  drawInvoiceMeta(page, fonts, {
    x: 235,
    top: 139,
    width: 98,
    issuedAt: options.createdAt,
    dueDate: options.dueDate,
    number: options.number,
  });
  drawLineTop(page, 346, 139, 346, 253, 0.8);
  drawCompanyBlock(page, fonts, 360, 140, 205);

  const subject = options.notes?.trim().split(/\r?\n/)[0] || "Artikujt";
  drawWrappedTextTop(page, subject, 28.5, 261, {
    font: fonts.bold,
    size: 10,
    maxWidth: 500,
    lineHeight: 12,
  });

  const tableResult = drawPaginatedPurchaseInvoiceTable(pdf, page, fonts, options, logoImage, displayTitle);
  if (tableResult.bottom > 690) {
    const footerPage = addContinuationPage(pdf, fonts, logoImage, displayTitle, options.number);
    drawPurchaseInvoiceFooter(footerPage, fonts, options, 150);
  } else {
    drawPurchaseInvoiceFooter(tableResult.page, fonts, options, tableResult.bottom);
  }

  return pdf.save();
}

export async function generateExpensePdf(options: ExpensePdfOptions) {
  return generatePurchasePdf({
    title: options.title,
    number: options.number,
    supplierName: options.supplierName,
    createdAt: options.date,
    dueDate: options.date,
    notes: options.description ?? options.category,
    lines: [
      {
        name: options.category,
        description: options.description,
        quantity: 1,
        unitPriceCents: options.amountCents,
        lineTotalCents: options.amountCents,
      },
    ],
    subtotalCents: options.amountCents,
    vatEnabled: options.vatEnabled,
    vatRate: options.vatRate,
    vatAmountCents: options.vatAmountCents,
    totalCents: options.totalCents,
  });
}

export async function generateDeliveryNotePdf(options: DeliveryPdfOptions) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.13, 0.11, 0.10);
  const accent = rgb(0.55, 0.39, 0.24);
  const soft = rgb(0.96, 0.93, 0.88);
  const muted = rgb(0.42, 0.38, 0.34);

  page.drawRectangle({ x: 0, y: height - 150, width, height: 150, color: ink });
  page.drawText("Art Home", {
    x: 48,
    y: height - 72,
    size: 28,
    font: headingFont,
    color: rgb(1, 1, 1),
  });
  page.drawText("Professional furniture documents", {
    x: 48,
    y: height - 98,
    size: 10,
    font: bodyFont,
    color: rgb(0.86, 0.84, 0.81),
  });
  page.drawText(options.number, {
    x: width - 188,
    y: height - 72,
    size: 16,
    font: headingFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(options.title, {
    x: 48,
    y: height - 188,
    size: 27,
    font: headingFont,
    color: ink,
  });
  page.drawText(options.typeLabel, {
    x: 48,
    y: height - 214,
    size: 12,
    font: headingFont,
    color: accent,
  });

  const details = [
    `${options.partyLabel}: ${options.partyName}`,
    `Email: ${options.partyEmail ?? "-"}`,
    `Phone: ${options.partyPhone ?? "-"}`,
    `Date: ${formatDate(options.issuedAt)}`,
  ];

  let y = height - 252;
  for (const detail of details) {
    page.drawText(detail, { x: 48, y, size: 11, font: bodyFont, color: muted });
    y -= 18;
  }

  const tableTop = height - 350;
  page.drawRectangle({
    x: 48,
    y: tableTop,
    width: width - 96,
    height: 34,
    color: accent,
  });
  page.drawText("Item", {
    x: 60,
    y: tableTop + 11,
    size: 10,
    font: headingFont,
    color: rgb(1, 1, 1),
  });
  page.drawText("Qty", {
    x: 480,
    y: tableTop + 11,
    size: 10,
    font: headingFont,
    color: rgb(1, 1, 1),
  });

  let rowY = tableTop - 28;
  for (const line of options.lines) {
    page.drawText(line.name, {
      x: 60,
      y: rowY,
      size: 11,
      font: headingFont,
      color: ink,
      maxWidth: 360,
    });
    if (line.description) {
      page.drawText(line.description, {
        x: 60,
        y: rowY - 14,
        size: 9,
        font: bodyFont,
        color: muted,
        maxWidth: 360,
      });
    }
    page.drawText(String(line.quantity), {
      x: 484,
      y: rowY,
      size: 11,
      font: bodyFont,
      color: ink,
    });
    rowY -= line.description ? 40 : 28;
    page.drawLine({
      start: { x: 48, y: rowY + 10 },
      end: { x: width - 48, y: rowY + 10 },
      thickness: 0.6,
      color: rgb(0.88, 0.86, 0.83),
    });
  }

  page.drawRectangle({
    x: 48,
    y: 108,
    width: width - 96,
    height: 58,
    color: soft,
    borderColor: rgb(0.86, 0.81, 0.74),
    borderWidth: 1,
  });
  page.drawText("Delivery note confirmation", {
    x: 64,
    y: 140,
    size: 11,
    font: headingFont,
    color: ink,
  });
  page.drawText("This document records delivered quantities and does not request payment.", {
    x: 64,
    y: 122,
    size: 9,
    font: bodyFont,
    color: muted,
  });

  if (options.notes) {
    page.drawText("Notes", { x: 48, y: 82, size: 11, font: headingFont, color: ink });
    page.drawText(options.notes, {
      x: 48,
      y: 64,
      size: 10,
      font: bodyFont,
      color: muted,
      maxWidth: width - 96,
    });
  }

  page.drawText("Art Home - delivery note", {
    x: 48,
    y: 34,
    size: 9,
    font: bodyFont,
    color: muted,
  });

  return pdf.save();
}

export async function generateDebitNotePdf(options: DebitNotePdfOptions) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4_SIZE);
  const fonts = await embedDocumentFonts(pdf);
  let logoImage: PDFImage | null = null;

  try {
    logoImage = await loadBrandLogo(pdf);
  } catch {
    logoImage = null;
  }

  const tableOptions: SalesPdfOptions = {
    title: options.title,
    number: options.number,
    clientName: options.clientName,
    clientAddress: options.clientAddress,
    clientEmail: options.clientEmail,
    clientPhone: options.clientPhone,
    clientNui: options.clientNui,
    clientVatNumber: options.clientVatNumber,
    createdAt: options.issuedAt,
    notes: options.notes,
    lines: options.lines,
    subtotalCents: options.subtotalCents,
    vatEnabled: options.vatEnabled,
    vatRate: options.vatRate,
    vatAmountCents: options.vatAmountCents,
    totalCents: options.totalCents,
  };

  drawTextTop(page, options.title, 45, 88, { font: fonts.bold, size: 28 });
  drawLogoTop(page, logoImage, 420, 60, 130, 96);

  const clientBottom = drawPartyBlock(page, fonts, {
    name: options.clientName,
    details: buildPartyDetails({
      address: options.clientAddress,
      phone: options.clientPhone,
      email: options.clientEmail,
      nui: options.clientNui,
      vatNumber: options.clientVatNumber,
    }),
    x: 45,
    top: 205,
    width: 210,
    nameSize: 10,
    detailSize: 10,
  });

  drawDebitNoteMeta(page, fonts, {
    x: 292,
    top: 173,
    width: 65,
    issuedAt: options.issuedAt,
    invoiceNumber: options.invoiceNumber,
    number: options.number,
  });
  drawLineTop(page, 372, 172, 372, 258, 0.8);
  const companyBottom = drawCompanyBlock(page, fonts, 388, 184, 178);

  const reasonTop = Math.max(274, clientBottom + 14, companyBottom + 14);
  drawTextTop(page, "Arsyeja", 45, reasonTop, { font: fonts.bold, size: 10 });
  const tableTop = drawWrappedTextTop(page, options.reason, 100, reasonTop, {
    font: fonts.body,
    size: 10,
    maxWidth: 450,
    lineHeight: 12,
  }) + 10;

  const tableResult = drawPaginatedSalesInvoiceTable(pdf, page, fonts, tableOptions, logoImage, options.title, tableTop);
  if (tableResult.bottom > 640) {
    const footerPage = addContinuationPage(pdf, fonts, logoImage, options.title, options.number);
    drawDebitNoteFooter(footerPage, fonts, options, 150);
  } else {
    drawDebitNoteFooter(tableResult.page, fonts, options, tableResult.bottom);
  }

  return pdf.save();
}
