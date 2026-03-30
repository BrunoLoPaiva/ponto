import React from "react";
import "./DocumentTimeline.css";

const STEPS = [
  { key: "GERADO",     label: "Gerado pelo RH" },
  { key: "PENDENTE_FUNCIONARIO", label: "Assinatura Funcionário" },
  { key: "PENDENTE_CHEFIA",      label: "Aguardando Gestor" },
  { key: "CONCLUIDO",  label: "Concluído" },
];

const STATUS_ORDER = {
  PENDENTE_FUNCIONARIO: 1,
  PENDENTE_CHEFIA: 2,
  CONCLUIDO: 3,
};

export function DocumentTimeline({ status }) {
  const currentOrder = STATUS_ORDER[status] ?? 0;

  const getState = (stepIndex) => {
    if (stepIndex < currentOrder) return "done";
    if (stepIndex === currentOrder) return "active";
    return "pending";
  };

  return (
    <div className="doc-timeline">
      {STEPS.map((step, i) => {
        const state = getState(i);
        return (
          <React.Fragment key={step.key}>
            <div className={`timeline-step ${state}`}>
              <div className="timeline-dot">
                {state === "done" && "✓"}
                {state === "active" && "●"}
                {state === "pending" && "○"}
              </div>
              <span className="timeline-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`timeline-connector ${state === "done" ? "done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
