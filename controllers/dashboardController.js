const Empresa = require("../models/Empresa");
const { getDashboardMetrics } = require("../services/dashboardMetrics");

// ===============================
// DASHBOARD EMPRESA
// ===============================
exports.dashboardEmpresa = async (req, res) => {
  try {
    // 🏢 EMPRESA YA RESUELTA POR MIDDLEWARE
    const empresaId = req.user.empresa;

    // ===============================
    // 🎯 FILTROS
    // ===============================
    const filtros = {};
    let tipoFiltro = "normal";

    if (req.query.hoy === "1") {
      tipoFiltro = "hoy";
      filtros.desde = new Date(new Date().setHours(0, 0, 0, 0));
      filtros.hasta = new Date();
    } 
    else if (req.query.semana === "1") {
      tipoFiltro = "semana";
      filtros.desde = new Date(Date.now() - 7 * 86400000);
      filtros.hasta = new Date();
    } 
    else if (req.query.mes === "1") {
      tipoFiltro = "mes";
      filtros.desde = new Date(Date.now() - 30 * 86400000);
      filtros.hasta = new Date();
    } 
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

    return res.json(metrics);

  } catch (err) {
    console.error("❌ Error dashboard empresa:", err);

    if (err.message?.includes("empresaId inválido")) {
      return res.status(400).json({ msg: err.message });
    }

    return res.status(500).json({
      msg: "Error interno del dashboard"
    });
  }
};
