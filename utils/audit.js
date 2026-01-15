// utils/audit.js
const AuditLog = require("../models/AuditLog");
const Empresa = require("../models/Empresa");
const getRealClientIP = require("./getRealClientIP");
const getGeoFromIP = require("./geo");

module.exports = async ({ req, accion, detalle, severidad = "media" }) => {
  try {
    /* =========================
       🔧 NORMALIZAR ACCIÓN
    ========================= */
    const accionFinal = accion?.toUpperCase?.() || "ACCION_DESCONOCIDA";

    /* =========================
       🔥 SEVERIDAD AUTOMÁTICA
    ========================= */
    const severidadPorAccion = {
      RESET_PASSWORD_ADMIN: "alta",
      BLOQUEO_PASSWORD: "alta",
      CAMBIO_PASSWORD_USUARIO: "media",
      LOGIN_FALLIDO: "media",
      USUARIO_DESACTIVADO: "alta"
    };

    const severidadFinal =
      severidadPorAccion[accionFinal] || severidad;

    /* =========================
       🌐 IP REAL DEL CLIENTE
    ========================= */
    let ip = getRealClientIP(req);

if (typeof ip === "string" && ip.startsWith("::ffff:")) {
  ip = ip.replace("::ffff:", "");
}

const ipRaw =
  req.headers["x-forwarded-for"] ||
  req.socket?.remoteAddress ||
  "—";


    /* =========================
       🌍 GEOLOCALIZACIÓN
    ========================= */
    const geo = getGeoFromIP(ip);

    /* =========================
       🧠 USER AGENT
    ========================= */
    const userAgent = req.headers["user-agent"] || "—";

    /* =========================
       👤 SNAPSHOT DE USUARIO
    ========================= */
    const usuarioData = req.user
      ? {
          id: req.user.id,
          nombre: req.user.nombre,
          email: req.user.email,
          rol: req.user.rol === "cliente" ? "usuario" : req.user.rol
        }
      : null;

    /* =========================
       🏢 SNAPSHOT DE EMPRESA
    ========================= */
    let empresaId =
      req.headers["x-empresa-activa"] &&
      req.headers["x-empresa-activa"] !== "null"
        ? req.headers["x-empresa-activa"]
        : req.user?.empresa || null;

    let empresaData = null;

    if (empresaId) {
      const empresa = await Empresa.findById(empresaId).lean();
      if (empresa) {
        empresaData = {
          id: empresa._id,
          nombre: empresa.nombre
        };
      }
    }

    /* =========================
       🧾 GUARDAR AUDITORÍA
    ========================= */
 await AuditLog.create({
  accion: accionFinal,
  detalle,
  severidad: severidadFinal,
  usuario: usuarioData,
  empresa: empresaData,

  ip,
  ipRaw,

  userAgent
});


  } catch (err) {
    console.error("❌ Error audit log:", err.message);
  }
};
