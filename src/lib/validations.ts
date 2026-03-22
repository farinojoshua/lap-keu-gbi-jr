import { z } from "zod";

// ---------- Income ----------

export const incomeEntrySchema = z.object({
  periodId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  category: z.string().min(1, "Kategori wajib diisi"),
  subcategory: z.string().default(""),
  description: z.string().default(""),
  amount: z.number().int().min(0, "Jumlah tidak boleh negatif"),
  attendance: z.number().int().min(0).nullable().optional(),
});

export const incomeUpdateSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().int().min(0).optional(),
  attendance: z.number().int().min(0).nullable().optional(),
});

// ---------- Expense ----------

export const expenseEntrySchema = z.object({
  periodId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  category: z.string().min(1, "Kategori wajib diisi"),
  description: z.string().default(""),
  amount: z.number().int().min(0, "Jumlah tidak boleh negatif"),
  isFixed: z.boolean().default(false),
});

export const expenseUpdateSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().int().min(0).optional(),
  isFixed: z.boolean().optional(),
});

// ---------- Period ----------

export const periodUpdateSchema = z.object({
  id: z.string().min(1),
  saldoRekening: z.number().int().optional(),
  saldoCash: z.number().int().optional(),
  saldoPindahan: z.number().int().optional(),
});

// ---------- Expense Template ----------

export const expenseTemplateCreateSchema = z.object({
  category: z.string().min(1, "Kategori wajib diisi"),
  description: z.string().min(1, "Keterangan wajib diisi"),
  defaultAmount: z.number().int().min(0, "Jumlah tidak boleh negatif"),
  isActive: z.boolean().default(true),
});

export const expenseTemplateUpdateSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  defaultAmount: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ---------- Fund Balance ----------

export const fundBalanceSchema = z.object({
  periodId: z.string().min(1),
  fundType: z.string().min(1, "Jenis dana wajib diisi"),
  balance: z.number().int(),
  note: z.string().default(""),
});

// ---------- Komsel ----------

export const komselCreateSchema = z.object({
  name: z.string().min(1, "Nama komsel wajib diisi").max(100).transform((v) => v.trim()),
});

export const komselUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).transform((v) => v.trim()).optional(),
  isActive: z.boolean().optional(),
});

// ---------- User ----------

export const userCreateSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").max(50),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(1, "Nama wajib diisi"),
  role: z.enum(["admin", "bendahara", "dokumentasi"]).default("bendahara"),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "bendahara", "dokumentasi"]).optional(),
});

// ---------- Dokumentasi ----------

export const folderCreateSchema = z.object({
  activityId: z.string().min(1),
  name: z.string().min(1, "Nama folder wajib diisi").max(100).transform((v) => v.trim()),
  parentId: z.string().min(1).nullable().optional(),
});

export const folderUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).transform((v) => v.trim()).optional(),
});

export const activityCreateSchema = z.object({
  name: z.string().min(1, "Nama kegiatan wajib diisi").max(100).transform((v) => v.trim()),
});

export const activityUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).transform((v) => v.trim()).optional(),
  isActive: z.boolean().optional(),
});

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
] as const;

export const uploadUrlRequestSchema = z.object({
  activityId: z.string().min(1),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  fileSize: z.number().int().min(1),
  title: z.string().default(""),
  folderId: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  const isVideo = data.contentType.startsWith("video/");
  const maxSize = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  if (data.fileSize > maxSize) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: isVideo
        ? "Ukuran video maksimal 100MB"
        : "Ukuran foto maksimal 25MB",
      path: ["fileSize"],
    });
  }
});

export const mediaCreateSchema = z.object({
  activityId: z.string().min(1),
  folderId: z.string().min(1).nullable().optional(),
  title: z.string().default(""),
  fileType: z.enum(["image", "video"]),
  mimeType: z.string().min(1),
  r2Key: z.string().min(1),
  url: z.string().url(),
});

export const mediaUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).optional(),
});

export const mediaMoveSchema = z.object({
  id: z.string().min(1),
  folderId: z.string().min(1).nullable(),
});
