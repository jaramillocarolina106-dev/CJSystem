// controllers/auditController.js
const AuditLog = require("../models/AuditLog");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");


// ============================================================
// 📜 LISTAR AUDITORÍA
// ============================================================
exports.listarAuditoria = async (req, res) => {
  try {
    const filtros = {};

    if (req.query.desde || req.query.hasta) {
      filtros.fecha = {};
      if (req.query.desde) filtros.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtros.fecha.$lte = new Date(req.query.hasta);
    }

    if (req.query.accion) {
      filtros.accion = { $regex: req.query.accion, $options: "i" };
    }

    const logs = await AuditLog.find(filtros)
      .populate("usuario", "nombre email")
      .sort({ fecha: -1 })
      .limit(500);

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error listando auditoría" });
  }
};

// ============================================================
// 📊 EXPORTAR EXCEL — AUDITORÍA (ENTERPRISE / ISO)
// ============================================================
exports.exportarExcel = async (req, res) => {
  try {
    const filtros = {};

    if (req.query.desde || req.query.hasta) {
      filtros.fecha = {};
      if (req.query.desde) filtros.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtros.fecha.$lte = new Date(req.query.hasta);
    }

    if (req.query.accion) {
      filtros.accion = { $regex: req.query.accion, $options: "i" };
    }

    const logs = await AuditLog.find(filtros)
      .populate("usuario", "nombre email")
      .populate("empresa", "nombre")
      .sort({ fecha: -1 });


    const wb = new ExcelJS.Workbook();
    wb.creator = "CJSystem";
    wb.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      alignment: { vertical: "middle" },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B2F70" }
      },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      }
    };

    const ws = wb.addWorksheet("Auditoría", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    ws.columns = [
      { header: "Fecha", key: "fecha", width: 22 },
      { header: "Usuario", key: "usuario", width: 28 },
      { header: "Correo", key: "correo", width: 32 },
      { header: "Empresa", key: "empresa", width: 28 },
      { header: "Acción", key: "accion", width: 28 },
      { header: "Detalle", key: "detalle", width: 40 },
      { header: "IP", key: "ip", width: 20 },
      { header: "Severidad", key: "severidad", width: 16 }
    ];

    ws.getRow(1).eachCell(c => (c.style = headerStyle));

    logs.forEach(l => {
  ws.addRow({
    fecha: new Date(l.fecha).toLocaleString(),

    usuario: l.usuario?.nombre || "Sistema",

    correo: l.usuario?.email
      ? l.usuario.email
      : "No aplica",

    empresa: l.empresa?.nombre || "Sistema / Global",

    accion: l.accion,

    detalle: l.detalle || "",

    ip: l.ip === "::1"
      ? "Localhost"
      : (l.ip || "-").replace("::ffff:", ""),

    severidad: l.severidad
  });
});


    ws.autoFilter = "A1:H1";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=auditoria-cjsystem.xlsx"
    );

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ Error exportando Excel auditoría:", err);
    res.status(500).json({ msg: "Error exportando Excel" });
  }
};

