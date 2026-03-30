"use client";
import React, { useState, useEffect, useCallback } from "react";
import "./Toast.css";

let addToastHandler = null;

export function toast(message, type = "info") {
  if (addToastHandler) addToastHandler(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastHandler = addToast;
    return () => { addToastHandler = null; };
  }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === "success" ? "✅" :
             t.type === "error" ? "❌" :
             t.type === "warning" ? "⚠️" : "ℹ️"}
          </span>
          <span className="toast-message">{t.message}</span>
          <button
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
