import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle, ClipboardList, Clock3, Package, RefreshCw,
  Route, Truck, Wallet, ChevronRight,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import { puedeVerModulo } from "../utils/permisosUsuario.js";
import { suscribirseCambiosDatos } from "../utils/dataSync.js";
import { listarInventario } from "../services/inventario.service.js";
import { obtenerResumenNotificaciones } from "../services/notificaciones.service.js";
import notificacionIcon from "../assets/icons/notificacion.webp";
import cerrarIcon from "../assets/icons/cerrar.webp";
import "../styles/notificaciones.css";

const STORAGE_POSICION = "webbuys:notificaciones:posicion";
const ANCHO_BOTON = 40;
const ALTO_BOTON = 30;
const MARGEN = 10;

const TABS = [
  { id: "todos", nombre: "Todas" },
  { id: "pedidos", nombre: "Pedidos", permiso: "pedidos" },
  { id: "entregas", nombre: "Entregas", permiso: "entregas" },
  { id: "cartera", nombre: "Cartera", permiso: "cartera" },
  { id: "inventario", nombre: "Inventario", permiso: "inventario" },
];

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n)
    ? n.toLocaleString("es-CO", { maximumFractionDigits: 4 })
    : "0";
}

function fechaCorta(valor, conHora = false) {
  if (!valor) return "";
  const s = String(valor);
  if (!conHora && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [anio, mes, dia] = s.slice(0, 10).split("-");
    return `${dia}/${mes}/${anio}`;
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(fecha);
}

function limitarPosicion(x, y) {
  if (typeof window === "undefined") return { x: 20, y: 90 };
  return {
    x: Math.min(Math.max(Number(x) || MARGEN, MARGEN), Math.max(MARGEN, window.innerWidth - ANCHO_BOTON - MARGEN)),
    y: Math.min(Math.max(Number(y) || MARGEN, MARGEN), Math.max(MARGEN, window.innerHeight - ALTO_BOTON - MARGEN)),
  };
}

function obtenerPosicionInicial() {
  if (typeof window === "undefined") return { x: 20, y: 90 };
  try {
    const guardada = JSON.parse(window.localStorage.getItem(STORAGE_POSICION) || "null");
    if (guardada && Number.isFinite(Number(guardada.x)) && Number.isFinite(Number(guardada.y))) {
      return limitarPosicion(guardada.x, guardada.y);
    }
  } catch (error) {
    console.warn("No se pudo leer la posición de notificaciones:", error);
  }
  return limitarPosicion(window.innerWidth - 84, 92);
}

function crearGrupos(datos, alertasInventario, permisos) {
  const categorias = datos?.categorias || {};
  const grupos = [];

  const agregar = (clave, grupo, titulo, tono, Icono, ruta, transformar) => {
    if (!permisos[grupo]) return;
    const origen = categorias[clave] || { total: 0, items: [] };
    grupos.push({
      id: clave, grupo, titulo, tono, Icono, ruta,
      total: Number(origen.total || 0),
      items: (Array.isArray(origen.items) ? origen.items : []).map(transformar),
    });
  };

  agregar("pedidosPendientes", "pedidos", "Pedidos pendientes", "info", ClipboardList, "/pedidos", (p) => ({
    id: p.id, titulo: p.estado === "Borrador" ? "Pedido en borrador" : "Pedido en preparación",
    principal: `${p.codigo || "Pedido"} · ${p.clienteNombre || "Sin cliente asignado"}`,
    detalle: `Creado: ${fechaCorta(p.createdAt, true)}${p.fechaEntrega ? ` · Entrega: ${fechaCorta(p.fechaEntrega)}` : ""}`,
  }));

  agregar("entregasPorPreparar", "entregas", "Entregas por preparar", "warning", Package, "/entregas", (e) => ({
    id: e.id, titulo: "Por preparar",
    principal: `${e.pedidoCodigo || "Pedido"} · ${e.clienteNombre || "Cliente"}`,
    detalle: e.fechaProgramada ? `Programada: ${fechaCorta(e.fechaProgramada)}` : "Pendiente de preparación",
  }));

  agregar("entregasPendientes", "entregas", "Pendientes de despacho", "info", Truck, "/entregas", (e) => ({
    id: e.id, titulo: "Entrega pendiente de salida",
    principal: `${e.pedidoCodigo || "Pedido"} · ${e.clienteNombre || "Cliente"}`,
    detalle: e.fechaProgramada ? `Programada: ${fechaCorta(e.fechaProgramada)}` : "Lista para gestionar el despacho",
  }));

  agregar("entregasEnRuta", "entregas", "Entregas en ruta", "route", Route, "/entregas", (e) => ({
    id: e.id, titulo: "Entrega en ruta",
    principal: `${e.pedidoCodigo || "Pedido"} · ${e.clienteNombre || "Cliente"}`,
    detalle: e.fechaProgramada ? `Programada: ${fechaCorta(e.fechaProgramada)}` : "En proceso de entrega",
  }));

  agregar("carteraVencida", "cartera", "Cartera vencida", "danger", Wallet, "/cartera", (c) => ({
    id: c.id, titulo: "Cuenta vencida",
    principal: `${c.codigo || c.pedidoCodigo || "Cuenta"} · ${c.clienteNombre || "Cliente"}`,
    detalle: `Saldo: ${PESOS.format(Number(c.saldoPendiente || 0))} · Venció: ${fechaCorta(c.fechaVencimiento)}`,
  }));

  if (permisos.inventario) {
    for (const [clave, titulo, tipo, tono] of [
      ["inventarioAgotado", "Productos agotados", "Agotado", "danger"],
      ["inventarioBajo", "Productos con stock bajo", "Stock bajo", "warning"],
    ]) {
      const filas = alertasInventario.filter((a) => a.tipo === tipo);
      grupos.push({
        id: clave, grupo: "inventario", titulo, tono, Icono: AlertCircle, ruta: "/inventario",
        total: filas.length,
        items: filas.slice(0, 12).map((a) => ({
          id: a.id, titulo: tipo === "Agotado" ? "Producto agotado" : "Stock bajo",
          principal: `${a.producto}${a.presentacion ? ` · ${a.presentacion}` : ""}`,
          detalle: `${a.codigo ? `${a.codigo} · ` : ""}Disponible: ${numero(a.disponible)} ${a.unidad}${tipo === "Stock bajo" ? ` · Mínimo: ${numero(a.minimo)}` : ""}`,
        })),
      });
    }
  }
  return grupos;
}

function construirAlertasInventario(inventario = []) {
  return inventario
    .filter((fila) => fila?.estado === "Agotado" || fila?.estado === "Stock bajo")
    .map((fila) => ({
      id: fila.id || `${fila.productoId || "producto"}-${fila.presentacionId || "principal"}`,
      tipo: fila.estado,
      producto: fila.producto || fila.nombre || "Producto",
      presentacion: fila.presentacion || "",
      codigo: fila.codigo || "",
      disponible: Number(fila.stockDisponible || 0),
      minimo: Number(fila.stockMinimo || 0),
      unidad: fila.unidad || "",
    }))
    .sort((a, b) => a.tipo !== b.tipo
      ? (a.tipo === "Agotado" ? -1 : 1)
      : String(a.producto).localeCompare(String(b.producto), "es"));
}

export default function Notificaciones() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const permisos = useMemo(() => ({
    pedidos: puedeVerModulo(usuario, "pedidos"),
    entregas: puedeVerModulo(usuario, "entregas"),
    cartera: puedeVerModulo(usuario, "cartera"),
    inventario: puedeVerModulo(usuario, "inventario"),
  }), [usuario]);

  const contenedorRef = useRef(null);
  const arrastreRef = useRef({ activo: false, pointerId: null, movio: false });
  const posicionRef = useRef(obtenerPosicionInicial());
  const solicitudRef = useRef(0);
  const [posicion, setPosicion] = useState(posicionRef.current);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [datos, setDatos] = useState({ categorias: {} });
  const [alertasInventario, setAlertasInventario] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState(null);

  const cargarNotificaciones = useCallback(async (mostrarCarga = false) => {
    const solicitud = ++solicitudRef.current;
    if (mostrarCarga) setCargando(true);
    const peticiones = [obtenerResumenNotificaciones()];
    if (permisos.inventario) peticiones.push(listarInventario());
    const resultados = await Promise.allSettled(peticiones);
    if (solicitud !== solicitudRef.current) return;

    const fallos = [];
    if (resultados[0].status === "fulfilled") {
      setDatos(resultados[0].value || { categorias: {} });
    } else {
      fallos.push("No se pudieron consultar los movimientos pendientes.");
    }
    if (permisos.inventario) {
      if (resultados[1]?.status === "fulfilled") {
        const inventario = resultados[1].value?.inventario;
        setAlertasInventario(construirAlertasInventario(Array.isArray(inventario) ? inventario : []));
      } else {
        fallos.push("No se pudieron consultar las alertas de inventario.");
      }
    } else {
      setAlertasInventario([]);
    }
    setError(fallos.join(" "));
    if (resultados.some((r) => r.status === "fulfilled")) setActualizado(new Date());
    setCargando(false);
  }, [permisos.inventario]);

  useEffect(() => {
    cargarNotificaciones();
  }, [location.pathname, cargarNotificaciones]);

  useEffect(() => {
    const intervalo = window.setInterval(() => cargarNotificaciones(), 60000);
    const alVolver = () => { if (document.visibilityState === "visible") cargarNotificaciones(); };
    window.addEventListener("focus", alVolver);
    const desuscribir = suscribirseCambiosDatos((detalle) => {
      if (/\/(pedidos|entregas|cartera|inventario|productos)(\/|$)/.test(String(detalle?.url || ""))) {
        cargarNotificaciones();
      }
    });
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", alVolver);
      desuscribir();
    };
  }, [cargarNotificaciones]);

  useEffect(() => {
    function cerrarFuera(event) {
      if (abierto && contenedorRef.current && !contenedorRef.current.contains(event.target)) setAbierto(false);
    }
    function cerrarEscape(event) { if (event.key === "Escape") setAbierto(false); }
    document.addEventListener("mousedown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, [abierto]);

  useEffect(() => {
    function mantenerEnPantalla() {
      const siguiente = limitarPosicion(posicionRef.current.x, posicionRef.current.y);
      posicionRef.current = siguiente;
      setPosicion(siguiente);
      try { window.localStorage.setItem(STORAGE_POSICION, JSON.stringify(siguiente)); } catch { /* opcional */ }
    }
    window.addEventListener("resize", mantenerEnPantalla);
    return () => window.removeEventListener("resize", mantenerEnPantalla);
  }, []);

  const grupos = useMemo(
    () => crearGrupos(datos, alertasInventario, permisos),
    [datos, alertasInventario, permisos],
  );
  const total = grupos.reduce((suma, g) => suma + g.total, 0);
  const conteos = {
    pedidos: grupos.filter((g) => g.grupo === "pedidos").reduce((s, g) => s + g.total, 0),
    entregas: grupos.filter((g) => g.grupo === "entregas").reduce((s, g) => s + g.total, 0),
    cartera: grupos.filter((g) => g.grupo === "cartera").reduce((s, g) => s + g.total, 0),
    inventario: grupos.filter((g) => g.grupo === "inventario").reduce((s, g) => s + g.total, 0),
  };
  const visibles = grupos.filter((g) => g.total > 0 && (filtro === "todos" || g.grupo === filtro));
  const tabsVisibles = TABS.filter((t) => !t.permiso || permisos[t.permiso]);

  function iniciarArrastre(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    arrastreRef.current = {
      activo: true, pointerId: event.pointerId,
      inicioX: event.clientX, inicioY: event.clientY,
      origenX: posicionRef.current.x, origenY: posicionRef.current.y,
      movio: false,
    };
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  }
  function moverArrastre(event) {
    const a = arrastreRef.current;
    if (!a.activo || a.pointerId !== event.pointerId) return;
    const dx = event.clientX - a.inicioX;
    const dy = event.clientY - a.inicioY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      a.movio = true;
      if (abierto) setAbierto(false);
    }
    if (!a.movio) return;
    const siguiente = limitarPosicion(a.origenX + dx, a.origenY + dy);
    posicionRef.current = siguiente;
    setPosicion(siguiente);
  }
  function terminarArrastre(event) {
    const a = arrastreRef.current;
    if (!a.activo || a.pointerId !== event.pointerId) return;
    a.activo = false;
    try { window.localStorage.setItem(STORAGE_POSICION, JSON.stringify(posicionRef.current)); } catch { /* opcional */ }
  }
  function clickNotificaciones() {
    if (arrastreRef.current.movio) {
      arrastreRef.current.movio = false;
      return;
    }
    setAbierto((anterior) => !anterior);
    if (!abierto) cargarNotificaciones(true);
  }
  function irA(ruta) {
    setAbierto(false);
    navigate(ruta);
  }

  const anchoPanel = typeof window === "undefined" ? 460 : Math.min(460, window.innerWidth - 20);
  const abrirArriba = typeof window !== "undefined" && posicion.y > window.innerHeight / 2;
  // Mantener una altura util para las listas, sin cortar el panel si la
  // campana esta en el centro o en la parte inferior de la pantalla.
  const altoPanel = typeof window === "undefined" ? 620 : Math.min(680, window.innerHeight - 20);
  const izquierdaPanel = typeof window === "undefined" ? 10 : Math.min(
    Math.max(10, posicion.x > window.innerWidth / 2 ? posicion.x + ANCHO_BOTON - anchoPanel : posicion.x),
    window.innerWidth - anchoPanel - 10,
  );
  const arribaDeseada = abrirArriba ? posicion.y - altoPanel - 10 : posicion.y + ALTO_BOTON + 10;
  const arribaPanel = typeof window === "undefined" ? 10 : Math.min(
    Math.max(10, arribaDeseada),
    Math.max(10, window.innerHeight - altoPanel - 10),
  );

  return (
    <div
      className="global-notifications"
      ref={contenedorRef}
      style={{ left: `${posicion.x}px`, top: `${posicion.y}px` }}
    >
      <button
        type="button"
        className={`global-notifications-button ${abierto ? "is-open" : ""}`}
        onClick={clickNotificaciones}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
        title="Notificaciones · arrastra para mover"
        aria-label={`Notificaciones. ${total} alertas activas`}
        aria-expanded={abierto}
      >
        <img src={notificacionIcon} alt="" />
        {total > 0 && <span className="global-notifications-badge">{total > 99 ? "99+" : total}</span>}
      </button>

      {abierto && (
        <div
          className="global-notifications-panel"
          style={{ left: `${izquierdaPanel}px`, top: `${arribaPanel}px`, width: `${anchoPanel}px`, maxHeight: `${altoPanel}px` }}
          role="dialog"
          aria-label="Panel de notificaciones"
        >
          <div className="global-notifications-header">
            <div>
              <span>WEBBUYS · CENTRO DE ALERTAS</span>
              <h3>Notificaciones</h3>
              <p>{total === 0 ? "Sin pendientes registrados" : `${total} alertas y movimientos por atender`}</p>
            </div>
            <button type="button" className="global-notifications-close" onClick={() => setAbierto(false)} aria-label="Cerrar notificaciones">
              <img src={cerrarIcon} alt="" />
            </button>
          </div>

          <div className="global-notifications-summary">
            {permisos.pedidos && (
              <button type="button" className={`notification-summary info ${filtro === "pedidos" ? "active" : ""}`} onClick={() => setFiltro("pedidos")}>
                <ClipboardList size={19} aria-hidden="true" />
                <strong>{conteos.pedidos}</strong><span>Pedidos pendientes</span>
              </button>
            )}
            {permisos.entregas && (
              <button type="button" className={`notification-summary warning ${filtro === "entregas" ? "active" : ""}`} onClick={() => setFiltro("entregas")}>
                <Truck size={19} aria-hidden="true" />
                <strong>{conteos.entregas}</strong><span>Entregas por gestionar</span>
              </button>
            )}
            {permisos.cartera && (
              <button type="button" className={`notification-summary danger ${filtro === "cartera" ? "active" : ""}`} onClick={() => setFiltro("cartera")}>
                <Wallet size={19} aria-hidden="true" />
                <strong>{conteos.cartera}</strong><span>Cartera vencida</span>
              </button>
            )}
            {permisos.inventario && (
              <button type="button" className={`notification-summary stock ${filtro === "inventario" ? "active" : ""}`} onClick={() => setFiltro("inventario")}>
                <Package size={19} aria-hidden="true" />
                <strong>{conteos.inventario}</strong><span>Alertas de inventario</span>
              </button>
            )}
          </div>

          <div className="global-notifications-tabs" role="group" aria-label="Filtrar notificaciones">
            {tabsVisibles.map((tab) => (
              <button key={tab.id} type="button" className={filtro === tab.id ? "active" : ""} onClick={() => setFiltro(tab.id)} aria-pressed={filtro === tab.id}>
                {tab.nombre}
              </button>
            ))}
          </div>

          {error && <div className="global-notifications-error" role="status">{error} <button type="button" onClick={() => cargarNotificaciones(true)}>Reintentar</button></div>}

          <div className="global-notifications-list">
            {visibles.length === 0 ? (
              <div className="global-notifications-empty">
                <Clock3 size={26} aria-hidden="true" />
                <strong>{cargando ? "Actualizando notificaciones..." : "No hay alertas activas"}</strong>
                <span>{filtro === "todos" ? "No hay movimientos pendientes en los módulos habilitados." : "Esta categoría no tiene movimientos pendientes."}</span>
              </div>
            ) : visibles.map((grupo) => (
              <section className="global-notification-section" key={grupo.id}>
                <div className="global-notification-section-header">
                  <div className={`global-notification-section-icon ${grupo.tono}`}><grupo.Icono size={16} aria-hidden="true" /></div>
                  <strong>{grupo.titulo}</strong>
                  <span className="global-notification-count">{grupo.total}</span>
                  <button type="button" onClick={() => irA(grupo.ruta)} title={`Abrir ${grupo.titulo}`} aria-label={`Ver ${grupo.titulo} en su módulo`}>
                    Ver módulo <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
                {grupo.items.map((item) => (
                  <button type="button" className={`global-notification-item ${grupo.tono}`} key={`${grupo.id}-${item.id}`} onClick={() => irA(grupo.ruta)}>
                    <span className="global-notification-dot" aria-hidden="true" />
                    <span className="global-notification-content">
                      <strong>{item.titulo}</strong>
                      <span className="global-notification-product" title={item.principal}>{item.principal}</span>
                      <small>{item.detalle}</small>
                    </span>
                    <ChevronRight className="global-notification-arrow" size={17} aria-hidden="true" />
                  </button>
                ))}
                {grupo.total > grupo.items.length && (
                  <button type="button" className="global-notification-more" onClick={() => irA(grupo.ruta)}>
                    Ver los {grupo.total - grupo.items.length} registros restantes en el módulo
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                )}
              </section>
            ))}
          </div>

          <div className="global-notifications-footer">
            <span>{actualizado ? `Actualizado ${actualizado.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}` : "Actualización automática cada minuto"}</span>
            <button type="button" className="refresh" onClick={() => cargarNotificaciones(true)} disabled={cargando}>
              <RefreshCw size={14} aria-hidden="true" className={cargando ? "spin" : ""} />
              {cargando ? "Actualizando" : "Actualizar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
