// ============================================================
// 👥 USUARIOS CONTROLLER — CJSystem HelpDesk SaaS
// ============================================================

const User = require("../models/User");

/**
 * 🧠 Util — obtener empresa activa desde req.user
 */
const getEmpresaId = (req, res) => {
  const empresaId = req.user?.empresa;
  if (!empresaId) {
    res.status(400).json({ msg: "Usuario sin empresa activa" });
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
      rol: { $in: ["cliente", "usuario"] },
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
/**
 * ============================================================
 * 👤 LISTAR USUARIOS FINALES (CLIENTES)
 * 👉 Usado por: admin y agente al crear ticket
 * ============================================================
 */
exports.listarUsuariosFinales = async (req, res) => {
  try {
    const empresaId = req.user.empresa;
    if (!empresaId) {
      return res.status(400).json({ msg: "Usuario sin empresa" });
    }

    const usuarios = await User.find({
      empresa: empresaId,
      rol: "cliente",
      activo: { $ne: false }
    })
      .select("_id nombre email")
      .sort({ nombre: 1 });

    res.json(usuarios);

  } catch (err) {
    console.error("❌ Error usuarios finales:", err);
    res.status(500).json({ msg: "Error cargando usuarios" });
  }
};
