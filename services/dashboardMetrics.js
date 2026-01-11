const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Empresa = require("../models/Empresa");

async function getDashboardMetrics(
  empresaId = null,
  filtros = {},
  tipoFiltro = "normal"
) {

  // 🔒 NORMALIZACIÓN FUERTE
  if (
    !empresaId ||
    empresaId === "null" ||
    empresaId === "undefined" ||
    !mongoose.Types.ObjectId.isValid(empresaId)
  ) {
    empresaId = null;
  }

  try {
const empresaObjectId = empresaId
  ? new mongoose.Types.ObjectId(empresaId)
  : null;


function mergeFecha(filtroBase, extra) {
  if (!filtroBase.createdAt) return extra;

  return {
    $gte: extra.$gte
      ? (filtroBase.createdAt.$gte > extra.$gte
          ? filtroBase.createdAt.$gte
          : extra.$gte)
      : filtroBase.createdAt.$gte,
    $lte: filtroBase.createdAt.$lte
  };
}


  /* ======================================================
     🎯 FILTRO BASE
  ====================================================== */
  const filtroBase = {};

if (empresaObjectId) {
  filtroBase.empresa = empresaObjectId;
}

  if (filtros.desde && filtros.hasta) {
    filtroBase.createdAt = {
      $gte: filtros.desde,
      $lte: filtros.hasta
    };
  }

  let diasRango = null;

if (filtros.desde && filtros.hasta) {
  const diffMs = filtros.hasta.getTime() - filtros.desde.getTime();
  diasRango = Math.ceil(diffMs / 86400000);
}


  /* ======================================================
     📊 KPIs ESTADO
  ====================================================== */
  const estado = {
    abierto: await Ticket.countDocuments({ ...filtroBase, estado: "abierto" }),
    en_progreso: await Ticket.countDocuments({ ...filtroBase, estado: "en_progreso" }),
    escalado: await Ticket.countDocuments({ ...filtroBase, estado: "escalado" }),
    cerrado: await Ticket.countDocuments({ ...filtroBase, estado: "cerrado" })
  };

  /* ======================================================
     ⚡ PRIORIDAD
  ====================================================== */
  const prioridad = {
    alta: await Ticket.countDocuments({ ...filtroBase, prioridad: "alta" }),
    media: await Ticket.countDocuments({ ...filtroBase, prioridad: "media" }),
    baja: await Ticket.countDocuments({ ...filtroBase, prioridad: "baja" })
  };
/* ======================================================
   ⏱️ TIEMPOS (LÓGICA INTELIGENTE)
====================================================== */
let hoy = null;
let semana = null;
let mes = null;


// ===== HOY =====
if (
  tipoFiltro === "normal" ||
  tipoFiltro === "hoy" ||
  tipoFiltro === "semana" ||
  tipoFiltro === "mes" ||
  (tipoFiltro === "rango" && diasRango >= 1)
) {
  hoy = await Ticket.countDocuments({
    ...filtroBase,
    createdAt: mergeFecha(filtroBase, {
      $gte: new Date(new Date().setHours(0,0,0,0))
    })
  });
}

// ===== SEMANA =====
if (
  tipoFiltro === "normal" ||
  tipoFiltro === "semana" ||
  tipoFiltro === "mes" ||
  (tipoFiltro === "rango" && diasRango >= 7)
) {
  semana = await Ticket.countDocuments({
    ...filtroBase,
    createdAt: mergeFecha(filtroBase, {
      $gte: new Date(Date.now() - 7 * 86400000)
    })
  });
}

// ===== 30 DÍAS =====
if (
  tipoFiltro === "normal" ||
  tipoFiltro === "mes" ||
  (tipoFiltro === "rango" && diasRango >= 30)
) {
  mes = await Ticket.countDocuments({
    ...filtroBase,
    createdAt: mergeFecha(filtroBase, {
      $gte: new Date(Date.now() - 30 * 86400000)
    })
  });
}



  /* ======================================================
     📈 TICKETS CREADOS (GRÁFICA)
  ====================================================== */
  const meses = [];
  const labelsMeses = [];
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  // 🔹 RANGO PERSONALIZADO → POR DÍA
  if (filtros.desde && filtros.hasta) {

    const inicio = new Date(filtros.desde);
    const fin = new Date(filtros.hasta);
    inicio.setHours(0,0,0,0);
    fin.setHours(0,0,0,0);

    for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {

      const diaInicio = new Date(fecha.setHours(0,0,0,0));
      const diaFin = new Date(fecha.setHours(23,59,59,999));

      const total = await Ticket.countDocuments({
        ...filtroBase,
        createdAt: { $gte: diaInicio, $lte: diaFin }
      });

      meses.push(total);
      labelsMeses.push(`${diaInicio.getDate()}/${diaInicio.getMonth()+1}`);
    }

  } 
  // 🔹 SIN FILTRO → 12 MESES
  else {

    for (let i = 11; i >= 0; i--) {

      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);

      const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);

      const total = await Ticket.countDocuments({
        ...filtroBase,
        createdAt: { $gte: inicio, $lt: fin }
      });

      meses.push(total);
      labelsMeses.push(`${nombres[inicio.getMonth()]} ${inicio.getFullYear()}`);
    }
  }

  /* ======================================================
     🧠 SLA GLOBAL
  ====================================================== */
 const ticketsSLA = await Ticket.find({
  ...filtroBase,
  "sla.fechaLimite": { $ne: null },
  fechaCierre: { $ne: null }
});

