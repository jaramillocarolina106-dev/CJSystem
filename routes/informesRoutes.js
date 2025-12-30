const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");

const reporte = require("../controllers/informesController");

// Solo admin/superadmin
const soloAdmin = permitRoles("admin", "superadmin");

// PDF mensual ejecutivo
router.get("/pdf/mensual", verifyToken, soloAdmin, reporte.informeMensualPDF);

// Excel completo
router.get("/excel/tickets", verifyToken, soloAdmin, reporte.informeExcelTickets);

// Productividad por agente
router.get("/agentes", verifyToken, soloAdmin, reporte.productividadAgentes);

// SLA
router.get("/sla", verifyToken, soloAdmin, reporte.informeSLA);

// PDF detallado ticket
router.get("/ticket/:id/pdf", verifyToken, soloAdmin, reporte.ticketPDF);

// ZIP adjuntos
router.get("/ticket/:id/zip", verifyToken, soloAdmin, reporte.zipAdjuntos);

// Datos para BI
router.get("/bi", verifyToken, soloAdmin, reporte.informeBI);

module.exports = router;
