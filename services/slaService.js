const ConfigEmpresa = require("../models/ConfigEmpresa");
const ConfigGlobal = require("../models/ConfigGlobal");
const { esFestivo } = require("./festivosService");

// ===============================
// ⏱ OBTENER HORAS SLA
// ===============================
async function obtenerHorasSLA(empresaId, prioridad = "media") {
  const prioridadValida = ["baja", "media", "alta"].includes(prioridad)
    ? prioridad
    : "media";

  const cfgEmpresa = await ConfigEmpresa.findOne({
    empresa: empresaId,
    activo: true
  }).lean();

  // ✅ USAR prioridadValida
  const valorEmpresa = cfgEmpresa?.sla?.[prioridadValida];

  if (typeof valorEmpresa === "number" && valorEmpresa > 0) {
    return valorEmpresa;
  }

  // 🔁 GLOBAL
  const cfgGlobal = await ConfigGlobal.getConfig();
  const valorGlobal = cfgGlobal?.sla?.[prioridadValida];

  if (typeof valorGlobal === "number" && valorGlobal > 0) {
    return valorGlobal;
  }

  // 🧯 Fallback
  return 4;
}


// ===============================
// 🕒 CALCULAR FECHA LÍMITE INTELIGENTE
// ===============================
async function calcularFechaLimite(empresaId, horasSLA) {
  const cfgEmpresa = await ConfigEmpresa.findOne({
    empresa: empresaId,
    activo: true
  }).lean();

  const horarioSemanal = cfgEmpresa?.horarioSemanal;
  const tipoHorario = cfgEmpresa?.tipoHorario;
  const trabajaFestivos = cfgEmpresa?.trabajaFestivos === true;

  // ⏱ Inicialización correcta
  let fecha = new Date();
  let minutosPendientes = horasSLA * 60;

  // 🟢 24x7 → horas corridas
  if (!horarioSemanal || tipoHorario === "24x7") {
    fecha.setMinutes(fecha.getMinutes() + minutosPendientes);
    return fecha;
  }

  // 🧠 Horario laboral inteligente
  while (minutosPendientes > 0) {
    fecha.setMinutes(fecha.getMinutes() + 1);

    // 🚫 Festivos
    if (!trabajaFestivos) {
      const festivo = await esFestivo(fecha);
      if (festivo) continue;
    }

    if (!esDiaLaboral(fecha, horarioSemanal)) continue;
    if (!dentroDeHorario(fecha, horarioSemanal)) continue;

    minutosPendientes--;
  }

  return fecha;
}


function obtenerDiaSemana(fecha) {
  return [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado"
  ][fecha.getDay()];
}

function esDiaLaboral(fecha, horarioSemanal) {
  const dia = obtenerDiaSemana(fecha);
  return horarioSemanal[dia]?.activo === true;
}

function dentroDeHorario(fecha, horarioSemanal) {
  const dia = obtenerDiaSemana(fecha);
  const cfg = horarioSemanal[dia];

  if (!cfg?.activo) return false;

  const [hIni, mIni] = cfg.inicio.split(":").map(Number);
  const [hFin, mFin] = cfg.fin.split(":").map(Number);

  const minutos = fecha.getHours() * 60 + fecha.getMinutes();
  return minutos >= (hIni * 60 + mIni) && minutos < (hFin * 60 + mFin);
}

module.exports = {
  obtenerHorasSLA,
  calcularFechaLimite
};