let cumplidos = 0;

ticketsSLA.forEach(t => {
  if (t.fechaCierre <= t.sla.fechaLimite) {
    cumplidos++;
  }
});

const porcentajeSLA = ticketsSLA.length
  ? Math.round((cumplidos / ticketsSLA.length) * 100)
  : 100;


/* ======================================================
   🧑‍💼 SLA POR AGENTE 
====================================================== */
const slaMatch = {
  asignadoA: { $ne: null },
  "sla.fechaLimite": { $ne: null },
  fechaCierre: { $ne: null }
};


if (empresaObjectId) {
  slaMatch.empresa = empresaObjectId;
}


if (filtros.desde && filtros.hasta) {
  slaMatch.createdAt = {
    $gte: filtros.desde,
    $lte: filtros.hasta
  };
}

const slaRaw = await Ticket.aggregate([
  { $match: slaMatch },
  {
    $group: {
      _id: "$asignadoA",
      total: { $sum: 1 },
      cumplidos: {
        $sum: {
          $cond: [
  { $lte: ["$fechaCierre", "$sla.fechaLimite"] },
  1,
  0
]

        }
      }
    }
  }
]);

// ======================================================
// 👤 MAPEAR USUARIOS DEL SLA
// ======================================================
const usuariosSla = await User.find(
  { _id: { $in: slaRaw.map(a => a._id) } },
  { nombre: 1 }
).lean();

const slaPorAgente = slaRaw.map(a => {
  const u = usuariosSla.find(x => x._id.equals(a._id));
  const total = a.total || 0;
  const cumplidos = a.cumplidos || 0;

  return {
    nombre: u?.nombre || "Agente",
    total,
    enSla: cumplidos,
    vencidos: total - cumplidos,
    sla: total > 0 ? Math.round((cumplidos / total) * 100) : 0
  };
});


  /* ======================================================
     🏢 MÉTRICAS GLOBALES
  ====================================================== */
  const empresas = empresaId ? null : await Empresa.countDocuments({ activa: true });
  const usuariosTotales = empresaId ? null : await User.countDocuments();
  const agentes = empresaId ? null : await User.countDocuments({ rol: "agente" });
  const admins = empresaId ? null : await User.countDocuments({ rol: "admin" });

  const totalTickets = await Ticket.countDocuments({ ...filtroBase });

  /* ======================================================
   📌 SIN ASIGNAR
====================================================== */
const sinAsignar = await Ticket.countDocuments({
  ...filtroBase,
  asignadoA: null
});


  /* ======================================================
     ✅ RETURN
  ====================================================== */
    return {
      estado,
      prioridad,
      hoy,
      semana,
      mes,
      sinAsignar,
      meses,
      labelsMeses,
      porcentajeSLA,
      slaPorAgente,
      empresas,
      usuarios: usuariosTotales,
      agentes,
      admins,
      totalTickets
    };

  } catch (err) {
  console.error("❌ ERROR DASHBOARD METRICS:", err);

  return {
    estado: { abierto: 0, en_progreso: 0, escalado: 0, cerrado: 0 },
    prioridad: { alta: 0, media: 0, baja: 0 },
    hoy: 0,
    semana: 0,
    mes: 0,
    sinAsignar: 0,
    meses: [],
    labelsMeses: [],
    porcentajeSLA: 0,
    slaPorAgente: [],
    empresas: null,
    usuarios: null,
    agentes: null,
    admins: null,
    totalTickets: 0
  };
}

}


module.exports = { getDashboardMetrics };
