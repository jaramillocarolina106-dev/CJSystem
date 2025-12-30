const Empresa = require("../models/Empresa");

exports.obtenerBranding = async (req, res) => {
  try {
    const empresaId = req.user.empresa;

    const empresa = await Empresa.findById(empresaId).lean();

    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

    res.json({
      nombreVisible: empresa.branding?.nombreVisible || empresa.nombre,

      // 🔥 AHORA LOGO DESDE ARCHIVO
      logoPath: empresa.branding?.logoPath || "",

      colorPrimario: empresa.branding?.colorPrimario || "#4b7bff",
      colorSecundario: empresa.branding?.colorSecundario || "#8eaaff"
    });

  } catch (err) {
    console.error("❌ Error obtener branding:", err);
    res.status(500).json({ msg: "Error obteniendo branding" });
  }
};
