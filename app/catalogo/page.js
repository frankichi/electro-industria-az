"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchJSON } from "@/lib/fetchJson";

const sol = (n) =>
  "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SinFoto() {
  return (
    <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-fondo">
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Catalogo() {
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [carrito, setCarrito] = useState({}); // { codigo: cantidad }
  const [abierto, setAbierto] = useState(false);
  const [cliente, setCliente] = useState({ nombre: "", telefono: "", email: "", direccion: "" });
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msj, setMsj] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);

  useEffect(() => {
    fetchJSON("/api/catalogo")
      .then((d) => setProductos(d.productos))
      .catch((e) => setError(e.message));
  }, []);

  const categorias = useMemo(() => {
    if (!productos) return [];
    return ["Todas", ...new Set(productos.map((p) => p.categoria))];
  }, [productos]);

  const visibles = useMemo(() => {
    if (!productos) return [];
    const q = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        (categoria === "Todas" || p.categoria === categoria) &&
        (!q ||
          p.nombre.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          String(p.codigo).toLowerCase().includes(q))
    );
  }, [productos, busqueda, categoria]);

  const porCodigo = useMemo(() => {
    const m = {};
    (productos || []).forEach((p) => (m[p.codigo] = p));
    return m;
  }, [productos]);

  const itemsCarrito = Object.entries(carrito)
    .map(([codigo, cantidad]) => ({ ...porCodigo[codigo], cantidad }))
    .filter((i) => i.codigo);
  const totalItems = itemsCarrito.reduce((s, i) => s + i.cantidad, 0);
  const totalSoles = itemsCarrito.reduce((s, i) => s + i.cantidad * i.precio, 0);

  function cambiar(codigo, delta) {
    setCarrito((c) => {
      const p = porCodigo[codigo];
      const actual = c[codigo] || 0;
      const nueva = Math.max(0, Math.min(actual + delta, p ? p.stock : 0));
      const copia = { ...c };
      if (nueva === 0) delete copia[codigo];
      else copia[codigo] = nueva;
      return copia;
    });
  }

  async function enviarPedido(e) {
    e.preventDefault();
    setMsj(null);
    setEnviando(true);
    try {
      const data = await fetchJSON("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente, nota,
          items: itemsCarrito.map((i) => ({ codigo: i.codigo, cantidad: i.cantidad })),
        }),
      });
      setConfirmacion(data.pedido);
      setCarrito({});
      setAbierto(false);
    } catch (e) {
      setMsj({ texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  const empresa = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE || "ELECTRO INDUSTRIA A&Z";
  const telefono = process.env.NEXT_PUBLIC_EMPRESA_TELEFONO || "";

  /* ── Confirmación de pedido enviado ── */
  if (confirmacion) {
    return (
      <div className="min-h-screen">
        <div className="franja" />
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={empresa} className="h-24 w-24 object-contain mx-auto" />
          <div className="card p-6 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 text-ok flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold uppercase">¡Pedido enviado!</h1>
            <p className="text-sm text-neutral-600">
              Tu pedido <span className="font-mono font-bold text-electrico">{confirmacion.id}</span> por{" "}
              <b>{sol(confirmacion.total)}</b> fue recibido. Nos pondremos en contacto contigo
              para coordinar el pago y la entrega.
            </p>
            {telefono && (
              <p className="text-xs text-neutral-400">¿Consultas? Llámanos: {telefono}</p>
            )}
            <button className="btn-azul w-full" onClick={() => setConfirmacion(null)}>
              Volver al catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="franja" />

      {/* ── Encabezado del catálogo ── */}
      <header className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-3">
          <span className="bg-white rounded-xl p-1.5 h-14 w-14 shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icono.png" alt="" className="h-full w-full object-contain" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide leading-6">{empresa}</h1>
            <p className="text-xs text-neutral-400">
              Catálogo en línea · Materiales, equipos y accesorios eléctricos e industriales
            </p>
          </div>
        </div>
      </header>

      {/* ── Filtros ── */}
      <div className="max-w-6xl mx-auto px-4 pt-5 space-y-3">
        <input
          className="input !py-3"
          placeholder="Buscar producto, marca o código…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar en el catálogo"
        />
        {categorias.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categorias.map((c) => (
              <button key={c} onClick={() => setCategoria(c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  categoria === c
                    ? "bg-electrico text-white shadow-sm"
                    : "bg-white border border-linea text-neutral-600 hover:border-electrico/40"
                }`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grilla de productos ── */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {error && (
          <div className="card p-6 text-center text-alerta text-sm">{error}</div>
        )}
        {!productos && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-neutral-100" />
            ))}
          </div>
        )}
        {productos && !visibles.length && (
          <div className="card p-10 text-center text-neutral-400 text-sm">
            No se encontraron productos con ese filtro.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibles.map((p) => {
            const enCarrito = carrito[p.codigo] || 0;
            const especificaciones = [p.voltaje, p.amperaje, p.medidas].filter(Boolean).join(" · ");
            return (
              <article key={p.codigo} className="card overflow-hidden flex flex-col hover:shadow-pop transition-shadow duration-200">
                <div className="aspect-square w-full overflow-hidden border-b border-linea">
                  {p.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen} alt={p.nombre} loading="lazy"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <SinFoto />
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  {p.marca && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{p.marca}</div>
                  )}
                  <h2 className="text-sm font-semibold leading-snug line-clamp-2">{p.nombre}</h2>
                  {especificaciones && (
                    <div className="text-[11px] text-neutral-500">{especificaciones}</div>
                  )}
                  <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                    <div>
                      <div className="font-display text-lg font-bold text-electrico leading-5">{sol(p.precio)}</div>
                      <div className="text-[10px] text-neutral-400">
                        Stock: {p.stock} {p.unidad}
                      </div>
                    </div>
                    {enCarrito === 0 ? (
                      <button onClick={() => cambiar(p.codigo, 1)}
                        className="btn-azul !px-3 !py-1.5 text-xs" aria-label={`Agregar ${p.nombre}`}>
                        Agregar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => cambiar(p.codigo, -1)}
                          className="w-7 h-7 rounded-lg bg-fondo border border-linea font-bold hover:border-electrico/40"
                          aria-label="Restar">−</button>
                        <span className="w-7 text-center font-mono font-bold text-sm">{enCarrito}</span>
                        <button onClick={() => cambiar(p.codigo, 1)}
                          disabled={enCarrito >= p.stock}
                          className="w-7 h-7 rounded-lg bg-electrico text-white font-bold disabled:opacity-40"
                          aria-label="Sumar">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* ── Barra flotante del carrito ── */}
      {totalItems > 0 && !abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 btn-ink !rounded-full !px-6 !py-3.5 shadow-pop"
        >
          🛒 Ver pedido · {totalItems} ítem{totalItems !== 1 ? "s" : ""} · <b>{sol(totalSoles)}</b>
        </button>
      )}

      {/* ── Panel del carrito / formulario de pedido ── */}
      {abierto && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-pop">
            <div className="franja" />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold uppercase">Tu pedido</h2>
                <button onClick={() => setAbierto(false)} className="btn-ghost !py-1 !px-3" aria-label="Cerrar">✕</button>
              </div>

              <ul className="divide-y divide-linea">
                {itemsCarrito.map((i) => (
                  <li key={i.codigo} className="py-2.5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-linea shrink-0">
                      {i.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.imagen} alt="" className="w-full h-full object-cover" />
                      ) : <SinFoto />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{i.nombre}</div>
                      <div className="text-xs text-neutral-500">{sol(i.precio)} c/u</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => cambiar(i.codigo, -1)}
                        className="w-7 h-7 rounded-lg bg-fondo border border-linea font-bold">−</button>
                      <span className="w-7 text-center font-mono font-bold text-sm">{i.cantidad}</span>
                      <button onClick={() => cambiar(i.codigo, 1)} disabled={i.cantidad >= i.stock}
                        className="w-7 h-7 rounded-lg bg-electrico text-white font-bold disabled:opacity-40">+</button>
                    </div>
                    <div className="w-20 text-right font-mono font-semibold text-sm">
                      {sol(i.precio * i.cantidad)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between items-center rounded-lg bg-electrico-pale/70 px-3 py-2">
                <span className="font-display font-bold uppercase text-electrico">Total</span>
                <span className="font-mono text-xl font-bold text-electrico">{sol(totalSoles)}</span>
              </div>
              <p className="text-[11px] text-neutral-400 -mt-2">
                Precio referencial con IGV. El pago y la entrega se coordinan al confirmar tu pedido.
              </p>

              {/* Datos del cliente */}
              <form onSubmit={enviarPedido} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="p-nombre">Nombre o empresa *</label>
                    <input id="p-nombre" className="input" required value={cliente.nombre}
                      onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-tel">Teléfono / WhatsApp *</label>
                    <input id="p-tel" className="input font-mono" required inputMode="tel" value={cliente.telefono}
                      onChange={(e) => setCliente((c) => ({ ...c, telefono: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-email">Correo (opcional)</label>
                    <input id="p-email" type="email" className="input" value={cliente.email}
                      onChange={(e) => setCliente((c) => ({ ...c, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-dir">Dirección de entrega (opcional)</label>
                    <input id="p-dir" className="input" value={cliente.direccion}
                      onChange={(e) => setCliente((c) => ({ ...c, direccion: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="p-nota">Nota para la tienda (opcional)</label>
                  <textarea id="p-nota" className="input" rows={2} value={nota}
                    placeholder="Ej: necesito el pedido para el viernes…"
                    onChange={(e) => setNota(e.target.value)} />
                </div>
                {msj && (
                  <div role="alert" className="rounded-lg px-3 py-2.5 text-sm font-medium bg-red-50 text-alerta border border-red-200">
                    {msj.texto}
                  </div>
                )}
                <button className="btn-volt w-full !py-3.5 text-base" disabled={enviando || !itemsCarrito.length}>
                  {enviando ? "Enviando pedido…" : "Enviar pedido"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
