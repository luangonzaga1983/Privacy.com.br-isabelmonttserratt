"use client";

import { useState } from "react";
import CheckoutModal from "@/components/CheckoutModal";

export default function PlanCard({ plan }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className="plan">
        <div className="plan-info">
          <h4>{plan.title}</h4>
          <p>{plan.desc}</p>
        </div>
        <div className="plan-action">
          <span className="price">{plan.price}</span>
          <button className="btn" onClick={() => setOpen(true)}>
            {plan.cta}
          </button>
        </div>
      </article>

      {open && <CheckoutModal plan={plan} onClose={() => setOpen(false)} />}
    </>
  );
}
