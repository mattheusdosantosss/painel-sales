import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarCredenciais, assinarSessao, COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { email, senha } = body || {};
  const user = verificarCredenciais(String(email ?? ""), String(senha ?? ""));
  if (!user) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }
  cookies().set(COOKIE, assinarSessao(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return NextResponse.json({ email: user.email, role: user.role });
}
