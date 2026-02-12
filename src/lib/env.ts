import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  NEXTAUTH_SECRET: z.string().min(10, "NEXTAUTH_SECRET minimal 10 karakter"),
  NEXTAUTH_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
