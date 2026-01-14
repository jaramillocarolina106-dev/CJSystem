const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");

const {
  dashboardEmpresa,
  dashboardAgente,
  dashboardUsuario
} = require("../controllers/dashboardController");


// ===============================
// DASHBOARD EMPRESA (ADMIN / SUPERADMIN)
// ===============================
router.get(
  "/",
  verifyToken,
  permitRoles("admin", "superadmin"),
  dashboardEmpresa
);

// ===============================
// DASHBOARD AGENTE
// ===============================
router.get(
  "/agente",
  verifyToken,
  permitRoles("agente"),
  dashboardAgente
);
// ===============================
// DASHBOARD USUARIO
// ===============================
router.get(
  "/usuario",
  verifyToken,
  permitRoles("usuario"),
  dashboardUsuario
);

module.exports = router;
