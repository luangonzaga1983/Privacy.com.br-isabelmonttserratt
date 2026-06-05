import PlanCard from "@/components/PlanCard";
import SamplePosts from "@/components/SamplePosts";
import SocialProof from "@/components/SocialProof";
import Bio from "@/components/Bio";

const plans = [
  {
    id: "mensal",
    title: "Assinatura mensal",
    desc: "Acesso a todo conteúdo exclusivo por 30 dias.",
    price: "R$ 9,90",
    cta: "Assinar",
  },
  {
    id: "personalizado",
    title: "Conteúdo personalizado",
    desc: "Você escolhe: eu faço a foto ou o vídeo do jeitinho que você pedir.",
    price: "a partir de R$ 7,00",
    cta: "Pedir",
  },
  {
    id: "chamada",
    title: "Chamada de vídeo",
    desc: "Chamada privada ao vivo, só nós dois. Eu faço tudo o que você mandar.",
    price: "R$ 99,90",
    cta: "Agendar",
  },
];

export default function Home() {
  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">Privacy</h1>
      </header>

      <main className="profile">
        <section className="cover">
          <div className="banner" />
          <div className="avatar" />
          <div className="stats">
            <span><strong>397</strong> fotos</span>
            <span><strong>108</strong> vídeos</span>
            <span><strong>17.8K</strong> curtidas</span>
          </div>
        </section>

        <section className="identity">
          <h2 className="name">
            Isabel Montserratt <span className="age-badge">18 anos</span>
          </h2>
          <p className="handle">@IsabelMontserratt</p>
          <Bio />
        </section>

        <SocialProof />

        <section className="plans">
          <h3 className="section-title">Escolha seu plano</h3>
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>

        <SamplePosts />
      </main>
    </>
  );
}
