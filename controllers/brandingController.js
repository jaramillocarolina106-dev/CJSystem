const Empresa = require("../models/Empresa");

/* =====================================================
   🎨 GUARDAR BRANDING
===================================================== */
exports.guardarBranding = async (req, res) => {
  try {
    const empresaId = req.user.empresa;

    if (!empresaId) {
      return res.status(400).json({
        msg: "No hay empresa activa para guardar branding"
      });
    }

    const update = {
      "branding.nombreVisible": req.body.nombreVisible,
      "branding.colorPrimario": req.body.colorPrimario,
      "branding.colorSecundario": req.body.colorSecundario
    };

    // ✅ LOGO CON MEMORY STORAGE
    if (req.file) {
      const base64Logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      update["branding.logoPath"] = base64Logo;
    }

    await Empresa.findByIdAndUpdate(
      empresaId,
      { $set: update },
      { new: true }
    );

    res.json({ msg: "Branding guardado correctamente" });

  } catch (err) {
    console.error("❌ Error guardar branding:", err);
    res.status(500).json({ msg: "Error guardando branding" });
  }
};
/* =====================================================
   🎨 OBTENER BRANDING (SIEMPRE DEVUELVE ALGO)
===================================================== */
exports.obtenerBranding = async (req, res) => {
  try {
    const empresaId = req.user.empresa;

    if (!empresaId) {
      return res.json({
        nombreVisible: "Mi Empresa",
        logoPath: "",
        colorPrimario: "#4b7bff",
        colorSecundario: "#8eaaff",
        esDefault: true
      });
    }

    const empresa = await Empresa.findById(empresaId).lean();

    if (!empresa) {
      return res.json({
        nombreVisible: "Mi Empresa",
        logoPath: "",
        colorPrimario: "#4b7bff",
        colorSecundario: "#8eaaff",
        esDefault: true
      });
    }

    res.json({
      nombreVisible: empresa.branding?.nombreVisible || empresa.nombre,
      logoPath: empresa.branding?.logoPath || "",
      colorPrimario: empresa.branding?.colorPrimario || "#4b7bff",
      colorSecundario: empresa.branding?.colorSecundario || "#8eaaff",
      esDefault: !empresa.branding
    });

  } catch (err) {
    console.error("❌ Error obtener branding:", err);
    res.status(500).json({ msg: "Error obteniendo branding" });
  }
};
