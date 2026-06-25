"use client";

import { useEffect, useMemo, useState } from "react";
import type { Painel, Ticket, Stage } from "@/lib/types";
import { NIVEL_LABEL } from "@/lib/types";

type SessionUser = { email: string; role: "admin" | "editor" };

/* ---------------- helpers ---------------- */
function fmt(n: number) { return n.toLocaleString("pt-BR"); }

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function parseData(d: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, dia] = d.split("-").map(Number);
  return new Date(y, m - 1, dia);
}
function dataCurta(d: string) {
  const dt = parseData(d);
  if (!dt) return "—";
  return `${dt.getDate()} de ${MESES[dt.getMonth()]} ${dt.getFullYear()}`;
}
function hojeZero() { const h = new Date(); h.setHours(0, 0, 0, 0); return h; }
function estaAtrasado(t: Ticket): boolean {
  if (t.isClosed || !t.dataPrevista) return false;
  const dt = parseData(t.dataPrevista);
  return !!dt && dt.getTime() < hojeZero().getTime();
}
// "Em andamento" = já está em execução: fica fixo no topo e não é repriorizado.
function emAndamento(t: Ticket): boolean { return /andamento/i.test(t.status); }

// tom visual do status a partir do estágio
function toneDe(label: string, isClosed: boolean): string {
  const l = label.toLowerCase();
  if (/cancel/.test(l)) return "st-cancel";
  if (isClosed || /conclu|aprovado\b|finaliz/.test(l)) return "st-done";
  if (/andamento|execu|fazendo|doing/.test(l)) return "st-doing";
  if (/aguard|aprova|espera|stand|análise|analise|revis/.test(l)) return "st-wait";
  return "st-todo";
}
function StatusBadge({ label, isClosed }: { label: string; isClosed: boolean }) {
  return (
    <span className={`badge ${toneDe(label, isClosed)}`}>
      <span className="bd" /> {label}
    </span>
  );
}

const NIVEL_TONE: Record<string, string> = { LOW: "pr-low", MEDIUM: "pr-med", HIGH: "pr-high", URGENT: "pr-urgent" };

type FilaInfo = { rank: number; isFirst: boolean; isLast: boolean };

