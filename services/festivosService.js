const Festivo = require("../models/Festivo");

const esFestivo = async (fecha) => {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  const festivo = await Festivo.findOne({
    fecha: { $gte: inicio, $lte: fin }
  }).lean();

  return !!festivo;
};

module.exports = { esFestivo };
