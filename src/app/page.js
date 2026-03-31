"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Login } from "@/components/Login";
import { EmployeeDashboard } from "@/components/EmployeeDashboard";
import { SupervisorDashboard } from "@/components/SupervisorDashboard";
import { RhDashboard } from "@/components/RhDashboard";
import { ControllerDashboard } from "@/components/ControllerDashboard";
import Image from "next/image";
import "@/components/App.css";
import { useState, useEffect } from "react";

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab] = React.useState("meu-ponto");

  // 1. Variáveis movidas para cima (antes do early return)
  const isRh = user?.role === "RH";
  const isSupervisor = user?.isSupervisor;
  const isController = user?.isController;

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. useEffect movido para cima (antes do early return)
  React.useEffect(() => {
    // Só atualiza a aba caso esteja autenticado
    if (isAuthenticated) {
      if (isRh) setActiveTab("rh");
      else if (isSupervisor) setActiveTab("supervisor");
      else if (isController) setActiveTab("controller");
    }
  }, [isAuthenticated, isRh, isSupervisor, isController]);

  // 3. O early return (retorno antecipado) deve vir DEPOIS dos hooks
  if (!isAuthenticated) {
    return <Login />;
  }

  // Define available tabs based on roles
  const tabs = [{ id: "meu-ponto", label: "Meu Ponto", icon: "👤" }];

  if (isSupervisor) {
    tabs.push({ id: "supervisor", label: "Gestão Supervisor", icon: "👥" });
  }
  if (isController) {
    tabs.push({ id: "controller", label: "Controladoria", icon: "🛡️" });
  }
  if (isRh) {
    tabs.push({ id: "rh", label: "Painel RH", icon: "🏢" });
  }

  return (
    <div className="App">
      <nav className="top-nav">
        <div className="nav-brand">
          <Image
            src="/calendar.png"
            alt="Logo"
            width={30}
            height={30}
            priority
          />
          <h2
            style={{
              display: isMobile ? "none" : "block", // A mágica acontece aqui
              float: "right",
              marginLeft: "8px",
              color: "#4675ea",
            }}
          >
            Ajuste de <span style={{ color: "#2fc57e" }}>Ponto </span>
          </h2>
        </div>

        <div className="nav-tabs-global">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="nav-user">
          <div className="user-info-box">
            <span className="user-greeting">
              Olá, {user?.name || user?.username}
            </span>
            {/* <span className="user-role-badge">{user?.role}</span> */}
          </div>
          <button className="btn-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === "meu-ponto" && <EmployeeDashboard />}
        {activeTab === "supervisor" && <SupervisorDashboard />}
        {activeTab === "controller" && <ControllerDashboard />}
        {activeTab === "rh" && <RhDashboard user={user} />}
      </main>
    </div>
  );
}
