// middlewares/verifyEmpresaActiva.js
const Empresa = require("../models/Empresa");

module.exports = async (req, res, next) => {
  try {
    if (!req.user || !req.user.empresa) {
      return res.status(401).json({
        msg: "Usuario sin empresa asociada"
      });
    }

    const empresa = await Empresa.findById(req.user.empresa);

    if (!empresa || !empresa.activa) {
      return res.status(403).json({
        msg: "Empresa inactiva. Contacta al administrador."
      });
    }

    next();

  } catch (err) {
    console.error("❌ Error verifyEmpresaActiva:", err);
    res.status(500).json({ msg: "Error validando empresa" });
  }
};
