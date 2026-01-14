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

const { getDashboardMetrics } = require("../services/dashboardMetrics");
const ConfigEmpresa = require("../models/ConfigEmpresa");
const { enviarPushUsuario } = require("../services/pushService");



// ============================================================
// 🧠 UTIL — EMPRESA ACTIVA (HEADER-BASED)
// ============================================================
const getEmpresaId = (req, res) => {
  let empresaId = req.user?.empresa;
  const empresaHeader = req.headers["x-empresa-activa"];

  // 🔒 Seguridad
  if (empresaHeader && empresaHeader !== "null" && req.user?.rol !== "superadmin") {
    res.status(403).json({ msg: "No autorizado" });
    return null;
  }

  // 👑 Superadmin selecciona empresa
  if (
    req.user?.rol === "superadmin" &&
    empresaHeader &&
    empresaHeader !== "null"
  ) {
    empresaId = empresaHeader;
  }

  // ❌ Empresa inválida
  if (!empresaId || empresaId === "null") {
    res.status(400).json({ msg: "No hay empresa activa" });
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

  creadoPor: usuarioFinal,

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
    const tickets = await Ticket.find({
      empresa: req.user.empresa   // 👈 ya viene normalizada
    })
    .populate("asignadoA")
    .populate("creadoPor");

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
// ============================================================
// 🔄 NORMALIZAR SLA PARA TICKETS ANTIGUOS
// ============================================================
if (
  ticket.estado === "cerrado" &&
  ticket.fechaCierre &&
  ticket.sla?.fechaLimite &&
  !ticket.sla?.final
) {
  const cierre = new Date(ticket.fechaCierre);
  const limite = new Date(ticket.sla.fechaLimite);

  if (cierre <= limite) {
    ticket.sla.cumplido = true;
    ticket.sla.incumplido = false;
  } else {
    ticket.sla.cumplido = false;
    ticket.sla.incumplido = true;
  }

  ticket.sla.final = true;
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

let usuariosANotificar = new Set();

const autorId = req.user.id.toString();


if (req.user.rol === "usuario") {
  if (ticket.asignadoA) {
    usuariosANotificar.add(ticket.asignadoA.toString());
  }
}


if (req.user.rol === "agente") {
  if (ticket.creadoPor) {
    usuariosANotificar.add(ticket.creadoPor.toString());
  }
}


if (["admin", "superadmin"].includes(req.user.rol)) {
  if (ticket.asignadoA) {
    usuariosANotificar.add(ticket.asignadoA.toString());
  } else if (ticket.creadoPor) {
    usuariosANotificar.add(ticket.creadoPor.toString());
  }
}


usuariosANotificar.delete(autorId);


for (const userId of usuariosANotificar) {
  await enviarPushUsuario(userId, {
    title: "💬 Nuevo comentario",
    body: `Ticket ${ticket.codigo}: ${ticket.titulo}`,
    url: `/ticket-detalle.html?id=${ticket._id}`
  });
}
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

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ msg: "Ticket no encontrado" });
    }

    if (String(ticket.empresa) !== String(empresaId)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    // 🟦 AGENTE → se asigna a sí mismo
    if (req.user.rol === "agente") {
      if (ticket.asignadoA) {
        return res.status(400).json({ msg: "El ticket ya está asignado" });
      }

      ticket.asignadoA = req.user.id;
      agenteAsignadoId = req.user.id;
      ticket.estado = "en_progreso";

      agregarHistorial(
        ticket,
        "Ticket tomado",
        `Tomado por ${req.user.nombre}`
      );
    }

    // 🟨 ADMIN / SUPERADMIN → asigna a otro agente
    if (req.user.rol === "admin" || req.user.rol === "superadmin") {
      const { agenteId } = req.body;

      if (!agenteId) {
        return res.status(400).json({ msg: "Agente requerido" });
      }

      ticket.asignadoA = agenteId;
      agenteAsignadoId = agenteId;
      ticket.estado = "en_progreso";

      agregarHistorial(
        ticket,
        "Ticket asignado",
        `Asignado por ${req.user.nombre}`
      );
    }

    
  // 🟧 SLA 
if (ticket.asignadoA && !ticket.fechaCierre) {
  const horasSLA = await obtenerHorasSLA(
    empresaId,
    ticket.prioridad
  );

  const fechaLimite = await calcularFechaLimite(
    empresaId,
    horasSLA
  );

  ticket.sla = {
    ...ticket.sla,
    horas: horasSLA,
    fechaLimite,
    alertaEnviada: false,
    vencidoNotificado: false
  };



    }

    await ticket.save();

if (agenteAsignadoId) {
  await enviarPushUsuario(agenteAsignadoId, {
    title: "🎫 Nuevo ticket asignado",
    body: `Ticket ${ticket.codigo}: ${ticket.titulo}`,
    url: `/ticket-detalle-agente.html?id=${ticket._id}`
  });
}

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

    // 🔥 ASEGURAR SLA AL ENTRAR EN PROGRESO
    if (
      estado === "en_progreso" &&
      ticket.asignadoA &&
      !ticket.sla?.fechaLimite
    ) {
      const horasSLA = await obtenerHorasSLA(
        empresaId,
        ticket.prioridad
      );

      const fechaLimite = await calcularFechaLimite(
        empresaId,
        horasSLA
      );

 if (!ticket.fechaCierre && !ticket.sla?.final) {

  ticket.sla = {
    ...ticket.sla,
    horas: horasSLA,
    fechaLimite,
    alertaEnviada: false,
    vencidoNotificado: false
  };
}

    }

    const anterior = ticket.estado;
    ticket.estado = estado;
    let severidadAuditoria = "media"; // valor por defecto

if (estado === "cerrado") {
  const fechaCierre = new Date();
  ticket.fechaCierre = fechaCierre;

  if (ticket.sla && ticket.sla.fechaLimite) {
    const limite = new Date(ticket.sla.fechaLimite);

    if (fechaCierre <= limite) {
      ticket.sla.cumplido = true;
      ticket.sla.incumplido = false;
    } else {
      ticket.sla.cumplido = false;
      ticket.sla.incumplido = true;
    }
  }

  
  ticket.sla.final = true;
}


  // 🧨 Severidad final del caso
  if (ticket.sla?.incumplido) {
    severidadAuditoria = "alta";
  } else {
    severidadAuditoria = "media";
  }




    agregarHistorial(ticket, "Cambio de estado", `${anterior} → ${estado}`);
    await ticket.save();

    await audit({
  req,
  accion: estado === "cerrado" ? "Cerrar ticket" : "Cambiar estado",
  detalle:
    estado === "cerrado"
      ? `Ticket ${ticket.codigo} ${ticket.sla?.incumplido ? "FUERA SLA" : "EN SLA"}`
      : `Ticket ${ticket.codigo}: ${anterior} → ${estado}`,
  severidad: severidadAuditoria
});

    res.json({ msg: "Estado actualizado", ticket });

  } catch (err) {
    console.error("❌ Error cambiar estado:", err);
    res.status(500).json({ msg: "Error cambiando estado" });
  }
};



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
    const empresaId = getEmpresaId(req, res);
