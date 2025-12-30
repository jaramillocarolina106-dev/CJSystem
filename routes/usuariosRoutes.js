const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");
const usuariosController = require("../controllers/usuariosController");

// 🔹 Escalado
router.get(
  "/internos-escalado",
  verifyToken,
  permitRoles("agente", "admin", "superadmin"),
  usuariosController.listarUsuariosInternosEscalado
);

// 🔹 Asignación (admin)
router.get(
  "/agentes",
  verifyToken,
  permitRoles("admin", "superadmin"),
  usuariosController.listarAgentesEmpresa
);

// 🔹 Panel usuarios
router.get(
  "/",
  verifyToken,
  permitRoles("admin", "superadmin"),
  usuariosController.listarUsuariosEmpresa
);
router.get(
  "/empresa/finales",
  verifyToken,
  usuariosController.listarUsuariosFinalesEmpresa
);


module.exports = router;
