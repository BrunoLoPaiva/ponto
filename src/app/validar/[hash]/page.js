import { getDb } from "@/lib/db";
import React from "react";

// Impede cache para garantir que sempre busque a situação real do banco
export const dynamic = "force-dynamic";

export default async function ValidacaoPage({ params }) {
  const { hash } = params;

  // Busca o documento pelo Hash Único
  const db = await getDb();
  const doc = await db.get(
    "SELECT * FROM punch_adjustments WHERE hash_validacao = ?",
    [hash],
  );

  if (!doc) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "3rem",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
          <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>
            Documento Inválido
          </h1>
          <p style={{ color: "#64748b", lineHeight: "1.5" }}>
            O código de autenticidade <strong>{hash}</strong> não consta em
            nossos registros de auditoria ou foi revogado.
          </p>
        </div>
      </div>
    );
  }

  // Se o documento existe, mostra os logs
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            backgroundColor: "#10b981",
            color: "white",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
          <h1 style={{ margin: 0 }}>Assinatura Verificada</h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.9 }}>
            Este documento foi assinado eletronicamente e possui validade.
          </p>
        </div>

        <div style={{ padding: "2rem" }}>
          <h3
            style={{
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "0.5rem",
              color: "#0f172a",
            }}
          >
            Dados do Documento
          </h3>
          <p>
            <strong>Colaborador:</strong> {doc.nome_completo}
          </p>
          <p>
            <strong>Matrícula:</strong> {doc.matricula} |{" "}
            <strong>Departamento:</strong> {doc.nome_cr}
          </p>
          <p>
            <strong>Data da Ocorrência:</strong> {doc.data_registro} ({doc.dia})
          </p>
          <p>
            <strong>Parecer do Gestor:</strong>{" "}
            {doc.abonado === 1 ? "Abonado" : "Não Abonado"}
          </p>

          <h3
            style={{
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "0.5rem",
              color: "#0f172a",
              marginTop: "2rem",
            }}
          >
            Trilha de Auditoria (Logs)
          </h3>

          <div
            style={{
              background: "#f8fafc",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "1rem",
            }}
          >
            <h4 style={{ margin: "0 0 1rem 0", color: "#334155" }}>
              1. Assinatura do Colaborador
            </h4>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
              <strong>Data/Hora:</strong>{" "}
              {new Date(doc.employee_signature_date).toLocaleString("pt-BR")}
            </p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
              <strong>Endereço IP:</strong> {doc.ip_funcionario}
            </p>
            <p
              style={{
                margin: "0.25rem 0",
                fontSize: "0.9rem",
                color: "#64748b",
              }}
            >
              <strong>Dispositivo:</strong> {doc.user_agent_funcionario}
            </p>
          </div>

          <div
            style={{
              background: "#f8fafc",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h4 style={{ margin: "0 0 1rem 0", color: "#334155" }}>
              2. Assinatura do Gestor
            </h4>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
              <strong>Data/Hora:</strong>{" "}
              {new Date(doc.supervisor_signature_date).toLocaleString("pt-BR")}
            </p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
              <strong>Endereço IP:</strong> {doc.ip_supervisor}
            </p>
            <p
              style={{
                margin: "0.25rem 0",
                fontSize: "0.9rem",
                color: "#64748b",
              }}
            >
              <strong>Dispositivo:</strong> {doc.user_agent_supervisor}
            </p>
          </div>

          <div
            style={{
              marginTop: "2rem",
              textAlign: "center",
              fontSize: "0.8rem",
              color: "#94a3b8",
            }}
          >
            <p>Código Hash: {hash}</p>
            <p>Sistema de Assinatura Eletrônica - ViaRondon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
