// =====================================================
// 📌 RUTAS DE EMPRESAS — CJSystem HelpDesk
// =====================================================

const express = require("express");
const router = express.Router();
const Empresa = require("../models/Empresa");

const empresaCtrl = require("../controllers/empresaController");
const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");
const uploadLogo = require("../middlewares/uploadLogo");


// =====================================================
// 🔵 RUTAS DE PRUEBA — para abrir desde navegador
// =====================================================
router.get("/test", (req, res) => {
  res.send("👋 Ruta EMPRESAS funcionando correctamente 💙");
});

// Ruta pública informativa
router.get("/info", (req, res) => {
  res.send("📂 Módulo de empresas activo. Usa rutas protegidas para gestionar empresas.");
});


// =====================================================
// 🌐 EMPRESAS PÚBLICAS — LOGIN
// =====================================================
router.get("/public", async (req, res) => {
  try {
    const empresas = await Empresa.find(
      { activo: { $ne: false } }, // solo activas (opcional)
      "_id nombre"
    ).sort({ nombre: 1 });

    res.json(empresas);
  } catch (err) {
    console.error("❌ Error empresas públicas:", err);
    res.status(500).json({ msg: "Error obteniendo empresas" });
  }
});

// =====================================================
// 🔐 RUTAS PROTEGIDAS
// =====================================================

// CREAR EMPRESA — Solo superadmin
router.post(
  "/crear",
  verifyToken,
  permitRoles("superadmin"),
  empresaCtrl.crearEmpresa
);

// LISTAR EMPRESAS — Solo superadmin
router.get(
  "/",
  verifyToken,
  permitRoles("superadmin"),
  empresaCtrl.obtenerEmpresas
);

// VER EMPRESA — Admin o Superadmin
router.get(
  "/:id",
  verifyToken,
  permitRoles("admin", "superadmin"),
  empresaCtrl.obtenerEmpresa
);

// EDITAR EMPRESA — Admin o Superadmin
router.put(
  "/:id",
  verifyToken,
  permitRoles("admin", "superadmin"),
  empresaCtrl.editarEmpresa
);

// =====================================================
// 🎨 BRANDING DE EMPRESA — Solo superadmin
// =====================================================
router.get(
  "/:id/branding",
  verifyToken,
  permitRoles("superadmin"),
  empresaCtrl.obtenerBranding
);

router.put(
  "/:id/branding",
  verifyToken,
  permitRoles("superadmin"),
  uploadLogo.single("logo"), // ⬅️ AQUÍ VA MULTER
  empresaCtrl.guardarBranding
);

module.exports = router;
