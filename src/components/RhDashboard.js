"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { PunchDocument } from "./PunchDocument";
import { ToastContainer, toast } from "./Toast";
import { RichTextEditor } from "./RichTextEditor";
import { generatePdfFromNode } from "@/lib/pdfExport";
import "./RhDashboard.css";

const PAGE_SIZE = 50;

const STATUS_OPTS = [
  { value: "", label: "Todos os status" },
  { value: "PENDENTE_FUNCIONARIO", label: "Aguarda Funcionário" },
  { value: "PENDENTE_CHEFIA", label: "Aguarda Gestor" },
  { value: "CONCLUIDO", label: "Concluído" },
];

const STATUS_LABEL = {
  PENDENTE_FUNCIONARIO: "Ag. Funcionário",
  PENDENTE_CHEFIA: "Ag. Gestor",
  CONCLUIDO: "Concluído",
};

const STATUS_CLASS = {
  PENDENTE_FUNCIONARIO: "badge pending",
  PENDENTE_CHEFIA: "badge pending-supervisor",
  CONCLUIDO: "badge success",
};

const MONTHS_PT = [
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

// ── Donut Chart (SVG puro) ─────────────────────────────────────
function DonutChart({ concluido, pendFunc, pendGestor, total }) {
  const r = 52,
    cx = 64,
    cy = 64,
    stroke = 14;
  const circ = 2 * Math.PI * r;
  const pct = (n) => (total > 0 ? n / total : 0);
  const slices = [
    { value: pct(concluido), color: "#10b981", label: "Concluído" },
    { value: pct(pendFunc), color: "#f59e0b", label: "Ag. Func." },
    { value: pct(pendGestor), color: "#6366f1", label: "Ag. Gestor" },
  ];
  let offset = 0;
  return (
    <div className="donut-chart-wrapper">
      <svg viewBox="0 0 128 128" className="donut-svg">
        {slices.map((s, i) => {
          const dash = s.value * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
          offset += s.value;
          return el;
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#0f172a"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="8"
          fill="#64748b"
        >
          total
        </text>
      </svg>
      <div className="donut-legend">
        {slices.map((s, i) => (
          <div key={i} className="donut-leg-item">
            <span className="donut-leg-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bar Chart (CSS) ────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="bar-chart">
      {data.slice(0, 5).map((d, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label" title={d.cr}>
            {d.cr}
          </span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="bar-count">{d.count}</span>
        </div>
      ))}
      {data.length === 0 && <p className="bar-empty">Nenhuma pendência 🎉</p>}
    </div>
  );
}

// ── Breadcrumb ─────────────────────────────────────────────────
function Breadcrumb({ crumbs, onClick }) {
  return (
    <nav className="repo-breadcrumb">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="crumb-sep">›</span>}
          <button
            className={`crumb-btn ${i === crumbs.length - 1 ? "active" : ""}`}
            onClick={() => onClick(i)}
          >
            {c}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

// ══════════════════════════════════════════════════════════════
export const RhDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // ── Data ──────────────────────────────────────────────────
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Filtros Registros ─────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCr, setFilterCr] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [page, setPage] = useState(1);

  // ── Filtros Visão Geral ───────────────────────────────────
  const [ovMes, setOvMes] = useState(""); // "YYYY-MM"
  const [ovCr, setOvCr] = useState("");

  // ── Seleção em lote ───────────────────────────────────────
  const [selected, setSelected] = useState(new Set());
  const [sendingBatch, setSendingBatch] = useState(false);

  // ── Repositório ───────────────────────────────────────────
  const [repoPath, setRepoPath] = useState([]);

  // ── Preview / PDF ─────────────────────────────────────────
  const [previewAdj, setPreviewAdj] = useState(null);
  const [printAdj, setPrintAdj] = useState(null);
  const pdfRef = useRef(null);

  // ── Templates ─────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [editTemplate, setEditTemplate] = useState(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // ── Upload ────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/punches/all-adjustments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (isMounted && data.success) setAllData(data.data);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 20000);
    return () => {
      isMounted = false;
      clearInterval(iv);
    };
  }, [token]);

  const fetchTemplates = React.useCallback(async () => {
    const res = await fetch("/api/rh/templates", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      setTemplates(data.data);
      setEditTemplate(null);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "settings") fetchTemplates();
  }, [activeTab, fetchTemplates]);

  // ── Overview: filtered data ────────────────────────────────
  const overviewData = useMemo(() => {
    return allData.filter((d) => {
      if (ovCr && d.nome_cr !== ovCr) return false;
      if (ovMes) {
        const parts = (d.data_registro || "").split("/");
        const mm = parts[1]?.padStart(2, "0");
        const yy = parts[2];
        if (`${yy}-${mm}` !== ovMes) return false;
      }
      return true;
    });
  }, [allData, ovMes, ovCr]);

  // ── Stats (use overviewData) ────────────────────────────────
  const stats = useMemo(
    () => ({
      total: overviewData.length,
      concluido: overviewData.filter((d) => d.status === "CONCLUIDO").length,
      pendFunc: overviewData.filter((d) => d.status === "PENDENTE_FUNCIONARIO")
        .length,
      pendGestor: overviewData.filter((d) => d.status === "PENDENTE_CHEFIA")
        .length,
    }),
    [overviewData],
  );

  // Top 5 CRs (use overviewData)
  const topCrs = useMemo(() => {
    const map = {};
    overviewData
      .filter((d) => d.status !== "CONCLUIDO")
      .forEach((d) => {
        map[d.nome_cr] = (map[d.nome_cr] || 0) + 1;
      });
    return Object.entries(map)
      .map(([cr, count]) => ({ cr, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [overviewData]);

  // ── Registros: filtered data ───────────────────────────────
  const filtered = useMemo(() => {
    return allData.filter((d) => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterCr && d.nome_cr !== filterCr) return false;
      if (filterMes) {
        const parts = (d.data_registro || "").split("/");
        const mm = parts[1]?.padStart(2, "0");
        const yy = parts[2];
        if (`${yy}-${mm}` !== filterMes) return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        if (
          !d.nome_completo?.toLowerCase().includes(q) &&
          !d.matricula?.toLowerCase().includes(q) &&
          !d.username?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allData, filterStatus, filterCr, filterMes, busca]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const uniqueCrs = [
    ...new Set(allData.map((d) => d.nome_cr).filter(Boolean)),
  ].sort();

  const uniqueMeses = useMemo(() => {
    const s = new Set();
    allData.forEach((d) => {
      const parts = (d.data_registro || "").split("/");
      if (parts[2] && parts[1])
        s.add(`${parts[2]}-${parts[1].padStart(2, "0")}`);
    });
    return [...s].sort().reverse();
  }, [allData]);

  // ── Selection helpers ─────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    const pending = pageData.filter((d) => d.status !== "CONCLUIDO");
    if (pending.every((d) => selected.has(d.id))) {
      setSelected((prev) => {
        const n = new Set(prev);
        pending.forEach((d) => n.delete(d.id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        pending.forEach((d) => n.add(d.id));
        return n;
      });
    }
  };

  const selectedPending = [...selected].filter((id) => {
    const d = allData.find((x) => x.id === id);
    return d && d.status !== "CONCLUIDO";
  });

  const handleBatchRemind = async () => {
    const usernames = selectedPending
      .map((id) => allData.find((x) => x.id === id)?.username)
      .filter(Boolean);
    if (!usernames.length) return;
    setSendingBatch(true);
    try {
      await Promise.all(
        usernames.map((username) =>
          fetch("/api/punches/remind", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username }),
          }),
        ),
      );
      toast(`${usernames.length} lembrete(s) enviado(s)!`, "success");
      setSelected(new Set());
    } catch {
      toast("Erro ao enviar lembretes.", "error");
    } finally {
      setSendingBatch(false);
    }
  };

  // ── PDF helpers ───────────────────────────────────────────
  const parseBatidas = (s) => {
    try {
      return JSON.parse(s) || [];
    } catch {
      return [];
    }
  };
  const parseMarcacoes = (s) => {
    if (!s) return [false, false, false, false];
    try {
      return JSON.parse(s);
    } catch {
      return [false, false, false, false];
    }
  };

  const triggerPdf = (adj) => {
    setPrintAdj(adj);
    setTimeout(async () => {
      if (!pdfRef.current) return;
      try {
        await generatePdfFromNode(
          pdfRef.current,
          `Ponto_${adj.data_registro?.replace(/\//g, "-")}_${adj.nome_completo?.split(" ")[0]}.pdf`,
        );
        toast("PDF gerado!", "success");
      } catch {
        toast("Erro ao gerar PDF.", "error");
      } finally {
        setPrintAdj(null);
      }
    }, 500);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCr) params.set("cr", filterCr);
    if (filterMes) params.set("mes", filterMes);
    if (busca) params.set("busca", busca);
    window.open(`/api/rh/export?${params.toString()}`, "_blank");
  };

  // ── Template save ─────────────────────────────────────────
  const handleSaveTemplate = async (tpl) => {
    setSavingTpl(true);
    try {
      const res = await fetch("/api/rh/templates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tpl),
      });
      const data = await res.json();
      if (data.success) {
        toast("Template salvo!", "success");
        fetchTemplates();
      } else toast("Erro: " + data.error, "error");
    } finally {
      setSavingTpl(false);
    }
  };

  // ── Repositório helpers ───────────────────────────────────
  const repoData = useMemo(() => {
    const concluidos = allData.filter((d) => d.status === "CONCLUIDO");
    const tree = {};
    concluidos.forEach((d) => {
      const parts = (d.data_registro || "//").split("/");
      const mm = Number(parts[1]) - 1,
        yy = parts[2];
      if (!yy) return;
      if (!tree[yy]) tree[yy] = {};
      const mKey = `${mm}`;
      if (!tree[yy][mKey]) tree[yy][mKey] = {};
      const crName = d.nome_cr || "Sem CR";
      if (!tree[yy][mKey][crName]) tree[yy][mKey][crName] = [];
      tree[yy][mKey][crName].push(d);
    });
    return tree;
  }, [allData]);

  const [year, monthIdx, cr] = repoPath;
  const crumbs = [
    "Repositório",
    year,
    monthIdx !== undefined ? MONTHS_PT[Number(monthIdx)] : undefined,
    cr,
  ].filter(Boolean);

  const TAB_LIST = [
    { id: "overview", icon: "📊", label: "Visão Geral" },
    { id: "records", icon: "📋", label: "Registros" },
    { id: "repository", icon: "🗂️", label: "Repositório" },
    { id: "settings", icon: "⚙️", label: "Configurações" },
    { id: "upload", icon: "📤", label: "Upload" },
  ];

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

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container rh-mode">
      <ToastContainer />

      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="header-top">
          <div>
            <h2>Central de Controle RH</h2>
            <p>Gerencie assinaturas, documentos e configurações do sistema.</p>
          </div>
          <div className="tab-bar rh-tab-bar">
            {TAB_LIST.map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ════════ TAB: VISÃO GERAL ════════ */}
      {activeTab === "overview" && (
        <div className="overview-container">
          {/* Filter bar */}
          <div className="overview-filters">
            <span className="filter-label">📅 Período:</span>
            <select
              className="filter-select"
              value={ovMes}
              onChange={(e) => setOvMes(e.target.value)}
            >
              <option value="">Todos os períodos</option>
              {uniqueMeses.map((m) => {
                const [y, mm] = m.split("-");
                return (
                  <option key={m} value={m}>
                    {MONTHS_PT[Number(mm) - 1]} {y}
                  </option>
                );
              })}
            </select>
            <select
              className="filter-select"
              value={ovCr}
              onChange={(e) => setOvCr(e.target.value)}
            >
              <option value="">Todos os CRs</option>
              {uniqueCrs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {(ovMes || ovCr) && (
              <button
                className="btn-clear-filter"
                onClick={() => {
                  setOvMes("");
                  setOvCr("");
                }}
              >
                × Limpar filtros
              </button>
            )}
            <span className="filter-result" style={{ marginLeft: "auto" }}>
              {ovMes || ovCr
                ? `${overviewData.length} de ${allData.length} registros`
                : `${allData.length} registros (total)`}
            </span>
          </div>

          {/* KPI cards */}
          <div className="stats-row">
            {[
              {
                label: "Total no Período",
                value: stats.total,
                cls: "",
                icon: "📁",
              },
              {
                label: "Concluídos",
                value: stats.concluido,
                cls: "success",
                icon: "✅",
              },
              {
                label: "Ag. Funcionário",
                value: stats.pendFunc,
                cls: "warning",
                icon: "⚡",
              },
              {
                label: "Ag. Gestor",
                value: stats.pendGestor,
                cls: "info",
                icon: "🔍",
              },
            ].map((s) => (
              <div key={s.label} className={`stat-card ${s.cls}`}>
                <span className="stat-icon">{s.icon}</span>
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
                {stats.total > 0 && (
                  <span className="stat-pct">
                    {Math.round((s.value / stats.total) * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="charts-row">
            <div className="chart-card">
              <h4 className="chart-title">📈 Status Geral</h4>
              {stats.total === 0 ? (
                <p className="bar-empty" style={{ padding: "2rem" }}>
                  Nenhum dado para o período.
                </p>
              ) : (
                <DonutChart {...stats} />
              )}
            </div>
            <div className="chart-card">
              <h4 className="chart-title">🏢 Top Pendências por CR</h4>
              <BarChart data={topCrs} />
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB: REGISTROS ════════ */}
      {activeTab === "records" && (
        <div className="records-container">
          {/* Toolbar */}
          <div className="records-toolbar">
            <input
              className="rh-search"
              placeholder="🔍 Buscar por nome, matrícula ou usuário..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={filterCr}
              onChange={(e) => {
                setFilterCr(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os CRs</option>
              {uniqueCrs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={filterMes}
              onChange={(e) => {
                setFilterMes(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os meses</option>
              {uniqueMeses.map((m) => {
                const [y, mm] = m.split("-");
                return (
                  <option key={m} value={m}>
                    {MONTHS_PT[Number(mm) - 1]} {y}
                  </option>
                );
              })}
            </select>
            <span className="filter-result">{filtered.length} registro(s)</span>
            <button className="btn-export" onClick={handleExport}>
              ⬇ Exportar .xlsx
            </button>
          </div>

          {/* Batch bar */}
          {selectedPending.length > 0 && (
            <div className="batch-bar">
              <span>
                ✅ {selectedPending.length} selecionado(s) com pendência
              </span>
              <button
                className="btn-batch-remind"
                onClick={handleBatchRemind}
                disabled={sendingBatch}
              >
                {sendingBatch
                  ? "⏳ Enviando..."
                  : `🔔 Cobrar Selecionados (${selectedPending.length})`}
              </button>
              <button
                className="btn-clear-sel"
                onClick={() => setSelected(new Set())}
              >
                Limpar
              </button>
            </div>
          )}

          {/* Table */}
          <div className="table-responsive-wrapper">
            <table className="rh-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      title="Selecionar pendentes da página"
                      onChange={toggleAll}
                      checked={
                        pageData.filter((d) => d.status !== "CONCLUIDO")
                          .length > 0 &&
                        pageData
                          .filter((d) => d.status !== "CONCLUIDO")
                          .every((d) => selected.has(d.id))
                      }
                    />
                  </th>
                  <th>Data</th>
                  <th>Funcionário</th>
                  <th>Matrícula</th>
                  <th>CR / Depto</th>
                  <th>Gestor</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="rh-table-msg">
                      Carregando...
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="rh-table-msg">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  pageData.map((adj) => (
                    <tr
                      key={adj.id}
                      className={selected.has(adj.id) ? "row-selected" : ""}
                    >
                      <td>
                        {adj.status !== "CONCLUIDO" && (
                          <input
                            type="checkbox"
                            checked={selected.has(adj.id)}
                            onChange={() => toggleSelect(adj.id)}
                          />
                        )}
                      </td>
                      <td className="rh-td-date">{adj.data_registro}</td>
                      <td>
                        <strong>{adj.nome_completo}</strong>
                      </td>
                      <td
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        {adj.matricula}
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>{adj.nome_cr}</td>
                      <td
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {adj.nome_chefia}
                      </td>
                      <td>
                        <span className={STATUS_CLASS[adj.status]}>
                          {STATUS_LABEL[adj.status]}
                        </span>
                      </td>
                      <td>
                        <div className="rh-row-actions">
                          <button
                            className="btn-preview"
                            onClick={() => setPreviewAdj(adj)}
                            title="Visualizar"
                          >
                            👁
                          </button>
                          {adj.status === "CONCLUIDO" && (
                            <button
                              className="btn-preview outline-btn"
                              onClick={() => triggerPdf(adj)}
                              title="Baixar PDF"
                            >
                              📄
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="rh-pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              «
            </button>
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <span className="page-info">
              Página {page} de {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ════════ TAB: REPOSITÓRIO ════════ */}
      {activeTab === "repository" && (
        <div className="repo-container">
          <Breadcrumb
            crumbs={crumbs}
            onClick={(idx) => {
              if (idx === 0) setRepoPath([]);
              else if (idx === 1) setRepoPath([year]);
              else if (idx === 2) setRepoPath([year, monthIdx]);
            }}
          />

          {/* Level 0: Years */}
          {repoPath.length === 0 && (
            <div className="repo-grid">
              {Object.keys(repoData)
                .sort((a, b) => b - a)
                .map((y) => (
                  <button
                    key={y}
                    className="repo-folder-card"
                    onClick={() => setRepoPath([y])}
                  >
                    <span className="repo-folder-icon">📁</span>
                    <span className="repo-folder-name">{y}</span>
                    <span className="repo-folder-count">
                      {Object.values(repoData[y] || {}).reduce(
                        (s, m) =>
                          s +
                          Object.values(m).reduce(
                            (ss, docs) => ss + docs.length,
                            0,
                          ),
                        0,
                      )}{" "}
                      doc(s)
                    </span>
                  </button>
                ))}
              {Object.keys(repoData).length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🗄️</div>
                  <h3>Repositório vazio</h3>
                  <p>Nenhum documento concluído ainda.</p>
                </div>
              )}
            </div>
          )}

          {/* Level 1: Months */}
          {repoPath.length === 1 && (
            <div className="repo-grid">
              {Object.keys(repoData[year] || {})
                .sort((a, b) => b - a)
                .map((m) => {
                  const total = Object.values(repoData[year][m] || {}).reduce(
                    (s, docs) => s + docs.length,
                    0,
                  );
                  return (
                    <button
                      key={m}
                      className="repo-folder-card"
                      onClick={() => setRepoPath([year, m])}
                    >
                      <span className="repo-folder-icon">📂</span>
                      <span className="repo-folder-name">
                        {MONTHS_PT[Number(m)]}
                      </span>
                      <span className="repo-folder-count">{total} doc(s)</span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Level 2: CRs */}
          {repoPath.length === 2 && (
            <div className="repo-grid">
              {Object.keys(repoData[year]?.[monthIdx] || {})
                .sort()
                .map((crName) => {
                  const docs = repoData[year][monthIdx][crName];
                  return (
                    <button
                      key={crName}
                      className="repo-folder-card"
                      onClick={() => setRepoPath([year, monthIdx, crName])}
                    >
                      <span className="repo-folder-icon">🏢</span>
                      <span className="repo-folder-name">{crName}</span>
                      <span className="repo-folder-count">
                        {docs.length} doc(s)
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Level 3: Documents */}
          {repoPath.length === 3 && (
            <div className="repo-docs-grid">
              {(repoData[year]?.[monthIdx]?.[cr] || []).map((adj) => (
                <div key={adj.id} className="repo-doc-card">
                  <span className="repo-doc-icon">📄</span>
                  <div className="repo-doc-info">
                    <strong>{adj.nome_completo}</strong>
                    <span>{adj.data_registro}</span>
                  </div>
                  <div className="repo-doc-actions">
                    <button
                      className="btn-preview"
                      onClick={() => setPreviewAdj(adj)}
                    >
                      👁 Ver
                    </button>
                    <button
                      className="btn-preview outline-btn"
                      onClick={() => triggerPdf(adj)}
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ TAB: CONFIGURAÇÕES ════════ */}
      {activeTab === "settings" && (
        <div className="settings-container">
          <div className="settings-header">
            <h3>✉️ Templates de E-mail</h3>
            <p>
              Edite as mensagens enviadas automaticamente pelo sistema. Use{" "}
              <code>{"{{nome}}"}</code> para inserir o nome do destinatário.
            </p>
          </div>
          <div className="templates-list">
            {templates.map((tpl) => {
              const isEditing = editTemplate?.tipo === tpl.tipo;
              const current = isEditing ? editTemplate : tpl;
              return (
                <div
                  key={tpl.tipo}
                  className={`template-card ${isEditing ? "editing" : ""}`}
                >
                  <div className="template-header">
                    <h4 className="template-tipo">
                      {tpl.tipo.replace(/_/g, " ")}
                    </h4>
                    {!isEditing ? (
                      <button
                        className="btn-edit-tpl"
                        onClick={() => setEditTemplate({ ...tpl })}
                      >
                        ✏️ Editar
                      </button>
                    ) : (
                      <button
                        className="btn-cancel-tpl"
                        onClick={() => setEditTemplate(null)}
                      >
                        ✕ Cancelar
                      </button>
                    )}
                  </div>
                  <label className="tpl-label">Assunto</label>
                  <input
                    className="tpl-input"
                    value={current.assunto}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setEditTemplate((t) => ({
                        ...t,
                        assunto: e.target.value,
                      }))
                    }
                  />
                  <label className="tpl-label">Corpo do e-mail</label>
                  {isEditing ? (
                    <RichTextEditor
                      value={current.corpo}
                      onChange={(html) =>
                        setEditTemplate((t) => ({ ...t, corpo: html }))
                      }
                      placeholder="Digite o conteúdo do e-mail... Use o botão + {{nome}} para inserir o nome do destinatário."
                    />
                  ) : (
                    <div
                      className="tpl-preview tpl-preview-readonly"
                      dangerouslySetInnerHTML={{ __html: current.corpo }}
                    />
                  )}
                  {isEditing && (
                    <>
                      <div className="tpl-preview-label">
                        Pré-visualização (com nome "João Silva"):
                      </div>
                      <div
                        className="tpl-preview"
                        dangerouslySetInnerHTML={{
                          __html: current.corpo
                            .replace(
                              /\{\{nome\}\}/g,
                              "<strong>João Silva</strong>",
                            )
                            .replace(
                              /class="rte-chip"/g,
                              'style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:0 8px;font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center"',
                            ),
                        }}
                      />
                      <div className="template-actions">
                        <button
                          className="btn-save-tpl"
                          disabled={savingTpl}
                          onClick={() => handleSaveTemplate(editTemplate)}
                        >
                          {savingTpl ? "Salvando..." : "💾 Salvar Template"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {templates.length === 0 && (
              <p style={{ color: "var(--color-text-muted)" }}>
                Carregando templates...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ════════ TAB: UPLOAD ════════ */}
      {activeTab === "upload" && (
        <div className="upload-card">
          <div
            className={`upload-dropzone ${dragActive ? "drag-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <div className="upload-icon">📊</div>
            <h3>Selecione o arquivo Excel ou arraste para cá</h3>
            <p>Formatos aceitos: .xlsx, .xls, .xltx, .csv</p>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.xltx,.xltm,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              id="file-upload"
              className="file-input-hidden"
            />
            <label htmlFor="file-upload" className="btn-secondary upload-btn">
              {file ? file.name : "Procurar Arquivo"}
            </label>
          </div>
          {uploadMsg && (
            <div className={`alert alert-${uploadMsg.type}`}>
              {uploadMsg.type === "success" ? "✅ " : "❌ "}
              {uploadMsg.text}
            </div>
          )}
          <div className="upload-actions">
            <button
              className="btn-primary rh-primary"
              disabled={!file || uploading}
              onClick={async () => {
                setUploading(true);
                setUploadMsg(null);
                const fd = new FormData();
                fd.append("file", file);
                try {
                  const res = await fetch("/api/rh/upload", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                  });
                  const data = await res.json();
                  if (data.success) {
                    setUploadMsg({ type: "success", text: data.message });
                    setFile(null);
                    fetchAll();
                  } else
                    setUploadMsg({
                      type: "error",
                      text: data.error || "Erro no upload.",
                    });
                } catch {
                  setUploadMsg({ type: "error", text: "Erro de rede." });
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? "⏳ Processando..." : "📤 Enviar Planilha"}
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden PDF render target ── */}
      {printAdj && (
        <PunchDocument
          ref={pdfRef}
          bancoHoras={printAdj.banco_horas === 1}
          anexoPath={printAdj.anexo_path}
          nome={printAdj.nome_completo || ""}
          setor={printAdj.nome_cr || ""}
          data={printAdj.data_registro || ""}
          id={printAdj.matricula || ""}
          batidasOriginais={parseBatidas(printAdj.batidas_originais)}
          batidasCorrigidas={parseBatidas(printAdj.batidas_corrigidas)}
          missedPunches={parseMarcacoes(printAdj.marcacoes_faltantes)}
          justificativa={printAdj.justificativa || ""}
          isAprovado={true}
          abonado={
            printAdj.abonado === 1
              ? true
              : printAdj.abonado === 0
                ? false
                : null
          }
          assinaturaColaboradorData={printAdj.employee_signature_date}
          assinaturaGestorData={printAdj.supervisor_signature_date}
          signatureFont={printAdj.signature_font}
          signatoryName={printAdj.nome_completo}
        />
      )}

      {/* ── Preview modal ── */}
      {previewAdj && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "1060px" }}>
            <div className="modal-preview-header">
              <div>
                <h3 style={{ margin: 0 }}>📄 Visualização do Documento</h3>
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.82rem",
                    marginTop: "0.2rem",
                  }}
                >
                  {previewAdj.data_registro} · {previewAdj.nome_completo} ·{" "}
                  {previewAdj.nome_cr}
                </p>
              </div>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
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
                    className="btn-preview outline-btn"
                    onClick={() => triggerPdf(previewAdj)}
                  >
                    📄 PDF
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
                  signatureFont={previewAdj.signature_font}
                  signatoryName={previewAdj.nome_completo}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
