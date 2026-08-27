"use client";

import React from "react";

interface ToastProps {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: ToastProps) {
  return (
    <div className={`toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      <span className="material-symbols-outlined">check_circle</span>
      <span>{message}</span>
    </div>
  );
}
