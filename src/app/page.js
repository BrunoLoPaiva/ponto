"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Login } from "@/components/Login";
import { EmployeeDashboard } from "@/components/EmployeeDashboard";
import { SupervisorDashboard } from "@/components/SupervisorDashboard";
import { RhDashboard } from "@/components/RhDashboard";
import "@/components/App.css";

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  // Decide qual painel principal renderizar
  // O SupervisorDashboard já gerencia internamente as abas
  // "Minha Equipe" e "Meu Ponto" — sem duplicar na nav global.
  const isRh         = user?.role === "RH";
  const isSupervisor = user?.isSupervisor;

  // Painel principal: RH > Supervisor > Funcionário
  const MainPanel = isRh
    ? () => <RhDashboard user={user} />
    : isSupervisor
    ? () => <SupervisorDashboard />
    : () => <EmployeeDashboard />;

  return (
    <div className="App">
      <nav className="top-nav">
        <div className="nav-brand">
          <h1>Sistema de Ponto</h1>
        </div>
        {/* A nav global não duplica tabs que os dashboards já têm internamente */}
        <div className="nav-tabs" />
        <div className="nav-user">
          <span className="user-greeting">
            Olá, {user?.name || user?.username}
          </span>
          <button className="btn-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </nav>
      <main className="main-content">
        <MainPanel />
      </main>
    </div>
  );
}
