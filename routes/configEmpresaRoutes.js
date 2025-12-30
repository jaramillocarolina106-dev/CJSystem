// =======================================================
// ⚙️ RUTAS CONFIGURACIÓN POR EMPRESA — CJSystem
// =======================================================

const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");
const ctrl = require("../controllers/configEmpresaController");

// =======================================================
// 📥 OBTENER CONFIGURACIÓN DE LA EMPRESA ACTIVA
// =======================================================
// 👉 Admin / Superadmin
router.get(
  "/",
  verifyToken,
  permitRoles("admin", "superadmin"),
  ctrl.obtenerConfigEmpresa
);

// =======================================================
// 💾 GUARDAR / ACTUALIZAR CONFIGURACIÓN
// =======================================================
// 👉 Admin / Superadmin
router.post(
  "/",
  verifyToken,
  permitRoles("admin", "superadmin"),
  ctrl.guardarConfigEmpresa
);

module.exports = router;
