const PDFDocument = require("pdfkit");
const Empresa = require("../models/Empresa");
const Ticket = require("../models/Ticket");
const User = require("../models/User");

module.exports = async function generarPDFGlobal(res) {

  const empresas = await Empresa.countDocuments();
  const tickets = await Ticket.countDocuments();
  const usuarios = await User.countDocuments();

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Reporte_Global_CJSystem.pdf"
  );

  doc.pipe(res);

  // TÍTULO
  doc
    .fontSize(22)
    .text("Reporte Global CJSystem", { align: "center" })
    .moveDown();

  doc
    .fontSize(14)
    .text(`Empresas registradas: ${empresas}`)
    .text(`Usuarios totales: ${usuarios}`)
    .text(`Tickets totales: ${tickets}`)
    .moveDown();

  doc
    .fontSize(12)
    .text(`Generado: ${new Date().toLocaleString()}`);

  doc.end();
};
