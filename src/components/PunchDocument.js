import React, { forwardRef, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Adicionar esta linha
import "./PunchDocument.css";

export const PunchDocument = forwardRef((props, ref) => {
  const { token } = useAuth() || {};
  const [imageUrl, setImageUrl] = useState(null);

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
    props.missedPunches?.[0] ?? !!props.batidasCorrigidas[0];
  const missedSaida1 = props.missedPunches?.[1] ?? !!props.batidasCorrigidas[1];
  const missedEntrada2 =
    props.missedPunches?.[2] ?? !!props.batidasCorrigidas[2];
  const missedSaida2 = props.missedPunches?.[3] ?? !!props.batidasCorrigidas[3];

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
          {/* ═══ HEADER ═══ */}
          <div className="pdf-header">
            <div className="pdf-logo">
              <img src="/logo.png" width="180" alt="Logo ViaRondon" />
            </div>
            <div className="pdf-title">
              JUSTIFICATIVA DE{" "}
              <span style={{ color: "#c00" }}>&nbsp;NÃO&nbsp;</span>
              MARCAÇÃO DE PONTO
            </div>
            <div className="pdf-doc-info">
              <div className="info-cell">FOR 109</div>
              <div className="info-cell">03/07/2017</div>
              <div className="info-cell" style={{ borderBottom: "none" }}>
                Revisão: 03
              </div>
            </div>
          </div>

          {/* ═══ FIELDS ═══ */}
          <div className="pdf-body">
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

            {/* ═══ PUNCHES ═══ */}
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
                            cursor: props.isEditable ? "pointer" : "default",
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
                              props.onPunchChange?.(punch.idx, e.target.value)
                            }
                            disabled={!punch.missed}
                          />
                        ) : (
                          <span className="pdf-line-value">
                            {punch.missed
                              ? props.batidasCorrigidas[punch.idx] || "___:___"
                              : "___:___"}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* ═══ JUSTIFICATION ═══ */}
            <div
              className="pdf-section-title"
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <span>JUSTIFICATIVA:</span>
              {(props.bancoHoras === true || props.banco_horas === 1) && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#16a34a",
                    fontWeight: "700",
                  }}
                >
                  [ x ] OPÇÃO: BANCO DE HORAS
                </span>
              )}
            </div>
            <div className="pdf-justification">
              {props.isEditable ? (
                <textarea
                  className="pdf-textarea-input"
                  rows={4}
                  placeholder={
                    props.bancoHoras
                      ? "A opção de Banco de Horas insenta a justificativa."
                      : "Escreva sua justificativa aqui (ex: Esquecimento)"
                  }
                  value={props.bancoHoras ? "" : props.justificativa}
                  disabled={props.bancoHoras}
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
          </div>

          {/* ═══ FOOTER (Signatures) ═══ */}
          <div className="pdf-footer">
            <table className="pdf-signatures-table">
              <tbody>
                <tr>
                  {/* Manager parecer */}
                  <td className="pdf-parecer-cell">
                    <div className="pdf-parecer-title">
                      PARECER DO GESTOR — ABONAR:
                    </div>
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
                  </td>

                  {/* Manager signature */}
                  <td className="pdf-sig-cell">
                    <div
                      className="pdf-sig-line"
                      style={{
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      {props.isAprovado && props.assinaturaGestorData && (
                        <>
                          <span
                            className="pdf-handwritten-name"
                            style={{
                              fontFamily:
                                props.supervisorFont || "Dancing Script",
                            }}
                          >
                            {props.supervisorName || ""}
                          </span>
                          <span className="pdf-digital-stamp">
                            Assinado digitalmente em{" "}
                            {new Date(
                              props.assinaturaGestorData,
                            ).toLocaleString("pt-BR")}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="pdf-sig-label">ASSINATURA GESTOR</div>
                  </td>

                  {/* Employee signature */}
                  <td className="pdf-sig-cell">
                    <div
                      className="pdf-sig-line"
                      style={{
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      {props.assinaturaColaboradorData && (
                        <>
                          {props.signatureFont && props.signatoryName && (
                            <span
                              className="pdf-handwritten-name"
                              style={{ fontFamily: props.signatureFont }}
                            >
                              {props.signatoryName}
                            </span>
                          )}
                          <span className="pdf-digital-stamp">
                            Assinado digitalmente em{" "}
                            {new Date(
                              props.assinaturaColaboradorData,
                            ).toLocaleString("pt-BR")}
                          </span>
                        </>
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
          <div className="pdf-digital-seal">
            <div className="seal-icon">🔒</div>
            <div className="seal-content">
              <div className="seal-title">
                Documento Assinado Digitalmente — ViaRondon
              </div>
              <div className="seal-subtitle">
                Para verificar a autenticidade, acesse:{" "}
                <strong>
                  {process.env.NEXT_PUBLIC_APP_URL}/validar/
                  {props.hashValidacao}
                </strong>
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
    </>
  );
});

PunchDocument.displayName = "PunchDocument";
