import { Router } from "express";
import { proteger } from "../middlewares/auth.middleware.js";
import { validarFormularioAcademico } from "../actividad4/validacion.js";

const router = Router();

// No lee clientes, pedidos ni datos personales; endpoint público solo de salud.
router.get("/estado", (_req, res) => {
  res.json({ modulo: "actividad4", disponible: true, demo: true });
});

router.post("/validar-datos", proteger, (req, res) => {
  const resultado = validarFormularioAcademico(req.body);
  if (!resultado.valido) {
    return res.status(422).json({ valido: false, errores: resultado.errores });
  }
  return res.json({
    valido: true,
    mensaje: "Datos válidos. Esta demostración no guarda registros.",
    datos: resultado.datos,
  });
});

export default router;
