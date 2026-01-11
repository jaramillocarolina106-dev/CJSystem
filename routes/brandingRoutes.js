const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const requireEmpresaActiva = require("../middlewares/requireEmpresaActiva");
const uploadBranding = require("../middlewares/uploadBranding");

const {
  obtenerBranding,
  guardarBranding
} = require("../controllers/brandingController");

// 🔹 OBTENER BRANDING
router.get(
  "/mi-branding",
  verifyToken,
  requireEmpresaActiva, 
  obtenerBranding
);

// 🔹 GUARDAR BRANDING
router.put(
  "/mi-branding",
  verifyToken,
  requireEmpresaActiva, 
  uploadBranding.single("logo"),
  guardarBranding
);

module.exports = router;
