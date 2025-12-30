const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

module.exports = async function (req, res, next) {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ msg: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    if (!user.activo) {
      return res.status(403).json({ msg: "Usuario desactivado" });
    }

    let empresaFinal = user.empresa;

    // 🔥 SOLO superadmin puede usar empresaActiva
    if (
      user.rol === "superadmin" &&
      req.cookies?.empresaActiva
    ) {
      empresaFinal = req.cookies.empresaActiva;
    }

    // 🧠 NORMALIZACIÓN DE ROL
    const rolNormalizado =
      user.rol === "cliente" ? "usuario" : user.rol;

    req.user = {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: rolNormalizado,
      empresa: new mongoose.Types.ObjectId(empresaFinal)
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ msg: "Token inválido o expirado" });
  }
};
