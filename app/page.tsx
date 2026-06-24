import Dashboard from "@/components/Dashboard";
import { getPainel } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initial = await getPainel();
  return <Dashboard initial={initial} />;
}
