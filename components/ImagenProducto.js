"use client";
import { useRef, useState } from "react";

/**
 * Subida de imagen de producto: permite adjuntar un archivo o tomar una
 * foto (en celulares, el atributo capture abre la cámara directamente).
 * La imagen se comprime en el navegador (~900px JPEG) y se sube a ImgBB
 * (alojamiento gratuito); en la hoja de Google Sheets solo se guarda la URL.
 */

async function comprimirImagen(file, maxLado = 900, calidad = 0.82) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("El archivo no es una imagen válida"));
    i.src = dataUrl;
  });
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL("image/jpeg", calidad);
  return jpeg.split(",")[1]; // solo el base64
}

export default function ImagenProducto({ url, onUrl }) {
  const inputArchivo = useRef(null);
  const inputCamara = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  async function procesar(file) {
    if (!file) return;
    setError(null);
    setSubiendo(true);
    try {
      const base64 = await comprimirImagen(file);
      const r = await fetch("/api/imagenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: `producto-${Date.now()}.jpg`,
          tipo: "image/jpeg",
          base64,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo subir la imagen");
      onUrl(data.url);
    } catch (e) {
      setError(e.message);
    }
    setSubiendo(false);
  }

  return (
    <div>
      <span className="label">Imagen del producto (para el catálogo)</span>
      <div className="flex items-start gap-3">
        <div className="w-24 h-24 rounded-xl border border-linea bg-fondo overflow-hidden flex items-center justify-center shrink-0">
          {subiendo ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 animate-spin text-electrico" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.56" />
            </svg>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Imagen del producto" className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-neutral-300" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
            </svg>
          )}
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => inputArchivo.current?.click()} disabled={subiendo}>
              📁 Adjuntar imagen
            </button>
            <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => inputCamara.current?.click()} disabled={subiendo}>
              📷 Tomar foto
            </button>
            {url && (
              <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs text-alerta"
                onClick={() => onUrl("")} disabled={subiendo}>
                Quitar
              </button>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            Se comprime automáticamente; en la hoja solo se guarda el enlace.
            En celulares, "Tomar foto" abre la cámara.
          </p>
          {error && <p className="text-xs text-alerta font-medium">{error}</p>}
        </div>
      </div>
      <input ref={inputArchivo} type="file" accept="image/*" className="hidden"
        onChange={(e) => { procesar(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={inputCamara} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { procesar(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
