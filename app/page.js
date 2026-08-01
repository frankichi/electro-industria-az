"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

const sol = (n) =>
  "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AZUL = "#2E2ED0";
const VOLT = "#F5B301";
const PALETA_DONA = ["#2E2ED0", "#F5B301", "#5B5BE8", "#B4551F", "#1F8A4C", "#16181F", "#8A8DF0", "#D99C00", "#94a3b8", "#D93A2B"];

/* ── Íconos ── */
const Ico = {
  ventas: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  mes: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  caja: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  alerta: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
};

function KpiCard({ icono, titulo, valor, detalle, tono = "azul" }) {
  const tonos = {
    azul: "from-electrico to-electrico-glow text-white",
    volt: "from-volt to-yellow-400 text-ink",
    ink: "from-ink to-neutral-700 text-white",
    rojo: "from-alerta to-red-500 text-white",
  };
  return (
    <div className="card p-4 flex items-start gap-3 hover:shadow-pop transition-shadow duration-200">
      <span className={`shrink-0 rounded-xl bg-gradient-to-br ${tonos[tono]} p-2.5 shadow-sm`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icono}
        </svg>
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{titulo}</div>
        <div className="font-display text-[26px] leading-8 font-bold truncate">{valor}</div>
        {detalle && <div className="text-xs text-neutral-500">{detalle}</div>}
      </div>
    </div>
  );
}

