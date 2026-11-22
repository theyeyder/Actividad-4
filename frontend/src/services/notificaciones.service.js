import api from "./api.js";

export async function obtenerResumenNotificaciones() {
  const respuesta = await api.get("/notificaciones/resumen");
  return respuesta.data;
}