if (!empresaId) return;

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

if (ticket.asignadoA && !ticket.fechaCierre) {
  const horasSLA = await obtenerHorasSLA(empresaId, prioridad);
  const fechaLimite = await calcularFechaLimite(empresaId, horasSLA);

  ticket.sla = {
    ...ticket.sla,
    horas: horasSLA,
    fechaLimite,
    alertaEnviada: false,
    vencidoNotificado: false
  };
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
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    desde.setHours(0, 0, 0, 0);

    const hasta = new Date();

    const metrics = await getDashboardMetrics(
      empresaId,
      { desde, hasta },
      "mes"
    );

    res.json(metrics);

  } catch (err) {
    console.error("❌ Error dashboard:", err);
    res.status(500).json({ msg: "Error cargando dashboard" });
  }
};


// ============================================================
// 📊 SLA POR AGENTE (ENTERPRISE)
// ============================================================
exports.slaPorAgente = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req, res);
    if (!empresaId) return;

    const tickets = await Ticket.find({
      empresa: empresaId,
      estado: "cerrado",
      asignadoA: { $ne: null },
      "sla.fechaLimite": { $exists: true }
    }).populate("asignadoA", "nombre");

    const map = {};

    tickets.forEach(t => {
      const agente = t.asignadoA;
      if (!agente) return;

      const id = agente._id.toString();

      if (!map[id]) {
        map[id] = {
          nombre: agente.nombre,
          total: 0,
          enSla: 0,
          vencidos: 0
        };
      }

      map[id].total++;

      if (t.sla?.incumplido) {
        map[id].vencidos++;
      } else {
        map[id].enSla++;
      }
    });

    const resultado = Object.values(map).map(a => ({
      nombre: a.nombre,
      total: a.total,
      enSla: a.enSla,
      vencidos: a.vencidos,
      sla: a.total === 0
        ? 100
        : Math.round((a.enSla / a.total) * 100)
    }));

    res.json(resultado);

  } catch (err) {
    console.error("❌ Error SLA por agente:", err);
    res.status(500).json({ msg: "Error calculando SLA por agente" });
  }
};
