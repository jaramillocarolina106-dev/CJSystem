// routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  registrar,
  login,
  listarUsuarios,
  perfil,
  registerSuperadmin
} = require("../controllers/authController");

const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");



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

// LISTAR USUARIOS
router.get(
  "/usuarios",
  verifyToken,
  permitRoles("admin", "superadmin"),
  listarUsuarios
);


// ACTIVAR / DESACTIVAR USUARIO
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

      // 🔒 NO AUTO-DESACTIVARSE (FIX REAL)
      if (req.user._id.toString() === usuario._id.toString()) {
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

      usuario.activo = activo;
      await usuario.save();

      res.json({ msg: "Estado del usuario actualizado" });

    } catch (err) {
      console.error("❌ Error actualizando usuario:", err);
      res.status(500).json({ msg: "Error interno" });
    }
  }
);





// REGISTRO INICIAL SUPERADMIN (solo dev)
router.post("/register-superadmin", registerSuperadmin);

module.exports = router;
