import type { Ticket, Stage } from "./types";

// Snapshot real do pipeline "Performance | MKT" (áreas do time de Sales),
// capturado do HubSpot em 24/06/2026. Serve de fallback quando não há
// HUBSPOT_TOKEN configurado — assim o painel renderiza com dados de verdade.
// Com o token, lib/hubspot.ts substitui isto pela leitura ao vivo.

// Estágios do pipeline "Performance | MKT" (confirmados no HubSpot em 26/06/2026).
// Em produção, lib/hubspot.ts substitui isto pela leitura ao vivo. A ordem aqui
// segue a listagem desejada (Em andamento → Backlog da Semana → Aguardando → Backlog → Concluído).
export const SEED_STAGES: Stage[] = [
  { id: "1311051533", label: "Em andamento", order: 0, isClosed: false },
  { id: "1367455656", label: "Backlog da Semana", order: 1, isClosed: false },
  { id: "1164776348", label: "Aguardando aprovação", order: 2, isClosed: false },
  { id: "1164776347", label: "Backlog", order: 3, isClosed: false },
  { id: "1164776349", label: "Concluído", order: 4, isClosed: true },
];

const STAGE = new Map(SEED_STAGES.map((s) => [s.id, s]));

// Proprietário (responsável) por ticket no snapshot. A grande maioria é do
// Mattheus; estes ids são do Leonardo Marcondes Moreira.
const PROPRIETARIO_LEONARDO = new Set([
  "46155090009", "46068263178", "46108667750", "46074613885",
]);
function proprietarioDe(id: string): { nome: string; id: string } {
  return PROPRIETARIO_LEONARDO.has(id)
    ? { nome: "Leonardo Marcondes Moreira", id: "79453134" }
    : { nome: "Mattheus Faleiro dos Santos", id: "91810791" };
}

// Prioridades de exemplo no snapshot, só p/ ilustrar a feature.
// Em andamento (sem ordem): nível congelado, fixo no topo, fora da fila.
// Aguardando/Backlog (com ordem): a fila numerada (#1, #2, #3) com setas.
const PRIORIDADE_SEED: Record<string, { nivel?: string; ordem?: number }> = {
  "46068245154": { nivel: "URGENT" },           // Sales | Painel (Em andamento)
  "46074539114": { nivel: "HIGH" },             // B2C | Migração TBW (Em andamento)
  "45852047224": { nivel: "HIGH", ordem: 1 },   // [B2B] | Painel tático (Aguardando)
  "45725553936": { nivel: "MEDIUM", ordem: 2 }, // B2C | Ajustes painel Pri (Aguardando)
  "46108667909": { nivel: "LOW", ordem: 3 },    // B2B | alteração check list (Backlog)
};

// [id, subject, stageId, area, solicitante, email, dataPrevista, criadoEm]
type Row = [string, string, string, string, string, string, string, string];

