"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { PunchDocument } from "./PunchDocument";
import { SkeletonGrid } from "./Skeleton";
import { DocumentTimeline } from "./DocumentTimeline";
import { ToastContainer, toast } from "./Toast";
import { generatePdfFromNode } from "@/lib/pdfExport";
import "./EmployeeDashboard.css";

const SIGNATURE_FONTS = [
  { id: "Sacramento", label: "Elegante" },
  { id: "Allura", label: "Clássica limpa" },
  { id: "Dancing Script", label: "Natural" },
  { id: "Marck Script", label: "Suave" },
  { id: "Kaushan Script", label: "Moderna" },
  { id: "Caveat", label: "Casual" },
  { id: "Indie Flower", label: "Descontraída" },
  { id: "Patrick Hand", label: "Manual" },
  { id: "Shadows Into Light", label: "Leve" },
  { id: "Satisfy", label: "Refinada" },
  { id: "Great Vibes", label: "Luxo" },
  { id: "Playball", label: "Esportiva elegante" },
  { id: "Yellowtail", label: "Vintage" },
];

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

export const EmployeeDashboard = ({ hideHeader = false }) => {
  const { user, token } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pendentes"); // "pendentes" | "historico"

  // Signature modal
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [correctedPunches, setCorrectedPunches] = useState(["", "", "", ""]);
  const [missedPunches, setMissedPunches] = useState([
    false,
    false,
    false,
    false,
  ]);
  const [justificativa, setJustificativa] = useState("");
  const [signatureFont, setSignatureFont] = useState(SIGNATURE_FONTS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bancoHoras, setBancoHoras] = useState(false);
  const [anexo, setAnexo] = useState(null);

  // History filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  // Preview modal (history quick-view)
  const [previewAdjustment, setPreviewAdjustment] = useState(null);

  // PDF printing
  const [printingAdjustment, setPrintingAdjustment] = useState(null);
  const [printingFont, setPrintingFont] = useState(SIGNATURE_FONTS[0].id);
  const pdfRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAdjustments = async () => {
      try {
        const response = await fetch(
          `/api/punches/my-adjustments?username=${user?.username}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await response.json();
        if (isMounted && data.success) {
          // Só atualiza o estado se houver mudança real nos dados
          setAdjustments((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data.data)) {
              return data.data;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error fetching adjustments", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdjustments();
    const interval = setInterval(fetchAdjustments, 10000);
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

  const handleOpenModal = (adj) => {
    setSelectedAdjustment(adj);
    setCorrectedPunches(["", "", "", ""]);
    setMissedPunches([false, false, false, false]);
    setJustificativa("");
    setSignatureFont(SIGNATURE_FONTS[0].id);
    setBancoHoras(false);
    setAnexo(null);
  };

  const handlePunchChange = (index, value) => {
    if (bancoHoras) return;
    const p = [...correctedPunches];
    p[index] = value;
    setCorrectedPunches(p);
  };

  const triggerPdf = (adj, font) => {
    setPrintingAdjustment(adj);
    setPrintingFont(font || SIGNATURE_FONTS[0].id);
    setTimeout(async () => {
      if (!pdfRef.current) return;
      try {
        await generatePdfFromNode(
          pdfRef.current,
          `Justificativa_Ponto_${adj.data_registro.replace(/\//g, "-")}.pdf`,
        );
        toast("PDF gerado com sucesso!", "success");
      } catch (err) {
        console.error("Error generating PDF", err);
        toast("Erro ao gerar o PDF. Tente novamente.", "error");
      } finally {
        setPrintingAdjustment(null);
      }
    }, 500);
  };

  const canSign = bancoHoras
    ? true
    : justificativa.trim() !== "" && missedPunches.includes(true);

  const getSignButtonText = () => {
    if (bancoHoras) return "🔒 Assinar (Banco de Horas)";
    if (!missedPunches.includes(true))
      return "Marque os dias/horários faltantes";
    if (!justificativa.trim())
      return "Preencha sua justificativa (obrigatório)";
    return "🔒 Assinar Digitalmente";
  };

  const handleSign = async () => {
    if (!selectedAdjustment) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("id", selectedAdjustment.id);
      formData.append("batidas_corrigidas", JSON.stringify(correctedPunches));
      formData.append("marcacoes_faltantes", JSON.stringify(missedPunches));
      formData.append("justificativa", justificativa);
      formData.append("signature_font", signatureFont);
      formData.append("banco_horas", bancoHoras);
      if (anexo) {
        formData.append("file", anexo);
      }

      const response = await fetch("/api/punches/sign-employee", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setSelectedAdjustment(null);
        fetchAdjustments();
        toast(
          "Documento assinado com sucesso! O gestor foi notificado.",
          "success",
        );
      } else {
        toast(data.error || "Falha ao assinar o documento.", "error");
      }
    } catch {
      toast("Erro de rede ao enviar assinatura.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendentesFuncionario = adjustments.filter(
    (a) => a.status === "PENDENTE_FUNCIONARIO",
  );
  const pendentesChefia = adjustments.filter(
    (a) => a.status === "PENDENTE_CHEFIA",
  );
  const totalPendentes = pendentesFuncionario.length + pendentesChefia.length;

  // History = only concluded docs filtered by month/year
  const history = adjustments
    .filter((a) => a.status === "CONCLUIDO")
    .filter((a) => {
      const [d, m, y] = (a.data_registro || "").split("/").map(Number);
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
    <div className={hideHeader ? "employee-embedded" : "dashboard-container"}>
      {!hideHeader && <ToastContainer />}

      {!hideHeader && (
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h2>Minhas Ausências de Marcação</h2>
              <p>
                Preencha os horários que estão faltando e assine digitalmente.
              </p>
            </div>
            <div className="tab-bar">
              <button
                className={`tab-btn ${activeTab === "pendentes" ? "active" : ""}`}
                onClick={() => setActiveTab("pendentes")}
              >
                🗂️ Pendentes
                {totalPendentes > 0 && (
                  <span className="tab-badge">{totalPendentes}</span>
                )}
              </button>
              <button
                className={`tab-btn ${activeTab === "historico" ? "active" : ""}`}
                onClick={() => setActiveTab("historico")}
              >
                🗄️ Meu Histórico
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ═══ TAB: PENDENTES ═══ */}
      {activeTab === "pendentes" && (
        <>
          {loading ? (
            <SkeletonGrid count={3} />
          ) : totalPendentes === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>Tudo em Dia!</h3>
              <p>Você não possui nenhum acerto de ponto pendente no momento.</p>
            </div>
          ) : (
            <div className="adjustments-layout">
              {pendentesFuncionario.length > 0 && (
                <div className="status-section">
                  <h3 className="section-header">
                    ✍️ Pendente da sua assinatura
                    <span className="section-count">
                      {pendentesFuncionario.length}
                    </span>
                  </h3>
                  <div className="adjustments-grid">
                    {pendentesFuncionario.map((adj) => (
                      <div
                        className="adjustment-card pending-action"
                        key={adj.id}
                      >
                        <div className="card-top">
                          <span className="badge pending">
                            ⚡ Ação Necessária
                          </span>
                          <span className="date">
                            {adj.data_registro} {adj.dia ? `(${adj.dia})` : ""}
                          </span>
                        </div>
                        <div className="card-body">
                          <p>
                            <strong>Horário Previsto:</strong>{" "}
                            {adj.descricao_horario}
                          </p>
                          <p className="batidas-originais">
                            <strong>Batidas no Relógio:</strong>{" "}
                            {parseBatidas(adj.batidas_originais).join(" – ") ||
                              "Sem marcações"}
                          </p>
                        </div>
                        <DocumentTimeline status={adj.status} />
                        <div className="card-footer">
                          <button
                            className="btn-primary"
                            onClick={() => handleOpenModal(adj)}
                          >
                            Corrigir e Assinar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendentesChefia.length > 0 && (
                <div className="status-section">
                  <h3 className="section-header">
                    ⏳ Aguardando Supervisor
                    <span className="section-count">
                      {pendentesChefia.length}
                    </span>
                  </h3>
                  <div className="adjustments-grid">
                    {pendentesChefia.map((adj) => (
                      <div className="adjustment-card read-only" key={adj.id}>
                        <div className="card-top">
                          <span className="badge pending-supervisor">
                            Aguardando Avaliação
                          </span>
                          <span className="date">
                            {adj.data_registro} {adj.dia ? `(${adj.dia})` : ""}
                          </span>
                        </div>
                        <div className="card-body">
                          <p>
                            <strong>Horário Previsto:</strong>{" "}
                            {adj.descricao_horario}
                          </p>
                        </div>
                        <DocumentTimeline status={adj.status} />
                        <div className="card-footer">
                          <button
                            className="btn-secondary read-only-btn"
                            disabled
                          >
                            Em Análise pelo Gestor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: HISTÓRICO ═══ */}
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
              {history.length} documento{history.length !== 1 ? "s" : ""}{" "}
              encontrado{history.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <SkeletonGrid count={3} />
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>Nenhum documento</h3>
              <p>
                Não há documentos concluídos para {MONTHS[filterMonth]} de{" "}
                {filterYear}.
              </p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Horário Previsto</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {history.map((adj) => (
                  <tr key={adj.id}>
                    <td className="history-date">{adj.data_registro}</td>
                    <td>{adj.descricao_horario}</td>
                    <td>
                      <span className="badge success">✓ Aprovado</span>
                    </td>
                    <td className="history-actions">
                      <button
                        className="btn-preview"
                        onClick={() => setPreviewAdjustment(adj)}
                      >
                        🔍 Visualizar
                      </button>
                      <button
                        className="btn-secondary outline-btn"
                        onClick={() => triggerPdf(adj, adj.signature_font)}
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

      {/* Hidden PDF target */}
      {printingAdjustment && (
        <PunchDocument
          ref={pdfRef}
          nome={printingAdjustment.nome_completo || user?.name || ""}
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
          hashValidacao={printingAdjustment.hash_validacao}
          signatureFont={printingFont}
          signatoryName={printingAdjustment.nome_completo || user?.name || ""}
          supervisorFont={printingAdjustment.supervisor_signature_font}
          supervisorName={
            printingAdjustment.nome_chefia_completo ||
            printingAdjustment.nome_chefia
          }
        />
      )}

      {/* ═══ HISTORY PREVIEW MODAL ═══ */}
      {previewAdjustment && (
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
                  {previewAdjustment.data_registro} ·{" "}
                  {previewAdjustment.nome_completo}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn-secondary outline-btn"
                  onClick={() =>
                    triggerPdf(
                      previewAdjustment,
                      previewAdjustment.signature_font,
                    )
                  }
                >
                  📄 Baixar PDF
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setPreviewAdjustment(null)}
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1rem",
              }}
            >
              <PunchDocument
                nome={previewAdjustment.nome_completo || ""}
                setor={previewAdjustment.nome_cr || ""}
                data={previewAdjustment.data_registro || ""}
                id={previewAdjustment.matricula || ""}
                batidasOriginais={parseBatidas(
                  previewAdjustment.batidas_originais,
                )}
                batidasCorrigidas={parseBatidas(
                  previewAdjustment.batidas_corrigidas,
                )}
                missedPunches={parseMarcacoes(
                  previewAdjustment.marcacoes_faltantes,
                )}
                justificativa={previewAdjustment.justificativa || ""}
                isAprovado={previewAdjustment.status === "CONCLUIDO"}
                abonado={
                  previewAdjustment.abonado === 1
                    ? true
                    : previewAdjustment.abonado === 0
                      ? false
                      : null
                }
                assinaturaColaboradorData={
                  previewAdjustment.employee_signature_date
                }
                assinaturaGestorData={
                  previewAdjustment.supervisor_signature_date
                }
                hashValidacao={previewAdjustment.hash_validacao}
                signatureFont={previewAdjustment.signature_font}
                signatoryName={previewAdjustment.nome_completo || ""}
                supervisorFont={previewAdjustment.supervisor_signature_font}
                supervisorName={
                  previewAdjustment.nome_chefia_completo ||
                  previewAdjustment.nome_chefia
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ SIGNATURE MODAL ═══ */}
      {selectedAdjustment && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "980px", width: "95%" }}
          >
            <h3 style={{ marginBottom: "0.25rem", textAlign: "center" }}>
              🖊️ Preencher Justificativa Oficial
            </h3>
            <p
              style={{
                textAlign: "center",
                color: "#64748b",
                fontSize: "0.9rem",
                marginBottom: "1.25rem",
              }}
            >
              Marque apenas os horários que você{" "}
              <strong>esqueceu de bater</strong> e preencha o horário correto.
            </p>

            <div className="reference-box">
              <span className="reference-label">
                📍 Suas batidas no relógio:
              </span>
              <span className="reference-value">
                {parseBatidas(selectedAdjustment.batidas_originais).join(
                  " – ",
                ) || "Nenhuma marcação"}
              </span>
            </div>

            {/* PunchDocument scaled to fit modal without adding scroll */}
            <div className="punch-doc-scaler-wrapper">
              <div className="punch-doc-scaler">
                <PunchDocument
                  isEditable={true}
                  bancoHoras={bancoHoras}
                  nome={selectedAdjustment.nome_completo || user?.name || ""}
                  setor={selectedAdjustment.nome_cr || ""}
                  data={selectedAdjustment.data_registro || ""}
                  id={selectedAdjustment.matricula || ""}
                  batidasOriginais={parseBatidas(
                    selectedAdjustment.batidas_originais,
                  )}
                  batidasCorrigidas={correctedPunches}
                  missedPunches={missedPunches}
                  justificativa={justificativa}
                  isAprovado={false}
                  onPunchChange={handlePunchChange}
                  onMissedChange={(index, val) => {
                    const n = [...missedPunches];
                    n[index] = val;
                    setMissedPunches(n);
                    if (!val) handlePunchChange(index, "");
                  }}
                  onJustificativaChange={setJustificativa}
                />
              </div>
            </div>

            {/* Extra Options Block (Banco de Horas & Attachment) */}
            <div
              className="extra-options-section"
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginBottom: "0.75rem",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={bancoHoras}
                  onChange={(e) => {
                    setBancoHoras(e.target.checked);
                    if (e.target.checked) {
                      setJustificativa("");
                      setMissedPunches([false, false, false, false]);
                      setCorrectedPunches(["", "", "", ""]);
                    }
                  }}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--color-brand)",
                  }}
                />
                Utilizar Banco de Horas (isenta horários e justificativa)
              </label>

              <div style={{ marginTop: "0.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                    color: "#475569",
                  }}
                >
                  📎 Anexar Comprovante (Opcional - ex: Atestado)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setAnexo(e.target.files?.[0] || null)}
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Signature font picker — single horizontal scroll strip */}
            {canSign ? (
              <div className="font-picker-section">
                <div className="font-picker-label">
                  ✒️ Escolha o estilo da sua assinatura:
                </div>
                <div className="font-picker-strip">
                  {SIGNATURE_FONTS.map((f) => (
                    <button
                      key={f.id}
                      className={`font-strip-option ${signatureFont === f.id ? "selected" : ""}`}
                      onClick={() => setSignatureFont(f.id)}
                    >
                      <span
                        style={{
                          fontFamily: f.id,
                          fontSize: "1.3rem",
                          display: "block",
                        }}
                      >
                        {
                          (
                            selectedAdjustment.nome_completo ||
                            user?.name ||
                            "Seu Nome"
                          ).split(" ")[0]
                        }
                      </span>
                      <span className="font-option-label">{f.label}</span>
                    </button>
                  ))}
                </div>
                {/* Live preview */}
                <div className="signature-preview-box">
                  <span
                    style={{
                      fontFamily: signatureFont,
                      fontSize: "1.75rem",
                      color: "#1d4ed8",
                    }}
                  >
                    {selectedAdjustment.nome_completo || user?.name || ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="signature-prerequisite">
                <p>
                  Complete as marcações e a justificativa para liberar sua
                  assinatura.
                </p>
              </div>
            )}

            <div className="signature-disclaimer">
              <p>
                ⚠️ Ao clicar em &quot;Assinar Digitalmente&quot;, declaro que as
                informações acima são verdadeiras e de minha responsabilidade.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setSelectedAdjustment(null)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                className={`btn-sign ${canSign ? "btn-sign-ready" : ""}`}
                onClick={handleSign}
                disabled={isSubmitting || !canSign}
              >
                {isSubmitting ? "⏳ Enviando..." : getSignButtonText()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
