const ExcelJS = require("exceljs");
const Empresa = require("../models/Empresa");

module.exports = async function generarExcelGlobal(res) {

  const empresas = await Empresa.find().lean();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Empresas");

  sheet.columns = [
    { header: "Empresa", key: "nombre", width: 30 },
    { header: "Activa", key: "activa", width: 15 },
    { header: "Fecha creación", key: "createdAt", width: 25 }
  ];

  empresas.forEach(e => {
    sheet.addRow({
      nombre: e.nombre,
      activa: e.activa ? "Sí" : "No",
      createdAt: new Date(e.createdAt).toLocaleDateString()
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
