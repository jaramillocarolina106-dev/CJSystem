// =======================================================
// ⚙️ CONFIGURACIÓN POR EMPRESA — CJSystem HelpDesk SaaS
// =======================================================

const ConfigEmpresa = require("../models/ConfigEmpresa");

// =======================================================
// 🧠 UTIL — EMPRESA ACTIVA
// =======================================================
const getEmpresaId = (req, res) => {
  let empresaId = req.user?.empresa;

  if (req.user.rol === "superadmin" && req.cookies?.empresaActiva) {
    empresaId = req.cookies.empresaActiva;
  }

  if (!empresaId) {
    res.status(400).json({ msg: "No hay empresa activa" });
    return null;
  }

  return empresaId;
};

// =======================================================
// 📥 OBTENER CONFIGURACIÓN
// =======================================================
exports.obtenerConfigEmpresa = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const config = await ConfigEmpresa.findOne({ empresa: empresaId }).lean();

    // 🆕 CONFIG POR DEFECTO (NO CREA REGISTRO)
    if (!config) {
      return res.json({
  sla: { alta: null, media: null, baja: null },
  tipoHorario: "lv", 
  horarioSemanal: {
    lunes:     { activo: true,  inicio: "08:00", fin: "17:00" },
    martes:    { activo: true,  inicio: "08:00", fin: "17:00" },
    miercoles: { activo: true,  inicio: "08:00", fin: "17:00" },
    jueves:    { activo: true,  inicio: "08:00", fin: "17:00" },
    viernes:   { activo: true,  inicio: "08:00", fin: "16:00" },
    sabado:    { activo: false, inicio: null,    fin: null },
    domingo:   { activo: false, inicio: null,    fin: null }
  },
  trabajaFestivos: false
});

    }

   res.json({
  sla: config.sla,
  tipoHorario: config.tipoHorario,
  horarioSemanal: config.horarioSemanal,
  trabajaFestivos: config.trabajaFestivos
});

  } catch (err) {
    console.error("❌ Error obtener config empresa:", err);
    res.status(500).json({ msg: "Error obteniendo configuración" });
  }
};

// =======================================================
// 💾 GUARDAR / ACTUALIZAR CONFIGURACIÓN
// =======================================================
exports.guardarConfigEmpresa = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const { sla = {}, horarioSemanal = {}, tipoHorario } = req.body;

    const update = {
  empresa: empresaId,
  tipoHorario: tipoHorario || "24x7",
  sla: {
    alta: sla.alta ?? null,
    media: sla.media ?? null,
    baja: sla.baja ?? null
  },
  horarioSemanal
};


    const config = await ConfigEmpresa.findOneAndUpdate(
      { empresa: empresaId },
      update,
      { upsert: true, new: true }
    );

    res.json({
      msg: "Configuración guardada correctamente",
      config
    });

  } catch (err) {
    console.error("❌ Error guardar config empresa:", err);
    res.status(500).json({ msg: "Error guardando configuración" });
  }
};
