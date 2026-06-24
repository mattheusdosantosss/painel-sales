import { NextResponse } from "next/server";
import { getPainel } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export async function GET() {
  try {
    const painel = await getPainel();
    return NextResponse.json(painel);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "erro" }, { status: 500 });
  }
}
