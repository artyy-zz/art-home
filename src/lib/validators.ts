import {
  FurnitureCategory,
  InvoiceStatus,
  LeadStatus,
  MaterialType,
  OfferStatus,
  Unit,
} from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional();

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

export const clientSchema = z.object({
  name: z.string().min(2).trim(),
  contactPerson: optionalText,
  email: optionalText,
  phone: optionalText,
  address: optionalText,
  notes: optionalText,
});

export const leadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
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

export const productBomItemSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.coerce.number().positive(),
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
  productId: z.string().min(1),
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
  items: z.array(offerItemSchema).min(1),
});

export const invoiceUpdateSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  dueDate: z.string().min(1),
  notes: optionalText,
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
});

export const userCreateSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.string().min(1),
});

export const userRoleSchema = z.object({
  roleId: z.string().min(1),
});

export const roleSchema = z.object({
  name: z.string().min(2).trim(),
  description: optionalText,
});
