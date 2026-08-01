import { NextResponse } from "next/server";
import { asegurarEstructura, leerTabla, agregarFilas, ahora } from "@/lib/sheets";
import { requerir } from "@/lib/auth";

export const dynamic = "force-dynamic";
const err = (t, s = 400) => NextResponse.json({ error: t }, { status: s });

// GET /api/categorias → lista de categorías guardadas
export async function GET() {
  const g = requerir();
  if (g.error) return err(g.error, g.status);
  try {
    await asegurarEstructura();
    const categorias = await leerTabla("Categorias");
    return NextResponse.json({
      categorias: categorias.map((c) => c.nombre).filter(Boolean),
    });
  } catch (e) {
    return err(e.message, 500);
  }
}

// POST /api/categorias → agrega una categoría nueva (si no existe ya)
export async function POST(req) {
  const g = requerir();
  if (g.error) return err(g.error, g.status);
  try {
    await asegurarEstructura();
    const { nombre } = await req.json();
    const limpio = String(nombre || "").trim();
    if (!limpio) return err("El nombre de la categoría no puede estar vacío");

    const categorias = await leerTabla("Categorias");
    const yaExiste = categorias.some(
      (c) => c.nombre.trim().toLowerCase() === limpio.toLowerCase()
    );
    if (!yaExiste) {
      await agregarFilas("Categorias", [{
        nombre: limpio, fecha_registro: ahora(), creado_por: g.sesion.usuario,
      }]);
    }
    return NextResponse.json({ ok: true, nombre: limpio });
  } catch (e) {
    return err(e.message, 500);
  }
}
