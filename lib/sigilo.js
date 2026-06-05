// sigilo.js — Cliente SigiloPay (SOMENTE servidor). Chaves nunca vão pro browser.

function env(key) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} não configurada`);
  return v;
}

const BASE = () => env("SIGILO_BASE");
const PUB = () => env("SIGILO_PUB");
const PRIV = () => env("SIGILO_PRIV");

async function sigiloPost(endpoint, body) {
  const r = await fetch(BASE() + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-key": PUB(),
      "x-secret-key": PRIV(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`SigiloPay ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json();
}

async function sigiloGet(endpoint) {
  const r = await fetch(BASE() + endpoint, {
    headers: { "x-public-key": PUB(), "x-secret-key": PRIV() },
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`SigiloPay ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json();
}

// Cliente anônimo — venda de conteúdo não expõe dados do comprador no gateway.
const ANON_CLIENT = {
  name: "Cliente",
  email: "cliente@site.com",
  phone: "(11) 99999-9999",
  document: "52998224725",
};

export async function generatePix({ amount, description, metadata }) {
  if (amount < 1) throw new Error("Valor mínimo R$ 1,00");
  if (amount > 10000) throw new Error("Valor máximo R$ 10.000,00");

  const identifier = `isa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const raw = await sigiloPost("/gateway/pix/receive", {
    identifier,
    amount,
    client: ANON_CLIENT,
    products: [
      { id: "isa_conteudo", name: description.slice(0, 120), quantity: 1, price: amount },
    ],
    metadata: { gateway: "isabel-site", ...(metadata || {}) },
  });

  return {
    transactionId: raw.transactionId,
    identifier,
    qrCodeBase64: raw.pix.base64,
    qrCodeText: raw.pix.code,
    amount,
    status: raw.status,
  };
}

export async function getPixStatus(transactionId) {
  // Consulta correta da SigiloPay: /gateway/transactions?id=...
  const t = await sigiloGet(`/gateway/transactions?id=${encodeURIComponent(transactionId)}`);
  const pago =
    !!t.payedAt ||
    ["PAID", "APPROVED", "COMPLETED"].includes(String(t.status || "").toUpperCase());
  return {
    transactionId,
    status: pago ? "PAID" : t.status || "PENDING",
    paidAt: t.payedAt || null,
    amount: t.amount,
  };
}
