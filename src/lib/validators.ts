import {
  DebitNoteReason,
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExpenseCategory,
  FurnitureCategory,
  InvoiceStatus,
  LeadStatus,
  MaterialType,
  OfferStatus,
  QuoteRequestStatus,
  Unit,
} from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional();

const optionalEmail = z.preprocess(
  (value) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text.length > 0 ? text : undefined;
  },
  z.email("Email is invalid").optional(),
);

const optionalAmount = z.preprocess(
  (value) => {
    if (value == null || String(value).trim() === "") {
      return undefined;
    }

    return value;
  },
  z.coerce.number().min(0).optional(),
);

export const loginSchema = z.object({
  email: z.email("Invalid email address").trim(),
  password: z.string().min(8, "Password is required"),
});

export const leadSchema = z.object({
  name: z.string().min(2, "Name is required").trim(),
  phone: z.string().min(6, "Phone is required").trim(),
  email: z.email("Email is invalid").trim(),
  description: z.string().min(12, "Please describe the request in more detail").trim(),
});

export const quoteRequestSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    phone: optionalText,
    email: optionalEmail,
    details: z.string().trim().min(1, "Offer/request details are required"),
  })
  .superRefine((value, context) => {
    if (!value.phone && !value.email) {
      context.addIssue({
        code: "custom",
        path: ["contact"],
        message: "At least one contact method is required",
      });
    }
  });

export const clientSchema = z.object({
  name: z.string().min(2).trim(),
  contactPerson: optionalText,
  email: optionalText,
  phone: optionalText,
  address: optionalText,
  nui: optionalText,
  vatNumber: optionalText,
  notes: optionalText,
});

export const supplierSchema = clientSchema;

export const leadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

export const quoteRequestStatusSchema = z.object({
  status: z.nativeEnum(QuoteRequestStatus),
});

export const materialSchema = z.object({
  name: z.string().min(2).trim(),
  sku: z.string().min(3).trim(),
  type: z.nativeEnum(MaterialType),
  unit: z.nativeEnum(Unit),
  stockQuantity: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
  costPerUnit: z.coerce.number().min(0),
  notes: optionalText,
});

export const inventoryAdjustmentSchema = z.object({
  quantity: z.coerce.number().positive(),
  note: optionalText,
});

export const assetInventorySchema = z.object({
  name: z.string().min(2).trim(),
  quantity: z.coerce.number().positive(),
  value: z.coerce.number().min(0),
  purchaseDate: z.string().min(1),
});

export const productBomItemSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

export const stokArtikullSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

export const stokSchema = z.object({
  name: z.string().min(2).trim(),
  price: z.coerce.number().min(0),
  items: z.array(stokArtikullSchema).min(1),
});

export const workerSchema = z.object({
  name: z.string().min(2).trim(),
  role: z.string().min(2).trim(),
});

export const workerTimeEntrySchema = z.object({
  date: z.string().min(1),
  startTime: z.string().min(1),
  finishTime: z.string().min(1),
});

export const workerAdvanceSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export const productSchema = z.object({
  nameSq: z.string().min(2).trim(),
  nameEn: z.string().min(2).trim(),
  slug: optionalText,
  category: z.nativeEnum(FurnitureCategory),
  summarySq: z.string().min(12).trim(),
  summaryEn: z.string().min(12).trim(),
  descriptionSq: z.string().min(18).trim(),
  descriptionEn: z.string().min(18).trim(),
  dimensions: optionalText,
  materialNotesSq: optionalText,
  materialNotesEn: optionalText,
  featured: z.boolean().default(false),
  basePrice: z.coerce.number().positive(),
  laborCost: z.coerce.number().min(0),
  bom: z.array(productBomItemSchema).min(1),
});

export const offerItemSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

export const offerSchema = z.object({
  clientId: z.string().min(1),
  leadId: optionalText,
  status: z.nativeEnum(OfferStatus),
  validUntil: z.string().min(1),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
  items: z.array(offerItemSchema).min(1),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1),
  status: z.nativeEnum(InvoiceStatus),
  dueDate: z.string().min(1),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
  amountPaid: optionalAmount,
  items: z.array(offerItemSchema).min(1),
});

export const invoiceUpdateSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  dueDate: z.string().min(1),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
  amountPaid: optionalAmount,
});

export const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1),
  status: z.nativeEnum(InvoiceStatus),
  dueDate: z.string().min(1),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
  amountPaid: optionalAmount,
  items: z.array(offerItemSchema).min(1),
});

export const purchaseInvoiceUpdateSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  dueDate: z.string().min(1),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
  amountPaid: optionalAmount,
});

export const deliveryNoteItemSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

export const deliveryNoteSchema = z
  .object({
    type: z.nativeEnum(DeliveryNoteType),
    clientId: optionalText,
    supplierId: optionalText,
    status: z.nativeEnum(DeliveryNoteStatus),
    issuedAt: z.string().min(1),
    notes: optionalText,
    items: z.array(deliveryNoteItemSchema).min(1),
  })
  .superRefine((value, context) => {
    if (value.type === DeliveryNoteType.SALES && !value.clientId) {
      context.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Client is required for sales delivery notes.",
      });
    }

    if (value.type === DeliveryNoteType.PURCHASE && !value.supplierId) {
      context.addIssue({
        code: "custom",
        path: ["supplierId"],
        message: "Supplier is required for purchase delivery notes.",
      });
    }
  });

export const deliveryNoteUpdateSchema = z.object({
  status: z.nativeEnum(DeliveryNoteStatus),
  issuedAt: z.string().min(1),
  notes: optionalText,
});

export const expenseSchema = z.object({
  name: z.string().min(2).trim(),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().min(0),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0).default(18),
  date: z.string().min(1),
  supplierName: optionalText,
  description: optionalText,
});

export const debitNoteItemSchema = z.object({
  invoiceItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

export const debitNoteSchema = z.object({
  clientId: z.string().min(1),
  invoiceId: z.string().min(1),
  issuedAt: z.string().min(1),
  reason: z.nativeEnum(DebitNoteReason),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0).default(18),
  items: z.array(debitNoteItemSchema).min(1),
});

export const debitNoteUpdateSchema = z.object({
  issuedAt: z.string().min(1),
  reason: z.nativeEnum(DebitNoteReason),
  notes: optionalText,
});

export const userCreateSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
  roleId: z.string().min(1),
});

export const userRoleSchema = z.object({
  roleId: z.string().min(1),
});

export const roleSchema = z.object({
  name: z.string().min(2).trim(),
  description: optionalText,
});
