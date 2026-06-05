import { NextResponse } from "next/server";
import { generatePix } from "@/lib/sigilo";
import { buildOrder } from "@/lib/catalog";
import { rateLimit, globalLimit, clientIp } from "@/lib/ratelimit";
import { sameOrigin, verifyNonce } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pix/generate  Body: { planId, tipo?, qtd?, horario?, nonce, exp, sig }
// O VALOR é calculado no servidor a partir do catálogo. O cliente nunca define preço.
export async function POST(req) {
  // 1) Só do próprio site (bloqueia curl/cross-site/bot sem origem).
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }

  const ip = clientIp(req);

  // 2) Limites por IP em camadas (minuto / hora / dia).
  const lims = [
    rateLimit(`gen:m:${ip}`, 6, 60_000),
    rateLimit(`gen:h:${ip}`, 30, 3_600_000),
    rateLimit(`gen:d:${ip}`, 80, 86_400_000),
  ];
  // 3) Teto GLOBAL: mesmo com IPs rotativos, o total/min é limitado.
  const glob = globalLimit("gen", 30, 60_000);
  const bloq = [...lims, glob].find((r) => !r.ok);
  if (bloq) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(bloq.retryAfter ?? 60) } },
    );
  }

  try {
    // Limita o tamanho do corpo (anti-DoS de payload).
    const raw = await req.text();
    if (raw.length > 1000) {
      return NextResponse.json({ error: "Requisição inválida" }, { status: 413 });
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
    }

    // 4) Token de uso único assinado pelo servidor (anti-replay / anti-flood de script).
    if (!verifyNonce({ nonce: body.nonce, exp: body.exp, sig: body.sig })) {
      return NextResponse.json({ error: "Sessão inválida. Recarregue a página." }, { status: 403 });
    }

    // Recalcula valor/descrição no servidor (whitelist + limites).
    let order;
    try {
      order = buildOrder(body);
    } catch (e) {
      return NextResponse.json({ error: e.message || "Pedido inválido" }, { status: 400 });
    }

    const pix = await generatePix({
      amount: order.amountCents / 100,
      description: order.description,
    });

    return NextResponse.json({
      transactionId: pix.transactionId,
      qrCodeBase64: pix.qrCodeBase64,
      qrCodeText: pix.qrCodeText,
      amount: pix.amount,
      status: pix.status,
    });
  } catch (e) {
    console.error("[pix/generate]", e);
    return NextResponse.json({ error: "Falha ao gerar Pix" }, { status: 500 });
  }
}
