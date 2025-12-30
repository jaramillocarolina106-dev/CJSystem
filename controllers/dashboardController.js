const Empresa = require("../models/Empresa");
const { getDashboardMetrics } = require("../services/dashboardMetrics");


// ===============================
// DASHBOARD EMPRESA (ADMIN / AGENTE / SUPERADMIN)
// ===============================
exports.dashboardEmpresa = async (req, res) => {
  try {

    // ===============================
    // 🏢 EMPRESA ACTIVA
    // ===============================
    let empresaId = req.user.empresa;

if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
  empresaId = req.cookies.empresaActiva;
}


    if (!empresaId) {
      return res.status(400).json({ msg: "No hay empresa activa" });
    }

    // ===============================
    // 🎯 FILTROS
    // ===============================
   const filtros = {};
let tipoFiltro = "normal";

// 🔹 HOY
if (req.query.hoy === "1") {
  tipoFiltro = "hoy";
  filtros.desde = new Date(new Date().setHours(0,0,0,0));
  filtros.hasta = new Date();
}

// 🔹 SEMANA
else if (req.query.semana === "1") {
  tipoFiltro = "semana";
  filtros.desde = new Date(Date.now() - 7 * 86400000);
  filtros.hasta = new Date();
}

// 🔹 30 DÍAS
else if (req.query.mes === "1") {
  tipoFiltro = "mes";
  filtros.desde = new Date(Date.now() - 30 * 86400000);
  filtros.hasta = new Date();
}

// 🔹 RANGO PERSONALIZADO (SOLO AQUÍ ES RANGO)
else if (req.query.desde && req.query.hasta) {
  tipoFiltro = "rango";
  filtros.desde = new Date(req.query.desde);
  filtros.hasta = new Date(req.query.hasta);
}
// ===============================
// 🚀 MÉTRICAS
// ===============================
const metrics = await getDashboardMetrics(
  empresaId,
  filtros,
  tipoFiltro
);

res.json(metrics);


  } catch (err) {
    console.error("❌ Error dashboard empresa:", err);
    res.status(500).json({ msg: "Error dashboard empresa" });
  }
};
