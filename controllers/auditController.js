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
    if (["cliente", "usuario"].includes(req.user.rol)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresaId = req.empresaActiva;

    const filtros = {};

if (empresaId) {
  filtros["empresa.id"] = empresaId;
}


    if (req.query.desde || req.query.hasta) {
      filtros.fecha = {};
      if (req.query.desde) filtros.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtros.fecha.$lte = new Date(req.query.hasta);
    }

    if (req.query.accion) {
      filtros.accion = { $regex: req.query.accion, $options: "i" };
    }

if (req.query.severidad && req.query.severidad !== "todas") {
  filtros.severidad = req.query.severidad;
}

    const logs = await AuditLog.find(filtros)
      .populate("usuario", "nombre email")
      .sort({ fecha: -1 })
      .limit(500);

    res.json(logs);

  } catch (err) {
    console.error("❌ Error auditoría:", err);
    res.status(500).json({ msg: "Error listando auditoría" });
  }
};


// ============================================================
// 📊 EXPORTAR EXCEL — AUDITORÍA (ENTERPRISE / ISO)
// ============================================================
exports.exportarExcel = async (req, res) => {
  try {
    if (["cliente", "usuario"].includes(req.user.rol)) {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresaId = req.empresaActiva;
    const filtros = {};

    // 👑 Superadmin puede ver todo
    if (empresaId) {
      filtros["empresa.id"] = empresaId;
    }

    if (req.query.desde || req.query.hasta) {
      filtros.fecha = {};
      if (req.query.desde) filtros.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtros.fecha.$lte = new Date(req.query.hasta);
    }

    if (req.query.accion) {
      filtros.accion = { $regex: req.query.accion, $options: "i" };
    }
if (req.query.severidad && req.query.severidad !== "todas") {
  filtros.severidad = req.query.severidad;
}

    const logs = await AuditLog.find(filtros)
      .sort({ fecha: -1 });

    const wb = new ExcelJS.Workbook();
    wb.creator = "CJSystem";
    wb.created = new Date();

    const ws = wb.addWorksheet("Auditoría");

    ws.columns = [
  { header: "Fecha", key: "fecha", width: 22 },
  { header: "Usuario", key: "usuario", width: 28 },
  { header: "Empresa", key: "empresa", width: 28 },
  { header: "Acción", key: "accion", width: 28 },
  { header: "Detalle", key: "detalle", width: 40 },
  { header: "Severidad", key: "severidad", width: 16 },
  { header: "IP pública", key: "ipPublica", width: 20 },
  { header: "Ciudad", key: "ciudad", width: 20 },
  { header: "País", key: "pais", width: 10 }
];


    logs.forEach(l => {
      ws.addRow({
  fecha: new Date(l.fecha).toLocaleString(),
  usuario: l.usuario?.nombre || "Sistema",
  empresa: l.empresa?.nombre || "Global",
  accion: l.accion,
  detalle: l.detalle || "",
  severidad: l.severidad,
  ipPublica: l.ipPublica || "—",
  ciudad: l.geo?.ciudad || "—",
  pais: l.geo?.pais || "—"
});

    });

    const buffer = await wb.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=auditoria-cjsystem.xlsx"
    );

    res.send(buffer);

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
   if (req.user.rol === "cliente" || req.user.rol === "usuario") {
  return res.status(403).json({ msg: "No autorizado" });
}


const empresaId = req.empresaActiva;


const filtros = {};

if (empresaId) {
  filtros["empresa.id"] = empresaId;
}



    if (req.query.desde || req.query.hasta) {
      filtros.fecha = {};
      if (req.query.desde) filtros.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtros.fecha.$lte = new Date(req.query.hasta);
    }

    if (req.query.accion) {
      filtros.accion = { $regex: req.query.accion, $options: "i" };
    }
if (req.query.severidad && req.query.severidad !== "todas") {
  filtros.severidad = req.query.severidad;
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

     // IP + Ubicación
const ipTexto = l.ipPublica || "—";
const ciudadTexto = l.geo?.ciudad
  ? `${l.geo.ciudad}, ${l.geo.pais || ""}`
  : "Ubicación no disponible";

doc.fontSize(9)
  .fillColor(gris)
  .text(
    `IP: ${ipTexto} | ${ciudadTexto}`,
    60,
    textY,
    { width: 360 }
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
    // 🔒 Solo superadmin
    if (req.user.rol !== "superadmin") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    // 📊 Total de eventos (TODAS las empresas)
    const total = await AuditLog.countDocuments();

    // 📅 Eventos de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const hoyCount = await AuditLog.countDocuments({
      fecha: { $gte: hoy }
    });

    // 📈 Acciones más frecuentes (GLOBAL)
    const acciones = await AuditLog.aggregate([
      {
        $group: {
          _id: "$accion",
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      total,
      hoy: hoyCount,
      acciones
    });

  } catch (err) {
    console.error("❌ Error dashboard auditoría global:", err);
    res.status(500).json({ msg: "Error dashboard global" });
  }
};

// ============================================================
// 📊 DASHBOARD POR EMPRESA (SEGURO)
// ============================================================
exports.dashboardAuditoriaEmpresa = async (req, res) => {
  try {
    const empresaId = req.params.empresaId;
    if (!empresaId) {
      return res.status(400).json({ msg: "Empresa requerida" });
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
      { $match: { "empresa.id": empresaObjectId } },
      { $group: { _id: "$accion", total: { $sum: 1 } } },
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