function PriorityCell({
  t, canEdit, info, saving, salvarNivel, mover, priorizar, tirarDaFila,
}: {
  t: Ticket;
  canEdit: boolean;
  info?: FilaInfo;
  saving: boolean;
  salvarNivel: (id: string, nivel: string) => void;
  mover: (id: string, dir: "up" | "down") => void;
  priorizar: (id: string) => void;
  tirarDaFila: (id: string) => void;
}) {
  const travado = emAndamento(t);
  const nivelBadge = t.prioridadeNivel ? (
    <span className={`badge ${NIVEL_TONE[t.prioridadeNivel] ?? ""}`}><span className="bd" />{NIVEL_LABEL[t.prioridadeNivel] ?? t.prioridadeNivel}</span>
  ) : null;

  // Em andamento: prioridade congelada (sem controles), mesmo para editor.
  if (!canEdit || travado) {
    const rank = !travado && info ? <span className="rankpill">#{info.rank}</span> : null;
    if (!nivelBadge && !rank && !travado) return <span className="faint">—</span>;
    return (
      <span className="prcell">
        {nivelBadge || (travado ? <span className="faint">—</span> : null)}
        {rank}
        {travado && <span className="lockpill" title="Em andamento — urgência e ordem não são mais alteradas">em execução</span>}
      </span>
    );
  }

  return (
    <span className={`prcell edit ${saving ? "saving" : ""}`}>
      <select className="prsel" value={t.prioridadeNivel} onChange={(e) => salvarNivel(t.id, e.target.value)} disabled={saving}>
        <option value="">— nível</option>
        <option value="LOW">Baixa</option>
        <option value="MEDIUM">Média</option>
        <option value="HIGH">Alta</option>
        <option value="URGENT">Urgente</option>
      </select>
      {info ? (
        <span className="rankctl">
          <button className="rankbtn" title="Subir na fila" disabled={saving || info.isFirst} onClick={() => mover(t.id, "up")}>▲</button>
          <span className="rankpill">#{info.rank}</span>
          <button className="rankbtn" title="Descer na fila" disabled={saving || info.isLast} onClick={() => mover(t.id, "down")}>▼</button>
          <button className="xbtn" title="Tirar da fila" disabled={saving} onClick={() => tirarDaFila(t.id)}>×</button>
        </span>
      ) : (
        <button className="qbtn" title="Adicionar à fila de prioridade" disabled={saving} onClick={() => priorizar(t.id)}>+ fila</button>
      )}
    </span>
  );
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <div className="empty">sem dados</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-row reveal" style={{ animationDelay: `${i * 45}ms` }} key={d.label}>
          <div className="bl" title={d.label}>{d.label}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} /></div>
          <div className="bv">{fmt(d.value)}</div>
          <div className="bp">{Math.round((d.value / total) * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- tabela ---------------- */
type SortKey = "nome" | "prioridade" | "status" | "area" | "proprietario" | "solicitante" | "dataPrevista" | "criadoEm";

function TicketsTable({
  tickets, stages, areas, proprietarios, canEdit, filaInfo, savingIds, salvarNivel, mover, priorizar, tirarDaFila,
}: {
  tickets: Ticket[]; stages: Stage[]; areas: string[]; proprietarios: string[];
  canEdit: boolean;
  filaInfo: Map<string, FilaInfo>;
  savingIds: Set<string>;
  salvarNivel: (id: string, nivel: string) => void;
  mover: (id: string, dir: "up" | "down") => void;
  priorizar: (id: string) => void;
  tirarDaFila: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [prop, setProp] = useState("");
  const [nivel, setNivel] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "criadoEm", dir: -1 });

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    let arr = tickets.filter((t) => {
      if (area && t.area !== area) return false;
      if (status && t.status !== status) return false;
      if (prop && t.proprietario !== prop) return false;
      if (nivel && t.prioridadeNivel !== nivel) return false;
      if (termo) {
        const blob = `${t.nome} ${t.solicitante} ${t.email} ${t.area} ${t.status} ${t.proprietario}`.toLowerCase();
        if (!blob.includes(termo)) return false;
      }
      return true;
    });
    const { key, dir } = sort;
    const nivelRank: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, "": 0 };
    arr = arr.slice().sort((a, b) => {
      // "Em andamento" sempre no topo, independente do critério de ordenação.
      const ae = emAndamento(a) ? 0 : 1, be = emAndamento(b) ? 0 : 1;
      if (ae !== be) return ae - be;
      let av: string | number = "", bv: string | number = "";
      if (key === "status") { av = a.statusOrder; bv = b.statusOrder; }
      else if (key === "prioridade") {
        // ordem da fila primeiro (vazio por último), desempata pelo nível
        av = a.prioridadeOrdem ?? Number.MAX_SAFE_INTEGER;
        bv = b.prioridadeOrdem ?? Number.MAX_SAFE_INTEGER;
        if (av === bv) { av = -(nivelRank[a.prioridadeNivel] ?? 0); bv = -(nivelRank[b.prioridadeNivel] ?? 0); }
      }
      else if (key === "dataPrevista") {
        av = a.dataPrevista || "9999-99-99"; bv = b.dataPrevista || "9999-99-99";
      }
      else { av = (a as any)[key] ?? ""; bv = (b as any)[key] ?? ""; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [tickets, q, area, status, prop, nivel, sort]);

  function th(key: SortKey, label: string) {
    const ativo = sort.key === key;
    return (
      <th className="sortable" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{ativo && <span className="arrow">{sort.dir === 1 ? "▲" : "▼"}</span>}
      </th>
    );
  }

  return (
    <>
      <div className="tbar">
        <input className="inp" placeholder="Buscar por nome, solicitante, e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="sel" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {stages.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}
        </select>
        <select className="sel" value={prop} onChange={(e) => setProp(e.target.value)}>
          <option value="">Todos os proprietários</option>
          {proprietarios.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="sel" value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="">Toda prioridade</option>
          <option value="URGENT">Urgente</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Média</option>
          <option value="LOW">Baixa</option>
        </select>
        <span className="tcount">{fmt(filtrados.length)} / {fmt(tickets.length)}</span>
      </div>

      <div className="tablewrap">
        <div className="tscroll">
          <table className="tbl">
            <thead>
              <tr>
                {th("nome", "Nome do ticket")}
                {th("prioridade", "Prioridade")}
                {th("status", "Status")}
                {th("area", "Área do solicitante")}
                {th("proprietario", "Proprietário")}
                {th("solicitante", "Solicitante")}
                <th>E-mail do solicitante</th>
                {th("dataPrevista", "Data prevista")}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((t) => {
                const atrasado = estaAtrasado(t);
                return (
                  <tr className={`row ${emAndamento(t) ? "row-doing" : ""}`} key={t.id}>
                    <td className="t-nome" title={t.nome}>{t.nome}</td>
                    <td><PriorityCell
                      t={t} canEdit={canEdit} info={filaInfo.get(t.id)} saving={savingIds.has(t.id)}
                      salvarNivel={salvarNivel} mover={mover} priorizar={priorizar} tirarDaFila={tirarDaFila}
                    /></td>
                    <td><StatusBadge label={t.status} isClosed={t.isClosed} /></td>
                    <td><span className="badge area">{t.area || "—"}</span></td>
                    <td className="t-sol">{t.proprietario || "—"}</td>
                    <td className="t-sol">{t.solicitante || "—"}</td>
                    <td className="t-email">{t.email ? <a href={`mailto:${t.email}`}>{t.email}</a> : "—"}</td>
                    <td className={`t-when ${atrasado ? "atrasado" : ""} ${!t.dataPrevista ? "semdata" : ""}`}>
                      {atrasado && <span className="lt">atrasado</span>}
                      {dataCurta(t.dataPrevista)}
                    </td>
                  </tr>
                );
              })}
              {!filtrados.length && (
                <tr><td colSpan={8} className="empty">nenhum ticket com esses filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- dashboard ---------------- */
export default function Dashboard({ initial }: { initial: Painel }) {
  const [data, setData] = useState<Painel>(initial);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [toast, setToast] = useState<{ msg: string; erro: boolean } | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = (localStorage.getItem("psa-sales-theme") as "dark" | "light") || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("psa-sales-theme", t);
  }

  async function atualizar() {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function sair() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }

  const { tickets, stages, areas, proprietarios, fonte } = data;
  const canEdit = user?.role === "admin" || user?.role === "editor";

  // fila de prioridade = tickets com ordem definida, em ordem crescente.
  // a posição exibida (#1, #2…) é sempre recalculada a partir disso.
  const filaInfo = useMemo(() => {
    // a fila numerada é só dos que ainda aguardam — "Em andamento" sai da fila.
    const fila = tickets.filter((t) => t.prioridadeOrdem != null && !emAndamento(t))
      .sort((a, b) => (a.prioridadeOrdem! - b.prioridadeOrdem!) || a.criadoEm.localeCompare(b.criadoEm));
    const m = new Map<string, FilaInfo>();
    fila.forEach((t, i) => m.set(t.id, { rank: i + 1, isFirst: i === 0, isLast: i === fila.length - 1 }));
    return m;
  }, [tickets]);

  // aplica 1+ updates de prioridade com update otimista; reverte tudo se algum falhar.
  async function aplicarPrioridade(updates: { id: string; patch: { nivel?: string; ordem?: number | null } }[]) {
    const ids = updates.map((u) => u.id);
    const antes = new Map(ids.map((id) => [id, data.tickets.find((t) => t.id === id)!]));
    setSavingIds((p) => new Set([...Array.from(p), ...ids]));
    setData((d) => ({
      ...d,
      tickets: d.tickets.map((t) => {
        const u = updates.find((x) => x.id === t.id);
        if (!u) return t;
        return {
          ...t,
          prioridadeNivel: "nivel" in u.patch ? (u.patch.nivel ?? "") : t.prioridadeNivel,
          prioridadeOrdem: "ordem" in u.patch ? (u.patch.ordem ?? null) : t.prioridadeOrdem,
        };
      }),
    }));
    try {
      const ress = await Promise.all(updates.map((u) =>
        fetch("/api/priority", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, ...u.patch }) })
      ));
      const bad = ress.find((r) => !r.ok);
      if (bad) { const d = await bad.json().catch(() => ({})); throw new Error(d.error || "Falha ao salvar."); }
      setToast({ msg: "Prioridade salva no HubSpot.", erro: false });
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setData((d) => ({ ...d, tickets: d.tickets.map((t) => antes.has(t.id) ? antes.get(t.id)! : t) }));
      setToast({ msg: e?.message || "Falha ao salvar.", erro: true });
      setTimeout(() => setToast(null), 4500);
    } finally {
      setSavingIds((p) => { const n = new Set(p); ids.forEach((i) => n.delete(i)); return n; });
    }
  }

  const salvarNivel = (id: string, nivel: string) => { void aplicarPrioridade([{ id, patch: { nivel } }]); };
  const tirarDaFila = (id: string) => { void aplicarPrioridade([{ id, patch: { ordem: null } }]); };
  const priorizar = (id: string) => {
    const max = tickets.reduce((mx, t) => Math.max(mx, t.prioridadeOrdem ?? 0), 0);
    void aplicarPrioridade([{ id, patch: { ordem: max + 1 } }]);
  };
  const mover = (id: string, dir: "up" | "down") => {
    const fila = tickets.filter((t) => t.prioridadeOrdem != null && !emAndamento(t))
      .sort((a, b) => (a.prioridadeOrdem! - b.prioridadeOrdem!) || a.criadoEm.localeCompare(b.criadoEm));
    const idx = fila.findIndex((t) => t.id === id);
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || j < 0 || j >= fila.length) return;
    const A = fila[idx], B = fila[j];
    void aplicarPrioridade([
      { id: A.id, patch: { ordem: B.prioridadeOrdem } },
      { id: B.id, patch: { ordem: A.prioridadeOrdem } },
    ]);
  };

  const kpis = useMemo(() => {
    const concluidas = tickets.filter((t) => t.isClosed).length;
    const abertas = tickets.length - concluidas;
    const atrasadas = tickets.filter(estaAtrasado).length;
    return { total: tickets.length, abertas, concluidas, atrasadas };
  }, [tickets]);

  const porStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets) m.set(t.status, (m.get(t.status) ?? 0) + 1);
    return stages.filter((s) => m.has(s.label)).map((s) => ({ label: s.label, value: m.get(s.label)! }));
  }, [tickets, stages]);

  const porArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets) m.set(t.area, (m.get(t.area) ?? 0) + 1);
    return areas.map((a) => ({ label: a, value: m.get(a) ?? 0 })).filter((d) => d.value > 0);
  }, [tickets, areas]);

  const atualizadoEm = new Date(data.atualizadoEm).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="wrap">
      <header className="header">
        <div className="brand">
          <div className="logo">
            <span style={{ height: "55%" }} /><span style={{ height: "80%" }} /><span style={{ height: "40%" }} /><span style={{ height: "100%" }} />
          </div>
          <div>
            <h1>PSA · <b>SALES</b><span className="pill">Performance | MKT</span></h1>
            <div className="sub">Demandas do time de Sales no pipeline Performance | MKT · HubSpot</div>
          </div>
        </div>
        <div className="headright">
          <div className="live">
            <span className={`dot ${fonte.hubspot ? "" : "seed"}`} />
            {fonte.hubspot ? "ao vivo" : "snapshot"}
          </div>
          <div className="stamp">{atualizadoEm}<small>última atualização</small></div>
          {user ? (
            <div className="userbox">
              <span className="uemail" title={user.email}>{user.email.split("@")[0]}</span>
              <span className="urole">{user.role === "admin" ? "admin" : user.role === "editor" ? "editor" : "leitura"}</span>
              <button className="iconbtn" onClick={sair} title="Sair">⎋</button>
            </div>
          ) : (
            <a className="btn ghost" href="/login">Entrar</a>
          )}
          <button className="iconbtn" onClick={toggleTheme} title="Alternar tema">{theme === "dark" ? "☀" : "☾"}</button>
          <button className="btn" onClick={atualizar} disabled={loading}>{loading ? "…" : "Atualizar"}</button>
        </div>
      </header>
      <hr className="hr" />

      <div className="kpis">
        <div className="kpi lead">
          <div className="lab">Total de demandas</div>
          <div className="num">{fmt(kpis.total)}</div>
          <div className="cap">{areas.length} áreas · pipeline Performance | MKT</div>
        </div>
        <div className="kpi">
          <div className="lab">Em aberto</div>
          <div className="num">{fmt(kpis.abertas)}</div>
          <div className="cap">não concluídas</div>
        </div>
        <div className="kpi">
          <div className="lab">Concluídas</div>
          <div className="num">{fmt(kpis.concluidas)}</div>
          <div className="cap">estágios fechados</div>
        </div>
        <div className="kpi">
          <div className="lab">Entregas atrasadas</div>
          <div className="num" style={{ color: kpis.atrasadas ? "var(--red)" : undefined }}>{fmt(kpis.atrasadas)}</div>
          <div className="cap">em aberto com data vencida</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-head"><div><div className="title">Por status</div><div className="cap">distribuição no pipeline</div></div></div>
          <Bars data={porStatus} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="title">Por área do solicitante</div><div className="cap">de onde vêm as demandas</div></div></div>
          <Bars data={porArea} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="title">Demandas</div>
            <div className="cap">
              {canEdit
                ? "Defina o nível e a ordem da fila na coluna Prioridade — salva direto no HubSpot. Itens “Em andamento” ficam fixos no topo e não são repriorizados."
                : "Clique no cabeçalho para ordenar. Itens “Em andamento” ficam fixos no topo. Entre como editor para definir a prioridade."}
            </div>
          </div>
          <div className="right"><div className="rlab">Tickets</div><div className="rnum">{fmt(tickets.length)}</div></div>
        </div>
        <TicketsTable
          tickets={tickets} stages={stages} areas={areas} proprietarios={proprietarios}
          canEdit={canEdit} filaInfo={filaInfo} savingIds={savingIds}
          salvarNivel={salvarNivel} mover={mover} priorizar={priorizar} tirarDaFila={tirarDaFila}
        />
      </div>

      <div className="footer">PSA · Painel de Sales · fonte: HubSpot {fonte.hubspot ? "(ao vivo)" : "(snapshot)"}</div>

      {toast && <div className={`toast ${toast.erro ? "err" : "ok"}`}>{toast.msg}</div>}
    </div>
  );
}
