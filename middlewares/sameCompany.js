// ==========================================================
// 🏢 VALIDAR MISMA EMPRESA — CJSystem HelpDesk SaaS
// ==========================================================
const Ticket = require("../models/Ticket");

module.exports = async function (req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "No autenticado" });
    }

    const usuario = req.user;

    // superadmin puede acceder siempre
    if (usuario.rol === "superadmin") return next();

    if (!usuario.empresa) {
      return res.status(403).json({
        msg: "Usuario sin empresa asociada"
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ msg: "Ticket no encontrado" });
    }

    if (String(ticket.empresa) !== String(usuario.empresa)) {
      return res.status(403).json({
        msg: "No puedes acceder a tickets de otra empresa"
      });
    }

    next();

  } catch (err) {
    console.error("❌ Error sameCompany:", err);
    return res.status(500).json({ msg: "Error validando empresa" });
  }
};