/* Tooltip personalizado para todas las gráficas */
function TooltipCaja({ active, payload, label, formato }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-white rounded-lg px-3 py-2 shadow-pop text-xs">
      {label && <div className="font-bold text-volt mb-0.5">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-neutral-300">{p.name}:</span>
          <span className="font-semibold font-mono">{formato === "sol" ? sol(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TituloCard({ children, extra }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide">{children}</h2>
      {extra}
    </div>
  );
}

function EstadoVacio({ texto }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
      <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm">{texto}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  function cargar() {
    setActualizando(true);
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { d.error ? setError(d.error) : setData(d); setActualizando(false); })
      .catch((e) => { setError(String(e)); setActualizando(false); });
  }
  useEffect(() => { cargar(); }, []);

  if (error) {
    return (
      <div className="card p-6 border-l-4 border-l-alerta">
        <h1 className="font-display text-2xl font-bold uppercase mb-2">
          No se pudo conectar con Google Sheets
        </h1>
        <p className="text-sm text-neutral-600">
          Revisa las variables de entorno (APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN) y que el
          Apps Script esté implementado con la versión más reciente.
        </p>
        <p className="font-mono text-xs text-alerta mt-3 bg-red-50 rounded-lg p-2">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-56 rounded-lg bg-neutral-200/70 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 h-[92px] animate-pulse bg-neutral-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-72 animate-pulse bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  const { kpis, porDia, topProductos, stockCategorias, bajoStock } = data;
  const totalUnidadesCat = stockCategorias.reduce((s, c) => s + c.unidades, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-2">
            Resumen del negocio en tiempo real, alimentado desde Google Sheets.
          </p>
        </div>
        <button className="btn-ghost" onClick={cargar} disabled={actualizando}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${actualizando ? "animate-spin" : ""}`}
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
          {actualizando ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icono={Ico.ventas} tono="azul" titulo="Ventas de hoy" valor={sol(kpis.ventasHoy)}
          detalle={`${kpis.comprobantesHoy} comprobante(s)`} />
        <KpiCard icono={Ico.mes} tono="ink" titulo="Ventas del mes" valor={sol(kpis.ventasMes)}
          detalle={`${kpis.comprobantesMes} comprobante(s)`} />
        <KpiCard icono={Ico.caja} tono="volt" titulo="Valor del inventario" valor={sol(kpis.valorInventario)}
          detalle={`${kpis.unidadesEnStock} unidades · ${kpis.totalProductos} productos`} />
        <KpiCard icono={Ico.alerta} tono={kpis.alertasStock > 0 ? "rojo" : "azul"}
          titulo="Alertas de stock" valor={kpis.alertasStock}
          detalle="productos en o bajo el mínimo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Ventas 14 días ── */}
        <div className="card p-4">
          <TituloCard>Ventas · últimos 14 días</TituloCard>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={porDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAzul" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AZUL} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={AZUL} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="#E3E5EC" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#8b8fa3" }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#8b8fa3" }} width={54}
                  axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCaja formato="sol" />} cursor={{ stroke: AZUL, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="total" name="Ventas"
                  stroke={AZUL} strokeWidth={2.5} fill="url(#gAzul)"
                  dot={{ r: 2.5, fill: AZUL, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: VOLT, stroke: AZUL, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Top productos ── */}
        <div className="card p-4">
          <TituloCard>Top productos vendidos</TituloCard>
          <div className="h-64">
            {topProductos.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductos} layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <defs>
                    <linearGradient id="gBarra" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={AZUL} />
                      <stop offset="100%" stopColor="#5B5BE8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="#E3E5EC" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8b8fa3" }}
                    axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" width={150}
                    tick={{ fontSize: 11, fill: "#4b4f63" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCaja />} cursor={{ fill: "rgba(46,46,208,0.06)" }} />
                  <Bar dataKey="unidades" name="Unidades" fill="url(#gBarra)"
                    radius={[0, 8, 8, 0]} maxBarSize={22}
                    label={{ position: "right", fontSize: 11, fill: "#4b4f63", fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EstadoVacio texto="Aún no hay ventas registradas." />
            )}
          </div>
        </div>

        {/* ── Stock por categoría (dona) ── */}
        <div className="card p-4">
          <TituloCard>Stock por categoría</TituloCard>
          <div className="h-64">
            {stockCategorias.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockCategorias} dataKey="unidades" nameKey="categoria"
                    cx="50%" cy="50%" innerRadius="52%" outerRadius="82%"
                    paddingAngle={2} strokeWidth={2} stroke="#fff">
                    {stockCategorias.map((_, i) => (
                      <Cell key={i} fill={PALETA_DONA[i % PALETA_DONA.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipCaja />} />
                  <Legend
                    layout="vertical" align="right" verticalAlign="middle"
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-xs text-neutral-600">{v}</span>}
                  />
                  {/* Total al centro de la dona */}
                  <text x="38%" y="47%" textAnchor="middle" className="font-display"
                    style={{ fontSize: 26, fontWeight: 700, fill: "#16181F" }}>
                    {totalUnidadesCat}
                  </text>
                  <text x="38%" y="56%" textAnchor="middle"
                    style={{ fontSize: 11, fill: "#8b8fa3", textTransform: "uppercase", letterSpacing: 1 }}>
                    unidades
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EstadoVacio texto="Registra productos para ver esta gráfica." />
            )}
          </div>
        </div>

        {/* ── Reponer stock ── */}
        <div className="card p-4">
          <TituloCard
            extra={bajoStock.length > 0 && (
              <span className="tag bg-red-100 text-alerta">{bajoStock.length} por reponer</span>
            )}
          >
            Reponer stock
          </TituloCard>
          <div className="h-64 overflow-y-auto -mx-1 px-1">
            {bajoStock.length ? (
              <ul className="space-y-2">
                {bajoStock.map((p) => {
                  const pct = Math.min(100, Math.round(
                    (Number(p.stock) / Math.max(Number(p.stock_minimo) || 1, 1)) * 100
                  ));
                  return (
                    <li key={p.codigo} className="rounded-xl border border-linea bg-white p-3 hover:border-alerta/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{p.nombre}</div>
                          <span className="codigo">{p.codigo}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-alerta text-lg leading-5">{p.stock}</div>
                          <div className="text-[10px] uppercase text-neutral-400">mín. {p.stock_minimo}</div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-alerta to-volt"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-ok">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm font-semibold">Todo el inventario está por encima del mínimo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
