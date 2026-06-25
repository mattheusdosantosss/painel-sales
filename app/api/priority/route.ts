import { NextResponse } from "next/server";
import { sessaoAtual, podeEditar } from "@/lib/auth";
import { salvarPrioridade } from "@/lib/hubspot";
import { NIVEIS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(req: Request) {
  const user = sessaoAtual();
  if (!podeEditar(user)) {
    return NextResponse.json({ error: "Sem permissão. Faça login como editor." }, { status: 401 });
  }
  if (!process.env.HUBSPOT_TOKEN) {
    return NextResponse.json(
      { error: "Edição indisponível: HUBSPOT_TOKEN não configurado (modo snapshot)." },
      { status: 400 }
    );
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { id } = body || {};
  if (!id) return NextResponse.json({ error: "id do ticket ausente." }, { status: 400 });

  // nível: undefined = não mexe; null/"" = limpa; senão precisa ser um nível válido.
  let nivel: string | null | undefined = undefined;
  if ("nivel" in body) {
    const v = body.nivel;
    if (v == null || v === "") nivel = "";
    else if (NIVEIS.includes(v)) nivel = v;
    else return NextResponse.json({ error: "Nível inválido." }, { status: 400 });
  }

  // ordem: undefined = não mexe; null = limpa; senão inteiro >= 0.
  let ordem: number | null | undefined = undefined;
  if ("ordem" in body) {
    const v = body.ordem;
    if (v == null || v === "") ordem = null;
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "Ordem inválida." }, { status: 400 });
      ordem = Math.round(n);
    }
  }

  const r = await salvarPrioridade(String(id), nivel, ordem);
  if (!r.ok) {
    const msg = r.status === 403
      ? "HubSpot recusou (403): o token não tem o scope crm.objects.tickets.write."
      : `HubSpot recusou a gravação (status ${r.status}).`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  return NextResponse.json({
    id: String(id),
    nivel: nivel === undefined ? undefined : nivel,
    ordem: ordem === undefined ? undefined : ordem,
  });
}
