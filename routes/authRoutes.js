// routes/authRoutes.js
const express = require("express");
const AuditLog = require("../models/AuditLog");
const router = express.Router();

const {
  registrar,
  login,
  listarUsuarios,
  perfil,
  registerSuperadmin,
  resetPasswordAdmin,
  cambiarPasswordObligatorio
} = require("../controllers/authController");


const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");

// ==============================
// RUTAS DE PRUEBA
// ==============================
router.get("/login", (req, res) => {
  res.send("👋 Ruta LOGIN funcionando. Usa POST.");
});

router.get("/register", (req, res) => {
  res.send("👋 Ruta REGISTER funcionando. Usa POST.");
});

// ==============================
// RUTAS REALES
// ==============================

// LOGIN
router.post("/login", login);

// REGISTRO USUARIO (admin / superadmin)
router.post(
  "/register",
  verifyToken,
  permitRoles("superadmin", "admin"),
  registrar
);

// PERFIL
router.get("/perfil", verifyToken, perfil);

router.put(
  "/usuarios/:id",
  verifyToken,
  permitRoles("admin", "superadmin"),
  async (req, res) => {
    try {
      const User = require("../models/User");
      const { activo } = req.body;

      const usuario = await User.findById(req.params.id);

      if (!usuario) {
        return res.status(404).json({ msg: "Usuario no encontrado" });
      }

      // 🔒 NO AUTO-DESACTIVARSE
      if (req.user.id.toString() === usuario._id.toString()) {
        return res
          .status(403)
          .json({ msg: "No puedes desactivarte a ti mismo" });
      }

      // 👑 BLOQUEO SUPERADMIN
      if (usuario.rol === "superadmin") {
        return res
          .status(403)
          .json({ msg: "No se puede desactivar el superadmin" });
      }

      // ✅ CAMBIO DE ESTADO
      usuario.activo = activo;
      await usuario.save();

      // 🧾 AUDITORÍA
      await AuditLog.create({
        accion: activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO",
        detalle: `Usuario ${usuario.email}`,
        severidad: "alta",
        usuario: {
          id: req.user.id,
          nombre: req.user.nombre,
          rol: req.user.rol
        },
        empresa: {
          id: req.user.empresa,
          nombre: "-"
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      });

      // ✅ RESPUESTA FINAL (SOLO UNA)
      res.json({ msg: "Estado del usuario actualizado" });

    } catch (err) {
      console.error("❌ Error actualizando usuario:", err);
      res.status(500).json({ msg: "Error interno" });
    }
  }
);


router.put(
  "/usuarios/:id/reset-password",
  verifyToken,
  permitRoles("admin", "superadmin"),
  resetPasswordAdmin
);

router.post("/cambiar-password-obligatorio", cambiarPasswordObligatorio);


// REGISTRO INICIAL SUPERADMIN (solo dev)
router.post("/register-superadmin", registerSuperadmin);

module.exports = router;
