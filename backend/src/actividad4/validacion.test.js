import test from "node:test";
import assert from "node:assert/strict";
import { validarFormularioAcademico } from "./validacion.js";
import { openapiActividad4 } from "./openapi.js";

test("acepta datos válidos sin alterar su contenido principal", () => {
  const r = validarFormularioAcademico({ nombre: " Queso ", cantidad: 2 });
  assert.equal(r.valido, true);
  assert.equal(r.datos.nombre, "Queso");
});
test("rechaza campos vacíos", () => {
  assert.equal(validarFormularioAcademico({ nombre: "  ", cantidad: 2 }).valido, false);
});
test("rechaza cantidades fuera del rango", () => {
  assert.equal(validarFormularioAcademico({ nombre: "Producto", cantidad: 101 }).valido, false);
});
test("OpenAPI publica ambos endpoints y pide JWT solo en el POST", () => {
  assert.ok(openapiActividad4.paths["/api/actividad4/estado"].get);
  assert.ok(openapiActividad4.paths["/api/actividad4/validar-datos"].post);
  assert.deepEqual(openapiActividad4.paths["/api/actividad4/validar-datos"].post.security, [{bearerAuth: []}]);
});
