// routes/auditRoutes.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");

const {
  listarAuditoria,
  exportarExcel,
  exportarPDF,
  dashboardAuditoria,
  dashboardAuditoriaEmpresa
} = require("../controllers/auditController");

// ============================================================
// 📜 LISTAR AUDITORÍA
// GET /api/audit
// ============================================================
router.get(
  "/",
  verifyToken,
  permitRoles("superadmin"),
  listarAuditoria
);

// ============================================================
// 📊 EXPORTAR
// ============================================================
router.get(
  "/export/excel",
  verifyToken,
  permitRoles("superadmin"),
  exportarExcel
);

router.get(
  "/export/pdf",
  verifyToken,
  permitRoles("superadmin"),
  exportarPDF
);

// ============================================================
// 📊 DASHBOARD GLOBAL
// ============================================================
router.get(
  "/dashboard",
  verifyToken,
  permitRoles("superadmin"),
  dashboardAuditoria
);

// ============================================================
// 📊 DASHBOARD POR EMPRESA
// ============================================================
router.get(
  "/empresa/:empresaId/dashboard",
  verifyToken,
  permitRoles("superadmin"),
  dashboardAuditoriaEmpresa
);

module.exports = router;
