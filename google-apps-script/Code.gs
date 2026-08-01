/**
 * ELECTRO INDUSTRIA A&Z — Backend de Google Sheets vía Apps Script
 * ------------------------------------------------------------------
 * Este script convierte tu propia hoja de cálculo en el "servidor" de
 * datos del sistema web, sin necesidad de una clave de cuenta de servicio.
 *
 * INSTALACIÓN / ACTUALIZACIÓN:
 * 1. Abre tu hoja "ElectroIndustriaAZ BD".
 * 2. Menú Extensiones → Apps Script.
 * 3. Borra el contenido de "Código.gs" y pega TODO este archivo.
 * 4. Revisa que la constante TOKEN (abajo) tenga tu clave secreta actual.
 * 5. Botón "Implementar" → "Gestionar implementaciones" → ícono ✏️ (editar)
 *    de tu implementación existente → en "Versión" elige "Nueva versión"
 *    → Implementar. (Si es tu primera vez, usa "Nueva implementación" en
 *    vez de editar una existente: Tipo "Aplicación web", Ejecutar como
 *    "Yo", Acceso "Cualquier usuario").
 * 6. La URL de la aplicación web NO cambia al crear una nueva versión,
 *    así que no necesitas tocar nada en Vercel tras actualizar el script.
 *
 * CAMBIOS DE ESTA VERSIÓN:
 *  - Arregla el bug de "se pierde el 0 a la izquierda" en códigos de
 *    barras: todas las columnas se fuerzan a formato de texto plano,
 *    así Sheets ya no las convierte en número automáticamente.
 *  - Agrega la pestaña "Clientes" (para guardar clientes por RUC/DNI).
 */

// ⚠️ Debe coincidir exactamente con APPS_SCRIPT_TOKEN en Vercel.
const TOKEN = "Rominit@14ua#";

const CABECERAS = {
  Productos: [
    "codigo", "nombre", "descripcion", "categoria", "marca", "unidad",
    "voltaje", "amperaje", "peso", "medidas", "stock", "stock_minimo",
    "costo", "precio", "ubicacion", "fecha_registro", "fecha_actualizacion",
  ],
  Ventas: [
    "id", "tipo", "serie", "numero", "fecha", "cliente_doc", "cliente_nombre",
    "cliente_direccion", "subtotal", "igv", "total", "metodo_pago", "num_items",
    "sunat_estado", "sunat_mensaje", "sunat_pdf", "sunat_xml", "sunat_cdr",
  ],
  VentaItems: [
    "venta_id", "codigo", "nombre", "cantidad", "precio_unit", "total",
  ],
  Movimientos: ["fecha", "codigo", "tipo", "cantidad", "stock_resultante", "referencia"],
  Usuarios: [
    "usuario", "nombre", "rol", "password_hash", "estado",
    "fecha_creacion", "creado_por", "codigo_recuperacion", "recuperacion_expira",
  ],
  Clientes: [
    "doc", "tipo_doc", "nombre", "direccion", "estado_sunat", "condicion_sunat",
    "fecha_registro", "creado_por",
  ],
  Categorias: ["nombre", "fecha_registro", "creado_por"],
};

function doPost(e) {
  var salida;
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) {
      salida = { error: "Token inválido. Revisa APPS_SCRIPT_TOKEN." };
      return responder(salida);
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (body.action) {
      case "ensureStructure":
        ensureStructure(ss);
        salida = { ok: true };
        break;
      case "read":
        salida = { filas: leerTabla(ss, body.table) };
        break;
      case "readMany":
        var tablas = {};
        (body.tables || []).forEach(function (t) { tablas[t] = leerTabla(ss, t); });
        salida = { tablas: tablas };
        break;
      case "append":
        agregarFilas(ss, body.table, body.rows || []);
        salida = { ok: true };
        break;
      case "update":
        actualizarFila(ss, body.table, body.rowNumber, body.data || {});
        salida = { ok: true };
        break;
      case "delete":
        eliminarFila(ss, body.table, body.rowNumber);
        salida = { ok: true };
        break;
      default:
        salida = { error: "Acción no reconocida: " + body.action };
    }
  } catch (err) {
    salida = { error: "Error en Apps Script: " + err.message };
  }
  return responder(salida);
}

