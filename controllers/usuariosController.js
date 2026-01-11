// ============================================================
// 👥 USUARIOS CONTROLLER — CJSystem HelpDesk SaaS
// ============================================================

const User = require("../models/User");

// ============================================================
// 🧠 UTIL — EMPRESA ACTIVA (HEADER-BASED)
// ============================================================
const getEmpresaId = (req, res) => {
  let empresaId = req.user?.empresa;
  const empresaHeader = req.headers["x-empresa-activa"];

  if (
    empresaHeader &&
    empresaHeader !== "null" &&
    req.user?.rol !== "superadmin"
  ) {
    res.status(403).json({ msg: "No autorizado" });
    return null;
  }

  if (
    req.user?.rol === "superadmin" &&
    empresaHeader &&
    empresaHeader !== "null"
  ) {
    empresaId = empresaHeader;
  }

  if (!empresaId || empresaId === "null") {
    res.status(400).json({ msg: "Empresa no definida" });
    return null;
  }

  return empresaId;
};



/**
 * ============================================================
 * 👤 LISTAR USUARIOS INTERNOS (ESCALADO)
 * 👉 Usado para: escalar ticket a usuario interno
 * Roles permitidos: agente, admin, superadmin
 * ============================================================
 */
exports.listarUsuariosInternosEscalado = async (req, res) => {
  if (!["agente", "admin", "superadmin"].includes(req.user.rol)) {
  return res.status(403).json({ msg: "No autorizado" });
}

  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const usuarios = await User.find({
      empresa: empresaId,
      rol: { $in: ["agente", "admin"] },
      activo: { $ne: false }
    })
      .select("_id nombre email rol")
      .sort({ nombre: 1 });

    res.json(usuarios);

  } catch (err) {
    console.error("❌ Error usuarios escalado:", err);
    res.status(500).json({ msg: "Error cargando usuarios internos" });
  }
};


/**
 * ============================================================
 * 👥 LISTAR AGENTES DE LA EMPRESA
 * 👉 Usado para: asignar ticket (admin / superadmin)
 * ============================================================
 */
exports.listarAgentesEmpresa = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const agentes = await User.find({
      empresa: empresaId,
      rol: "agente",
      activo: { $ne: false }
    })
      .select("_id nombre email")
      .sort({ nombre: 1 });

    res.json(agentes);

  } catch (err) {
    console.error("❌ Error listar agentes:", err);
    res.status(500).json({ msg: "Error cargando agentes" });
  }
};

/**
 * ============================================================
 * 👥 LISTAR USUARIOS (ADMIN PANEL)
 * 👉 Usado en: usuarios.html
 * ============================================================
 */
exports.listarUsuariosEmpresa = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.rol)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const usuarios = await User.find({
      empresa: empresaId,
      activo: { $ne: false }
    })
      .select("_id nombre email rol activo createdAt")
      .sort({ createdAt: -1 });

    res.json(usuarios);

  } catch (err) {
    console.error("❌ Error listar usuarios:", err);
    res.status(500).json({ msg: "Error cargando usuarios" });
  }
};

/**
 * ============================================================
 * 👥 LISTAR USUARIOS FINALES (AGENTE / ADMIN)
 * 👉 Usado para: crear ticket por otro usuario
 * ============================================================
 */
exports.listarUsuariosFinalesEmpresa = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    // 🔐 Permisos
    if (!["agente", "admin", "superadmin"].includes(req.user.rol)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

   const usuarios = await User.find({
  empresa: empresaId,
  rol: "usuario",
  activo: { $ne: false }
})
      .select("_id nombre email")
      .sort({ nombre: 1 });

    res.json(usuarios);

  } catch (err) {
    console.error("❌ Error listar usuarios finales:", err);
    res.status(500).json({ msg: "Error cargando usuarios finales" });
  }
};

