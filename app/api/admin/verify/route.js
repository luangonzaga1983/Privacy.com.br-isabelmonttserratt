import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getPixStatus } from "@/lib/sigilo";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sameOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Comparação de token resistente a timing attack.
function tokenOk(recebido) {
  const esperado = process.env.ADMIN_TOKEN || "";
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// GET /api/admin/verify?tx=...  Header: x-admin-token
// Fonte da verdade: consulta o gateway. Só admin com token vê.
export async function GET(req) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }
  const ip = clientIp(req);

  // Anti-brute-force do token.
  const rl = rateLimit(`adm:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas tentativas" }, { status: 429 });
  }

  if (!tokenOk(req.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const tx = new URL(req.url).searchParams.get("tx") || "";
    if (!/^[a-z0-9]{10,40}$/i.test(tx)) {
      return NextResponse.json({ error: "tx inválido" }, { status: 400 });
    }

    const r = await getPixStatus(tx);
    return NextResponse.json({
      transactionId: tx,
      status: r.status, // PAID = pago de verdade
      pago: r.status === "PAID",
      paidAt: r.paidAt ?? null,
      amount: r.amount ?? null,
    });
  } catch (e) {
    console.error("[admin/verify]", e);
    return NextResponse.json({ error: "Falha ao consultar" }, { status: 500 });
  }
}
