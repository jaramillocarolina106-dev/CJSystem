const ExcelJS = require("exceljs");
const Empresa = require("../models/Empresa");

module.exports = async function generarExcelGlobal(req, res) {


  const empresas = await Empresa.find()
  .sort({ createdAt: -1 })
  .lean();


  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Empresas");

 sheet.columns = [
  { header: "Empresa", key: "nombre", width: 30 },
  { header: "NIT", key: "nit", width: 20 },
  { header: "Activa", key: "activa", width: 12 },
  { header: "Creada", key: "createdAt", width: 20 },
  { header: "Actualizada", key: "updatedAt", width: 20 }
];

  empresas.forEach(e => {
    sheet.addRow({
  nombre: e.nombre,
  nit: e.nit || "—",
  activa: e.activa ? "Sí" : "No",
  createdAt: new Date(e.createdAt).toLocaleDateString("es-CO"),
  updatedAt: new Date(e.updatedAt).toLocaleDateString("es-CO")
});

  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Reporte_Global_CJSystem.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
};
