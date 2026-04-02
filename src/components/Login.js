"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import "./Login.css";

export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const [isValidateMode, setIsValidateMode] = useState(false);
  const [hashInput, setHashInput] = useState("");

  const handleValidateDocument = (e) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    // Redireciona para a página de validação existente
    window.location.href = `/validar/${hashInput.trim()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token, data.user);
      } else {
        setError(data.message || data.error || "Credenciais inválidas.");
      }
    } catch (err) {
      setError("Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <header className="login-header">
          <div className="logo-wrapper">
            <Image
              src="/calendar.png"
              alt="Logo"
              width={100}
              height={100}
              priority
            />
          </div>
          <h1>
            Ajuste de <span>Ponto </span>
          </h1>
          <p>
            Faça login para gerenciar seus horários.{" "}
            <span style={{ fontSize: "25px" }}>✍️</span>{" "}
          </p>
        </header>

        {error && (
          <div className="login-error-box">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de usuário ou email"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="loader"></span> : "Entrar no Sistema"}
          </button>
        </form>

        {/* ═══ SESSÃO DE VALIDAÇÃO PÚBLICA ═══ */}
        <div className="validation-section">
          <div className="validation-divider">
            <span>ou</span>
          </div>

          {!isValidateMode ? (
            <button
              type="button"
              className="btn-validate-toggle"
              onClick={() => setIsValidateMode(true)}
            >
              🔒 Validar Documento Assinado
            </button>
          ) : (
            <form onSubmit={handleValidateDocument} className="validate-form">
              <label htmlFor="hash">Código de Autenticidade (Hash):</label>
              <input
                id="hash"
                type="text"
                placeholder="Ex: 5f9a3b2..."
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                className="input-field"
                autoComplete="off"
              />
              <div className="validate-actions">
                <button type="submit" className="btn-validate-submit">
                  Validar
                </button>
                <button
                  type="button"
                  className="btn-validate-cancel"
                  onClick={() => setIsValidateMode(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        <footer className="login-footer">
          <p>© {new Date().getFullYear()} | ViaRondon</p>
        </footer>
      </div>
    </div>
  );
};
