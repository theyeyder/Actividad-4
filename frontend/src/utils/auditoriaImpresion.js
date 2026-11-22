// WebBuys V13 - Impresion de Auditoria.
// Documento de solo lectura, con la impresion nativa del navegador.
// No fija orientacion ni tamano de papel para conservar las opciones de Chrome/Edge.

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[caracter]));
}

function fechaLegible(fecha) {
  if (!fecha) return "—";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "—";
  return valor.toLocaleString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function diaLegible(fecha) {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function documentoAuditoriaImprimible({
  registros = [], filtros = {}, alcance = "filtrados",
  pagina = 1, totalFiltrado = 0,
} = {}) {
  const fechaImpresion = fechaLegible(new Date());
  const registrosSeguros = Array.isArray(registros) ? registros : [];
  const modulos = new Set(registrosSeguros.map((r) => r?.modulo).filter(Boolean)).size;
  const usuarios = new Set(registrosSeguros.map((r) => r?.codigoUsuario || r?.nombreUsuario).filter(Boolean)).size;
  const tituloAlcance = alcance === "pagina"
    ? `Página ${pagina} · hasta 50 registros visibles`
    : "Todos los resultados filtrados";
  const condiciones = [
    filtros.buscar?.trim() && ["Búsqueda", filtros.buscar.trim()],
    filtros.modulo && ["Módulo", filtros.modulo],
    filtros.accion && ["Acción", filtros.accion],
    filtros.desde && ["Desde", diaLegible(filtros.desde)],
    filtros.hasta && ["Hasta", diaLegible(filtros.hasta)],
  ].filter(Boolean);
  const filtrosHtml = condiciones.length
    ? condiciones.map(([etiqueta, valor]) =>
      `<span class="filtro"><b>${escaparHtml(etiqueta)}:</b> ${escaparHtml(valor)}</span>`
    ).join("")
    : '<span class="filtro"><b>Filtros:</b> Ninguno (todos los registros)</span>';

  const filas = registrosSeguros.map((r, i) => `
    <tr>
      <td class="fecha">${escaparHtml(fechaLegible(r?.createdAt))}</td>
      <td class="usuario">
        <strong>${escaparHtml(r?.codigoUsuario || "—")}</strong>
        <span>${escaparHtml(r?.nombreUsuario || "Sistema")}</span>
      </td>
      <td>${escaparHtml(r?.modulo || "—")}</td>
      <td><span class="accion">${escaparHtml(r?.accion || "—")}</span></td>
      <td class="codigo">${escaparHtml(r?.codigoRegistro || "—")}</td>
      <td class="descripcion">${escaparHtml(r?.descripcion || "—")}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebBuys | Auditoría - Registro de actividad</title>
  <style>
    :root { color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font: 13px/1.45 Arial, Helvetica, sans-serif; color: #183028; background: #edf3ef; }
    .barra { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 20px; border-bottom: 1px solid #d7e6dd; background: #fff; box-shadow: 0 3px 16px #14312615; }
    .barra strong { font-size: 16px; color: #173b2d; }
    .barra p { margin: 2px 0 0; color: #617368; font-size: 12px; }
    .acciones { display: flex; flex-wrap: wrap; gap: 9px; }
    button { border: 1px solid #bfd5c8; border-radius: 8px; background: #fff; color: #244637; padding: 10px 15px; font: 700 13px Arial, sans-serif; cursor: pointer; }
    button.principal { background: #0c8066; color: #fff; border-color: #0c8066; }
    button:hover { filter: brightness(.97); }
    .marco { padding: 26px 16px 46px; }
    .hoja { width: 100%; max-width: 225mm; margin: 0 auto; padding: 13mm 12mm 14mm; background: #fff; box-shadow: 0 15px 42px #1c453019; border-top: 5px solid #0c8066; }
    .cabecera { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; padding-bottom: 15px; border-bottom: 2px solid #0c8066; margin-bottom: 15px; }
    .cabecera > div:first-child { min-width: 0; }
    .identificador { margin: 0 0 6px; color: #0b7861; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
    h1 { margin: 0; color: #15392b; font-size: 25px; line-height: 1.17; letter-spacing: -.025em; }
    .subtitulo { margin: 6px 0 0; color: #597064; font-size: 12px; }
    .emitido { min-width: 160px; text-align: right; color: #50685c; font-size: 11px; }
    .emitido b { display: block; margin-bottom: 3px; color: #1d4835; }
    .resumen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 13px; }
    .metrica { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: 1px solid #cfe2d7; border-radius: 7px; background: #f4faf6; }
    .metrica .valor { color: #08735a; font-size: 24px; line-height: 1; font-weight: 800; }
    .metrica .texto { color: #446052; font-size: 11px; font-weight: 700; }
    .filtros { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 16px; }
    .filtro { padding: 5px 8px; border: 1px solid #dbe8e0; border-radius: 5px; background: #f7faf8; color: #3d5749; font-size: 10.5px; }
    .filtro b { color: #195c44; }
    .tabla-titulo { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 0 0 8px; }
    .tabla-titulo h2 { margin: 0; color: #1b4534; font-size: 14px; }
    .tabla-titulo span { color: #65786b; font-size: 10.5px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #d1e1d7; }
    col.fecha { width: 15%; } col.usuario { width: 18%; } col.modulo { width: 13%; }
    col.accion { width: 12%; } col.registro { width: 14%; } col.descripcion { width: 28%; }
    th { padding: 10px 7px; background: #147c68; color: #fff; text-align: left; font-size: 10.5px; font-weight: 800; letter-spacing: .01em; }
    td { padding: 9px 7px; border-bottom: 1px solid #dfe9e2; color: #253a2e; font-size: 11px; vertical-align: top; overflow-wrap: anywhere; word-break: normal; }
    tbody tr:nth-child(even) { background: #f6faf7; }
    td.usuario strong { display: block; color: #174633; font-size: 10.5px; }
    td.usuario span { display: block; margin-top: 3px; color: #4b6355; }
    td.fecha { color: #465e51; font-variant-numeric: tabular-nums; }
    td.codigo { color: #1d533c; font-weight: 700; }
    td.descripcion { white-space: pre-line; }
    .accion { display: inline-block; max-width: 100%; border: 1px solid #cfe1d5; border-radius: 4px; padding: 3px 5px; background: #eff7f1; color: #206044; font-size: 10px; font-weight: 800; overflow-wrap: anywhere; }
    .pie { margin-top: 16px; padding: 11px 12px; border: 1px solid #d5e6db; border-left: 4px solid #0c8066; border-radius: 5px; background: #f7faf8; color: #496557; font-size: 10.5px; }
    .pie strong { color: #185c43; }
    .final { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-top: 15px; padding-top: 9px; border-top: 1px solid #dce9e1; color: #687e70; font-size: 10px; }
    @media screen and (max-width: 750px) { .barra { flex-direction: column; align-items: flex-start; } .marco { overflow-x: auto; } .hoja { min-width: 690px; } }
    @media print {
      /* Sin @page size: Chrome/Edge ofrecen vertical/horizontal y tamaño de papel. */
      html, body { margin: 0; padding: 0; width: auto; background: #fff !important; }
      .barra { display: none !important; }
      .marco { margin: 0; padding: 0; overflow: visible; }
      .hoja { max-width: none; min-width: 0; width: 100%; margin: 0; padding: 0; border: 0; box-shadow: none; }
      .cabecera { break-inside: avoid; padding-bottom: 9px; margin-bottom: 11px; }
      h1 { font-size: 21px; } .identificador { font-size: 9px; } .subtitulo { font-size: 10px; }
      .emitido { font-size: 9px; min-width: 110px; }
      .resumen { gap: 7px; margin-bottom: 10px; break-inside: avoid; }
      .metrica { padding: 7px 9px; background: #fff; }
      .metrica .valor { font-size: 20px; } .metrica .texto { font-size: 9.5px; }
      .filtros { gap: 4px; margin-bottom: 10px; break-inside: avoid; }
      .filtro { padding: 3px 6px; font-size: 9px; background: #fff; }
      .tabla-titulo { margin-bottom: 5px; break-inside: avoid; }
      .tabla-titulo h2 { font-size: 12px; }
      .tabla-titulo span { font-size: 9px; }
      table { border: 1px solid #c8d9ce; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th { background: #e9f3ed !important; color: #18563f !important; border-bottom: 2px solid #117962; padding: 6px 5px; font-size: 9.5px; }
      td { padding: 6px 5px; font-size: 9.5px; }
      td.usuario strong { font-size: 9.5px; } td.usuario span { margin-top: 2px; }
      .accion { padding: 2px 3px; font-size: 8.5px; }
      .pie { break-inside: avoid; margin-top: 10px; padding: 8px 9px; background: #fff; font-size: 9px; }
      .final { break-inside: avoid; margin-top: 8px; padding-top: 6px; font-size: 9px; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @media print and (orientation: portrait) {
      h1 { font-size: 22px; } .subtitulo { font-size: 11px; }
      th { padding: 8px 5px; font-size: 9.5px; }
      td { padding: 8px 5px; font-size: 10px; }
      .metrica { padding: 9px 10px; }
    }
    @media print and (orientation: landscape) {
      .cabecera { padding-bottom: 6px; margin-bottom: 7px; }
      h1 { font-size: 20px; }
      .resumen { margin-bottom: 7px; }
      th { padding: 5px 6px; font-size: 10px; }
      td { padding: 5px 6px; font-size: 10px; }
      .filtros { margin-bottom: 7px; }
    }
  </style>
</head>
<body>
  <div class="barra">
    <div><strong>WebBuys · Auditoría</strong><p>Vista previa del registro de actividad</p></div>
    <div class="acciones">
      <button type="button" class="principal" id="auditoria-imprimir">Imprimir / Guardar PDF</button>
      <button type="button" id="auditoria-cerrar">Cerrar</button>
    </div>
  </div>
  <main class="marco"><article class="hoja">
    <header class="cabecera">
      <div><p class="identificador">WEBBUYS · CONTROL Y TRAZABILIDAD</p><h1>Registro de actividad</h1><p class="subtitulo">Informe de auditoría del sistema</p></div>
      <div class="emitido"><b>Fecha de emisión</b>${escaparHtml(fechaImpresion)}</div>
    </header>
    <section class="resumen" aria-label="Resumen del informe">
      <div class="metrica"><span class="valor">${registrosSeguros.length}</span><span class="texto">Registros incluidos</span></div>
      <div class="metrica"><span class="valor">${modulos}</span><span class="texto">Módulos registrados</span></div>
      <div class="metrica"><span class="valor">${usuarios}</span><span class="texto">Usuarios registrados</span></div>
    </section>
    <div class="filtros">${filtrosHtml}</div>
    <div class="tabla-titulo"><h2>Movimientos del sistema</h2><span>${escaparHtml(tituloAlcance)}</span></div>
    <table>
      <colgroup><col class="fecha"/><col class="usuario"/><col class="modulo"/><col class="accion"/><col class="registro"/><col class="descripcion"/></colgroup>
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Registro</th><th>Descripción</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="6">Sin registros para los filtros seleccionados.</td></tr>'}</tbody>
    </table>
    <div class="pie"><strong>Alcance:</strong> ${escaparHtml(tituloAlcance)}. ${alcance === "pagina"
      ? `Página ${escaparHtml(pagina)} de la consulta; ${escaparHtml(totalFiltrado)} registros filtrados en total.`
      : `${escaparHtml(registrosSeguros.length)} registros encontrados con los filtros aplicados.`
    } Los datos corresponden a la consulta realizada al generar el documento.</div>
    <footer class="final"><span>WebBuys V13 · Auditoría</span><span>Documento de consulta · Solo lectura</span></footer>
  </article></main>
</body>
</html>`;
}

export function mostrarDocumentoAuditoria(ventana, html) {
  if (!ventana || ventana.closed) return;
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.document.getElementById("auditoria-imprimir")?.addEventListener("click", () => {
    ventana.focus();
    ventana.print();
  });
  ventana.document.getElementById("auditoria-cerrar")?.addEventListener("click", () => {
    ventana.close();
  });
}

export function mostrarEstadoAuditoria(ventana, titulo, descripcion) {
  if (!ventana || ventana.closed) return;
  ventana.document.open();
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />
    <title>WebBuys · Auditoría</title><style>body{font:15px Arial,sans-serif;max-width:680px;margin:65px auto;padding:0 22px;color:#1c3b2d}h1{font-size:24px}p{line-height:1.6}button{background:#0c8066;border:0;border-radius:7px;color:white;padding:11px 16px;cursor:pointer}</style>
    </head><body><h1>${escaparHtml(titulo)}</h1><p>${escaparHtml(descripcion)}</p><button id="cerrar">Cerrar</button></body></html>`);
  ventana.document.close();
  ventana.document.getElementById("cerrar")?.addEventListener("click", () => ventana.close());
}