// ============================================================
// 📄 EXPORTAR PDF — AUDITORÍA (ENTERPRISE / ISO / ESTABLE)
// ============================================================
exports.exportarPDF = async (req, res) => {
  let doc;

  try {
    const filtros = {};

    if (req.query.desde || req.query.hasta) {
      filtros.fecha = {};
      if (req.query.desde) filtros.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtros.fecha.$lte = new Date(req.query.hasta);
    }

    if (req.query.accion) {
      filtros.accion = { $regex: req.query.accion, $options: "i" };
    }

    const logs = await AuditLog.find(filtros)
      .populate("usuario", "nombre email")
      .populate("empresa", "nombre")
      .sort({ fecha: -1 })
      .limit(300);


    doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=auditoria-cjsystem.pdf"
    );

    doc.pipe(res);

    /* =========================
       🎨 COLORES
    ========================= */
    const azulOscuro = "#0a1228";
    const azulClaro = "#8eaaff";
    const gris = "#555";

    /* =========================
       🖼️ PORTADA
    ========================= */
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(azulOscuro);

    const logoPath = path.join(__dirname, "../public/logo-cj.png");
    const logoSize = 120;
    const centerX = doc.page.width / 2;
    const startY = doc.page.height / 2 - 140;

    if (fs.existsSync(logoPath)) {
      doc.image(
        logoPath,
        centerX - logoSize / 2,
        startY,
        { width: logoSize }
      );
    }

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(34)
      .text(
        "REPORTE DE AUDITORÍA",
        0,
        startY + logoSize + 30,
        { align: "center" }
      );

    doc
      .fontSize(18)
      .fillColor(azulClaro)
      .text(
        "CJSystem HelpDesk SaaS",
        0,
        startY + logoSize + 75,
        { align: "center" }
      );

    doc
      .fontSize(13)
      .fillColor("#dbe2ff")
      .text(
        `Generado: ${new Date().toLocaleString()}`,
        0,
        startY + logoSize + 110,
        { align: "center" }
      );

    // 👉 pasar a contenido
    doc.addPage();
    doc.y = 50;

    /* =========================
       📋 REGISTROS
    ========================= */
    const CARD_HEIGHT = 120;
    const PAGE_BOTTOM = doc.page.height - 80;

    logs.forEach(l => {
      // 👉 validar espacio
      if (doc.y + CARD_HEIGHT > PAGE_BOTTOM) {
        doc.addPage();
        doc.y = 50;
      }

      const y = doc.y;

      const colorSeveridad =
        l.severidad === "alta"
          ? "#dc2626"
          : l.severidad === "media"
          ? "#f59e0b"
          : "#16a34a";

      // Fondo card
      doc
        .save()
        .roundedRect(45, y, 520, CARD_HEIGHT, 12)
        .fillOpacity(0.05)
        .fill("#4b7bff")
        .restore();

      let textY = y + 12;

      doc.fontSize(9).fillColor(gris)
        .text(`Fecha: ${new Date(l.fecha).toLocaleString()}`, 60, textY);

      textY += 16;

      doc.fontSize(12).fillColor("#000").font("Helvetica-Bold")
        .text(`Acción: ${l.accion}`, 60, textY);

      doc.font("Helvetica");
      textY += 20;

      doc.fontSize(10)
        .text(
          `Usuario: ${l.usuario?.nombre || "Sistema"} (${l.usuario?.email || "No aplica"})`,
          60,
          textY
        );

      textY += 14;

      doc.text(
        `Empresa: ${l.empresa?.nombre || "Sistema / Global"}`,
        60,
        textY
      );

      textY += 14;

      doc.text(`Detalle: ${l.detalle || "-"}`, 60, textY);

      textY += 18;

      // IP
      doc.fontSize(9).fillColor(gris)
        .text(
          `IP: ${
            l.ip === "::1"
              ? "Localhost"
              : (l.ip || "-").replace("::ffff:", "")
          }`,
          60,
          textY,
          { width: 300 }
        );

      // Severidad (SIN continued)
      doc.font("Helvetica-Bold")
        .fillColor(colorSeveridad)
        .text(
          `Severidad: ${l.severidad}`,
          370,
          textY,
          { width: 180 }
        );

      doc.font("Helvetica").fillColor("#000");

      // 👉 avanzar cursor (CLAVE)
      doc.y = y + CARD_HEIGHT + 12;
    });

    doc.end();

  } catch (err) {
    console.error("❌ Error exportando PDF auditoría:", err);
    if (doc && !doc._ended) doc.end();
  }
};


// ============================================================
// 📊 DASHBOARD GLOBAL
// ============================================================
exports.dashboardAuditoria = async (req, res) => {
  try {
    const totalEventos = await AuditLog.countDocuments();

    const accionesTop = await AuditLog.aggregate([
      { $group: { _id: "$accion", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.json({ totalEventos, accionesTop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error dashboard auditoría" });
  }
};

// ============================================================
// 📊 DASHBOARD POR EMPRESA (SEGURO)
// ============================================================
exports.dashboardAuditoriaEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.params;

    // 🔒 VALIDACIÓN DE SEGURIDAD
    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({
        msg: "ID de empresa inválido"
      });
    }

    const empresaObjectId = new mongoose.Types.ObjectId(empresaId);

    const total = await AuditLog.countDocuments({
      "empresa.id": empresaObjectId
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const hoyCount = await AuditLog.countDocuments({
      "empresa.id": empresaObjectId,
      fecha: { $gte: hoy }
    });

    const acciones = await AuditLog.aggregate([
      {
        $match: {
          "empresa.id": empresaObjectId
        }
      },
      {
        $group: {
          _id: "$accion",
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      total,
      hoy: hoyCount,
      acciones
    });

  } catch (err) {
    console.error("❌ Error dashboard auditoría empresa:", err);
    res.status(500).json({ msg: "Error dashboard empresa" });
  }
};
