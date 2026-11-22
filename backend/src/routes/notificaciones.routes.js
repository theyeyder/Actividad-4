import { Router } from "express";
import { proteger } from "../middlewares/auth.middleware.js";
import { obtenerNotificaciones } from "../controllers/notificaciones.controller.js";

const router = Router();
router.get("/resumen", proteger, obtenerNotificaciones);
export default router;
