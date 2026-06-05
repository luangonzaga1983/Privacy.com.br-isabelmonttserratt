"use client";

import { useEffect, useState } from "react";
import { whatsappLink } from "@/lib/config";

// Preço por unidade do conteúdo personalizado (em centavos).
const PRECO_UNIT = { foto: 700, video: 1500 };
const fmt = (c) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

// Minutos desde meia-noite no horário de Brasília (America/Sao_Paulo).
function minutosBrasilia() {
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(p.find((x) => x.type === "hour").value);
  const m = Number(p.find((x) => x.type === "minute").value);
  return h * 60 + m;
}

// "HH:MM" -> minutos desde meia-noite.
const emMinutos = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Segundos -> "MM:SS".
const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Horários do dia para chamada de vídeo (ok=false fica indisponível).
const HORARIOS = [
  { t: "14:00", ok: true },
  { t: "16:30", ok: false },
  { t: "19:00", ok: true },
  { t: "21:00", ok: true },
  { t: "22:30", ok: false },
  { t: "23:30", ok: true },
];

export default function CheckoutModal({ plan, onClose }) {
  // Etapa inicial depende do plano.
  const inicial =
    plan.id === "chamada" ? "agendar" : plan.id === "personalizado" ? "pedido" : "metodo";

  // steps: "agendar" | "pedido" | "metodo" | "pagando" | "sucesso"
  const [step, setStep] = useState(inicial);
  const [comprovante, setComprovante] = useState("");

  // Hora atual de Brasília capturada ao abrir o modal.
  const [agoraMin] = useState(() => minutosBrasilia());

  // Estado do checkout Pix (gerado pelo gateway SigiloPay via API).
  const [copiado, setCopiado] = useState(false);
  const [segundos, setSegundos] = useState(15 * 60); // validade do Pix
  const [pix, setPix] = useState(null); // { transactionId, qrCodeBase64, qrCodeText }
  const [carregandoPix, setCarregandoPix] = useState(false);
  const [erroPix, setErroPix] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [aviso, setAviso] = useState("");

  // Dados extras coletados antes do pagamento.
  const [horario, setHorario] = useState("");
  const [tipo, setTipo] = useState("foto");
  const [qtd, setQtd] = useState(1);
  const [descricao, setDescricao] = useState("");

  const maxQtd = tipo === "foto" ? 8 : 2;
  const unidade = tipo === "foto" ? "foto" : "vídeo";

  // Preço apenas para EXIBIÇÃO (o servidor recalcula o valor real na cobrança).
  const totalPersonalizado = fmt(PRECO_UNIT[tipo] * qtd);
  const precoExibido = plan.id === "personalizado" ? totalPersonalizado : plan.price;

  // Troca o tipo e ajusta a quantidade ao novo limite.
  const trocarTipo = (novo) => {
    setTipo(novo);
    const max = novo === "foto" ? 8 : 2;
    setQtd((q) => Math.min(q, max));
  };

  // Fecha com ESC.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Conta regressiva da validade enquanto a tela de pagamento estiver aberta.
  useEffect(() => {
    if (step !== "metodo") return;
    const id = setInterval(() => setSegundos((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  // Gera o Pix real no gateway ao entrar na tela de pagamento (uma vez).
  useEffect(() => {
    if (step !== "metodo" || pix) return;
    setCarregandoPix(true);
    setErroPix("");
    (async () => {
      try {
        // 1) Pega um token de uso único do servidor.
        const rc = await fetch("/api/pix/challenge");
        const ch = await rc.json();
        if (!rc.ok) throw new Error(ch.error || "Falha ao iniciar");

        // 2) Gera o Pix enviando o token + identificadores (servidor calcula o valor).
        const r = await fetch("/api/pix/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: plan.id,
            tipo,
            qtd,
            horario,
            nonce: ch.nonce,
            exp: ch.exp,
            sig: ch.sig,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Falha ao gerar Pix");
        setPix({
          transactionId: d.transactionId,
          qrCodeBase64: d.qrCodeBase64,
          qrCodeText: d.qrCodeText,
        });
      } catch (e) {
        setErroPix(e.message || "Erro de conexão");
      } finally {
        setCarregandoPix(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Confirma pagamento automaticamente: consulta o status a cada 4s.
  useEffect(() => {
    if (step !== "metodo" || !pix) return;
    const id = setInterval(() => checarStatus(false), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pix]);

  // Consulta o status no gateway. manual=true mostra aviso se ainda não pago.
  const checarStatus = async (manual) => {
    if (!pix) return;
    if (manual) setVerificando(true);
    try {
      const r = await fetch(`/api/pix/status?tx=${encodeURIComponent(pix.transactionId)}`);
      const d = await r.json();
      if (d.status === "PAID") {
        setComprovante(pix.transactionId);
        setStep("sucesso");
      } else if (manual) {
        setAviso("Pagamento ainda não identificado. Se já pagou, aguarde alguns segundos.");
        setTimeout(() => setAviso(""), 4000);
      }
    } catch {
      if (manual) {
        setAviso("Não foi possível verificar agora. Tente de novo.");
        setTimeout(() => setAviso(""), 4000);
      }
    } finally {
      if (manual) setVerificando(false);
    }
  };

  const copiarPix = async () => {
    if (!pix?.qrCodeText) return;
    try {
      await navigator.clipboard.writeText(pix.qrCodeText);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  const irWhatsApp = () => {
    let detalhe = "";
    if (plan.id === "chamada") detalhe = ` Horário agendado: ${horario}.`;
    if (plan.id === "personalizado")
      detalhe = ` Pedido: ${qtd} ${unidade}${qtd > 1 ? "s" : ""} — ${descricao}.`;

    const msg =
      `Fiz a compra do "${plan.title}" (${precoExibido}).${detalhe} ` +
      `Aqui está o comprovante: ${comprovante}`;
    window.open(whatsappLink(msg), "_blank");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        {step === "agendar" && (
          <>
            <h3 className="modal-title">Agendar chamada</h3>
            <div className="modal-plan">
              <span>{plan.title}</span>
              <strong>{precoExibido}</strong>
            </div>
            <p className="modal-label">Horários disponíveis hoje</p>
            <div className="slots">
              {HORARIOS.map((h) => {
                const passou = emMinutos(h.t) <= agoraMin;
                const indisponivel = !h.ok || passou;
                return (
                  <button
                    key={h.t}
                    className={`slot ${horario === h.t ? "active" : ""} ${indisponivel ? "off" : ""}`}
                    disabled={indisponivel}
                    onClick={() => setHorario(h.t)}
                  >
                    {h.t}
                    {passou ? (
                      <small>passou</small>
                    ) : !h.ok ? (
                      <small>esgotado</small>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              className="btn btn-full"
              disabled={!horario}
              onClick={() => setStep("metodo")}
            >
              Continuar
            </button>
          </>
        )}

        {step === "pedido" && (
          <>
            <h3 className="modal-title">Seu pedido</h3>
            <div className="modal-plan">
              <span>{plan.title}</span>
              <strong>{precoExibido}</strong>
            </div>
            <p className="modal-label">O que você quer</p>
            <div className="pay-methods">
              <button
                className={`pay-method ${tipo === "foto" ? "active" : ""}`}
                onClick={() => trocarTipo("foto")}
              >
                Foto
              </button>
              <button
                className={`pay-method ${tipo === "video" ? "active" : ""}`}
                onClick={() => trocarTipo("video")}
              >
                Vídeo
              </button>
            </div>

            <p className="modal-label">
              Quantidade{" "}
              <small className="lim">
                (até {maxQtd} · {fmt(PRECO_UNIT[tipo])} cada)
              </small>
            </p>
            <div className="stepper">
              <button
                className="step-btn"
                disabled={qtd <= 1}
                onClick={() => setQtd((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="step-val">
                {qtd} {unidade}{qtd > 1 ? "s" : ""}
              </span>
              <button
                className="step-btn"
                disabled={qtd >= maxQtd}
                onClick={() => setQtd((q) => Math.min(maxQtd, q + 1))}
              >
                +
              </button>
            </div>

            <div className="total-linha">
              <span>Total</span>
              <strong>{totalPersonalizado}</strong>
            </div>

            <p className="modal-label">Descreva o pedido</p>
            <textarea
              className="pedido-input"
              rows={3}
              placeholder="Ex: vídeo de 2 min com a roupa vermelha…"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
            <button
              className="btn btn-full"
              disabled={!descricao.trim()}
              onClick={() => setStep("metodo")}
            >
              Continuar
            </button>
          </>
        )}

        {step === "metodo" && (
          <>
            <div className="pix-head">
              <span className="pix-tag">Pagamento via Pix</span>
              <span className="pix-timer">Expira em {mmss(segundos)}</span>
            </div>

            <div className="modal-plan">
              <span>{plan.title}</span>
              <strong>{precoExibido}</strong>
            </div>

            {plan.id === "chamada" && horario && (
              <div className="resumo">Horário: <strong>{horario}</strong></div>
            )}
            {plan.id === "personalizado" && (
              <div className="resumo">
                Pedido: <strong>{qtd} {unidade}{qtd > 1 ? "s" : ""}</strong> — {descricao}
              </div>
            )}

            {carregandoPix && (
              <div className="modal-center" style={{ padding: "24px 0" }}>
                <div className="spinner" />
                <p>Gerando cobrança Pix…</p>
              </div>
            )}

            {erroPix && (
              <div className="modal-center" style={{ padding: "16px 0" }}>
                <p style={{ color: "#f15a59" }}>{erroPix}</p>
                <button
                  className="btn-outline btn-full"
                  onClick={() => setPix(null)}
                >
                  Tentar de novo
                </button>
              </div>
            )}

            {pix && (
              <>
                <div className="qr-wrap">
                  <img
                    className="qr"
                    src={`data:image/png;base64,${pix.qrCodeBase64}`}
                    alt="QR Code Pix"
                  />
                  <p className="qr-hint">Escaneie no app do seu banco</p>
                </div>

                <p className="modal-label">Pix copia e cola</p>
                <div className="pix-code">
                  <code>{pix.qrCodeText}</code>
                </div>
                <button className="btn-outline btn-full" onClick={copiarPix}>
                  {copiado ? "Código copiado" : "Copiar código"}
                </button>

                <button
                  className="btn btn-full"
                  disabled={verificando}
                  onClick={() => checarStatus(true)}
                >
                  {verificando ? "Verificando…" : "Já fiz o pagamento"}
                </button>
                {aviso && <p className="modal-note" style={{ color: "#f7941d" }}>{aviso}</p>}
                <p className="modal-note">
                  A confirmação é automática assim que o Pix cair.
                </p>
              </>
            )}
          </>
        )}

        {step === "pagando" && (
          <div className="modal-center">
            <div className="spinner" />
            <p>Processando pagamento…</p>
          </div>
        )}

        {step === "sucesso" && (
          <div className="modal-center">
            <div className="check-circle">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="modal-title">Pagamento aprovado</h3>
            <div className="receipt">
              <span>Comprovante</span>
              <strong>{comprovante}</strong>
            </div>
            <button className="btn btn-full btn-wa" onClick={irWhatsApp}>
              Ir para o WhatsApp
            </button>
            <p className="modal-note">
              Envie o comprovante para liberar seu acesso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
