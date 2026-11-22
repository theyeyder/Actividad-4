/** Validación académica aislada: NO crea pedidos ni escribe en la base de datos. */
export function validarFormularioAcademico(entrada = {}) {
  const nombre = typeof entrada.nombre === "string" ? entrada.nombre.trim() : "";
  const cantidad = Number(entrada.cantidad);
  const errores = [];
  if (!nombre || nombre.length > 80) {
    errores.push("El nombre debe contener entre 1 y 80 caracteres.");
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
    errores.push("La cantidad debe ser un entero entre 1 y 100.");
  }
  return { valido: errores.length === 0, errores, datos: { nombre, cantidad } };
}
