import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { getPainel } from "@/lib/tickets";
import { sessaoAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  // painel restrito: sem sessão válida, vai para o login.
  if (!sessaoAtual()) redirect("/login");
  const initial = await getPainel();
  return <Dashboard initial={initial} />;
}
