  // ============================================================
  // 📌 TICKET CONTROLLER — CJSystem HelpDesk SaaS (ENTERPRISE)
  // ============================================================

  const Ticket = require("../models/Ticket");
  const audit = require("../utils/audit");
  const ConfigGlobal = require("../models/ConfigGlobal");
  const {
  obtenerHorasSLA,
  calcularFechaLimite
} = require("../services/slaService");




  // ============================================================
  // 🧠 UTIL — EMPRESA ACTIVA
  // ============================================================
const getEmpresaId = (req, res) => {
  let empresaId = req.user?.empresa;

  // 🔥 SUPERADMIN CON EMPRESA ACTIVA
  if (req.user?.rol === "superadmin" && req.cookies?.empresaActiva) {
    empresaId = req.cookies.empresaActiva;
  }

  if (!empresaId) {
    res.status(400).json({ msg: "Empresa no definida" });
    return null;
  }

  return empresaId;
};



  // ============================================================
  // 🧠 UTIL — GENERAR CÓDIGO ÚNICO
  // ============================================================
  const generarCodigo = () =>
  "TCK-" + Date.now().toString(36).slice(-5).toUpperCase();


  // ============================================================
  // 🧠 UTIL — HISTORIAL
  // ============================================================
  const agregarHistorial = (ticket, accion, detalle = "") => {
    ticket.historial.push({
      accion,
      detalle,
      fecha: new Date()
    });
  };



  // ============================================================
  // 🟢 CREAR TICKET
  // ============================================================
  exports.crear = async (req, res) => {
    try {
      const empresaId = getEmpresaId(req, res);
      if (!empresaId) return;

      const { titulo, descripcion, prioridad, categoria } = req.body;

      // ==========================
// 👤 ASIGNACIÓN INICIAL (OPCIONAL)
// ==========================
if (
  ["admin", "agente"].includes(req.user.rol) &&
  req.body.agenteId
) {
  ticket.asignadoA = req.body.agenteId;
  ticket.estado = "en_progreso";

  agregarHistorial(
    ticket,
    "Ticket asignado",
    `Asignado al crear por ${req.user.nombre}`
  );
}

      // ==========================
// 👤 USUARIO AFECTADO
// ==========================
let usuarioFinal = req.user.id;

// Admin o agente pueden crear para otro usuario
if (
  ["admin", "agente"].includes(req.user.rol) &&
  req.body.usuarioId
) {
  usuarioFinal = req.body.usuarioId;
}


// 🔔 Prioridad solicitada por el usuario
const prioridadSolicitada = ["baja", "media", "alta"].includes(prioridad)
  ? prioridad
  : "media";

// 🎯 Prioridad inicial del ticket
const prioridadFinal = prioridadSolicitada;




// ==========================
// 📎 ADJUNTOS
// ==========================
const adjuntos = (req.files || []).map(file => ({
  nombre: file.originalname,
  url: "/uploads/" + file.filename
}));

// ==========================
// 🎫 CREAR TICKET
// ==========================
const ticket = await Ticket.create({
  empresa: empresaId,

  // 👤 usuario afectado
  usuario: usuarioFinal,

  // 👤 quien lo creó
  creadoPor: req.user.id,

  codigo: generarCodigo(),

  titulo: titulo.trim(),
  descripcion: descripcion.trim(),

  urgenciaUsuario: prioridadSolicitada,
  prioridad: prioridadFinal,

  categoria: categoria || "General",

  adjuntos
});


// ==========================
// 📜 HISTORIAL
// ==========================
agregarHistorial(
  ticket,
  "Ticket creado",
  `Creado por ${req.user.nombre} (${req.user.rol})`
);


// 🔥 HISTORIAL DE AJUSTE DE PRIORIDAD (PRO)
if (prioridadSolicitada !== prioridadFinal) {
  agregarHistorial(
    ticket,
    "Ajuste de prioridad",
    `Urgencia solicitada: ${prioridadSolicitada} → Prioridad asignada: ${prioridadFinal}`
  );
}

await ticket.save();

      await audit({
        req,
        accion: "Crear ticket",
        detalle: `Ticket ${ticket.codigo}`
      });

      res.status(201).json({ msg: "Ticket creado exitosamente", ticket });

    } catch (err) {
      console.error("❌ Error crear ticket:", err);
      res.status(500).json({ msg: "Error creando ticket" });
    }
  };


  // ============================================================
  // 📋 LISTAR TICKETS
  // ============================================================
  exports.listar = async (req, res) => {
    try {
      const empresaId = getEmpresaId(req, res);
      if (!empresaId) return;

      const filtros = { empresa: empresaId };

      if (req.user.rol === "cliente") {
        filtros.creadoPor = req.user.id;
      }

      if (req.query.estado) filtros.estado = req.query.estado;
      if (req.query.prioridad) filtros.prioridad = req.query.prioridad;

      const tickets = await Ticket.find(filtros)
        .sort({ createdAt: -1 })
        .populate("creadoPor", "nombre email")
        .populate("asignadoA", "nombre email");

      res.json(tickets);

    } catch (err) {
      console.error("❌ Error listar tickets:", err);
      res.status(500).json({ msg: "Error listando tickets" });
    }
  };

  // ============================================================
  // 🔍 OBTENER TICKET (CORREGIDO)
  // ============================================================
  exports.obtener = async (req, res) => {
    try {
      const empresaId = getEmpresaId(req, res);
      if (!empresaId) return;

      const ticket = await Ticket.findById(req.params.id)
        .populate("creadoPor", "nombre email")
        .populate("asignadoA", "nombre email")
        .populate({
          path: "comentarios.autor",
          select: "nombre email"
        });

      if (!ticket) {
        return res.status(404).json({ msg: "Ticket no encontrado" });
      }

      if (String(ticket.empresa) !== String(empresaId)) {
        return res.status(403).json({ msg: "No autorizado" });
      }
  if (
    ticket.tieneRespuestaNueva &&
    ticket.ultimaRespuestaPor !== req.user.rol
  ) {
    ticket.tieneRespuestaNueva = false;
    ticket.ultimaRespuestaPor = null;
    await ticket.save();
  }

      res.json(ticket);

    } catch (err) {
      console.error("❌ Error obtener ticket:", err);
      res.status(500).json({ msg: "Error obteniendo ticket" });
    }
  };

  // ============================================================
  // 💬 AGREGAR COMENTARIO (CORREGIDO)
  // ============================================================
  exports.comentar = async (req, res) => {
    try {
      const empresaId = getEmpresaId(req, res);
      if (!empresaId) return;

      const { mensaje } = req.body;
      if (!mensaje?.trim()) {
        return res.status(400).json({ msg: "Mensaje vacío" });
      }

      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ msg: "Ticket no encontrado" });

      if (String(ticket.empresa) !== String(empresaId)) {
        return res.status(403).json({ msg: "No autorizado" });
      }
  ticket.comentarios.push({
    autor: req.user.id,
    mensaje: mensaje.trim()
  });

  // 🔔 NOTIFICACIÓN MULTI-ROL
  ticket.tieneRespuestaNueva = true;

  if (req.user.rol === "agente") {
    ticket.ultimaRespuestaPor = "agente";
  } else if (req.user.rol === "admin" || req.user.rol === "superadmin") {
    ticket.ultimaRespuestaPor = "admin";
  } else {
    ticket.ultimaRespuestaPor = "usuario";
  }


      agregarHistorial(ticket, "Nuevo comentario", `Por ${req.user.nombre}`);
      await ticket.save();

      const ticketActualizado = await Ticket.findById(ticket._id)
        .populate({
          path: "comentarios.autor",
          select: "nombre email"
        });

      await audit({
        req,
        accion: "Agregar comentario",
        detalle: `Ticket ${ticket.codigo}`
      });

      res.json(ticketActualizado);

    } catch (err) {
      console.error("❌ Error comentar:", err);
      res.status(500).json({ msg: "Error agregando comentario" });
    }
  };

  // ============================================================
  // 👤 ASIGNAR AGENTE
  // ============================================================
