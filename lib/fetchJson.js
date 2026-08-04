/**
 * fetch con límite de tiempo y manejo de errores robusto.
 *
 * Por qué existe: si el servidor (o Apps Script detrás de él) se demora
 * demasiado o responde con algo que no es JSON (por ejemplo una página de
 * error de Vercel por tiempo agotado), un fetch "desnudo" puede quedar
 * colgado indefinidamente o lanzar una excepción que nadie captura — y en
 * la interfaz eso se ve como un botón trabado en "Guardando..." para
 * siempre. Esta función SIEMPRE termina: o devuelve datos, o lanza un
 * Error con un mensaje legible, dentro de un tiempo máximo razonable.
 */
export async function fetchJSON(url, options = {}, timeoutMs = 25000) {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { ...options, signal: controlador.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder. Intenta de nuevo.");
    }
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión.");
  } finally {
    clearTimeout(timeout);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      res.ok
        ? "El servidor respondió con datos inválidos."
        : `El servidor respondió con un error (${res.status}). Intenta de nuevo en unos segundos.`
    );
  }

  if (!res.ok) {
    throw new Error(data.error || `Error del servidor (${res.status})`);
  }
  return data;
}
