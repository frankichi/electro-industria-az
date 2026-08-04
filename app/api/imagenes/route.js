import { NextResponse } from "next/server";
import { requerir } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Sube la imagen de un producto a ImgBB (alojamiento de imágenes gratuito
 * con enlaces directos y permanentes) y devuelve la URL. En Google Sheets
 * solo se guarda ese enlace (columna "imagen" de Productos) — las celdas
 * de Sheets no pueden almacenar la imagen en sí (límite de 50.000
 * caracteres por celda) y esto mantiene las lecturas del inventario
 * rápidas.
 *
 * Configuración: crear cuenta gratis en imgbb.com → obtener la API key en
 * api.imgbb.com → agregarla como variable IMGBB_API_KEY en Vercel.
 */

// POST /api/imagenes  body: { nombre, tipo, base64 }
export async function POST(req) {
  const g = requerir();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "La subida de imágenes no está configurada todavía. Crea una cuenta gratis en " +
          "imgbb.com, copia tu API key desde api.imgbb.com y agrégala como variable " +
          "IMGBB_API_KEY en Vercel (ver README).",
      },
      { status: 501 }
    );
  }

  try {
    const { nombre, base64 } = await req.json();
    if (!base64) {
      return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
    }
    // ~2.8MB máximo en base64 (≈2MB reales): más que suficiente tras comprimir
    if (base64.length > 2_800_000) {
      return NextResponse.json(
        { error: "La imagen es demasiado pesada incluso comprimida. Intenta con otra." },
        { status: 413 }
      );
    }

    const form = new URLSearchParams();
    form.set("image", base64);
    if (nombre) form.set("name", String(nombre).replace(/\.[a-z]+$/i, ""));

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const detalle = data?.error?.message || `HTTP ${res.status}`;
      return NextResponse.json(
        { error: "El servicio de imágenes rechazó la subida: " + detalle },
        { status: 502 }
      );
    }

    // URL directa de la imagen (i.ibb.co/...), lista para usarse en <img>
    return NextResponse.json({ ok: true, url: data.data.url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
