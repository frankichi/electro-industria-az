"use client";
import { useEffect } from "react";

/** Visor de imagen a pantalla completa: clic afuera, tecla Esc, o botón ✕ para cerrar. */
export default function VisorImagen({ url, alt = "", onCerrar }) {
  useEffect(() => {
    function alTeclear(e) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onCerrar}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors"
        aria-label="Cerrar"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
