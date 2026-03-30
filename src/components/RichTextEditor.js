"use client";
import React, { useRef, useEffect, useCallback, useState } from "react";
import "./RichTextEditor.css";

// ── Toolbar config ─────────────────────────────────────────────
const TOOLBAR_GROUPS = [
  [
    { cmd: "bold",        icon: "B",  title: "Negrito",    style: { fontWeight: 800 } },
    { cmd: "italic",      icon: "I",  title: "Itálico",    style: { fontStyle: "italic" } },
    { cmd: "underline",   icon: "U",  title: "Sublinhado", style: { textDecoration: "underline" } },
    { cmd: "strikeThrough", icon: "S", title: "Tachado",   style: { textDecoration: "line-through" } },
  ],
  [
    { cmd: "justifyLeft",   icon: "⬛⬛⬛\n⬛⬛↙",  title: "Esquerda",   iconClass: "icon-left"   },
    { cmd: "justifyCenter", icon: "⬛⬛⬛\n⬛⬛⬛",  title: "Centro",     iconClass: "icon-center" },
    { cmd: "justifyRight",  icon: "⬛⬛⬛\n↘⬛⬛",  title: "Direita",    iconClass: "icon-right"  },
  ],
  [
    { cmd: "insertUnorderedList", title: "Lista com marcadores", iconSvg: "list-ul" },
    { cmd: "insertOrderedList",   title: "Lista numerada",       iconSvg: "list-ol" },
  ],
];

// SVG icons for alignment and lists
const ICONS = {
  "left":    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h12v1.5H2z"/></svg>,
  "center":  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1.5H2zm3 4h6v1.5H5zm-3 4h12v1.5H2z"/></svg>,
  "right":   <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1.5H2zm4 4h8v1.5H6zm-4 4h12v1.5H2z"/></svg>,
  "list-ul": <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 4h9v1.5H5zm0 5h9v1.5H5zm0 5h9v1.5H5zM1.5 4.5a1 1 0 110-2 1 1 0 010 2zm0 5a1 1 0 110-2 1 1 0 010 2zm0 5a1 1 0 110-2 1 1 0 010 2z"/></svg>,
  "list-ol": <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 4h9v1.5H5zm0 5h9v1.5H5zm0 5h9v1.5H5zM1 3.5h1.5V7H1zm0 4.5h1.5v3.5H1zm0 4.5h1.5V16H1z"/></svg>,
};

const ALIGN_ICONS = {
  justifyLeft:   ICONS["left"],
  justifyCenter: ICONS["center"],
  justifyRight:  ICONS["right"],
  insertUnorderedList: ICONS["list-ul"],
  insertOrderedList:   ICONS["list-ol"],
};

const FONT_SIZES = ["12px","14px","16px","18px","20px","24px","28px","32px"];

// ── Component ──────────────────────────────────────────────────
export function RichTextEditor({ value, onChange, placeholder = "Digite o conteúdo do e-mail..." }) {
  const editorRef  = useRef(null);
  const isInternal = useRef(false);

  // Sync external value → editor (only when not typing)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isInternal.current) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    // Notify parent
    isInternal.current = true;
    onChange?.(editorRef.current?.innerHTML || "");
    setTimeout(() => { isInternal.current = false; }, 0);
  }, [onChange]);

  const handleInput = useCallback(() => {
    isInternal.current = true;
    onChange?.(editorRef.current?.innerHTML || "");
    setTimeout(() => { isInternal.current = false; }, 0);
  }, [onChange]);

  // Insert {{nome}} as a styled, non-editable chip
  const insertNome = useCallback(() => {
    editorRef.current?.focus();
    const chip = `<span class="rte-chip" contenteditable="false">{{nome}}</span>&nbsp;`;
    document.execCommand("insertHTML", false, chip);
    isInternal.current = true;
    onChange?.(editorRef.current?.innerHTML || "");
    setTimeout(() => { isInternal.current = false; }, 0);
  }, [onChange]);

  const isActive = (cmd) => {
    try { return document.queryCommandState(cmd); } catch { return false; }
  };

  return (
    <div className="rte-wrapper">
      {/* ── Toolbar ── */}
      <div className="rte-toolbar">
        {/* Text format group */}
        <div className="rte-group">
          {TOOLBAR_GROUPS[0].map((btn) => (
            <button
              key={btn.cmd}
              type="button"
              title={btn.title}
              className={`rte-btn ${isActive(btn.cmd) ? "active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); exec(btn.cmd); }}
              style={btn.style}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        <div className="rte-sep" />

        {/* Font size */}
        <div className="rte-group">
          <select
            className="rte-select"
            title="Tamanho da fonte"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec("fontSize", e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Tamanho</option>
            {[1,2,3,4,5,6,7].map((n) => (
              <option key={n} value={n}>
                {["8px","10px","12px","14px","16px","24px","32px"][n-1]}
              </option>
            ))}
          </select>
        </div>

        {/* Text color */}
        <div className="rte-group">
          <label className="rte-color-btn" title="Cor do texto">
            <span className="rte-color-icon">A</span>
            <input
              type="color"
              className="rte-color-input"
              onInput={(e) => exec("foreColor", e.target.value)}
            />
          </label>
          <label className="rte-color-btn rte-bg-btn" title="Cor de fundo">
            <span className="rte-color-icon">🖊</span>
            <input
              type="color"
              className="rte-color-input"
              onInput={(e) => exec("hiliteColor", e.target.value)}
            />
          </label>
        </div>

        <div className="rte-sep" />

        {/* Alignment */}
        <div className="rte-group">
          {TOOLBAR_GROUPS[1].map((btn) => (
            <button
              key={btn.cmd}
              type="button"
              title={btn.title}
              className={`rte-btn ${isActive(btn.cmd) ? "active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); exec(btn.cmd); }}
            >
              <span className="rte-svg-icon">{ALIGN_ICONS[btn.cmd]}</span>
            </button>
          ))}
        </div>

        <div className="rte-sep" />

        {/* Lists */}
        <div className="rte-group">
          {TOOLBAR_GROUPS[2].map((btn) => (
            <button
              key={btn.cmd}
              type="button"
              title={btn.title}
              className={`rte-btn ${isActive(btn.cmd) ? "active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); exec(btn.cmd); }}
            >
              <span className="rte-svg-icon">{ALIGN_ICONS[btn.cmd]}</span>
            </button>
          ))}
        </div>

        <div className="rte-sep" />

        {/* Insert link */}
        <div className="rte-group">
          <button
            type="button"
            title="Inserir link"
            className="rte-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              const url = prompt("Digite a URL do link:");
              if (url) exec("createLink", url);
            }}
          >
            🔗
          </button>
          <button
            type="button"
            title="Remover link"
            className="rte-btn"
            onMouseDown={(e) => { e.preventDefault(); exec("unlink"); }}
          >
            🚫
          </button>
        </div>

        <div className="rte-sep" />

        {/* Special: {{nome}} chip */}
        <div className="rte-group">
          <button
            type="button"
            title="Inserir variável: nome do destinatário"
            className="rte-btn rte-btn-nome"
            onMouseDown={(e) => { e.preventDefault(); insertNome(); }}
          >
            + &#123;&#123;nome&#125;&#125;
          </button>
        </div>
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}
