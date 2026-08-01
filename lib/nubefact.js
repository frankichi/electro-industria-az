/**
 * Emisión de facturas electrónicas ante SUNAT, a través de NubeFacT
 * (Operador de Servicios Electrónicos autorizado por SUNAT).
 *
 * Por qué un intermediario y no "hablar directo" con SUNAT: emitir con
 * validez legal requiere certificado digital, homologación previa ante
 * SUNAT y generar/firmar XML en formato UBL 2.1 — un proceso de semanas.
 * Un OSE como NubeFacT hace ese trabajo y expone una API simple; es el
 * mecanismo estándar que usa la enorme mayoría de negocios en Perú.
 *
 * Cómo activarlo: ver README, sección "Conectar con SUNAT (facturas)".
 */

const IGV_PORCENTAJE = 18;

function nubefactConfigurado() {
  return Boolean(process.env.NUBEFACT_URL && process.env.NUBEFACT_TOKEN);
}

/** Convierte "31/07/2026, 14:22:05" (es-PE) al formato dd-mm-aaaa que espera NubeFacT. */
function formatoFechaNubefact(fechaLocal) {
  const m = String(fechaLocal).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : fechaLocal;
}

function construirPayload({ serie, numero, fecha, cliente, items, subtotal, igv, total }) {
  return {
    operacion: "generar_comprobante",
    tipo_de_comprobante: 1, // 1 = Factura (catálogo de tipos de NubeFacT)
    serie,
    numero,
    sunat_transaction: 1,
    cliente_tipo_de_documento: 6, // 6 = RUC
    cliente_numero_de_documento: cliente.doc,
    cliente_denominacion: cliente.nombre,
    cliente_direccion: cliente.direccion || "-",
    fecha_de_emision: formatoFechaNubefact(fecha),
    moneda: 1, // 1 = Soles
    porcentaje_de_igv: IGV_PORCENTAJE,
    total_gravada: subtotal,
    total_igv: igv,
    total,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,
    items: items.map((it) => {
      const valorUnitario = +(it.precio_unit / (1 + IGV_PORCENTAJE / 100)).toFixed(2);
      const itemSubtotal = +(valorUnitario * it.cantidad).toFixed(2);
      const itemIgv = +(it.total - itemSubtotal).toFixed(2);
      return {
        unidad_de_medida: "NIU",
        codigo: it.codigo,
        descripcion: it.nombre,
        cantidad: it.cantidad,
        valor_unitario: valorUnitario,
        precio_unitario: it.precio_unit,
        subtotal: itemSubtotal,
        tipo_de_igv: 1, // 1 = Gravado - Operación Onerosa
        igv: itemIgv,
        total: it.total,
      };
    }),
  };
}

/**
 * Envía la factura a SUNAT vía NubeFacT.
 * Lanza un error con mensaje claro si algo falla; si tiene éxito, devuelve
 * el estado y los enlaces al PDF/XML/CDR que SUNAT reconoce como válidos.
 */
export async function emitirFacturaSunat(datosVenta) {
  if (!nubefactConfigurado()) {
    throw new Error(
      "La emisión electrónica de facturas no está configurada. Agrega NUBEFACT_URL " +
      "y NUBEFACT_TOKEN (ver README, sección 'Conectar con SUNAT (facturas)')."
    );
  }

  const payload = construirPayload(datosVenta);
  let res;
  try {
    res = await fetch(process.env.NUBEFACT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NUBEFACT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error("No se pudo contactar al servicio de facturación electrónica: " + e.message);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("El servicio de facturación electrónica no devolvió una respuesta válida.");
  }

  if (!res.ok || data.errors) {
    const detalle = data?.errors || `HTTP ${res.status}`;
    throw new Error(`SUNAT rechazó la factura: ${detalle}`);
  }

  return {
    estado: data.aceptada_por_sunat ? "ACEPTADA" : (data.sunat_description ? "OBSERVADA" : "ENVIADA"),
    mensaje: data.sunat_description || data.sunat_note || data.sunat_responsecode || "Enviada a SUNAT correctamente.",
    pdf: data.enlace_del_pdf || "",
    xml: data.enlace_del_xml || "",
    cdr: data.enlace_del_cdr || "",
  };
}

export { nubefactConfigurado };
