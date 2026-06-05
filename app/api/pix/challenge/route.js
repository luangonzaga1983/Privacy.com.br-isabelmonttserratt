import { NextResponse } from "next/server";
import { sameOrigin, issueNonce } from "@/lib/guard";
import { rateLimit, globalLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pix/challenge -> { nonce, exp, sig }
// Token de uso único exigido para gerar um Pix. Só same-origin.
export async function GET(req) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }
  const ip = clientIp(req);
  if (!rateLimit(`ch:${ip}`, 20, 60_000).ok || !globalLimit("ch", 120, 60_000).ok) {
    return NextResponse.json({ error: "Muitas tentativas" }, { status: 429 });
  }
  return NextResponse.json(issueNonce());
}
