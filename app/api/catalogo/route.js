import { NextResponse } from "next/server";
import { asegurarEstructura, leerTabla } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * Catálogo PÚBLICO (no requiere sesión): lo consumen los clientes desde
 * el enlace compartible /catalogo. Solo expone productos con stock
 * disponible y campos seguros — nunca costos, ubicación ni datos internos.
 */
export async function GET() {
  try {
    await asegurarEstructura();
    const productos = await leerTabla("Productos");
    const visibles = productos
      .filter((p) => Number(p.stock) > 0 && p.nombre)
      .map((p) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        categoria: p.categoria || "Otros",
        marca: p.marca || "",
        unidad: p.unidad || "UND",
        voltaje: p.voltaje || "",
        amperaje: p.amperaje || "",
        medidas: p.medidas || "",
        precio: Number(p.precio) || 0,
        stock: Number(p.stock) || 0,
        imagen: p.imagen || "",
      }));
    return NextResponse.json({ productos: visibles });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
