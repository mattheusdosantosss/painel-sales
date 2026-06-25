"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setErro(d.error || "Não foi possível entrar.");
      }
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginwrap">
      <form className="loginbox" onSubmit={entrar}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="logo">
            <span style={{ height: "55%" }} /><span style={{ height: "80%" }} /><span style={{ height: "40%" }} /><span style={{ height: "100%" }} />
          </div>
          <div>
            <h1>PSA · <b>SALES</b></h1>
            <div className="sub">Acesso ao painel de demandas</div>
          </div>
        </div>

        <label className="flab">E-mail</label>
        <input className="finp" type="email" autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="voce@profissionaissa.com" required />

        <label className="flab">Senha</label>
        <input className="finp" type="password" autoComplete="current-password" value={senha}
          onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" required />

        {erro && <div className="ferro">{erro}</div>}

        <button className="btn fbtn" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>

        <a className="fback" href="/">← voltar ao painel</a>
      </form>
    </div>
  );
}
