# Site Isabel Montserratt

Site de venda de conteúdo com pagamento Pix real (gateway SigiloPay), feito em Next.js 15.

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev                  # http://localhost:3000
```

## Variáveis de ambiente (obrigatórias)

| Variável       | O que é                                                        |
|----------------|----------------------------------------------------------------|
| `SIGILO_BASE`  | `https://app.sigilopay.com.br/api/v1`                          |
| `SIGILO_PUB`   | Chave pública SigiloPay                                         |
| `SIGILO_PRIV`  | Chave secreta SigiloPay (o dinheiro cai nesta conta)           |
| `ADMIN_TOKEN`  | Senha do painel `/verificar`                                   |
| `APP_SECRET`   | Segredo aleatório p/ assinar tokens (gere com o comando abaixo) |

Gerar segredos fortes:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Deploy na Vercel

1. Suba o projeto (importe o repositório OU faça upload deste .zip em vercel.com > Add New > Project).
2. Framework: **Next.js** (detecção automática).
3. Em **Settings > Environment Variables**, adicione as 5 variáveis acima (use os valores reais; NÃO comite o `.env.local`).
4. **Deploy**. A região já está fixada em São Paulo (`gru1`) via `vercel.json`.
5. Pronto: HTTPS automático, e os headers de segurança (CSP, HSTS etc.) já vão ativos.

## Fotos

Coloque na pasta `public/` com estes nomes exatos:

- `avatar.jpg` — foto de perfil (círculo)
- `banner.jpg` — capa
- `previa.jpg` — prévia do conteúdo bloqueado

Sem elas, o site mostra um gradiente no lugar (não quebra).

## Confirmar pagamentos

Acesse `/verificar`, digite a senha (`ADMIN_TOKEN`) e cole o código da transação
que o cliente enviou no WhatsApp. Só entregue o conteúdo se aparecer **PAGO**.
A mensagem do WhatsApp por si só **não** é prova de pagamento.

## Segurança aplicada

- Valor calculado no servidor (cliente não define preço)
- Token de uso único assinado (HMAC) + same-origin nas APIs
- Rate limit por IP (minuto/hora/dia) + teto global
- Headers: CSP, X-Frame-Options, HSTS, nosniff, Permissions-Policy
- Chaves só no servidor; `/verificar` protegido por senha

> Observação Vercel: o rate limit é em memória (por instância). Em escala
> serverless ele protege menos. O essencial — preço e confirmação de pagamento —
> continua 100% no servidor. Para anti-DDoS forte, use Cloudflare na frente.
