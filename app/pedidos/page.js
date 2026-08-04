"use client";
import { useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetchJson";

const sol = (n) =>
  "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTILO_ESTADO = {
  PENDIENTE: "bg-volt-pale text-cobre",
  ATENDIDO: "bg-green-100 text-ok",
  ANULADO: "bg-neutral-200 text-neutral-500",
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("PENDIENTE");
  const [expandido, setExpandido] = useState(null);
  const [msj, setMsj] = useState(null);

  async function cargar() {
    setCargando(true);
    try {
      const r = await fetchJSON("/api/pedidos");
      setPedidos(r.pedidos || []);
    } catch (e) {
      setMsj({ tipo: "error", texto: e.message });
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function cambiarEstado(id, estado) {
    setMsj(null);
    try {
      await fetchJSON("/api/pedidos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      setMsj({ tipo: "ok", texto: `Pedido ${id} marcado como ${estado.toLowerCase()}.` });
      cargar();
    } catch (e) {
      setMsj({ tipo: "error", texto: e.message });
    }
  }

  const filtrados = pedidos.filter((p) => filtro === "TODOS" || p.estado === filtro);
  const pendientes = pedidos.filter((p) => p.estado === "PENDIENTE").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Pedidos del catálogo</h1>
          <p className="text-sm text-neutral-500 mt-2">
            Solicitudes que llegan desde el catálogo público.
            {pendientes > 0 && <> <b className="text-cobre">{pendientes} pendiente(s)</b> por atender.</>}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/catalogo" target="_blank" rel="noreferrer" className="btn-azul">
            Ver catálogo ↗
          </a>
          <button
            className="btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/catalogo`);
              setMsj({ tipo: "ok", texto: "Enlace del catálogo copiado. Compártelo con tus clientes por WhatsApp o redes." });
            }}
          >
            Copiar enlace
          </button>
        </div>
      </div>

      {msj && (
        <div role="status" className={`rounded-lg px-4 py-3 text-sm font-medium ${
          msj.tipo === "error"
            ? "bg-red-50 text-alerta border border-red-200"
            : "bg-green-50 text-ok border border-green-200"
        }`}>
          {msj.texto}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["PENDIENTE", "ATENDIDO", "ANULADO", "TODOS"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              filtro === f
                ? "bg-ink text-white shadow-sm"
                : "bg-white border border-linea text-neutral-600 hover:border-electrico/40"
            }`}>
            {f === "TODOS" ? "Todos" : f.charAt(0) + f.slice(1).toLowerCase() + "s"}
          </button>
        ))}
        <button className="btn-ghost !py-1.5 !px-3 text-xs ml-auto" onClick={cargar} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {cargando && (
        <div className="card p-10 text-center text-neutral-400 text-sm">Cargando pedidos…</div>
      )}
      {!cargando && !filtrados.length && (
        <div className="card p-10 text-center text-neutral-400 text-sm">
          No hay pedidos {filtro !== "TODOS" ? `en estado ${filtro.toLowerCase()}` : "todavía"}.
          Comparte el enlace del catálogo con tus clientes para recibir los primeros.
        </div>
      )}

      <div className="space-y-3">
        {filtrados.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <button
              className="w-full text-left p-4 flex flex-wrap items-center gap-3 hover:bg-fondo/50 transition-colors"
              onClick={() => setExpandido(expandido === p.id ? null : p.id)}
              aria-expanded={expandido === p.id}
            >
              <span className="font-mono font-bold text-electrico">{p.id}</span>
              <span className={`tag ${ESTILO_ESTADO[p.estado] || ""}`}>{p.estado}</span>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{p.cliente_nombre}</div>
                <div className="text-xs text-neutral-500 font-mono">{p.cliente_telefono}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-mono font-bold">{sol(p.total)}</div>
                <div className="text-xs text-neutral-400">{p.fecha} · {p.num_items} ítem(s)</div>
              </div>
              <svg viewBox="0 0 24 24" className={`w-4 h-4 text-neutral-400 transition-transform ${expandido === p.id ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            {expandido === p.id && (
              <div className="border-t border-linea p-4 space-y-3 bg-fondo/40">
                <table className="w-full text-sm bg-white rounded-lg overflow-hidden border border-linea">
                  <thead>
                    <tr className="text-left">
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-center">Cant.</th>
                      <th className="px-3 py-2 text-right">P. Unit</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.items.map((it, i) => (
                      <tr key={i} className="border-t border-linea">
                        <td className="px-3 py-2">
                          <div className="font-medium">{it.nombre}</div>
                          <span className="codigo">{it.codigo}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{it.cantidad}</td>
                        <td className="px-3 py-2 text-right font-mono">{sol(it.precio_unit)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{sol(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {p.cliente_email && <div><span className="text-neutral-400">Correo:</span> {p.cliente_email}</div>}
                  {p.cliente_direccion && <div><span className="text-neutral-400">Entrega:</span> {p.cliente_direccion}</div>}
                  {p.nota && <div className="sm:col-span-2"><span className="text-neutral-400">Nota:</span> {p.nota}</div>}
                  {p.atendido_por && (
                    <div className="sm:col-span-2 text-xs text-neutral-400">
                      Última gestión: {p.atendido_por} · {p.fecha_atencion}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {p.cliente_telefono && (
                    <a
                      className="btn-ghost !py-1.5 !px-3 text-xs"
                      target="_blank" rel="noreferrer"
                      href={`https://wa.me/${p.cliente_telefono.replace(/\D/g, "").replace(/^0+/, "").replace(/^9/, "519")}?text=${encodeURIComponent(`Hola ${p.cliente_nombre}, te escribimos de Electro Industria A&Z por tu pedido ${p.id}.`)}`}
                    >
                      💬 WhatsApp al cliente
                    </a>
                  )}
                  {p.estado !== "ATENDIDO" && (
                    <button className="btn-azul !py-1.5 !px-3 text-xs" onClick={() => cambiarEstado(p.id, "ATENDIDO")}>
                      ✓ Marcar atendido
                    </button>
                  )}
                  {p.estado !== "ANULADO" && (
                    <button className="btn-ghost !py-1.5 !px-3 text-xs text-alerta" onClick={() => cambiarEstado(p.id, "ANULADO")}>
                      Anular
                    </button>
                  )}
                  {p.estado !== "PENDIENTE" && (
                    <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => cambiarEstado(p.id, "PENDIENTE")}>
                      Volver a pendiente
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  El stock no se descuenta al recibir el pedido: cuando el cliente confirme,
                  genera la venta en el Punto de venta (ahí sí se descuenta y se emite el comprobante).
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
