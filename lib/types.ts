export type Ticket = {
  id: string;
  nome: string;         // subject
  statusId: string;     // hs_pipeline_stage (id)
  status: string;       // label do estágio
  statusOrder: number;  // ordem do estágio no pipeline (p/ agrupar/ordenar)
  isClosed: boolean;    // estágio "fechado" (concluído/cancelado)
  area: string;         // area_do_solicitante (ex: "Comercial | B2B")
  proprietario: string; // hubspot_owner_id resolvido p/ nome (responsável)
  proprietarioId: string;
  solicitante: string;  // solicitante
  email: string;        // e_mail_do_solicitante
  dataPrevista: string; // "YYYY-MM-DD" ou ""
  criadoEm: string;     // ISO ou ""
  // prioridade definida pelo time (write-back no HubSpot)
  prioridadeNivel: string;       // "" | "LOW" | "MEDIUM" | "HIGH" | "URGENT" (hs_ticket_priority)
  prioridadeOrdem: number | null; // posição na fila (prioridade_de_demandas)
};

export const NIVEIS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const NIVEL_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export type Stage = {
  id: string;
  label: string;
  order: number;
  isClosed: boolean;
};

export type Painel = {
  tickets: Ticket[];
  stages: Stage[];          // estágios do pipeline, em ordem
  areas: string[];          // áreas presentes nos tickets, em ordem fixa
  proprietarios: string[];  // proprietários (responsáveis) presentes, ordenados
  total: number;
  fonte: { hubspot: boolean }; // true = ao vivo; false = snapshot (seed)
  atualizadoEm: string;     // ISO
};