// Atajo útil para probar en el navegador que el script responde (no expone datos).
function doGet(e) {
  return responder({ ok: true, mensaje: "Apps Script de Electro Industria A&Z activo." });
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Crea las pestañas que falten, y en las que ya existen agrega al final
 * cualquier columna nueva definida en CABECERAS que aún no tengan (esto
 * permite agregar funciones nuevas al sistema sin perder datos viejos).
 * También fuerza TODAS las columnas a formato de texto plano ("@"), para
 * que los códigos de barra, RUC, DNI y códigos de recuperación con ceros
 * a la izquierda nunca se conviertan en número. El formateo corre una
 * sola vez por script (se recuerda con PropertiesService) salvo que se
 * cree una pestaña o columna nueva, para no repetir trabajo en cada llamada.
 *
 * IMPORTANTE: los campos nuevos siempre deben agregarse al FINAL de cada
 * arreglo en CABECERAS, nunca insertarse en medio, para que el orden de
 * columnas siga coincidiendo con lo que ya está escrito en la hoja.
 */
function ensureStructure(ss) {
  var props = PropertiesService.getScriptProperties();

  // Si ya se verificó la estructura hace menos de 15 minutos, no repetir
  // el trabajo (leer cabeceras de 7 pestañas en cada request es lo que
  // más retrasaba la carga del sistema). Cuando agregues una pestaña o
  // columna nueva a CABECERAS, el próximo despliegue del script vuelve
  // a forzar la verificación una vez (VERSION_FORMATO cambia el caché).
  var VERSION_FORMATO = "v3-cache15min";
  var ultimaVerificacion = props.getProperty("estructura_verificada_" + VERSION_FORMATO);
  var ahoraMs = Date.now();
  if (ultimaVerificacion && (ahoraMs - Number(ultimaVerificacion) < 15 * 60 * 1000)) {
    return;
  }

  var creoAlguna = false;

  Object.keys(CABECERAS).forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
      hoja.getRange(1, 1, 1, CABECERAS[nombre].length).setValues([CABECERAS[nombre]]);
      hoja.setFrozenRows(1);
      hoja.getRange(1, 1, 1, CABECERAS[nombre].length)
        .setFontWeight("bold").setBackground("#1A1D21").setFontColor("#F5B301");
      creoAlguna = true;
    } else {
      var anchoActual = Math.max(hoja.getLastColumn(), 1);
      var headerActual = hoja.getRange(1, 1, 1, anchoActual).getValues()[0];
      var faltantes = CABECERAS[nombre].filter(function (c) {
        return headerActual.indexOf(c) === -1;
      });
      if (faltantes.length) {
        hoja.getRange(1, anchoActual + 1, 1, faltantes.length).setValues([faltantes]);
        hoja.getRange(1, anchoActual + 1, 1, faltantes.length)
          .setFontWeight("bold").setBackground("#1A1D21").setFontColor("#F5B301");
        creoAlguna = true;
      }
    }
  });

  var VERSION_TEXTO = "v2-texto-plano";
  if (creoAlguna || props.getProperty("formato_aplicado") !== VERSION_TEXTO) {
    Object.keys(CABECERAS).forEach(function (nombre) {
      var hoja = ss.getSheetByName(nombre);
      if (!hoja) return;
      var numCols = CABECERAS[nombre].length;
      var numFilas = Math.max(hoja.getMaxRows(), 3000);
      hoja.getRange(1, 1, numFilas, numCols).setNumberFormat("@");
    });
    props.setProperty("formato_aplicado", VERSION_TEXTO);
  }

  props.setProperty("estructura_verificada_" + VERSION_FORMATO, String(ahoraMs));
}

function leerTabla(ss, nombre) {
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) return [];
  var datos = hoja.getDataRange().getDisplayValues(); // texto tal cual se ve en la celda
  if (datos.length < 2) return [];
  var cab = datos[0];
  var filas = [];
  for (var i = 1; i < datos.length; i++) {
    // Saltar filas totalmente vacías
    if (datos[i].every(function (v) { return v === ""; })) continue;
    var obj = { _fila: i + 1 }; // fila real en la hoja (1-indexada)
    for (var j = 0; j < cab.length; j++) {
      obj[cab[j]] = datos[i][j];
    }
    filas.push(obj);
  }
  return filas;
}

function agregarFilas(ss, nombre, objetos) {
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error("No existe la pestaña " + nombre);
  var cab = CABECERAS[nombre];
  var matriz = objetos.map(function (o) {
    return cab.map(function (c) {
      var v = (o[c] !== undefined && o[c] !== null) ? o[c] : "";
      return String(v); // fuerza texto: nunca pierde ceros a la izquierda
    });
  });
  if (!matriz.length) return;
  var ultimaFila = hoja.getLastRow();
  hoja.getRange(ultimaFila + 1, 1, matriz.length, cab.length).setNumberFormat("@").setValues(matriz);
}

function actualizarFila(ss, nombre, numFila, objeto) {
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error("No existe la pestaña " + nombre);
  var cab = CABECERAS[nombre];
  var fila = cab.map(function (c) {
    var v = (objeto[c] !== undefined && objeto[c] !== null) ? objeto[c] : "";
    return String(v);
  });
  hoja.getRange(numFila, 1, 1, cab.length).setNumberFormat("@").setValues([fila]);
}

function eliminarFila(ss, nombre, numFila) {
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error("No existe la pestaña " + nombre);
  hoja.deleteRow(numFila);
}
