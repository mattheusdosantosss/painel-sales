import { NextResponse } from "next/server";
import { getPainel } from "@/lib/tickets";
import { sessaoAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export async function GET() {
  if (!sessaoAtual()) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  try {
    const painel = await getPainel();
    return NextResponse.json(painel);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "erro" }, { status: 500 });
  }
}
