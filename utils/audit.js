// utils/audit.js
const AuditLog = require("../models/AuditLog");
const Empresa = require("../models/Empresa");

module.exports = async ({ req, accion, detalle, severidad = "media" }) => {
  try {
    // =========================
    // 🌐 IP REAL DEL CLIENTE
    // =========================
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;

    const userAgent = req.headers["user-agent"] || "—";

    // =========================
    // 🏢 EMPRESA REAL
    // =========================
    let empresaData = null;

    if (req.user?.empresa) {
      const empresa = await Empresa.findById(req.user.empresa).lean();
      if (empresa) {
        empresaData = {
          id: empresa._id,
          nombre: empresa.nombre
        };
      }
    }

    await AuditLog.create({
      accion,
      detalle,
      severidad,

      usuario: req.user
  ? {
      id: req.user.id,
      nombre: req.user.nombre,
      email: req.user.email,
      rol: req.user.rol
    }
  : null,


      empresa: empresaData,
      ip,
      userAgent
    });

  } catch (err) {
    console.error("❌ Error audit log:", err.message);
  }
};
