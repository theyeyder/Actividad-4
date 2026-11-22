/** Swagger UI desde CDN: requiere conexión a Internet para cargar los recursos visuales. */
import { openapiActividad4 } from "./openapi.js";

export function configurarSwagger(app) {
  app.get("/api-docs/openapi.json", (_req, res) => res.json(openapiActividad4));
  app.get("/api-docs", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Swagger UI - WebBuys Actividad 4</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head><body><div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
window.onload = function () {
  if (!window.SwaggerUIBundle) {
    document.getElementById('swagger-ui').textContent =
      'No se pudo cargar Swagger UI desde CDN. Revisa tu conexión a Internet. El JSON está disponible en /api-docs/openapi.json';
    return;
  }
  window.SwaggerUIBundle({ url: '/api-docs/openapi.json', dom_id: '#swagger-ui' });
};
</script></body></html>`);
  });
}
