import type { Ticket, Stage } from "./types";

const BASE = "https://api.hubapi.com";

// Pipeline "Performance | MKT" e as áreas do solicitante que o time de Sales
// acompanha. Dá pra sobrescrever por env sem mexer no código.
const PIPELINE_ID = process.env.HUBSPOT_TICKETS_PIPELINE || "794615341";
const AREAS = (
  process.env.HUBSPOT_AREAS ||
  "Comercial;Comercial | B2B;Comercial | B2C;Farmer | B2B;CS | B2B;CS | B2C"
)
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

export const AREAS_INCLUIDAS = AREAS;

const PROPS = [
  "subject",
  "hs_pipeline_stage",
  "area_do_solicitante",
  "hubspot_owner_id",
  "solicitante",
  "e_mail_do_solicitante",
  "data_prevista_de_entrega",
  "createdate",
  "hs_ticket_priority",
  "prioridade_de_demandas",
];

type HsTicket = { id?: string; properties: Record<string, string | null> };

function headers() {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error("HUBSPOT_TOKEN ausente");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function toISO(v: string | null | undefined): string {
  if (!v) return "";
  const d = /^\d+$/.test(v) ? new Date(Number(v)) : new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

// Datas "date picker" do HubSpot chegam como meia-noite UTC (ms epoch ou ISO).
// Queremos só a parte YYYY-MM-DD, sem deslocar o dia por fuso.
function toDateOnly(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = /^\d+$/.test(v) ? new Date(Number(v)) : new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// Busca os estágios do pipeline (id -> label, ordem, fechado). Assim os rótulos
// e a ordem das colunas vêm sempre certos do HubSpot, sem hardcode.
export async function buscarEstagios(): Promise<Stage[]> {
  const res = await fetch(`${BASE}/crm/v3/pipelines/tickets/${PIPELINE_ID}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HubSpot pipelines ${res.status}`);
  const data = await res.json();
  const stages: Stage[] = (data.stages ?? []).map((s: any) => ({
    id: String(s.id),
    label: String(s.label ?? "").trim(),
    order: Number(s.displayOrder ?? 0),
    isClosed: String(s.metadata?.isClosed ?? "false") === "true",
  }));
  return stages.sort((a, b) => a.order - b.order);
}

// Mapa ownerId -> nome do proprietário. Lê todos os owners da conta (paginado)
// e monta o índice; assim resolvemos o "Proprietário do ticket" de uma vez.
export async function buscarProprietarios(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let after: string | undefined = undefined;
  for (let i = 0; i < 20; i++) {
    const url = new URL(`${BASE}/crm/v3/owners`);
    url.searchParams.set("limit", "500");
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url.toString(), { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`HubSpot owners ${res.status}`);
    const data = await res.json();
    for (const o of data.results ?? []) {
      const nome = `${(o.firstName ?? "").trim()} ${(o.lastName ?? "").trim()}`.trim() || (o.email ?? "").trim();
      if (o.id != null) map.set(String(o.id), nome || "—");
    }
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return map;
}

// Pagina todos os tickets do pipeline cujas áreas estão na lista do time de Sales.
async function buscarTickets(): Promise<HsTicket[]> {
  const out: HsTicket[] = [];
  let after: string | undefined = undefined;
  for (let i = 0; i < 50; i++) {
    const body: any = {
      filterGroups: [
        {
          filters: [
            { propertyName: "hs_pipeline", operator: "EQ", value: PIPELINE_ID },
            { propertyName: "area_do_solicitante", operator: "IN", values: AREAS },
          ],
        },
      ],
      properties: PROPS,
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      limit: 100,
    };
    if (after) body.after = after;
    const res = await fetch(`${BASE}/crm/v3/objects/tickets/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HubSpot tickets search ${res.status}`);
    const data = await res.json();
    out.push(...(data.results ?? []));
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}

// Grava a prioridade (nível e/ou ordem) de volta no ticket do HubSpot.
// nivel/ordem === undefined => não mexe naquele campo. null/"" => limpa o campo.
// Status 403 = token sem o scope crm.objects.tickets.write.
export async function salvarPrioridade(
  id: string,
  nivel: string | null | undefined,
  ordem: number | null | undefined
): Promise<{ ok: boolean; status: number }> {
  const properties: Record<string, string> = {};
  if (nivel !== undefined) properties.hs_ticket_priority = nivel ?? "";
  if (ordem !== undefined) properties.prioridade_de_demandas = ordem == null ? "" : String(ordem);
  if (Object.keys(properties).length === 0) return { ok: true, status: 200 };
  const res = await fetch(`${BASE}/crm/v3/objects/tickets/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ properties }),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status };
}

export async function getHubspotPainel(): Promise<{
  tickets: Ticket[];
  stages: Stage[];
}> {
  const [stages, raw, owners] = await Promise.all([
    buscarEstagios(),
    buscarTickets(),
    buscarProprietarios().catch(() => new Map<string, string>()),
  ]);
  const byId = new Map(stages.map((s) => [s.id, s]));

  const tickets: Ticket[] = raw.map((t) => {
    const p = t.properties;
    const stageId = (p.hs_pipeline_stage ?? "").trim();
    const st = byId.get(stageId);
    const ownerId = (p.hubspot_owner_id ?? "").trim();
    return {
      id: t.id ?? p.hs_object_id ?? "",
      nome: (p.subject ?? "").trim() || "(sem título)",
      statusId: stageId,
      status: st?.label || "—",
      statusOrder: st?.order ?? 999,
      isClosed: st?.isClosed ?? false,
      area: (p.area_do_solicitante ?? "").trim(),
      proprietario: ownerId ? owners.get(ownerId) || "—" : "—",
      proprietarioId: ownerId,
      solicitante: (p.solicitante ?? "").trim(),
      email: (p.e_mail_do_solicitante ?? "").trim(),
      dataPrevista: toDateOnly(p.data_prevista_de_entrega),
      criadoEm: toISO(p.createdate),
      prioridadeNivel: (p.hs_ticket_priority ?? "").trim(),
      prioridadeOrdem: p.prioridade_de_demandas != null && p.prioridade_de_demandas !== ""
        ? Number(p.prioridade_de_demandas)
        : null,
    };
  });

  // Ordem padrão: mais recentes primeiro (igual à visão do HubSpot).
  tickets.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  return { tickets, stages };
}
