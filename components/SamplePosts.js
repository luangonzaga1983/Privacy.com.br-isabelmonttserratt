"use client";

import { useEffect, useState } from "react";

export default function SamplePosts() {
  const [open, setOpen] = useState(false);

  // Fecha a prévia com ESC.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="posts">
      <div className="tabs">
        <button className="tab active">295 Postagens</button>
        <button className="tab">505 Mídias</button>
      </div>

      <article className="post" onClick={() => setOpen(true)} title="Ver prévia">
        <div className="post-blur" />
        <div className="lock">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div className="post-stats">
          <span>397 Fotos</span>
          <span>108 Vídeos</span>
          <span>17.8K Curtidas</span>
        </div>
      </article>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar">
              ×
            </button>
            <h3 className="modal-title">Prévia</h3>
            <div className="preview-img" />
            <p className="modal-note">Conteúdo completo liberado após o pagamento.</p>
          </div>
        </div>
      )}
    </section>
  );
}