exports.asignar = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const { agenteId } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ msg: "Ticket no encontrado" });

    if (String(ticket.empresa) !== String(empresaId)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    
 // 🟦 AGENTE o ADMIN: se asigna a sí mismo
if (["agente", "admin"].includes(req.user.rol)) {
  if (ticket.asignadoA) {
    return res.status(400).json({ msg: "El ticket ya está asignado" });
  }

  ticket.asignadoA = req.user.id;

  agregarHistorial(
    ticket,
    "Ticket tomado",
    `Tomado por ${req.user.nombre} (${req.user.rol})`
  );
}


    // 🟩 ADMIN / SUPERADMIN
    if (["admin", "superadmin"].includes(req.user.rol)) {
      if (!agenteId) {
        return res.status(400).json({ msg: "Agente requerido" });
      }
      ticket.asignadoA = agenteId;
      agregarHistorial(
        ticket,
        "Ticket asignado",
        `Asignado por ${req.user.nombre}`
      );
    }

    // ⏱️ INICIAR SLA SOLO AL TOMAR EL TICKET
  if (!ticket.fechaLimite) {
  const horasSLA = await obtenerHorasSLA(
    empresaId,
    ticket.prioridad
  );

  const fechaLimite = await calcularFechaLimite(
    empresaId,
    horasSLA
  );

  ticket.horasSLA = horasSLA;
  ticket.fechaLimite = fechaLimite;
}


    ticket.estado = "en_progreso";
    await ticket.save();

    await audit({
      req,
      accion: "Asignar ticket",
      detalle: `Ticket ${ticket.codigo}`
    });

    res.json({ msg: "Ticket asignado correctamente", ticket });

  } catch (err) {
    console.error("❌ Error asignar:", err);
    res.status(500).json({ msg: "No se pudo asignar el ticket" });
  }
};


  // ============================================================
  // 🔄 CAMBIAR ESTADO
  // ============================================================
  exports.cambiarEstado = async (req, res) => {
    try {
      const empresaId = getEmpresaId(req, res);
      if (!empresaId) return;

      const { estado } = req.body;
      if (!estado) {
        return res.status(400).json({ msg: "Estado requerido" });
      }

      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ msg: "Ticket no encontrado" });

      const anterior = ticket.estado;
      ticket.estado = estado;

      if (estado === "cerrado") {
        ticket.fechaCierre = new Date();
      }

      agregarHistorial(ticket, "Cambio de estado", `${anterior} → ${estado}`);
      await ticket.save();

      await audit({
        req,
        accion: "Cambiar estado",
        detalle: `Ticket ${ticket.codigo}`
      });

      res.json({ msg: "Estado actualizado", ticket });

    } catch (err) {
      console.error("❌ Error cambiar estado:", err);
      res.status(500).json({ msg: "Error cambiando estado" });
    }
  };

  async function getDashboardMetrics(empresaId, inicio) {

  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  const filtro = {
    empresa: empresaId,
    createdAt: { $gte: inicio, $lte: fin }
  };

  // 🔹 Conteos por estado
  const estadoAgg = await Ticket.aggregate([
    { $match: filtro },
    { $group: { _id: "$estado", total: { $sum: 1 } } }
  ]);

  const estado = {
    abierto: 0,
    en_progreso: 0,
    escalado: 0,
    cerrado: 0
  };

  estadoAgg.forEach(e => estado[e._id] = e.total);

  // 🔹 Conteos por prioridad
  const prioridadAgg = await Ticket.aggregate([
    { $match: filtro },
    { $group: { _id: "$prioridad", total: { $sum: 1 } } }
  ]);

  const prioridad = { alta: 0, media: 0, baja: 0 };
  prioridadAgg.forEach(p => prioridad[p._id] = p.total);

  // 🔹 Total
  const total = Object.values(estado).reduce((a, b) => a + b, 0);

  return { estado, prioridad, total };
}

