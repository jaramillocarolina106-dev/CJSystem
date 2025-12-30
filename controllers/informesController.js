// ======================================================
// 📊 CONTROLADOR DE INFORMES — CJSystem HelpDesk SaaS
// ======================================================

const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Empresa = require("../models/Empresa");

const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

// ======================================================
// 🟦 FUNCIONES AUXILIARES
// ======================================================

const getLogoPath = (empresa) => {
  if (!empresa.logo) return path.join(__dirname, "../public/default-logo.png");
  return path.join(__dirname, "../uploads/logos", empresa.logo);
};

const f = (fecha) =>
  new Date(fecha).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

// ======================================================
// 📌 1️⃣ INFORME PDF MENSUAL
// ======================================================
exports.informeMensualPDF = async (req, res) => {
  try {
   
    const empresa = await Empresa.findById(empresaId);
    const tickets = await Ticket.find({ empresa: empresaId });

    const abiertos = tickets.filter(t => t.estado === "abierto").length;
    const progreso = tickets.filter(t => t.estado === "en_progreso").length;
    const escalados = tickets.filter(t => t.estado === "escalado").length;
    const cerrados = tickets.filter(t => t.estado === "cerrado").length;

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=informe_mensual.pdf");

    doc.pipe(res);

    doc.image(getLogoPath(empresa), 40, 40, { width: 120 });

    doc.fontSize(28).fillColor("#1a237e")
      .text(`Informe Mensual — ${empresa.nombre}`, 40, 180);

    doc.moveDown();
    doc.fontSize(14).fillColor("black")
      .text(`Fecha de generación: ${f(new Date())}`);

    doc.moveDown(2);

    doc.fontSize(20).fillColor("#0f1e46")
      .text("Resumen general", { underline: true });

    doc.moveDown();
    doc.fontSize(14).fillColor("black");
    doc.text(`📌 Abiertos: ${abiertos}`);
    doc.text(`📌 En progreso: ${progreso}`);
    doc.text(`📌 Escalados: ${escalados}`);
    doc.text(`📌 Cerrados: ${cerrados}`);
    doc.text(`📌 Total: ${tickets.length}`);

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error generando informe PDF" });
  }
};

// ======================================================
// 📌 2️⃣ INFORME EXCEL
// ======================================================
exports.informeExcelTickets = async (req, res) => {
  try {
    const empresaId = req.session.empresaActiva;
    if (!empresaId) {
      return res.status(400).json({ msg: "No hay empresa activa" });
    }

    const tickets = await Ticket
      .find({ empresa: empresaId })
      .populate("creadoPor asignadoA");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Tickets");

    ws.columns = [
      { header: "ID", key: "id", width: 25 },
      { header: "Título", key: "titulo", width: 40 },
      { header: "Prioridad", key: "prioridad", width: 12 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Creado por", key: "creadoPor", width: 25 },
      { header: "Asignado a", key: "asignadoA", width: 25 },
      { header: "Fecha creación", key: "fecha", width: 25 },
      { header: "Fecha cierre", key: "cierre", width: 25 }
    ];

    tickets.forEach(t => {
      ws.addRow({
        id: t._id.toString(),
        titulo: t.titulo,
        prioridad: t.prioridad,
        estado: t.estado,
        categoria: t.categoria,
        creadoPor: t.creadoPor?.nombre || "N/A",
        asignadoA: t.asignadoA?.nombre || "Sin asignar",
        fecha: f(t.createdAt),
        cierre: t.fechaCierre ? f(t.fechaCierre) : "Sin cerrar"
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tickets.xlsx"
    );

    await wb.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({ msg: "Error generando Excel" });
  }
};

// ======================================================
// 📌 3️⃣ PRODUCTIVIDAD POR AGENTE
// ======================================================
exports.productividadAgentes = async (req, res) => {
  try {
    const empresaId = req.session.empresaActiva;
    if (!empresaId) {
      return res.status(400).json({ msg: "No hay empresa activa" });
    }

    const agentes = await User.find({ rol: "agente", empresa: empresaId });
    const resultados = [];

    for (const agente of agentes) {
      const todos = await Ticket.find({ asignadoA: agente._id });
      const cerrados = todos.filter(t => t.estado === "cerrado").length;

      resultados.push({
        agente: agente.nombre,
        total: todos.length,
        cerrados,
        abiertos: todos.length - cerrados
      });
    }

    res.json(resultados);

  } catch (error) {
    res.status(500).json({ msg: "Error productividad agentes" });
  }
};

// ======================================================
// 📌 4️⃣ INFORME SLA
// ======================================================
exports.informeSLA = async (req, res) => {
  try {
    const empresaId = req.session.empresaActiva;
    if (!empresaId) {
      return res.status(400).json({ msg: "No hay empresa activa" });
    }

    const tickets = await Ticket.find({ empresa: empresaId });
    const conSLA = tickets.filter(t => t.fechaLimite);
    const vencidos = conSLA.filter(
      t => t.fechaLimite < new Date() && t.estado !== "cerrado"
    );

    res.json({
      totalSLA: conSLA.length,
      vencidos: vencidos.length,
      cumplimiento:
        conSLA.length === 0
          ? "N/A"
          : ((conSLA.length - vencidos.length) / conSLA.length * 100).toFixed(1) + "%"
    });

  } catch (error) {
    res.status(500).json({ msg: "Error SLA" });
  }
};

// ======================================================
// 📌 5️⃣ DATASET BI
// ======================================================
exports.informeBI = async (req, res) => {
  try {
    const empresaId = req.session.empresaActiva;
    if (!empresaId) {
      return res.status(400).json({ msg: "No hay empresa activa" });
    }

    const tickets = await Ticket.find({ empresa: empresaId });
    const agentes = await User.find({ rol: "agente", empresa: empresaId });

    res.json({ tickets, agentes });

  } catch (error) {
    res.status(500).json({ msg: "Error dataset BI" });
  }
};
