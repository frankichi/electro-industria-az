"use client";
import { useEffect, useState } from "react";
import CampoEscaneo from "@/components/CampoEscaneo";
import ImagenProducto from "@/components/ImagenProducto";
import { fetchJSON } from "@/lib/fetchJson";

const VACIO = {
  codigo: "", nombre: "", descripcion: "", categoria: "", marca: "",
  unidad: "UND", voltaje: "", amperaje: "", peso: "", medidas: "",
  stock: "", stock_minimo: "", costo: "", precio: "", ubicacion: "",
};

const CATEGORIAS_BASE = [
  "Cables y conductores", "Iluminación", "Tableros y llaves",
  "Tomacorrientes e interruptores", "Herramientas", "Motores y bombas",
  "Canalización (tubos/canaletas)", "Ferretería general", "EPP / Seguridad", "Otros",
];
const NUEVA_CATEGORIA = "__nueva__";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState(null); // null = cerrado
  const [esEdicion, setEsEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msj, setMsj] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [categorias, setCategorias] = useState(CATEGORIAS_BASE);
  const esAdmin = sesion?.rol === "admin";

  async function cargar() {
    setCargando(true);
    try {
      const r = await fetchJSON("/api/productos");
      setProductos(r.productos || []);
    } catch (e) {
      setMsj({ tipo: "error", texto: e.message });
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    cargar();
    fetch("/api/auth/yo").then((r) => r.json()).then((d) => setSesion(d.sesion));
    cargarCategorias();
  }, []);

  async function cargarCategorias() {
    let r;
    try {
      r = await fetchJSON("/api/categorias");
    } catch {
      return; // no crítico: se usan las categorías base como respaldo
    }
    const guardadas = r.categorias || [];
    const fusion = [...CATEGORIAS_BASE];
    guardadas.forEach((c) => { if (!fusion.some((f) => f.toLowerCase() === c.toLowerCase())) fusion.push(c); });
    setCategorias(fusion);
  }

  async function alCambiarCategoria(valor) {
    if (valor !== NUEVA_CATEGORIA) {
      set("categoria", valor);
      return;
    }
    const nueva = window.prompt("Nombre de la categoría nueva:");
    const limpio = (nueva || "").trim();
    if (!limpio) return;
    await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: limpio }),
    });
    setCategorias((c) => (c.some((x) => x.toLowerCase() === limpio.toLowerCase()) ? c : [...c, limpio]));
    set("categoria", limpio);
  }

  function alEscanear(codigo) {
    const existente = productos.find((p) => String(p.codigo).trim() === codigo);
    if (existente) {
      if (esAdmin) {
        setForm({ ...VACIO, ...existente });
        setEsEdicion(true);
        setMsj({ tipo: "info", texto: `Producto encontrado: ${existente.nombre}. Puedes editarlo.` });
      } else {
        setBusqueda(String(existente.codigo));
        setMsj({
          tipo: "info",
          texto: `${existente.nombre} — Stock: ${existente.stock} ${existente.unidad} — Precio: S/ ${Number(existente.precio || 0).toFixed(2)}. (Solo el administrador puede editar productos.)`,
        });
      }
    } else {
      setForm({ ...VACIO, codigo });
      setEsEdicion(false);
      setMsj({ tipo: "info", texto: "Código nuevo. Completa las características para registrarlo." });
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMsj(null);
    try {
      await fetchJSON("/api/productos", {
        method: esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setMsj({ tipo: "ok", texto: esEdicion ? "Producto actualizado" : "Producto registrado" });
      setForm(null);
      cargar();
    } catch (e) {
      setMsj({ tipo: "error", texto: e.message });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar definitivamente "${p.nombre}" (${p.codigo})? Esta acción no se puede deshacer.`)) return;
    try {
      await fetchJSON(`/api/productos?codigo=${encodeURIComponent(p.codigo)}`, { method: "DELETE" });
      setMsj({ tipo: "ok", texto: `Producto "${p.nombre}" eliminado` });
      cargar();
    } catch (e) {
      setMsj({ tipo: "error", texto: e.message });
    }
  }

  const filtrados = productos.filter((p) => {
    const q = busqueda.toLowerCase();
    return (
      !q ||
      String(p.codigo).toLowerCase().includes(q) ||
      String(p.nombre).toLowerCase().includes(q) ||
      String(p.categoria).toLowerCase().includes(q) ||
      String(p.marca).toLowerCase().includes(q)
    );
  });

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Inventario</h1>
          <p className="text-sm text-neutral-500 mt-2">
            {esAdmin ? "Escanea un código: si existe lo abres para editar, si es nuevo lo registras." : "Escanea un código: si es nuevo lo registras; si existe, verás su stock y precio."}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/catalogo" target="_blank" rel="noreferrer" className="btn-azul">
            Ver catálogo público ↗
          </a>
          <button
            className="btn-volt"
            onClick={() => { setForm({ ...VACIO }); setEsEdicion(false); setMsj(null); }}
          >
            + Registrar sin escanear
          </button>
        </div>
      </div>

      <div className="card p-4">
        <CampoEscaneo onCodigo={alEscanear} grande />
      </div>

      {msj && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            msj.tipo === "error"
              ? "bg-red-50 text-alerta border border-red-200"
              : msj.tipo === "ok"
              ? "bg-green-50 text-ok border border-green-200"
              : "bg-electrico-pale text-electrico border border-blue-200"
          }`}
        >
          {msj.texto}
        </div>
      )}

      {/* ── Formulario de producto ─────────────────────────── */}
      {form && (
        <form onSubmit={guardar} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold uppercase">
              {esEdicion ? "Editar producto" : "Nuevo producto"}
            </h2>
            {form.codigo && <span className="codigo">{form.codigo}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="f-codigo">Código (barras/QR) *</label>
              <input id="f-codigo" className="input font-mono" required value={form.codigo}
                onChange={(e) => set("codigo", e.target.value)} disabled={esEdicion} />
            </div>
            <div className="lg:col-span-2">
              <label className="label" htmlFor="f-nombre">Nombre del producto *</label>
              <input id="f-nombre" className="input" required value={form.nombre}
                placeholder="Ej: Cable THW 12 AWG rollo 100m"
                onChange={(e) => set("nombre", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-categoria">Categoría</label>
              <select id="f-categoria" className="input" value={form.categoria}
                onChange={(e) => alCambiarCategoria(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {categorias.map((c) => <option key={c}>{c}</option>)}
                <option value={NUEVA_CATEGORIA}>+ Agregar categoría nueva…</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-marca">Marca</label>
              <input id="f-marca" className="input" value={form.marca}
                placeholder="Indeco, Philips, Stanley…"
                onChange={(e) => set("marca", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-unidad">Unidad</label>
              <select id="f-unidad" className="input" value={form.unidad}
                onChange={(e) => set("unidad", e.target.value)}>
                {["UND", "MTS", "ROLLO", "CAJA", "KG", "PAR", "JGO", "GLN"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-voltaje">Voltaje</label>
              <input id="f-voltaje" className="input" value={form.voltaje}
                placeholder="220V, 380V, 12V…" onChange={(e) => set("voltaje", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-amperaje">Amperaje / Potencia</label>
              <input id="f-amperaje" className="input" value={form.amperaje}
                placeholder="16A, 2A, 1500W…" onChange={(e) => set("amperaje", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-peso">Peso</label>
              <input id="f-peso" className="input" value={form.peso}
                placeholder="2.5 kg" onChange={(e) => set("peso", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-medidas">Medidas</label>
              <input id="f-medidas" className="input" value={form.medidas}
                placeholder='20x15x10 cm, 1/2", 3m…' onChange={(e) => set("medidas", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-ubicacion">Ubicación en tienda</label>
              <input id="f-ubicacion" className="input" value={form.ubicacion}
                placeholder="Estante A-3" onChange={(e) => set("ubicacion", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-stock">Stock actual</label>
              <input id="f-stock" type="number" min="0" step="any" className="input font-mono"
                value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-min">Stock mínimo (alerta)</label>
              <input id="f-min" type="number" min="0" step="any" className="input font-mono"
                value={form.stock_minimo} onChange={(e) => set("stock_minimo", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-costo">Costo (S/)</label>
              <input id="f-costo" type="number" min="0" step="0.01" className="input font-mono"
                value={form.costo} onChange={(e) => set("costo", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-precio">Precio de venta (S/) *</label>
              <input id="f-precio" type="number" min="0" step="0.01" required className="input font-mono"
                value={form.precio} onChange={(e) => set("precio", e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <ImagenProducto url={form.imagen} onUrl={(u) => set("imagen", u)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label" htmlFor="f-desc">Descripción</label>
              <textarea id="f-desc" className="input" rows={2} value={form.descripcion}
                onChange={(e) => set("descripcion", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn-volt" disabled={guardando}>
              {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Registrar producto"}
            </button>
          </div>
        </form>
      )}

      {/* ── Tabla de productos ─────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-linea flex flex-wrap items-center gap-3 justify-between">
          <h2 className="font-display text-xl font-bold uppercase">
            Productos <span className="text-neutral-400">({filtrados.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <input
              className="input !w-64"
              placeholder="Buscar por nombre, código, marca…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar producto"
            />
            <button
              type="button"
              className="btn-ghost shrink-0"
              onClick={cargar}
              disabled={cargando}
              title="Volver a cargar el inventario desde la hoja"
            >
              <svg viewBox="0 0 24 24" className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`}
                fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">{cargando ? "Actualizando…" : "Actualizar"}</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-fondo text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5">Categoría</th>
                <th className="px-4 py-2.5">Especificaciones</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                {esAdmin && <th className="px-4 py-2.5 text-right">Costo</th>}
                <th className="px-4 py-2.5 text-right">Precio</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={esAdmin ? 8 : 7} className="px-4 py-8 text-center text-neutral-400">
                  Cargando inventario…
                </td></tr>
              )}
              {!cargando && !filtrados.length && (
                <tr><td colSpan={esAdmin ? 8 : 7} className="px-4 py-8 text-center text-neutral-400">
                  Aún no hay productos. Escanea un código arriba para registrar el primero.
                </td></tr>
              )}
              {filtrados.map((p) => {
                const bajo = Number(p.stock) <= (Number(p.stock_minimo) || 0);
                return (
                  <tr key={p.codigo} className="border-t border-linea hover:bg-fondo/60">
                    <td className="px-4 py-2.5"><span className="codigo">{p.codigo}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {p.imagen ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagen} alt="" loading="lazy"
                            className="w-10 h-10 rounded-lg object-cover border border-linea shrink-0" />
                        ) : (
                          <span className="w-10 h-10 rounded-lg bg-fondo border border-linea shrink-0 flex items-center justify-center text-neutral-300">
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                            </svg>
                          </span>
                        )}
                        <div>
                          <div className="font-semibold">{p.nombre}</div>
                          <div className="text-xs text-neutral-500">{p.marca}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{p.categoria}</td>
                    <td className="px-4 py-2.5 text-xs text-neutral-600">
                      {[p.voltaje, p.amperaje, p.medidas, p.peso].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      <span className={`tag ${bajo ? "bg-red-100 text-alerta" : "bg-green-100 text-ok"}`}>
                        {p.stock} {p.unidad}
                      </span>
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-2.5 text-right font-mono text-neutral-500">
                        S/ {Number(p.costo || 0).toFixed(2)}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      S/ {Number(p.precio || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {esAdmin && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            className="btn-ghost !py-1 !px-3 text-xs"
                            onClick={() => { setForm({ ...VACIO, ...p }); setEsEdicion(true); setMsj(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-rojo !py-1 !px-3 text-xs"
                            onClick={() => eliminar(p)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
