/* eslint-disable @next/next/no-img-element */
import React, { forwardRef, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import "./PunchDocument.css";

export const PunchDocument = forwardRef((props, ref) => {
  const { token } = useAuth() || {};
  const [imageUrl, setImageUrl] = useState(null);

  // Variável que define qual layout renderizar (Normal vs Banco de Horas)
  const isBancoHoras = props.bancoHoras === true || props.banco_horas === 1;

  useEffect(() => {
    let isMounted = true;
    if (
      props.anexoPath &&
      !props.anexoPath.toLowerCase().endsWith(".pdf") &&
      props.id &&
      token
    ) {
      fetch(`/api/punches/attachment?id=${props.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Erro auth anexo");
          return res.blob();
        })
        .then((blob) => {
          if (isMounted) setImageUrl(URL.createObjectURL(blob));
        })
        .catch((err) => console.error("Erro ao carregar anexo:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [props.anexoPath, props.id, token]);

  const missedEntrada1 =
    props.missedPunches?.[0] ?? !!props.batidasCorrigidas?.[0];
  const missedSaida1 =
    props.missedPunches?.[1] ?? !!props.batidasCorrigidas?.[1];
  const missedEntrada2 =
    props.missedPunches?.[2] ?? !!props.batidasCorrigidas?.[2];
  const missedSaida2 =
    props.missedPunches?.[3] ?? !!props.batidasCorrigidas?.[3];

  const punches = [
    { label: "ENTRADA 1", missed: missedEntrada1, idx: 0 },
    { label: "SAÍDA 1", missed: missedSaida1, idx: 1 },
    { label: "ENTRADA 2", missed: missedEntrada2, idx: 2 },
    { label: "SAÍDA 2", missed: missedSaida2, idx: 3 },
  ];

  return (
    <>
      <div className={props.className || ""} ref={ref}>
        <div
          className={`pdf-page page-1 ${props.isEditable ? "editable" : ""}`}
        >
          {/* ═══ HEADER DINÂMICO ═══ */}
          <div className="pdf-header">
            <div className="pdf-logo">
              <img src="/logo.png" width="180" alt="Logo ViaRondon" />
            </div>
            <div className="pdf-title">
              {isBancoHoras ? (
                <>
                  TERMO DE OPÇÃO -{" "}
                  <span style={{ color: "#16a34a" }}>BANCO DE HORAS</span>
                </>
              ) : (
                <>
                  JUSTIFICATIVA DE{" "}
                  <span style={{ color: "#c00" }}>&nbsp;NÃO&nbsp;</span>{" "}
                  MARCAÇÃO DE PONTO
                </>
              )}
            </div>
            <div className="pdf-doc-info">
              <div className="info-cell">
                {isBancoHoras ? "FOR 110" : "FOR 109"}
              </div>
              <div className="info-cell">03/07/2017</div>
              <div className="info-cell" style={{ borderBottom: "none" }}>
                Revisão: 03
              </div>
            </div>
          </div>

          <div className="pdf-body">
            {/* ═══ DADOS DO FUNCIONÁRIO (COMUM A AMBOS) ═══ */}
            <table className="pdf-fields-table">
              <tbody>
                <tr>
                  <td className="pdf-field-label">NOME:</td>
                  <td className="pdf-field-value">{props.nome}</td>
                  <td
                    className="pdf-field-label"
                    style={{ paddingLeft: "24px" }}
                  >
                    DATA:
                  </td>
                  <td className="pdf-field-value" style={{ width: "130px" }}>
                    {props.data}
                  </td>
                </tr>
                <tr>
                  <td className="pdf-field-label">SETOR:</td>
                  <td className="pdf-field-value">{props.setor}</td>
                  <td
                    className="pdf-field-label"
                    style={{ paddingLeft: "24px" }}
                  >
                    MATRÍCULA:
                  </td>
                  <td className="pdf-field-value">{props.id}</td>
                </tr>
              </tbody>
            </table>

            {/* ═══ CORPO CONDICIONAL ═══ */}
            {isBancoHoras ? (
              /* LAYOUT 1: BANCO DE HORAS (Esticado para manter o tamanho da folha A4) */
              <div
                style={{
                  padding: "50px 30px",
                  textAlign: "justify",
                  fontSize: "16px",
                  lineHeight: "1.8",
                  color: "#334155",
                  minHeight: "420px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <p>
                  Eu, <strong>{props.nome}</strong>, matrícula nº{" "}
                  <strong>{props.id}</strong>, lotado(a) no setor de{" "}
                  <strong>{props.setor}</strong>, declaro para os devidos fins
                  que as horas em débito correspondentes à minha jornada de
                  trabalho do dia <strong>{props.data}</strong> deverão ser
                  integralmente contabilizadas e debitadas do meu saldo no{" "}
                  <strong>Banco de Horas</strong>.
                </p>
                <p style={{ marginTop: "20px" }}>
                  Estou ciente de que esta operação está em conformidade com o
                  Acordo Coletivo de Trabalho e as políticas internas vigentes
                  da ViaRondon.
                </p>
                <p
                  style={{
                    marginTop: "50px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Por ser expressão da verdade, firmo o presente documento.
                </p>
              </div>
            ) : (
              /* LAYOUT 2: JUSTIFICATIVA PADRÃO INTACTA (Esquecimento/Falta de marcação) */
              <>
                <div className="pdf-section-title">DEIXOU DE MARCAR:</div>
                <table className="pdf-punches-table">
                  <tbody>
                    <tr>
                      {punches.map((punch) => (
                        <td key={punch.idx} className="pdf-punch-cell">
                          <div className="punch-header">
                            <div
                              className={`pdf-checkbox ${punch.missed ? "checked" : ""}`}
                              onClick={() =>
                                props.isEditable &&
                                props.onMissedChange &&
                                props.onMissedChange(punch.idx, !punch.missed)
                              }
                              style={{
                                cursor: props.isEditable
                                  ? "pointer"
                                  : "default",
                              }}
                            >
                              {punch.missed && "✓"}
                            </div>
                            <span className="punch-label">{punch.label}</span>
                          </div>
                          <div className="punch-time-row">
                            <span className="punch-time-label">Horário:</span>
                            {props.isEditable ? (
                              <input
                                type="time"
                                className={`pdf-time-input ${punch.missed ? "active-input" : ""}`}
                                value={props.batidasCorrigidas[punch.idx] || ""}
                                onChange={(e) =>
                                  props.onPunchChange?.(
                                    punch.idx,
                                    e.target.value,
                                  )
                                }
                                disabled={!punch.missed}
                              />
                            ) : (
                              <span className="pdf-line-value">
                                {punch.missed
                                  ? props.batidasCorrigidas[punch.idx] ||
                                    "___:___"
                                  : "___:___"}
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                <div
                  className="pdf-section-title"
                  style={{ marginTop: "16px" }}
                >
                  JUSTIFICATIVA:
                </div>
                <div className="pdf-justification">
                  {props.isEditable ? (
                    <textarea
                      className="pdf-textarea-input"
                      rows={4}
                      placeholder="Escreva sua justificativa aqui (ex: Esquecimento da credencial, falha no relógio, etc.)"
                      value={props.justificativa}
                      onChange={(e) =>
                        props.onJustificativaChange?.(e.target.value)
                      }
                    />
                  ) : (
                    <>
                      <div className="pdf-just-line-text">
                        {props.justificativa}
                      </div>
                      <div className="pdf-just-line" />
                      <div className="pdf-just-line" />
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ═══ FOOTER (Signatures) ═══ */}
          <div className="pdf-footer">
            <table className="pdf-signatures-table">
              <tbody>
                <tr>
                  {/* Manager Parecer (Oculta botões Sim/Não se for Banco de Horas) */}
                  <td className="pdf-parecer-cell">
                    <div className="pdf-parecer-title">
                      {isBancoHoras
                        ? "PARECER DO GESTOR:"
                        : "PARECER DO GESTOR — ABONAR:"}
                    </div>
                    {isBancoHoras ? (
                      <div
                        style={{
                          marginTop: "10px",
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: "#16a34a",
                        }}
                      >
                        [ ✓ ] CIENTE E DE ACORDO
                      </div>
                    ) : (
                      <div className="parecer-options">
                        <label
                          className={`parecer-option ${props.abonado === true ? "selected" : ""}`}
                          onClick={() =>
                            props.isManagerEditable &&
                            props.onAbonarChange?.(true)
                          }
                          style={{
                            cursor: props.isManagerEditable
                              ? "pointer"
                              : "default",
                          }}
                        >
                          <div
                            className={`pdf-checkbox ${props.abonado === true ? "checked" : ""}`}
                            style={{ width: 12, height: 12 }}
                          >
                            {props.abonado === true && "✓"}
                          </div>
                          SIM
                        </label>
                        <label
                          className={`parecer-option ${props.abonado === false ? "selected" : ""}`}
                          onClick={() =>
                            props.isManagerEditable &&
                            props.onAbonarChange?.(false)
                          }
                          style={{
                            cursor: props.isManagerEditable
                              ? "pointer"
                              : "default",
                          }}
                        >
                          <div
                            className={`pdf-checkbox ${props.abonado === false ? "checked" : ""}`}
                            style={{ width: 12, height: 12 }}
                          >
                            {props.abonado === false && "✓"}
                          </div>
                          NÃO
                        </label>
                      </div>
                    )}
                  </td>

                  {/* Manager signature */}
                  <td className="pdf-sig-cell">
                    <div className="pdf-sig-line">
                      {props.isAprovado && props.assinaturaGestorData && (
                        <div className="signature-container">
                          <span
                            className="pdf-handwritten-name"
                            style={{
                              fontFamily:
                                props.supervisorFont || "Dancing Script",
                            }}
                          >
                            {props.supervisorName || ""}
                          </span>
                          <div className="pdf-digital-stamp-box">
                            <span className="stamp-icon">🔒</span>
                            <div className="stamp-text">
                              <strong>Assinatura Eletrônica</strong>
                              <span>
                                Data:{" "}
                                {new Date(
                                  props.assinaturaGestorData,
                                ).toLocaleString("pt-BR")}
                              </span>
                              <span>Papel: Gestor / Aprovador</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pdf-sig-label">ASSINATURA GESTOR</div>
                  </td>

                  {/* Employee signature */}
                  <td className="pdf-sig-cell">
                    <div className="pdf-sig-line">
                      {props.assinaturaColaboradorData && (
                        <div className="signature-container">
                          {props.signatureFont && props.signatoryName && (
                            <span
                              className="pdf-handwritten-name"
                              style={{ fontFamily: props.signatureFont }}
                            >
                              {props.signatoryName}
                            </span>
                          )}
                          <div className="pdf-digital-stamp-box">
                            <span className="stamp-icon">🔒</span>
                            <div className="stamp-text">
                              <strong>Assinatura Eletrônica</strong>
                              <span>
                                Data:{" "}
                                {new Date(
                                  props.assinaturaColaboradorData,
                                ).toLocaleString("pt-BR")}
                              </span>
                              <span>Papel: Colaborador</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pdf-sig-label">ASSINATURA COLABORADOR</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ DIGITAL SEAL ═══ */}
        {props.isAprovado && props.hashValidacao && (
          <div className="pdf-digital-seal-container">
            <div className="seal-badge">
              <span>✓</span>
              <strong>VALIDADO</strong>
            </div>
            <div className="seal-info">
              <div className="seal-title">
                CERTIFICADO DE ASSINATURA DIGITAL — VIARONDON
              </div>
              <div className="seal-desc">
                Este documento foi assinado eletronicamente. A integridade e
                autoria das assinaturas podem ser verificadas através do código
                de autenticidade abaixo.
              </div>
              <div className="seal-hash">
                <strong>Código Hash:</strong> {props.hashValidacao}
              </div>
              <div className="seal-url">
                <strong>Verifique em:</strong> {process.env.NEXT_PUBLIC_APP_URL}
                /validar/{props.hashValidacao}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEGUNDA PÁGINA Opcional (ANEXO) */}
      {props.anexoPath && (
        <div
          className="pdf-page page-2"
          style={{
            marginTop: "20px",
            pageBreakBefore: "always",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="pdf-header" style={{ marginBottom: "1rem" }}>
            <div className="pdf-title">ANEXO E COMPROVANTE (Folha 2)</div>
          </div>
          {props.anexoPath.toLowerCase().endsWith(".pdf") ? (
            <div
              style={{
                flex: 1,
                border: "2px dashed #94a3b8",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
              }}
            >
              <span style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</span>
              <h2 style={{ margin: 0 }}>Documento Auxiliar PDF Anexado</h2>
              <p>
                Este comprovante encontra-se arquivado eletronicamente no
                sistema RH.
              </p>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                border: "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                  alt="Anexo"
                  crossOrigin="anonymous"
                />
              ) : (
                <span style={{ color: "#64748b" }}>
                  Carregando anexo seguro...
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TERCEIRA PÁGINA: MANIFESTO E TRILHA DE AUDITORIA (LOGS) ═══ */}
      {props.isAprovado && props.hashValidacao && (
        <div
          className="pdf-page page-audit"
          style={{
            marginTop: "20px",
            pageBreakBefore: "always",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="pdf-header" style={{ marginBottom: "1rem" }}>
            <div className="pdf-logo">
              <img src="/logo.png" width="180" alt="Logo ViaRondon" />
            </div>
            <div className="pdf-title">
              MANIFESTO E TRILHA DE
              <br />
              AUDITORIA DE ASSINATURA
            </div>
          </div>

          <div className="audit-content">
            <p className="audit-intro">
              Este documento foi assinado eletronicamente. Abaixo encontram-se
              os metadados técnicos capturados no momento das assinaturas,
              garantindo a integridade, autenticidade e o não-repúdio da
              operação de acordo com as políticas da ViaRondon.
            </p>

            <div className="audit-section">
              <h3>1. Identificação do Documento</h3>
              <table className="audit-table">
                <tbody>
                  <tr>
                    <td className="audit-label">Código Hash de Validação:</td>
                    <td className="audit-value hash-value">
                      {props.hashValidacao}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">Data de Conclusão:</td>
                    <td className="audit-value">
                      {props.assinaturaGestorData
                        ? new Date(props.assinaturaGestorData).toLocaleString(
                            "pt-BR",
                          )
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">ID do Registro (Sistema):</td>
                    <td className="audit-value">{props.id}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="audit-section">
              <h3>2. Assinatura do Colaborador (Solicitante)</h3>
              <table className="audit-table">
                <tbody>
                  <tr>
                    <td className="audit-label">Nome:</td>
                    <td className="audit-value">{props.nome}</td>
                  </tr>
                  <tr>
                    <td className="audit-label">Data da Assinatura:</td>
                    <td className="audit-value">
                      {props.assinaturaColaboradorData
                        ? new Date(
                            props.assinaturaColaboradorData,
                          ).toLocaleString("pt-BR")
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">Endereço IP:</td>
                    <td className="audit-value">
                      {props.ip_funcionario ||
                        "Não registrado nas versões antigas"}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">Dispositivo / Navegador:</td>
                    <td className="audit-value">
                      {props.user_agent_funcionario || "Não registrado"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="audit-section">
              <h3>3. Assinatura do Gestor (Aprovador)</h3>
              <table className="audit-table">
                <tbody>
                  <tr>
                    <td className="audit-label">Nome:</td>
                    <td className="audit-value">
                      {props.supervisorName || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">Data da Aprovação:</td>
                    <td className="audit-value">
                      {props.assinaturaGestorData
                        ? new Date(props.assinaturaGestorData).toLocaleString(
                            "pt-BR",
                          )
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">Endereço IP:</td>
                    <td className="audit-value">
                      {props.ip_gestor || "Não registrado nas versões antigas"}
                    </td>
                  </tr>
                  <tr>
                    <td className="audit-label">Dispositivo / Navegador:</td>
                    <td className="audit-value">
                      {props.user_agent_gestor || "Não registrado"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="audit-footer">
              <p>
                Para validar a integridade e autoria deste documento impresso ou
                digital, acesse:
              </p>
              <strong>
                {process.env.NEXT_PUBLIC_APP_URL}/validar/{props.hashValidacao}
              </strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

PunchDocument.displayName = "PunchDocument";
