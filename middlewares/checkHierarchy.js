// ==========================================================
// 🏆 CONTROL DE JERARQUÍA — CJSystem
// superadmin > admin > agente > cliente
// ==========================================================

const niveles = {
  superadmin: 4,
  admin: 3,
  agente: 2,
  cliente: 1
};

module.exports = function (rolObjetivo) {
  return (req, res, next) => {
    const rolUsuario = req.user.rol;

    if (niveles[rolUsuario] < niveles[rolObjetivo]) {
      return res.status(403).json({
        msg: "Tu rol no tiene jerarquía suficiente",
        tuRol: rolUsuario,
        objetivo: rolObjetivo
      });
    }

    next();
  };
};
