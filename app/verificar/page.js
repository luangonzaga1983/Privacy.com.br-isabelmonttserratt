"use client";

import { useState } from "react";

export default function Verificar() {
  const [token, setToken] = useState("");
  const [tx, setTx] = useState("");
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const verificar = async (e) => {
    e.preventDefault();
    setErro("");
    setRes(null);
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/verify?tx=${encodeURIComponent(tx.trim())}`, {
        headers: { "x-admin-token": token },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro");
      setRes(d);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main style={{ maxWidth: 460, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 6 }}>Verificar pagamento</h1>
      <p style={{ color: "#9a9a9a", fontSize: ".85rem", marginBottom: 20 }}>
        Cole o código da transação que o cliente enviou. Só entregue o conteúdo
        se aparecer <strong style={{ color: "#3ddc84" }}>PAGO</strong>.
      </p>

      <form onSubmit={verificar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password"
          placeholder="Senha de admin"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="v-input"
        />
        <input
          type="text"
          placeholder="ID da transação (tx)"
          value={tx}
          onChange={(e) => setTx(e.target.value)}
          className="v-input"
        />
        <button className="btn btn-full" disabled={carregando || !token || !tx}>
          {carregando ? "Verificando…" : "Verificar"}
        </button>
      </form>

      {erro && <p style={{ color: "#f15a59", marginTop: 16 }}>{erro}</p>}

      {res && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            border: `1.5px solid ${res.pago ? "#3ddc84" : "#f7941d"}`,
            background: "#161616",
          }}
        >
          <p style={{ fontSize: "1.4rem", fontWeight: 700, color: res.pago ? "#3ddc84" : "#f7941d" }}>
            {res.pago ? "PAGO ✓" : `NÃO PAGO (${res.status})`}
          </p>
          {res.amount != null && <p style={{ marginTop: 6 }}>Valor: R$ {Number(res.amount).toFixed(2)}</p>}
          {res.paidAt && <p style={{ color: "#9a9a9a", fontSize: ".8rem" }}>Pago em: {res.paidAt}</p>}
        </div>
      )}

      <style jsx>{`
        .v-input {
          background: #1e1e1e;
          border: 1.5px solid #2a2a2a;
          border-radius: 10px;
          color: #f2f2f2;
          padding: 12px 14px;
          font-size: 0.95rem;
        }
        .v-input:focus {
          outline: none;
          border-color: #f7941d;
        }
      `}</style>
    </main>
  );
}
