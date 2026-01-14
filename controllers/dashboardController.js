const Ticket = require("../models/Ticket");
const Empresa = require("../models/Empresa");
const { getDashboardMetrics } = require("../services/dashboardMetrics");

// ===============================
// DASHBOARD EMPRESA
// ===============================
exports.dashboardEmpresa = async (req, res) => {
  try {
    const empresaId = req.user.empresa;

    const filtros = {};
    let tipoFiltro = "normal";

    if (req.query.hoy === "1") {
      tipoFiltro = "hoy";
      filtros.desde = new Date(new Date().setHours(0, 0, 0, 0));
      filtros.hasta = new Date();
    } else if (req.query.semana === "1") {
      tipoFiltro = "semana";
      filtros.desde = new Date(Date.now() - 7 * 86400000);
      filtros.hasta = new Date();
    } else if (req.query.mes === "1") {
      tipoFiltro = "mes";
      filtros.desde = new Date(Date.now() - 30 * 86400000);
      filtros.hasta = new Date();
    } else if (req.query.desde && req.query.hasta) {
      tipoFiltro = "rango";
      filtros.desde = new Date(req.query.desde);
      filtros.hasta = new Date(req.query.hasta);
    }

    const metrics = await getDashboardMetrics(
      empresaId,
      filtros,
      tipoFiltro
    );

    return res.json(metrics);

  } catch (err) {
    console.error("❌ Error dashboard empresa:", err);
    return res.status(500).json({ msg: "Error interno del dashboard" });
  }
};

// ============================================================
// 📊 DASHBOARD AGENTE
// ============================================================
exports.dashboardAgente = async (req, res) => {
  try {
    if (req.user.rol !== "agente") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresaId = req.user.empresa;
    const agenteId = req.user.id;

    const tickets = await Ticket.find({
      empresa: empresaId,
      asignadoA: agenteId
    });

    const data = {
      asignados: tickets.length,
      abiertos: tickets.filter(t => t.estado === "abierto").length,
      en_progreso: tickets.filter(t => t.estado === "en_progreso").length,
      cerrados: tickets.filter(t => t.estado === "cerrado").length
    };

    res.json(data);

  } catch (err) {
    console.error("❌ Error dashboard agente:", err);
    res.status(500).json({ msg: "Error cargando dashboard agente" });
  }
};
// ============================================================
// 📊 DASHBOARD USUARIO
// ============================================================
exports.dashboardUsuario = async (req, res) => {
  try {
    if (req.user.rol !== "usuario") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresaId = req.user.empresa;
    const usuarioId = req.user.id;

    const tickets = await Ticket.find({
      empresa: empresaId,
      creadoPor: usuarioId
    });

    const data = {
      abiertos: tickets.filter(t => t.estado === "abierto").length,
      en_progreso: tickets.filter(t => t.estado === "en_progreso").length,
      cerrados: tickets.filter(t => t.estado === "cerrado").length,
      total: tickets.length
    };

    res.json(data);

  } catch (err) {
    console.error("❌ Error dashboard usuario:", err);
    res.status(500).json({ msg: "Error cargando dashboard usuario" });
  }
};
