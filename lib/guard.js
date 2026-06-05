// Defesas locais: mesma-origem + token único assinado (HMAC). Sem dependência externa.
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const SECRET = () => process.env.APP_SECRET || "";

// Aceita só requisições vindas do próprio site. Bloqueia cross-site, curl e bots sem origem.
export function sameOrigin(req) {
  const host = req.headers.get("host");
  if (!host) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      return new URL(ref).host === host;
    } catch {
      return false;
    }
  }
  return false; // sem origin nem referer = provavelmente automação
}

function hmac(data) {
  return createHmac("sha256", SECRET()).update(data).digest("base64url");
}

// Emite um token de uso único, válido por 2 min, assinado pelo servidor.
export function issueNonce() {
  const nonce = randomBytes(16).toString("base64url");
  const exp = Date.now() + 120_000;
  return { nonce, exp, sig: hmac(`${nonce}.${exp}`) };
}

const usados = new Map(); // nonce -> exp (garante uso único)
function limpar(now) {
  for (const [k, v] of usados) if (now > v) usados.delete(k);
}

// Verifica assinatura, validade e que o token nunca foi usado antes.
export function verifyNonce({ nonce, exp, sig } = {}) {
  if (!SECRET() || !nonce || !exp || !sig) return false;
  const now = Date.now();
  if (now > Number(exp)) return false;
  const esperado = hmac(`${nonce}.${exp}`);
  const a = Buffer.from(String(sig));
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  limpar(now);
  if (usados.has(nonce)) return false; // replay
  usados.set(nonce, Number(exp));
  return true;
}
