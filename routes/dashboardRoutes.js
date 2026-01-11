const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");
const requireEmpresaActiva = require("../middlewares/requireEmpresaActiva");
const { dashboardEmpresa } = require("../controllers/dashboardController");

// DASHBOARD UNIVERSAL
router.get(
  "/",
  verifyToken,
permitRoles("admin", "agente", "superadmin"),
dashboardEmpresa
);


module.exports = router;
