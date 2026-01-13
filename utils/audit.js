// utils/audit.js
const AuditLog = require("../models/AuditLog");
const Empresa = require("../models/Empresa");

/**
 * 📌 Registro de auditoría centralizado
 * Uso:
 * await audit({
 *   req,
 *   accion: "RESET_PASSWORD_ADMIN",
 *   detalle: "Admin restableció contraseña",
 *   severidad: "alta" // opcional
 * });
 */
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
const rawIp =
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  "—";

// Normalizar SOLO IPv4 mapeada (::ffff:)
let ip = rawIp;
if (typeof ip === "string" && ip.startsWith("::ffff:")) {
  ip = ip.replace("::ffff:", "");
}



    const userAgent =
      req.headers["user-agent"] || "—";

    /* =========================
       👤 SNAPSHOT DE USUARIO
    ========================= */
    const usuarioData = req.user
      ? {
          id: req.user.id,
          nombre: req.user.nombre,
          email: req.user.email,
          rol:
            req.user.rol === "cliente"
              ? "usuario"
              : req.user.rol
        }
      : null;

/* =========================
   🏢 SNAPSHOT DE EMPRESA (MULTI-EMPRESA REAL)
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
  ipRaw: rawIp, 

  userAgent
});



  } catch (err) {
    // ❗ La auditoría NUNCA debe romper el flujo principal
    console.error("❌ Error audit log:", err.message);
  }
};
