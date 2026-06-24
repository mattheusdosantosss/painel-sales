export type Ticket = {
  id: string;
  nome: string;         // subject
  statusId: string;     // hs_pipeline_stage (id)
  status: string;       // label do estágio
  statusOrder: number;  // ordem do estágio no pipeline (p/ agrupar/ordenar)
  isClosed: boolean;    // estágio "fechado" (concluído/cancelado)
  area: string;         // area_do_solicitante (ex: "Comercial | B2B")
  solicitante: string;  // solicitante
  email: string;        // e_mail_do_solicitante
  dataPrevista: string; // "YYYY-MM-DD" ou ""
  criadoEm: string;     // ISO ou ""
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
  total: number;
  fonte: { hubspot: boolean }; // true = ao vivo; false = snapshot (seed)
  atualizadoEm: string;     // ISO
};
