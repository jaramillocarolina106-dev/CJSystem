const express = require("express");
const router = express.Router();

// 🔐 Middlewares
const verifyToken = require("../middlewares/verifyToken");
const onlySuperadmin = require("../middlewares/onlySuperadmin");

// 📦 Controllers
const {
  listarEmpresas,
  crearEmpresa,
  entrarEmpresa
} = require("../controllers/empresaController");

// 🎨 Branding
const uploadBranding = require("../middlewares/uploadBranding");
const { subirLogoEmpresa } = require("../controllers/brandingController");

/* ======================================================
   📋 LISTAR EMPRESAS (SUPERADMIN)
====================================================== */
router.get(
  "/empresas",
  verifyToken,
  onlySuperadmin,
  listarEmpresas
);

/* ======================================================
   ➕ CREAR EMPRESA (SUPERADMIN)
====================================================== */
router.post(
  "/empresas/crear",
  verifyToken,
  onlySuperadmin,
  crearEmpresa
);

/* ======================================================
   🖼️ SUBIR LOGO EMPRESA
====================================================== */
router.put(
  "/empresas/:id/branding/logo",
  verifyToken,
  onlySuperadmin,
  uploadBranding.single("logo"),
  subirLogoEmpresa
);

/* ======================================================
   🚪 ENTRAR A EMPRESA (SUPERADMIN)
====================================================== */
router.post(
  "/empresas/:id/entrar",
  verifyToken,
  onlySuperadmin,
  entrarEmpresa
);

module.exports = router;
