import type { Painel, Ticket, Stage } from "./types";
import { SEED_TICKETS, SEED_STAGES } from "./seed";
import { getHubspotPainel, AREAS_INCLUIDAS } from "./hubspot";

// Ordem fixa das áreas (a mesma do filtro pedido pelo time de Sales).
function ordenarAreas(tickets: Ticket[]): string[] {
  const presentes = new Set(tickets.map((t) => t.area).filter(Boolean));
  const ordenadas = AREAS_INCLUIDAS.filter((a) => presentes.has(a));
  // qualquer área inesperada que apareça vai pro fim, sem sumir do painel
  for (const a of presentes) if (!ordenadas.includes(a)) ordenadas.push(a);
  return ordenadas;
}

export async function getPainel(): Promise<Painel> {
  const temToken = !!process.env.HUBSPOT_TOKEN;

  let tickets: Ticket[] = SEED_TICKETS;
  let stages: Stage[] = SEED_STAGES;
  let hubspot = false;

  if (temToken) {
    try {
      const live = await getHubspotPainel();
      tickets = live.tickets;
      stages = live.stages;
      hubspot = true;
    } catch (e) {
      console.error("HubSpot falhou, usando seed:", e);
    }
  }

  return {
    tickets,
    stages,
    areas: ordenarAreas(tickets),
    total: tickets.length,
    fonte: { hubspot },
    atualizadoEm: new Date().toISOString(),
  };
}
