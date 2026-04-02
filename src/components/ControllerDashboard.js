"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { PunchDocument } from "./PunchDocument";
import { SkeletonGrid } from "./Skeleton";
import { DocumentTimeline } from "./DocumentTimeline";
import { ToastContainer, toast } from "./Toast";
import { EmployeeDashboard } from "./EmployeeDashboard";
import { generatePdfFromNode } from "@/lib/pdfExport";
import "./ControllerDashboard.css";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const ControllerDashboard = () => {
  const { user, token } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de histórico
  const [activeTab, setActiveTab] = useState("pendentes-func"); // "pendentes-func" | "pendentes-gestor" | "historico"
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [previewAdj, setPreviewAdj] = useState(null);

  // Busca rápida
  const [search, setSearch] = useState("");

  // Botões de cobrança e PDF
  const [sendingReminder, setSendingReminder] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [printingAdjustment, setPrintingAdjustment] = useState(null);
  const pdfRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchControllerData = async () => {
      try {
        const response = await fetch(
          `/api/punches/controller-adjustments?username=${user?.username}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (isMounted && data.success) {
          setAdjustments((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.data)) {
              return data.data;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error fetching controller adjustments", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchControllerData();
    const interval = setInterval(fetchControllerData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.username, token]);

  const parseBatidas = (jsonStr) => {
    try {
      return JSON.parse(jsonStr) || [];
    } catch {
      return [];
    }
  };
  const parseMarcacoes = (jsonStr) => {
    if (!jsonStr) return [false, false, false, false];
    try {
      return JSON.parse(jsonStr) || [false, false, false, false];
    } catch {
      return [false, false, false, false];
    }
  };

  const triggerPdf = (adj) => {
    setPrintingAdjustment(adj);
    setTimeout(async () => {
      if (!pdfRef.current) return;
      try {
        await generatePdfFromNode(
          pdfRef.current,
          `Justificativa_Ponto_${adj.data_registro.replace(/\//g, "-")}_${adj.nome_completo.split(" ")[0]}.pdf`,
        );
        toast("PDF gerado com sucesso!", "success");
      } catch (err) {
        console.error("Error generating PDF", err);
        toast("Erro ao gerar o PDF.", "error");
      } finally {
        setPrintingAdjustment(null);
      }
    }, 500);
  };

  const handleRemindAll = async (list) => {
    setSendingAll(true);
    try {
      await Promise.all(
        list.map((adj) =>
          fetch("/api/punches/remind", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username: adj.username }), // cobraremos sempre o funcionário ou gestor? A API atual cobra o usuário de username.
          }),
        ),
      );
      toast(`${list.length} lembrete(s) enviado(s)!`, "success");
    } catch {
      toast("Erro ao enviar lembretes.", "error");
    } finally {
      setSendingAll(false);
    }
  };

  const handleReminder = async (username) => {
    setSendingReminder(username);
    try {
      const res = await fetch("/api/punches/remind", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) toast("Lembrete enviado com sucesso!", "success");
      else toast("Erro ao enviar lembrete: " + data.error, "error");
    } catch {
      toast("Erro de rede ao enviar lembrete.", "error");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleViewAttachment = async (id) => {
    try {
      const res = await fetch(`/api/punches/attachment?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Acesso negado ou anexo não encontrado.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const pendentesFunc = adjustments.filter(
    (a) => a.status === "PENDENTE_FUNCIONARIO",
  );
  const pendentesGestor = adjustments.filter(
    (a) => a.status === "PENDENTE_CHEFIA",
  );
  const filteredFuncs = pendentesFunc.filter((a) =>
    a.nome_completo?.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredGestores = pendentesGestor.filter((a) =>
    a.nome_completo?.toLowerCase().includes(search.toLowerCase()),
  );

  const history = adjustments
    .filter((a) => a.status === "CONCLUIDO")
    .filter((a) => {
      const [, m, y] = (a.data_registro || "").split("/").map(Number);
      return m - 1 === filterMonth && y === filterYear;
    });

  const years = Array.from(
    new Set(
      adjustments
        .filter((a) => a.status === "CONCLUIDO")
        .map((a) => Number((a.data_registro || "").split("/")[2]))
        .filter(Boolean),
    ),
  ).sort((a, b) => b - a);
  if (!years.includes(filterYear)) years.push(filterYear);

  return (
    <div className="controller-mode" style={{ marginTop: "1rem" }}>
      <ToastContainer />

      <div className="sub-tab-bar">
        <button
          className={`sub-tab-btn ${activeTab === "pendentes-func" ? "active" : ""}`}
          onClick={() => setActiveTab("pendentes-func")}
        >
          ⏳ Aguardando Funcionário
          {pendentesFunc.length > 0 && (
            <span className="tab-badge agenda">{pendentesFunc.length}</span>
          )}
        </button>
        <button
          className={`sub-tab-btn ${activeTab === "pendentes-gestor" ? "active" : ""}`}
          onClick={() => setActiveTab("pendentes-gestor")}
        >
          ⏳ Aguardando Gestor
          {pendentesGestor.length > 0 && (
            <span className="tab-badge">{pendentesGestor.length}</span>
          )}
        </button>
        <button
          className={`sub-tab-btn ${activeTab === "historico" ? "active" : ""}`}
          onClick={() => setActiveTab("historico")}
        >
          🗄️ Histórico Regional
        </button>
      </div>

      {loading ? (
        <SkeletonGrid count={2} />
      ) : (
        <>
          {(activeTab === "pendentes-func" ||
            activeTab === "pendentes-gestor") && (
            <div
              className="team-search-bar"
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="🔍 Buscar colaborador..."
                className="filter-select"
                style={{ flex: 1, padding: "0.6rem 1rem" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {activeTab === "pendentes-func" && filteredFuncs.length > 0 && (
                <button
                  className="btn-secondary"
                  onClick={() => handleRemindAll(filteredFuncs)}
                  disabled={sendingAll}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {sendingAll
                    ? "⏳ Enviando..."
                    : `🔔 Cobrar Todos (${filteredFuncs.length})`}
                </button>
              )}
            </div>
          )}

          {activeTab === "pendentes-func" && (
            <>
              {filteredFuncs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>Nenhum pendente!</h3>
                  <p>
                    Sua controladoria não tem documentos aguardando assinatura
                    do funcionário.
                  </p>
                </div>
              ) : (
                <div className="team-list">
                  {filteredFuncs.map((adj) => (
                    <div className="team-card" key={adj.id}>
                      <span className="departament-title">{adj.nome_cr}</span>
                      <div className="team-card-header">
                        <div className="employee-info">
                          <span className="matricula">
                            Colaborador: <strong>{adj.nome_completo}</strong>
                          </span>
                          <span
                            style={{ fontSize: "0.8rem", color: "#64748b" }}
                          >
                            {" "}
                            · {adj.data_registro}
                          </span>
                        </div>
                        <span className="badge pending">
                          Aguarda Funcionário
                        </span>
                      </div>
                      <DocumentTimeline status={adj.status} />
                      <div className="team-card-actions">
                        <button
                          className="btn-preview"
                          onClick={() => setPreviewAdj(adj)}
                        >
                          👁️ Ver Doc
                        </button>
                        <button
                          className="btn-reminder"
                          disabled={sendingReminder === adj.username}
                          onClick={() => handleReminder(adj.username)}
                        >
                          {sendingReminder === adj.username
                            ? "⏳ Enviando..."
                            : "🔔 Cobrar Funcionário"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "pendentes-gestor" && (
            <>
              {filteredGestores.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>Nenhum pendente!</h3>
                  <p>
                    Sua controladoria não tem documentos aguardando o gestor
                    aprovar.
                  </p>
                </div>
              ) : (
                <div className="team-list">
                  {filteredGestores.map((adj) => (
                    <div className="team-card" key={adj.id}>
                      <span className="departament-title">{adj.nome_cr}</span>
                      <div className="team-card-header">
                        <div className="employee-info">
                          <span className="matricula">
                            Colaborador: <strong>{adj.nome_completo}</strong>
                          </span>
                          <span
                            style={{ fontSize: "0.8rem", color: "#64748b" }}
                          >
                            {" "}
                            · Gestor: {adj.nome_chefia}
                          </span>
                        </div>
                        <span className="badge pending-supervisor">
                          Aguarda Gestor
                        </span>
                      </div>
                      <DocumentTimeline status={adj.status} />
                      <div className="team-card-actions">
                        <button
                          className="btn-preview"
                          onClick={() => setPreviewAdj(adj)}
                        >
                          👁️ Ver Doc
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "historico" && (
            <div className="history-container">
              <div className="history-filters">
                <label className="filter-label">Filtrar por:</label>
                <select
                  className="filter-select"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="filter-select"
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className="filter-result">
                  {history.length} documento(s)
                </span>
              </div>
              {history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📂</div>
                  <h3>Nenhum documento</h3>
                </div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Colaborador</th>
                      <th>Setor</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((adj) => (
                      <tr key={adj.id}>
                        <td className="history-date">{adj.data_registro}</td>
                        <td>{adj.nome_completo}</td>
                        <td style={{ color: "#64748b", fontSize: "0.85rem" }}>
                          {adj.nome_cr}
                        </td>
                        <td>
                          <span className="badge success">✓ Concluído</span>
                        </td>
                        <td className="history-actions">
                          <button
                            className="btn-preview"
                            onClick={() => setPreviewAdj(adj)}
                          >
                            🔍 Vis.
                          </button>
                          <button
                            className="btn-secondary outline-btn"
                            onClick={() => triggerPdf(adj)}
                          >
                            📄 PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Hidden PDF target */}
      {printingAdjustment && (
        <PunchDocument
          ref={pdfRef}
          bancoHoras={printingAdjustment.banco_horas === 1}
          anexoPath={printingAdjustment.anexo_path}
          nome={printingAdjustment.nome_completo || ""}
          setor={printingAdjustment.nome_cr || ""}
          data={printingAdjustment.data_registro || ""}
          id={printingAdjustment.matricula || ""}
          batidasOriginais={parseBatidas(printingAdjustment.batidas_originais)}
          batidasCorrigidas={parseBatidas(
            printingAdjustment.batidas_corrigidas,
          )}
          missedPunches={parseMarcacoes(printingAdjustment.marcacoes_faltantes)}
          justificativa={printingAdjustment.justificativa || ""}
          isAprovado={printingAdjustment.status === "CONCLUIDO"}
          abonado={
            printingAdjustment.abonado === 1
              ? true
              : printingAdjustment.abonado === 0
                ? false
                : null
          }
          assinaturaColaboradorData={printingAdjustment.employee_signature_date}
          assinaturaGestorData={printingAdjustment.supervisor_signature_date}
          signatureFont={printingAdjustment.signature_font}
          signatoryName={printingAdjustment.nome_completo}
          supervisorFont={printingAdjustment.supervisor_signature_font}
          supervisorName={
            printingAdjustment.nome_chefia_completo ||
            printingAdjustment.nome_chefia
          }
        />
      )}

      {/* History preview modal */}
      {previewAdj && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "1060px", width: "95%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  🗄️ Visualização do Documento (Controladoria)
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.85rem",
                    margin: "0.25rem 0 0",
                  }}
                >
                  {previewAdj.data_registro} · {previewAdj.nome_completo}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                {previewAdj.anexo_path && (
                  <button
                    className="btn-secondary outline-btn"
                    onClick={() => handleViewAttachment(previewAdj.id)}
                  >
                    📎 Ver Anexo
                  </button>
                )}
                {previewAdj.status === "CONCLUIDO" && (
                  <button
                    className="btn-secondary outline-btn"
                    onClick={() => triggerPdf(previewAdj)}
                  >
                    📄 Baixar PDF
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => setPreviewAdj(null)}
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
            <div className="punch-doc-scaler-wrapper">
              <div className="punch-doc-scaler">
                <PunchDocument
                  bancoHoras={previewAdj.banco_horas === 1}
                  anexoPath={previewAdj.anexo_path}
                  nome={previewAdj.nome_completo || ""}
                  setor={previewAdj.nome_cr || ""}
                  data={previewAdj.data_registro || ""}
                  id={previewAdj.matricula || ""}
                  batidasOriginais={parseBatidas(previewAdj.batidas_originais)}
                  batidasCorrigidas={parseBatidas(
                    previewAdj.batidas_corrigidas,
                  )}
                  missedPunches={parseMarcacoes(previewAdj.marcacoes_faltantes)}
                  justificativa={previewAdj.justificativa || ""}
                  isAprovado={previewAdj.status === "CONCLUIDO"}
                  abonado={
                    previewAdj.abonado === 1
                      ? true
                      : previewAdj.abonado === 0
                        ? false
                        : null
                  }
                  assinaturaColaboradorData={previewAdj.employee_signature_date}
                  assinaturaGestorData={previewAdj.supervisor_signature_date}
                  hashValidacao={previewAdj.hash_validacao}
                  signatureFont={previewAdj.signature_font}
                  signatoryName={previewAdj.nome_completo}
                  supervisorFont={previewAdj.supervisor_signature_font}
                  supervisorName={
                    previewAdj.nome_chefia_completo || previewAdj.nome_chefia
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
