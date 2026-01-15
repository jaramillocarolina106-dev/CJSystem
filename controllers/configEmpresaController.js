// =======================================================
// ⚙️ CONFIGURACIÓN POR EMPRESA — CJSystem HelpDesk SaaS
// =======================================================

const ConfigEmpresa = require("../models/ConfigEmpresa");


const getEmpresaId = (req, res) => {
  const empresaHeader = req.headers["x-empresa-activa"];
  let empresaId = null;

 
  if (["admin", "superadmin"].includes(req.user?.rol)) {
    empresaId = empresaHeader || null;
  } 
  
  else {
    empresaId = req.user?.empresa || null;
  }

  if (!empresaId || empresaId === "null") {
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
  horarioSemanal,
  trabajaFestivos: req.body.trabajaFestivos ?? false
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

