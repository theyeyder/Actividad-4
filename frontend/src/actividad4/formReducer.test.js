import test from "node:test";
import assert from "node:assert/strict";
import { formReducer, initialFormState } from "./formReducer.js";

test("actualiza el nombre sin mutar el estado original", () => {
  const nuevo = formReducer(initialFormState, { type: "CAMPO", campo: "nombre", valor: "Yogur" });
  assert.equal(nuevo.nombre, "Yogur");
  assert.equal(initialFormState.nombre, "");
});
test("marca el envío", () => {
  assert.equal(formReducer(initialFormState, { type: "ENVIANDO" }).enviando, true);
});
test("registra respuesta correcta", () => {
  const actual = formReducer(initialFormState, { type: "EXITO", resultado: "Correcto" });
  assert.equal(actual.resultado, "Correcto");
});
test("reinicia formulario", () => {
  const mod = { ...initialFormState, nombre: "Prueba", error: "Mensaje" };
  assert.deepEqual(formReducer(mod, { type: "REINICIAR" }), initialFormState);
});