// ============================================================
// 🔴 ESCALAR TICKET (ENTERPRISE)
// ============================================================
exports.escalarTicket = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const { tipo, refId, nombre, motivo } = req.body;

    if (!tipo || !nombre) {
      return res.status(400).json({ msg: "Destino de escalado incompleto" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ msg: "Ticket no encontrado" });
    }

    if (String(ticket.empresa) !== String(empresaId)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    // 🔴 Estado
    ticket.estado = "escalado";

    // 🔴 Datos de escalado
    ticket.escaladoA = {
      tipo,
      refId: refId || null,
      nombre,
      fecha: new Date(),
      motivo: motivo || ""
    };

    // 📜 Historial específico de escalado
    ticket.historialEscalado.push({
      por: req.user.id,
      tipo,
      destino: nombre,
      motivo: motivo || ""
    });

    // 📜 Historial general
    agregarHistorial(
      ticket,
      "Ticket escalado",
      `Escalado a ${tipo}: ${nombre}`
    );

    // 👤 Reasignar si es usuario interno
    if (tipo === "usuario" && refId) {
      ticket.asignadoA = refId;
    }

    await ticket.save();

    await audit({
      req,
      accion: "Escalar ticket",
      detalle: `Ticket ${ticket.codigo} → ${tipo}: ${nombre}`
    });

    res.json({ msg: "Ticket escalado correctamente", ticket });

  } catch (err) {
    console.error("❌ Error escalar ticket:", err);
    res.status(500).json({ msg: "Error al escalar ticket" });
  }
};
// ============================================================
// 🎯 CAMBIAR PRIORIDAD DEL TICKET
// ============================================================
exports.cambiarPrioridad = async (req, res) => {
  try {
    const empresaId = req.user.empresa;
    const { prioridad } = req.body;

    if (!["baja", "media", "alta"].includes(prioridad)) {
      return res.status(400).json({ msg: "Prioridad inválida" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ msg: "Ticket no encontrado" });
    }

    if (String(ticket.empresa) !== String(empresaId)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const prioridadAnterior = ticket.prioridad;

    if (prioridadAnterior === prioridad) {
      return res.json({ msg: "La prioridad ya es esa", ticket });
    }

    // 🔄 Cambiar prioridad
    ticket.prioridad = prioridad;

    // ⏱️ Recalcular SLA si ya está en progreso
    if (ticket.asignadoA) {
      const horasSLA = await obtenerHorasSLA(empresaId, prioridad);
      const fechaLimite = await calcularFechaLimite(empresaId, horasSLA);

      ticket.horasSLA = horasSLA;
      ticket.fechaLimite = fechaLimite;
      ticket.slaAlertaEnviada = false;
      ticket.slaVencidoNotificado = false;
    }

    // 📜 Historial
    agregarHistorial(
      ticket,
      "Cambio de prioridad",
      `${prioridadAnterior} → ${prioridad} (por ${req.user.nombre})`
    );

    await ticket.save();

    await audit({
      req,
      accion: "Cambiar prioridad",
      detalle: `Ticket ${ticket.codigo}: ${prioridadAnterior} → ${prioridad}`
    });

    res.json({ msg: "Prioridad actualizada", ticket });

  } catch (err) {
    console.error("❌ Error cambiar prioridad:", err);
    res.status(500).json({ msg: "Error cambiando prioridad" });
  }
};
// ============================================================
// 📊 DASHBOARD EMPRESA (ADMIN / SUPERADMIN)
// ============================================================
exports.dashboardEmpresa = async (req, res) => {
  try {
    const empresaId = req.user.empresa;
    if (!empresaId) {
      return res.status(400).json({ msg: "Empresa no definida" });
    }

    // 📅 rango: últimos 30 días
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    inicio.setHours(0, 0, 0, 0);

    const metrics = await getDashboardMetrics(empresaId, inicio);

    res.json(metrics);

  } catch (err) {
    console.error("❌ Error dashboard:", err);
    res.status(500).json({ msg: "Error cargando dashboard" });
  }
};


exports.getDashboardMetrics = getDashboardMetrics;

