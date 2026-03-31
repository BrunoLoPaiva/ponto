"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { PunchDocument } from "./PunchDocument";
import { SkeletonGrid } from "./Skeleton";
import { DocumentTimeline } from "./DocumentTimeline";
import { ToastContainer, toast } from "./Toast";
import { EmployeeDashboard } from "./EmployeeDashboard";
import { generatePdfFromNode } from "@/lib/pdfExport";
import "./SupervisorDashboard.css";

const SIGNATURE_FONTS = [
  { id: "Sacramento", label: "Elegante" },
  { id: "Allura", label: "Clássica" },
  { id: "Dancing Script", label: "Natural" },
  { id: "Marck Script", label: "Suave" },
  { id: "Kaushan Script", label: "Moderna" },
  { id: "Caveat", label: "Casual" },
  { id: "Indie Flower", label: "Descontraída" },
  { id: "Patrick Hand", label: "Manual" },
  { id: "Shadows Into Light", label: "Leve" },
  { id: "Satisfy", label: "Refinada" },
  { id: "Great Vibes", label: "Luxo" },
  { id: "Playball", label: "Esportiva" },
  { id: "Yellowtail", label: "Vintage" },
];

export const SupervisorDashboard = () => {
  const { user, token } = useAuth();

  // ── Aba principal ──────────────────────────────────────────────
  // "team"    → aprovações da equipe
  // "meu-ponto" → pendentes/histórico pessoal (reutiliza EmployeeDashboard)
  const [mainTab, setMainTab] = useState("team");

  // ── Estado da aba "Minha Equipe" ───────────────────────────────
  const [adjustments, setAdjustments] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [abonadoSelection, setAbonadoSelection] = useState(true);
  const [supervisorFont, setSupervisorFont] = useState(SIGNATURE_FONTS[0].id);

  // Filtro de histórico da equipe
  const [teamTab, setTeamTab] = useState("pendentes"); // "pendentes" | "historico"
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [previewAdj, setPreviewAdj] = useState(null); // preview PDF modal (histórico)

  // Botão de cobrança
  const [sendingReminder, setSendingReminder] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);

  // Busca rápida dentro da equipe
  const [teamSearch, setTeamSearch] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // ── PDF ──────────────────────────────────────────────────────
  const [printingAdjustment, setPrintingAdjustment] = useState(null);
  const pdfRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTeamAdjustments = async () => {
      try {
        const response = await fetch(
          `/api/punches/team-adjustments?username=${user?.username}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await response.json();
        if (isMounted && data.success) setAdjustments(data.data);
      } catch (error) {
        console.error("Error fetching team adjustments", error);
      } finally {
        if (isMounted) setLoadingTeam(false);
      }
    };

    fetchTeamAdjustments();
    const interval = setInterval(fetchTeamAdjustments, 1000);
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

  const handleApprove = async (id) => {
    setIsApproving(true);
    try {
      const response = await fetch("/api/punches/sign-supervisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          abonado: abonadoSelection,
          supervisor_font: supervisorFont,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedAdjustment(null);
        setSupervisorFont(SIGNATURE_FONTS[0].id);
        // refresh data locally or let the interval pick it up
      } else {
        toast("Erro: " + data.error, "error");
      }
    } catch {
      toast("Erro de rede ao aprovar documento.", "error");
    } finally {
      setIsApproving(false);
    }
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
            body: JSON.stringify({ username: adj.username }),
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

  // ── Derived data ───────────────────────────────────────────────
  const pendentesEquipe = adjustments.filter(
    (a) => a.status === "PENDENTE_CHEFIA",
  );
  const pendentesFuncionario = adjustments.filter(
    (a) => a.status === "PENDENTE_FUNCIONARIO",
  );
  const totalPendentes = pendentesEquipe.length + pendentesFuncionario.length;

  const filteredEquipe = pendentesEquipe.filter((a) =>
    a.nome_completo?.toLowerCase().includes(teamSearch.toLowerCase()),
  );

  const filteredFuncs = pendentesFuncionario.filter((a) =>
    a.nome_completo?.toLowerCase().includes(teamSearch.toLowerCase()),
  );

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

  return (
    <div className="dashboard-container supervisor-mode">
      <ToastContainer />

      {/* ────── MAIN NAV TABS ────── */}
      <header className="dashboard-header">
        <div className="header-top">
          <div>
            <h2>Painel do Gestor</h2>
            <p>Gerencie sua equipe e acompanhe o seu próprio ponto.</p>
          </div>
          <div className="tab-bar">
            <button
              className={`tab-btn ${mainTab === "team" ? "active" : ""}`}
              onClick={() => setMainTab("team")}
            >
              👥 Minha Equipe
              {totalPendentes > 0 && (
                <span className="tab-badge">{totalPendentes}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ────── TAB: MINHA EQUIPE ────── */}
      {mainTab === "team" && (
        <>
          {/* Sub-tabs: Pendentes vs Histórico da Equipe */}
          <div className="sub-tab-bar">
            <button
              className={`sub-tab-btn ${teamTab === "pendentes" ? "active" : ""}`}
              onClick={() => setTeamTab("pendentes")}
            >
              ✍️ Pendentes de Aprovação
              {pendentesEquipe.length > 0 && (
                <span className="tab-badge">{pendentesEquipe.length}</span>
              )}
            </button>
            <button
              className={`sub-tab-btn ${teamTab === "pendentes-func" ? "active" : ""}`}
              onClick={() => setTeamTab("pendentes-func")}
            >
              ⏳ Aguardando Funcionário
              {pendentesFuncionario.length > 0 && (
                <span className="tab-badge agenda">
                  {pendentesFuncionario.length}
                </span>
              )}
            </button>
            <button
              className={`sub-tab-btn ${teamTab === "historico" ? "active" : ""}`}
              onClick={() => setTeamTab("historico")}
            >
              🗄️ Histórico da Equipe
            </button>
          </div>

          {loadingTeam ? (
            <SkeletonGrid count={2} />
          ) : (
            <>
              {/* Quick Search */}
              {(teamTab === "pendentes" || teamTab === "pendentes-func") && (
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
                    placeholder="🔍 Buscar colaborador por nome..."
                    className="filter-select"
                    style={{ flex: 1, padding: "0.6rem 1rem" }}
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                  />
                  {teamTab === "pendentes-func" && filteredFuncs.length > 0 && (
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

              {/* ── SUB-TAB: PENDENTES PARA ASSINAR ── */}
              {teamTab === "pendentes" && (
                <>
                  {filteredEquipe.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🎯</div>
                      <h3>Equipe em Dia!</h3>
                      <p>Não há documentos aguardando a sua assinatura.</p>
                    </div>
                  ) : (
                    <div className="team-list">
                      {filteredEquipe.map((adj) => (
                        <div className="team-card action-card" key={adj.id}>
                          <span className="departament-title">
                            {adj.nome_cr}
                          </span>
                          <div className="team-card-header">
                            <div className="employee-info">
                              <span className="matricula">
                                Colaborador:{" "}
                                <strong>{adj.nome_completo}</strong>
                              </span>
                            </div>
                            <span className="badge pending-supervisor">
                              Aguarda Gestor
                            </span>
                          </div>
                          <DocumentTimeline status={adj.status} />
                          <div className="team-card-actions">
                            <button
                              className="btn-approve"
                              onClick={() => {
                                setAbonadoSelection(true);
                                setSelectedAdjustment(adj);
                              }}
                            >
                              ✓ Revisar e Assinar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── SUB-TAB: AGUARDANDO FUNCIONÁRIO ── */}
              {teamTab === "pendentes-func" && (
                <>
                  {filteredFuncs.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">✅</div>
                      <h3>Nenhum pendente!</h3>
                      <p>
                        Todos os colaboradores já assinaram seus documentos.
                      </p>
                    </div>
                  ) : (
                    <div className="team-list">
                      {filteredFuncs.map((adj) => (
                        <div className="team-card" key={adj.id}>
                          <span className="departament-title">
                            {adj.nome_cr}
                          </span>
                          <div className="team-card-header">
                            <div className="employee-info">
                              <span className="matricula">
                                Colaborador:{" "}
                                <strong>{adj.nome_completo}</strong>
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
                              className="btn-reminder"
                              disabled={sendingReminder === adj.username}
                              onClick={() => handleReminder(adj.username)}
                            >
                              {sendingReminder === adj.username
                                ? "⏳ Enviando..."
                                : "🔔 Cobrar Assinatura"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── SUB-TAB: HISTÓRICO DA EQUIPE ── */}
              {teamTab === "historico" && (
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
                      {history.length} documento
                      {history.length !== 1 ? "s" : ""} encontrado
                      {history.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {history.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📂</div>
                      <h3>Nenhum documento</h3>
                      <p>
                        Sem documentos concluídos para {MONTHS[filterMonth]} de{" "}
                        {filterYear}.
                      </p>
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
                            <td className="history-date">
                              {adj.data_registro}
                            </td>
                            <td>{adj.nome_completo}</td>
                            <td
                              style={{ color: "#64748b", fontSize: "0.85rem" }}
                            >
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
                                🔍 Visualizar
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
          supervisorName={printingAdjustment.nome_chefia_completo || printingAdjustment.nome_chefia}
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
                <h3 style={{ margin: 0 }}>🗄️ Visualização do Documento</h3>
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
                <button
                  className="btn-secondary outline-btn"
                  onClick={() => triggerPdf(previewAdj)}
                >
                  📄 Baixar PDF
                </button>
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
                  supervisorName={previewAdj.nome_chefia_completo || previewAdj.nome_chefia}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor approval modal */}
      {selectedAdjustment && (
        <div className="modal-overlay">
          <div className="modal-content sup-approval-modal">
            <div className="sup-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>🔍 Visar Formulário de Ponto</h3>
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.85rem",
                    margin: "0.2rem 0 0",
                  }}
                >
                  {selectedAdjustment.data_registro} ·{" "}
                  {selectedAdjustment.nome_completo}
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setSelectedAdjustment(null)}
              >
                ✕ Fechar
              </button>
            </div>

            {/* Document preview with zoom scaler (no scroll) */}
            <div className="punch-doc-scaler-wrapper">
              <div className="punch-doc-scaler">
                <PunchDocument
                  nome={selectedAdjustment.nome_completo || ""}
                  setor={selectedAdjustment.nome_cr || ""}
                  data={selectedAdjustment.data_registro || ""}
                  id={selectedAdjustment.matricula || ""}
                  batidasOriginais={parseBatidas(
                    selectedAdjustment.batidas_originais,
                  )}
                  batidasCorrigidas={parseBatidas(
                    selectedAdjustment.batidas_corrigidas,
                  )}
                  missedPunches={parseMarcacoes(
                    selectedAdjustment.marcacoes_faltantes,
                  )}
                  justificativa={selectedAdjustment.justificativa || ""}
                  isAprovado={true}
                  isManagerEditable={true}
                  abonado={abonadoSelection}
                  onAbonarChange={setAbonadoSelection}
                  assinaturaColaboradorData={
                    selectedAdjustment.employee_signature_date
                  }
                  assinaturaGestorData={new Date().toISOString()}
                  signatureFont={selectedAdjustment.signature_font}
                  signatoryName={selectedAdjustment.nome_completo || ""}
                  supervisorFont={supervisorFont}
                  supervisorName={user?.name && !user?.name?.includes('.') ? user.name : selectedAdjustment.nome_chefia}
                />
              </div>
            </div>

            {/* Font picker — gestor escolhe sua própria fonte */}
            <div className="font-picker-section">
              <div className="font-picker-label">
                ✒️ Escolha o estilo da sua assinatura:
              </div>
              <div className="font-picker-strip">
                {SIGNATURE_FONTS.map((f) => (
                  <button
                    key={f.id}
                    className={`font-option ${supervisorFont === f.id ? "selected" : ""}`}
                    onClick={() => setSupervisorFont(f.id)}
                    style={{ fontFamily: f.id }}
                  >
                    <span className="font-preview" style={{ fontFamily: f.id }}>
  {(user?.name && !user?.name?.includes('.') ? user.name : selectedAdjustment.nome_chefia)?.split(" ")[0] || "Gestor"}
</span>
                    <span className="font-label">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="sup-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setSelectedAdjustment(null)}
                disabled={isApproving}
              >
                Cancelar
              </button>
              <button
                className="btn-approve"
                onClick={() => handleApprove(selectedAdjustment.id)}
                disabled={isApproving}
              >
                {isApproving ? "⏳ Aprovando..." : "✓ Assinar e Aprovar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
