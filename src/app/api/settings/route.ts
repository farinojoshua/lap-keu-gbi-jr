import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.churchInfo.findMany();
  const result: Record<string, string> = {};
  settings.forEach((s) => {
    result[s.key] = s.value;
  });
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.churchInfo.upsert({
      where: { key },
      update: { value: value as string },
      create: { key, value: value as string },
    });
  }

  return NextResponse.json({ success: true });
}
