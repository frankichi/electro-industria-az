import { NextResponse } from "next/server";
import {
  asegurarEstructura, leerTabla, leerTablas, agregarFilas, actualizarFila, ahora,
} from "@/lib/sheets";
import { requerir } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const err = (t, s = 400) => NextResponse.json({ error: t }, { status: s });

// GET /api/pedidos → historial de pedidos (solo personal con sesión)
export async function GET() {
  const g = requerir();
  if (g.error) return err(g.error, g.status);
  try {
    await asegurarEstructura();
    const { Pedidos: pedidos = [], PedidoItems: items = [] } =
      await leerTablas(["Pedidos", "PedidoItems"]);
    const conItems = pedidos.map((p) => ({
      ...p,
      items: items.filter((i) => i.pedido_id === p.id),
    })).reverse();
    return NextResponse.json({ pedidos: conItems });
  } catch (e) {
    return err(e.message, 500);
  }
}

// POST /api/pedidos → PÚBLICO: un cliente envía su pedido desde el catálogo
// body: { cliente: {nombre, telefono, email, direccion}, nota, items: [{codigo, cantidad}] }
export async function POST(req) {
  try {
    await asegurarEstructura();
    const { cliente = {}, nota = "", items = [] } = await req.json();

    const nombre = String(cliente.nombre || "").trim().slice(0, 120);
    const telefono = String(cliente.telefono || "").trim().slice(0, 20);
    if (!nombre || telefono.replace(/\D/g, "").length < 6) {
      return err("Indica tu nombre y un teléfono de contacto válido.");
    }
    if (!Array.isArray(items) || !items.length) {
      return err("El carrito está vacío.");
    }
    if (items.length > 60) return err("El pedido tiene demasiados productos distintos.");

    const productos = await leerTabla("Productos");
    const detalle = [];
    for (const it of items) {
      const p = productos.find((x) => String(x.codigo).trim() === String(it.codigo).trim());
      if (!p) return err(`Un producto del carrito ya no está disponible (${it.codigo}).`, 409);
      const cant = Math.floor(Number(it.cantidad)) || 0;
      if (cant <= 0) continue;
      if (Number(p.stock) < cant) {
        return err(`Solo quedan ${p.stock} ${p.unidad} de "${p.nombre}". Ajusta la cantidad.`, 409);
      }
      const precio = Number(p.precio) || 0;
      detalle.push({
        codigo: p.codigo, nombre: p.nombre, cantidad: cant,
        precio_unit: precio, total: +(cant * precio).toFixed(2),
      });
    }
    if (!detalle.length) return err("El carrito está vacío.");

    const total = +detalle.reduce((s, d) => s + d.total, 0).toFixed(2);

    const pedidos = await leerTabla("Pedidos");
    const nums = pedidos.map((p) => parseInt(String(p.id).replace("PED-", ""), 10) || 0);
    const numero = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(6, "0");
    const id = `PED-${numero}`;

    await agregarFilas("Pedidos", [{
      id, fecha: ahora(),
      cliente_nombre: nombre,
      cliente_telefono: telefono,
      cliente_email: String(cliente.email || "").trim().slice(0, 120),
      cliente_direccion: String(cliente.direccion || "").trim().slice(0, 200),
      nota: String(nota || "").trim().slice(0, 300),
      total, estado: "PENDIENTE", num_items: detalle.length,
      atendido_por: "", fecha_atencion: "",
    }]);
    await agregarFilas("PedidoItems", detalle.map((d) => ({ pedido_id: id, ...d })));

    return NextResponse.json({ ok: true, pedido: { id, total, items: detalle } });
  } catch (e) {
    return err(e.message, 500);
  }
}

// PUT /api/pedidos → personal: cambiar estado (ATENDIDO / ANULADO / PENDIENTE)
export async function PUT(req) {
  const g = requerir();
  if (g.error) return err(g.error, g.status);
  try {
    const { id, estado } = await req.json();
    if (!["PENDIENTE", "ATENDIDO", "ANULADO"].includes(estado)) return err("Estado inválido");
    const pedidos = await leerTabla("Pedidos");
    const p = pedidos.find((x) => x.id === id);
    if (!p) return err("Pedido no encontrado", 404);
    await actualizarFila("Pedidos", p._fila, {
      ...p, estado,
      atendido_por: g.sesion.usuario,
      fecha_atencion: ahora(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e.message, 500);
  }
}
