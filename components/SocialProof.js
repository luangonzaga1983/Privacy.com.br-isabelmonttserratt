"use client";

import { useEffect, useState } from "react";

// Status estável por minuto: ciclo de 15 min (10 online, 5 offline).
function calcStatus() {
  const pos = Math.floor(Date.now() / 60000) % 15;
  return pos < 10 ? { online: true } : { online: false, min: pos - 9 };
}

export default function SocialProof() {
  const [status, setStatus] = useState({ online: true });

  // Evita divergência servidor/cliente: calcula só no cliente e atualiza.
  useEffect(() => {
    setStatus(calcStatus());
    const id = setInterval(() => setStatus(calcStatus()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="proof">
      <div className={`proof-status ${status.online ? "" : "off"}`}>
        <span className="dot" />
        {status.online ? "Online agora" : `Online há ${status.min} min`}
      </div>
      <div className="proof-grid">
        <div className="proof-item">
          <strong>2.4K</strong>
          <span>Assinantes</span>
        </div>
        <div className="proof-item">
          <strong>98%</strong>
          <span>Avaliações positivas</span>
        </div>
        <div className="proof-item">
          <strong>12</strong>
          <span>Novos nas 24h</span>
        </div>
      </div>
    </section>
  );
}
