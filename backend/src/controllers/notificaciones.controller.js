import { prisma } from "../config/postgresql.js";
import { puede } from "../utils/permisos.js";

// La campana solo consulta datos: no crea registros ni modifica estados.
// Se consultan contadores y una muestra pequena para no descargar
// pedidos/entregas completos cada minuto.
const LIMITE_DETALLE = 12;

const PENDIENTES_PEDIDO = ["Borrador", "En preparación"];

function inicioHoyColombia() {
  // Los vencimientos se guardan como @db.Date en PostgreSQL.
  // Comparar con la fecha calendario de Colombia evita desfases de UTC.
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const parte = (tipo) => partes.find((p) => p.type === tipo)?.value;
  return new Date(`${parte("year")}-${parte("month")}-${parte("day")}T00:00:00.000Z`);
}

async function consultarCategoria(modelo, where, select, orderBy) {
  const [total, filas] = await Promise.all([
    modelo.count({ where }),
    modelo.findMany({
      where,
      select,
      orderBy,
      take: LIMITE_DETALLE,
    }),
  ]);

  return { total, items: filas };
}

export const obtenerNotificaciones = async (req, res) => {
  try {
    const permitido = {
      pedidos: puede(req.usuario, "pedidos", "ver"),
      entregas: puede(req.usuario, "entregas", "ver"),
      cartera: puede(req.usuario, "cartera", "ver"),
      inventario: puede(req.usuario, "inventario", "ver"),
    };

    const categorias = {};
    const consultas = [];

    if (permitido.pedidos) {
      consultas.push((async () => {
        categorias.pedidosPendientes = await consultarCategoria(
          prisma.pedido,
          { estado: { in: PENDIENTES_PEDIDO } },
          { id: true, codigo: true, clienteNombre: true, estado: true, createdAt: true, fechaEntrega: true },
          { createdAt: "asc" },
        );
      })());
    }

    if (permitido.entregas) {
      const select = {
        id: true,
        pedidoCodigo: true,
        clienteNombre: true,
        estado: true,
        fechaProgramada: true,
        createdAt: true,
      };
      for (const [clave, estado] of [
        ["entregasPorPreparar", "Por preparar"],
        ["entregasPendientes", "Pendiente"],
        ["entregasEnRuta", "En ruta"],
      ]) {
        consultas.push((async () => {
          categorias[clave] = await consultarCategoria(
            prisma.entrega,
            { estado },
            select,
            { createdAt: "asc" },
          );
        })());
      }
    }

    if (permitido.cartera) {
      consultas.push((async () => {
        categorias.carteraVencida = await consultarCategoria(
          prisma.cartera,
          {
            saldoPendiente: { gt: 0 },
            estado: { not: "Pagada" },
            fechaVencimiento: { lt: inicioHoyColombia() },
          },
          {
            id: true,
            codigo: true,
            pedidoCodigo: true,
            clienteNombre: true,
            saldoPendiente: true,
            fechaVencimiento: true,
          },
          { fechaVencimiento: "asc" },
        );
        // Prisma Decimal no se debe serializar como objeto en el frontend.
        categorias.carteraVencida.items = categorias.carteraVencida.items.map((item) => ({
          ...item,
          saldoPendiente: Number(item.saldoPendiente),
        }));
      })());
    }

    await Promise.all(consultas);

    return res.json({ permitido, categorias, actualizadoAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error consultando notificaciones:", error);
    return res.status(500).json({ mensaje: "No fue posible consultar las notificaciones." });
  }
};
