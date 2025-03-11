"use client";

import { Toaster } from "react-hot-toast";

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "var(--card)",
          opacity: 0,
          color: "var(--foreground)",
          direction: "rtl",
          fontFamily: "var(--font-cairo)",
          borderRadius: "var(--radius)",
        },
        duration: 3000
      }}
    />
  );
};