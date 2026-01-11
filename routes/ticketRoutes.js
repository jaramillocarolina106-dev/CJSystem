// =======================================================
// 🚀 RUTAS DE TICKETS — CJSystem HelpDesk SaaS
// =======================================================
const express = require("express");
const router = express.Router();

const Ticket = require("../models/Ticket");
const ctrl = require("../controllers/ticketController");
const verifyToken = require("../middlewares/verifyToken");
const permitRoles = require("../middlewares/permitRoles");
const upload = require("../middlewares/upload");
const { getDashboardMetrics } = require("../services/dashboardMetrics");
const requireEmpresaActiva = require("../middlewares/requireEmpresaActiva");

router.get(
  "/",
  verifyToken,
  permitRoles("admin", "agente", "superadmin"),
  requireEmpresaActiva,
  ctrl.listar
);

// =======================================================
// 👤 MIS TICKETS — USUARIO FINAL
// =======================================================
router.get(
  "/mis-tickets",
  verifyToken,
  permitRoles("usuario"),
  requireEmpresaActiva,
  async (req, res) => {
    try {
      const tickets = await Ticket.find({
        empresa: req.user.empresa,
        creadoPor: req.user.id
      }).sort({ createdAt: -1 });

      res.json(tickets);
    } catch (err) {
      console.error("❌ Error mis tickets usuario:", err);
      res.status(500).json({ msg: "Error cargando tus tickets" });
    }
  }
);


// =======================================================
// 📊 DASHBOARD — ESTADÍSTICAS BÁSICAS
// =======================================================
router.get(
  "/dashboard/estadisticas",
  verifyToken,
  permitRoles("admin", "agente", "superadmin"),
  async (req, res) => {
    try {

      // 🔑 AQUÍ
      let empresaId = req.user.empresa;
      if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
        empresaId = req.cookies.empresaActiva;
      }

      const tickets = await Ticket.find({ empresa: empresaId });

      res.json({
        abiertos: tickets.filter(t => t.estado === "abierto").length,
        progreso: tickets.filter(t => t.estado === "en_progreso").length,
        escalado: tickets.filter(t => t.estado === "escalado").length,
        cerrados: tickets.filter(t => t.estado === "cerrado").length,
        alta: tickets.filter(t => t.prioridad === "alta").length,
        media: tickets.filter(t => t.prioridad === "media").length,
        baja: tickets.filter(t => t.prioridad === "baja").length
      });

    } catch (error) {
      res.status(500).json({ msg: "Error obteniendo estadísticas", error });
    }
  }
);

// =======================================================
// 📊 DASHBOARD PRO — MÉTRICAS COMPLETAS (ADMIN)
// =======================================================
router.get(
  "/dashboard",
  verifyToken,
  permitRoles("admin", "superadmin"),
  async (req, res) => {
    try {
      const empresaId =
  typeof req.user.empresa === "object"
    ? req.user.empresa._id
    : req.user.empresa;


      if (!empresaId) {
        return res.status(400).json({ msg: "Empresa no definida" });
      }

      const metrics = await getDashboardMetrics(
        empresaId,
        {},          // filtros
        "normal"     // tipoFiltro
      );

      res.json(metrics);

    } catch (error) {
      console.error("❌ Error en dashboard:", error);
      res.status(500).json({ msg: "Error en dashboard" });
    }
  }
);



// =======================================================
// 🟢 CREAR TICKET (CON ADJUNTOS)
// =======================================================
router.post(
  "/crear",
  verifyToken,
  upload.array("adjuntos"),
  ctrl.crear
);

// =======================================================
// 📊 SLA POR AGENTE
// =======================================================
router.get(
  "/sla-por-agente",
  verifyToken,
  permitRoles("admin", "agente", "superadmin"),
  async (req, res) => {
    try {
      let empresaId = req.user.empresa;
      if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
        empresaId = req.cookies.empresaActiva;
      }

      const tickets = await Ticket.find({
        empresa: empresaId,
        estado: "cerrado",
        asignadoA: { $ne: null },
        "sla.fechaLimite": { $exists: true }
      }).populate("asignadoA", "nombre");

      const porAgente = {};

      tickets.forEach(t => {
        const agente = t.asignadoA;
        if (!agente) return;

        const id = agente._id.toString();

        if (!porAgente[id]) {
          porAgente[id] = {
            nombre: agente.nombre,
            total: 0,
            enSla: 0,
            vencidos: 0
          };
        }

        porAgente[id].total++;

        if (t.sla?.incumplido) {
          porAgente[id].vencidos++;
        } else {
          porAgente[id].enSla++;
        }
      });

      const resultado = Object.values(porAgente).map(a => ({
        nombre: a.nombre,
        total: a.total,
        enSla: a.enSla,
        vencidos: a.vencidos,
        sla: a.total > 0
          ? Math.round((a.enSla / a.total) * 100)
          : 100
      }));

      res.json(resultado);

    } catch (err) {
      console.error("❌ Error SLA por agente:", err);
      res.status(500).json({ msg: "Error SLA por agente" });
    }
  }
);

