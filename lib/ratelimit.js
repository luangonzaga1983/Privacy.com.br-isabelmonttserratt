// Rate limiter simples em memória (por instância do servidor).
// Suficiente para 1 instância. Em produção multi-instância, troque por Redis/Upstash.

const buckets = new Map(); // chave -> { count, reset }

// Limpeza periódica para não vazar memória.
let ultimaLimpeza = Date.now();
function limpar(now) {
  if (now - ultimaLimpeza < 60_000) return;
  ultimaLimpeza = now;
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}

/**
 * @param {string} chave  Ex.: `gen:${ip}`
 * @param {number} limite Máx. de requisições na janela
 * @param {number} janelaMs Tamanho da janela
 * @returns {{ ok:boolean, retryAfter?:number }}
 */
export function rateLimit(chave, limite, janelaMs) {
  const now = Date.now();
  limpar(now);
  const e = buckets.get(chave);
  if (!e || now > e.reset) {
    buckets.set(chave, { count: 1, reset: now + janelaMs });
    return { ok: true };
  }
  if (e.count >= limite) {
    return { ok: false, retryAfter: Math.ceil((e.reset - now) / 1000) };
  }
  e.count++;
  return { ok: true };
}

// Teto GLOBAL: limita o total de requisições somando todos os IPs.
// Defesa contra IP rotativo/proxy — o atacante não fura trocando de IP.
export function globalLimit(nome, limite, janelaMs) {
  return rateLimit(`__global__:${nome}`, limite, janelaMs);
}

// Extrai o IP do cliente respeitando proxies (Vercel/NGINX).
export function clientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}
