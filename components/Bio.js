"use client";

import { useState } from "react";

export default function Bio() {
  const [aberto, setAberto] = useState(false);

  return (
    <p className="bio">
      Oi amor, sou a Isabel, sua neném de 18 aninhos recém-completos. Aqui eu solto
      tudo que não posso mostrar no Instagram: ensaios sensuais, fotos íntimas e
      vídeos brincando com a minha buceta rosinha.
      {aberto ? (
        <>
          {" "}
          Conteúdo exclusivo e sem censura, atualizado toda semana. Faço
          conteúdo personalizado do jeitinho que você pedir e chamadas privadas
          só nós dois.{" "}
          <span className="more" onClick={() => setAberto(false)}>
            Ler menos
          </span>
        </>
      ) : (
        <>
          {"… "}
          <span className="more" onClick={() => setAberto(true)}>
            Ler mais
          </span>
        </>
      )}
    </p>
  );
}
