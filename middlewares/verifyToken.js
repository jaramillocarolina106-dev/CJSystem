const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

module.exports = async function (req, res, next) {
  try {
    let token = req.cookies?.token;

    // Backup por header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    // 🔥 VALIDACIÓN FUERTE
    if (
      !token ||
      typeof token !== "string" ||
      token.split(".").length !== 3
    ) {
      return res.status(401).json({ msg: "Token malformado" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    if (!user.activo) {
      return res.status(403).json({ msg: "Usuario desactivado" });
    }

if (user.debeCambiarPassword) {
  return res.status(403).json({
    requiereCambioPassword: true,
    msg: "Debes cambiar tu contraseña antes de continuar"
  });
}

    let empresaFinal = user.empresa || null;

    
   const empresaHeader = req.headers["x-empresa-activa"];

if (
  user.rol === "superadmin" &&
  empresaHeader &&
  empresaHeader !== "undefined" &&          // 🔥 CLAVE
  empresaHeader !== "null" &&
  mongoose.Types.ObjectId.isValid(empresaHeader)
) {
  empresaFinal = empresaHeader;
}


    req.user = {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      empresa: empresaFinal
        ? new mongoose.Types.ObjectId(empresaFinal)
        : null
    };

    next();
  } catch (err) {
    console.error("❌ verifyToken error:", err.message);
    return res.status(401).json({ msg: "Token inválido o expirado" });
  }
};