const ROWS: Row[] = [
  ["46155090009", "Link Agenda | Sthefany Mello", "1164776347", "CS | B2C", "Bruna Eckhardt", "bruna.eckhardt@profissionaissa.com", "2026-06-26", "2026-06-24T19:18:05Z"],
  ["46068263178", "B2B | Notificação para o Farmer saber quando avança os negócios criados", "1164776349", "Farmer | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "", "2026-06-24T17:21:18Z"],
  ["46108667750", "B2B | Automação de disparo de Whats pós-proposta enviada", "1164776349", "Comercial | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "", "2026-06-24T17:18:59Z"],
  ["46074539114", "B2C | Migração fluxo TBW para WhatsApp", "1311051533", "CS | B2C", "Bruna Eckardt", "bruna.eckhadr@profissionaissa.com", "2026-07-03", "2026-06-23T19:16:30Z"],
  ["46068245154", "Sales | Painel para acompanhamento das demandas comerciais", "1311051533", "Comercial", "Leonardo Moreira", "leonardo.moreira@profissionaissa.com", "2026-06-26", "2026-06-23T16:24:07Z"],
  ["46108667909", "B2B | alteração do check list atual de Farmer", "1164776347", "Farmer | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "", "2026-06-22T17:26:45Z"],
  ["46074676797", "B2B | UTM para os Farmers", "1164776347", "Farmer | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "", "2026-06-22T17:25:42Z"],
  ["46074613885", "B2B | Ajuste no processo de \"perdido\" B2B", "1311051533", "Comercial | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "2026-06-26", "2026-06-18T17:23:44Z"],
  ["45852047224", "[B2B] | Painel tático dos farmers", "1164776348", "Farmer | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "2026-06-26", "2026-06-18T11:45:28Z"],
  ["45772392197", "B2B | Ajuste nos números dos farmers", "1164776349", "Farmer | B2B", "Leticia Santos", "leticia.santos@profissionaissa.com", "2026-06-15", "2026-06-15T19:36:57Z"],
  ["45771981872", "[B2C] Testar o fluxo no n8n do Tchat para envio de mensagem", "1164776349", "Comercial | B2C", "Leonardo Moreira", "leonardo.moreira@profissionaissa.com", "2026-06-15", "2026-06-15T14:26:49Z"],
  ["45725553936", "B2C | Ajustes no painel da Pri / Farmers", "1164776348", "Farmer | B2B", "Leandro Bengochea", "lenadro.bengochea@profissionaissa.com", "2026-06-19", "2026-06-08T19:39:46Z"],
  ["45665036156", "TBS | Dash para acompanhar o Max", "1164776349", "CS | B2C", "Leonardo Moreira", "leonardo.moreira@profissionaissa.com", "2026-06-05", "2026-06-03T12:39:20Z"],
  ["45688377732", "B2B | Adição de botão de check \"Contato Atualizado\" na empresa", "1164776347", "Farmer | B2B", "Leandro Bengochea", "leandro.bengochea@profissionaissa.com", "2026-06-02", "2026-06-02T11:51:26Z"],
  ["45666894639", "B2C | Melhorias no processo de Partner (Fay)", "1164776348", "CS | B2C", "Camila Fay", "camila.fay@profissionaissa.com", "2026-06-05", "2026-05-28T12:31:19Z"],
  ["45542215274", "B2C | Ajuste na \"Criação de negócios\" quando a reunião é marcada", "1164776349", "Comercial | B2C", "Nicollas Lenuzza", "nicollas.lenuzza@profissionaissa.com", "2026-06-12", "2026-05-27T11:07:55Z"],
  ["45542151576", "B2B | Criação de telefone para whats no Hub | Talita", "1164776349", "Comercial | B2B", "César Filho", "cesar.filho@profissionaissa.com", "2026-05-28", "2026-05-27T11:03:32Z"],
  ["45541969409", "B2C | Criação de telefone para whats no Hub | João Paulo", "1164776349", "Comercial | B2C", "Leonardo Moreira", "leonardo.moreira@profissionaissa.com", "2026-05-28", "2026-05-27T11:02:24Z"],
  ["45497542720", "[TBW] Inclusão de novas turmas", "1164776349", "CS | B2C", "Bruna Eckardt", "bruna.eckhadr@profissionaissa.com", "", "2026-05-25T20:52:26Z"],
  ["45422979952", "LP | TBday pelo Brasil", "1164776349", "Comercial | B2C", "Leonardo Moreira", "leonardo.moreira@profissionaissa.com", "2026-05-22", "2026-05-21T12:35:53Z"],
  ["45337828196", "[B2B] | Painel sobre Sistema S", "1164776349", "Comercial | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "2026-05-20", "2026-05-18T16:21:34Z"],
  ["45336262759", "[B2B] | Aviso sobre demandas do Sistema S", "1164776349", "Comercial | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "2026-05-18", "2026-05-18T15:05:58Z"],
  ["45269897632", "[B2B] | Aviso aos farmers por e-mail qdo negócio for perdido", "1164776349", "Farmer | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "2026-05-14", "2026-05-14T00:03:34Z"],
  ["45269763860", "[B2B] | Fluxo para criação de negócios do sistema S", "1164776349", "Comercial | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "", "2026-05-13T12:24:07Z"],
  ["45274009097", "[B2B] | Formulário para demandas do sistema S", "1164776349", "Farmer | B2B", "Eduardo Tavares", "eduardo.tavares@profissionaissa.com", "", "2026-05-12T11:15:50Z"],
  ["45269580930", "[B2C] | Automação para avaliação de mentoria com Gil", "1164776349", "CS | B2C", "Bruna Eckardt", "bruna.eckhadr@profissionaissa.com", "", "2026-05-11T11:17:22Z"],
  ["45269940598", "[TBS] | IA de suporte", "1164776349", "CS | B2C", "Bruna Eckardt", "bruna.eckhadr@profissionaissa.com", "2026-05-14", "2026-05-11T11:14:28Z"],
];

export const SEED_TICKETS: Ticket[] = ROWS.map(
  ([id, nome, statusId, area, solicitante, email, dataPrevista, criadoEm]) => {
    const st = STAGE.get(statusId);
    const prop = proprietarioDe(id);
    return {
      id,
      nome,
      statusId,
      status: st?.label || "—",
      statusOrder: st?.order ?? 999,
      isClosed: st?.isClosed ?? false,
      area,
      proprietario: prop.nome,
      proprietarioId: prop.id,
      solicitante,
      email,
      dataPrevista,
      criadoEm,
      prioridadeNivel: PRIORIDADE_SEED[id]?.nivel ?? "",
      prioridadeOrdem: PRIORIDADE_SEED[id]?.ordem ?? null,
    };
  }
);
