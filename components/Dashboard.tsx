"use client";

import { useEffect, useMemo, useState } from "react";
import type { Painel, Ticket, Stage } from "@/lib/types";

/* ---------------- helpers ---------------- */
function fmt(n: number) { return n.toLocaleString("pt-BR"); }
function iniciais(s: string) {
  return s.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
}

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

function Bars({ data, color }: { data: { label: string; value: number; tone?: string }[]; color?: boolean }) {
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
type SortKey = "nome" | "status" | "area" | "proprietario" | "solicitante" | "dataPrevista" | "criadoEm";

function TicketsTable({ tickets, stages, areas, proprietarios }: { tickets: Ticket[]; stages: Stage[]; areas: string[]; proprietarios: string[] }) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [prop, setProp] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "criadoEm", dir: -1 });

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    let arr = tickets.filter((t) => {
      if (area && t.area !== area) return false;
      if (status && t.status !== status) return false;
      if (prop && t.proprietario !== prop) return false;
      if (termo) {
        const blob = `${t.nome} ${t.solicitante} ${t.email} ${t.area} ${t.status} ${t.proprietario}`.toLowerCase();
        if (!blob.includes(termo)) return false;
      }
      return true;
    });
    const { key, dir } = sort;
    arr = arr.slice().sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (key === "status") { av = a.statusOrder; bv = b.statusOrder; }
      else if (key === "dataPrevista") {
        // vazios sempre por último, independente da direção
        av = a.dataPrevista || "9999-99-99"; bv = b.dataPrevista || "9999-99-99";
      }
      else { av = (a as any)[key] ?? ""; bv = (b as any)[key] ?? ""; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [tickets, q, area, status, prop, sort]);

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
        <span className="tcount">{fmt(filtrados.length)} / {fmt(tickets.length)}</span>
      </div>

      <div className="tablewrap">
        <div className="tscroll">
          <table className="tbl">
            <thead>
              <tr>
                {th("nome", "Nome do ticket")}
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
                  <tr className="row" key={t.id}>
                    <td className="t-nome" title={t.nome}>{t.nome}</td>
                    <td><StatusBadge label={t.status} isClosed={t.isClosed} /></td>
                    <td><span className="badge area">{t.area || "—"}</span></td>
                    <td>
                      {t.proprietario && t.proprietario !== "—" ? (
                        <span className="owner"><span className="oav">{iniciais(t.proprietario)}</span>{t.proprietario}</span>
                      ) : "—"}
                    </td>
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
                <tr><td colSpan={7} className="empty">nenhum ticket com esses filtros</td></tr>
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

  useEffect(() => {
    const t = (localStorage.getItem("psa-sales-theme") as "dark" | "light") || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
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

  const { tickets, stages, areas, proprietarios, fonte } = data;

  const kpis = useMemo(() => {
    const concluidas = tickets.filter((t) => t.isClosed).length;
    const abertas = tickets.length - concluidas;
    const atrasadas = tickets.filter(estaAtrasado).length;
    return { total: tickets.length, abertas, concluidas, atrasadas };
  }, [tickets]);

  const porStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets) m.set(t.status, (m.get(t.status) ?? 0) + 1);
    // segue a ordem do pipeline; status sem ocorrência ficam de fora
    return stages
      .filter((s) => m.has(s.label))
      .map((s) => ({ label: s.label, value: m.get(s.label)! }));
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
          <div className="card-head">
            <div><div className="title">Por status</div><div className="cap">distribuição no pipeline</div></div>
          </div>
          <Bars data={porStatus} />
        </div>
        <div className="card">
          <div className="card-head">
            <div><div className="title">Por área do solicitante</div><div className="cap">de onde vêm as demandas</div></div>
          </div>
          <Bars data={porArea} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="title">Demandas</div>
            <div className="cap">Comercial · Comercial B2B/B2C · Farmer B2B · CS B2B/B2C — clique no cabeçalho para ordenar</div>
          </div>
          <div className="right"><div className="rlab">Tickets</div><div className="rnum">{fmt(tickets.length)}</div></div>
        </div>
        <TicketsTable tickets={tickets} stages={stages} areas={areas} proprietarios={proprietarios} />
      </div>

      <div className="footer">PSA · Painel de Sales · fonte: HubSpot {fonte.hubspot ? "(ao vivo)" : "(snapshot)"}</div>
    </div>
  );
}
