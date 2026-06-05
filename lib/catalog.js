// Catálogo oficial — FONTE DA VERDADE de preços e limites.
// Sem segredos: pode ser importado no client (exibição) e no server (cobrança).
// O servidor SEMPRE recalcula o valor a partir daqui; nunca confia no cliente.

export const PRECO_UNIT = { foto: 700, video: 1500 }; // centavos
export const LIMITE_QTD = { foto: 8, video: 2 };

export const HORARIOS = [
  { t: "14:00", ok: true },
  { t: "16:30", ok: false },
  { t: "19:00", ok: true },
  { t: "21:00", ok: true },
  { t: "22:30", ok: false },
  { t: "23:30", ok: true },
];

export const PLANS = {
  mensal: { title: "Assinatura mensal", amountCents: 990 },
  personalizado: { title: "Conteúdo personalizado" }, // valor dinâmico
  chamada: { title: "Chamada de vídeo", amountCents: 9990 },
};

// Minutos desde meia-noite no fuso de Brasília (validação server-side de horário).
export function minutosBrasilia(d = new Date()) {
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(p.find((x) => x.type === "hour").value);
  const m = Number(p.find((x) => x.type === "minute").value);
  return h * 60 + m;
}

/**
 * Monta o pedido a partir de dados do cliente, recalculando o valor no servidor.
 * Lança Error com mensagem segura se algo for inválido. NUNCA usa valor do cliente.
 * @returns {{ amountCents:number, description:string }}
 */
export function buildOrder(body) {
  if (!body || typeof body !== "object") throw new Error("Pedido inválido");
  const planId = String(body.planId || "");

  if (planId === "mensal") {
    return { amountCents: PLANS.mensal.amountCents, description: "Assinatura mensal" };
  }

  if (planId === "personalizado") {
    const tipo = body.tipo === "video" ? "video" : body.tipo === "foto" ? "foto" : null;
    if (!tipo) throw new Error("Tipo inválido");
    const qtd = Number(body.qtd);
    const max = LIMITE_QTD[tipo];
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > max) throw new Error("Quantidade inválida");
    const amountCents = PRECO_UNIT[tipo] * qtd;
    const unidade = tipo === "foto" ? "foto" : "vídeo";
    return {
      amountCents,
      description: `Conteúdo personalizado: ${qtd} ${unidade}${qtd > 1 ? "s" : ""}`,
    };
  }

  if (planId === "chamada") {
    const horario = String(body.horario || "");
    const slot = HORARIOS.find((h) => h.t === horario && h.ok);
    if (!slot) throw new Error("Horário indisponível");
    // Recusa horário que já passou no fuso de Brasília.
    const [hh, mm] = horario.split(":").map(Number);
    if (hh * 60 + mm <= minutosBrasilia()) throw new Error("Horário já passou");
    return { amountCents: PLANS.chamada.amountCents, description: `Chamada de vídeo — ${horario}` };
  }

  throw new Error("Plano inválido");
}
