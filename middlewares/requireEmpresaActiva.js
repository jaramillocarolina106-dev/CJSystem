module.exports = (req, res, next) => {
  // ===============================
  // 🔵 SUPERADMIN
  // ===============================
  if (req.user?.rol === "superadmin") {
    const empresaHeader = req.headers["x-empresa-activa"];

    if (
      !empresaHeader ||
      empresaHeader === "undefined" ||
      empresaHeader === "null"
    ) {
      return res.status(400).json({
        msg: "Superadmin sin empresa activa"
      });
    }

    // 🔑 NORMALIZAMOS: todo el sistema usa req.user.empresa
    req.user.empresa = empresaHeader;
req.empresaActiva = empresaHeader;


    console.log("🔥 EMPRESA SUPERADMIN OK:", {
      rol: req.user.rol,
      empresa: req.user.empresa
    });

    return next();
  }

  // ===============================
  // 🟢 ADMIN / AGENTE
  // ===============================
  if (!req.user?.empresa) {
    return res.status(400).json({
      msg: "Usuario sin empresa asociada"
    });
  }

  console.log("🔥 EMPRESA USUARIO OK:", {
    rol: req.user.rol,
    empresa: req.user.empresa
  });
  
req.empresaActiva = req.user.empresa;

  next();
};
