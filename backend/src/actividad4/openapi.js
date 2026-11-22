/** Especificación OpenAPI 3.0, utilizada por Swagger UI. */
export const openapiActividad4 = {
  openapi: "3.0.3",
  info: {
    title: "WebBuys - API académica de demostración",
    version: "1.0.0",
    description: "Endpoints aislados para Actividad 4. No escriben en PostgreSQL ni modifican pedidos reales.",
  },
  servers: [{ url: "/", description: "Servidor actual" }],
  tags: [{ name: "Actividad 4", description: "Pruebas sin modificación de datos reales" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Formulario: {
        type: "object", required: ["nombre", "cantidad"],
        properties: {
          nombre: { type: "string", maxLength: 80, example: "Producto de demostración" },
          cantidad: { type: "integer", minimum: 1, maximum: 100, example: 2 },
        },
      },
    },
  },
  paths: {
    "/api/actividad4/estado": {
      get: {
        summary: "Consultar estado del servicio de demostración",
        tags: ["Actividad 4"],
        responses: {
          "200": { description: "Servicio de demostración disponible" },
        },
      },
    },
    "/api/actividad4/validar-datos": {
      post: {
        summary: "Validar datos de un formulario sin guardarlos",
        tags: ["Actividad 4"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { "$ref": "#/components/schemas/Formulario" } } },
        },
        responses: {
          "200": { description: "Datos válidos; no se guardaron" },
          "422": { description: "Datos inválidos" },
          "401": { description: "No autenticado" },
        },
      },
    },
  },
};
