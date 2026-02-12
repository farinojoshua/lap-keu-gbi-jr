import { join } from "node:path";

export function getDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("file:")) {
    const relative = dbUrl.replace("file:", "");
    if (relative.startsWith("/") || /^[A-Za-z]:/.test(relative)) {
      return relative;
    }
    return join(process.cwd(), "prisma", relative);
  }
  return join(process.cwd(), "prisma", "dev.db");
}
