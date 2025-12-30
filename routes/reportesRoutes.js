const express = require("express");
const router = express.Router();
const permitRoles = require("../middlewares/permitRoles");
const verifyToken = require("../middlewares/verifyToken");

// 🔵 GLOBAL (superadmin)
const {
  reporteGlobalPDF,
  reporteGlobalExcel
} = require("../controllers/reportesGlobalController");

// 🟢 EMPRESA
const {
  reporteEmpresaPDF
} = require("../controllers/reportesController");

/* =====================================================
   📄 PDF GLOBAL (solo superadmin)
===================================================== */
router.get(
  "/global/pdf",
  verifyToken,
  permitRoles("superadmin"),
  reporteGlobalPDF
);

/* =====================================================
   📊 EXCEL GLOBAL (solo superadmin)
===================================================== */
router.get(
  "/global/excel",
  verifyToken,
  permitRoles("superadmin"),
  reporteGlobalExcel
);

/* =====================================================
   📄 PDF POR EMPRESA
===================================================== */
router.get(
  "/empresa/pdf",
  verifyToken,
  permitRoles("admin", "superadmin"),
  reporteEmpresaPDF
);

module.exports = router;