// =======================================================
// 🔍 OBTENER TICKET POR ID
// =======================================================
router.get("/:id", verifyToken, ctrl.obtener);

// =======================================================
// 🔄 CAMBIAR ESTADO
// =======================================================
router.put(
  "/estado/:id",
  verifyToken,
  permitRoles("agente", "admin", "superadmin"),
  ctrl.cambiarEstado
);

// =======================================================
// 🔴 ESCALAR TICKET
// =======================================================
router.put(
  "/escalar/:id",
  verifyToken,
  permitRoles("agente", "admin", "superadmin"),
  ctrl.escalarTicket
);


// =======================================================
// 💬 AGREGAR COMENTARIO
// =======================================================
router.post("/comentario/:id", verifyToken, ctrl.comentar);

// =======================================================
// 👤 ASIGNAR AGENTE
// =======================================================
router.put(
  "/asignar/:id",
  verifyToken,
  permitRoles("agente", "admin", "superadmin"),
  ctrl.asignar
);
// =======================================================
// 📊 DASHBOARD AGENTE — SOLO SUS TICKETS
// =======================================================
router.get(
  "/dashboard/agente",
  verifyToken,
  permitRoles("agente"),
  async (req, res) => {
    try {

      // 🔑 AQUÍ
      let empresaId = req.user.empresa;
      if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
        empresaId = req.cookies.empresaActiva;
      }

      const tickets = await Ticket.find({
        empresa: empresaId,
        asignadoA: req.user.id
      });

      res.json({
        asignados: tickets.length,
        abiertos: tickets.filter(t => t.estado === "abierto").length,
        en_progreso: tickets.filter(t => t.estado === "en_progreso").length,
        cerrados: tickets.filter(t => t.estado === "cerrado").length
      });

    } catch (err) {
      res.status(500).json({ msg: "Error dashboard agente" });
    }
  }
);



// =======================================================
// 📊 DASHBOARD USUARIO — SOLO SUS TICKETS
// =======================================================
router.get(
  "/dashboard/usuario",
  verifyToken,
  async (req, res) => {
    try {
      if (req.user.rol !== "usuario") {
        return res.status(403).json({ msg: "No autorizado" });
      }

      let empresaId = req.user.empresa;
      if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
        empresaId = req.cookies.empresaActiva;
      }

      const tickets = await Ticket.find({
        empresa: empresaId,
        creadoPor: req.user.id
      });

      res.json({
        abiertos: tickets.filter(t => t.estado === "abierto").length,
        en_progreso: tickets.filter(t => t.estado === "en_progreso").length,
        cerrados: tickets.filter(t => t.estado === "cerrado").length,
        total: tickets.length
      });

    } catch (err) {
      res.status(500).json({ msg: "Error dashboard usuario" });
    }
  }
);

// =======================================================
// 🎯 CAMBIAR PRIORIDAD
// =======================================================
router.put(
  "/prioridad/:id",
  verifyToken,
  permitRoles("agente", "admin", "superadmin"),
  ctrl.cambiarPrioridad
);


// =======================================================
// ♻️ RECALCULAR SLA (ADMIN)
// =======================================================
router.put(
  "/recalcular-sla",
  verifyToken,
  permitRoles("admin", "superadmin"),
  requireEmpresaActiva,
  async (req, res) => {
    try {
      const empresaId = req.user.empresa;

      const tickets = await Ticket.find({
        empresa: empresaId,
        estado: { $in: ["abierto", "en_progreso"] },
        asignadoA: { $ne: null }
      });

      let actualizados = 0;

      for (const t of tickets) {
        const horas = await require("../services/slaService").obtenerHorasSLA(
          empresaId,
          t.prioridad
        );

        const fechaLimite = await require("../services/slaService").calcularFechaLimite(
          empresaId,
          horas
        );

        t.sla = {
          horas,
          fechaLimite,
          alertaEnviada: false,
          vencidoNotificado: false
        };

        await t.save();
        actualizados++;
      }

      res.json({
        msg: "SLA recalculado correctamente",
        total: actualizados
      });

    } catch (err) {
      console.error("❌ Error recalculando SLA:", err);
      res.status(500).json({ msg: "Error recalculando SLA" });
    }
  }
);


module.exports = router;
