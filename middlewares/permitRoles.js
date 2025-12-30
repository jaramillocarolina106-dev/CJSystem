// ==========================================================
// 🎫 PERMISOS POR ROL — CJSystem HelpDesk SaaS
// ==========================================================
module.exports = function (...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: "Usuario no autenticado" });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        msg: "No tienes permiso para realizar esta acción"
      });
    }

    next();
  };
};
