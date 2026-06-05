import { NextResponse } from "next/server";
import { getPixStatus } from "@/lib/sigilo";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pix/status?tx=...  -> { status, paidAt, amount }
export async function GET(req) {
  const ip = clientIp(req);

  // Polling roda a cada 4s; permite isso com folga, mas barra flood/enumeração.
  const rl = rateLimit(`st:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas consultas. Aguarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } },
    );
  }

  try {
    const tx = new URL(req.url).searchParams.get("tx") || "";
    // IDs do gateway são tokens alfanuméricos curtos (cuid). Rejeita o resto.
    if (!/^[a-z0-9]{10,40}$/i.test(tx)) {
      return NextResponse.json({ error: "tx inválido" }, { status: 400 });
    }

    const remote = await getPixStatus(tx);
    return NextResponse.json({
      status: remote.status,
      paidAt: remote.paidAt ?? null,
      amount: remote.amount ?? null,
    });
  } catch (e) {
    console.error("[pix/status]", e);
    return NextResponse.json({ error: "Falha ao consultar" }, { status: 500 });
  }
}
