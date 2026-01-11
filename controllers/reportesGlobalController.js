const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const https = require("https");
const path = require("path");
const fs = require("fs");

const Empresa = require("../models/Empresa");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const { getDashboardMetrics } = require("../services/dashboardMetrics");






/* ============================================================
   🖼️ DESCARGAR IMAGEN (QuickChart → Buffer)
============================================================ */
function descargarImagen(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        const data = [];
        res.on("data", chunk => data.push(chunk));
        res.on("end", () => resolve(Buffer.concat(data)));
      })
      .on("error", reject);
  });
}

/* ============================================================
   📊 QUICKCHART URL
============================================================ */
function generarGrafica(config) {
  return `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(config)
  )}&width=700&height=400&backgroundColor=white`;
}



/* ============================================================
   📄 REPORTE GLOBAL PDF (PREMIUM)
============================================================ */
exports.reporteGlobalPDF = async (req, res) => {



  // 🎨 Colores globales del reporte
  const azul = "#4b7bff";       // azul principal CJSystem
  
  let doc;
  try {

    const metrics = await getDashboardMetrics();


    /* =========================
       CONSULTA: TICKETS POR EMPRESA
    ========================= */
   const ticketsPorEmpresa = await Empresa.aggregate([
  {
    $match: { activa: true }   
  },
  {
    $lookup: {
      from: "tickets",
      localField: "_id",
      foreignField: "empresa",
      as: "tickets"
    }
  },
  {
    $project: {
      nombre: 1,
      total: { $size: "$tickets" }
    }
  },
  {
    $sort: { total: -1 }
  }
]);


    /* =========================
       PDF INIT
    ========================= */
    doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=reporte-global-cjsystem.pdf"
    );
    doc.pipe(res);
/* =========================
   🎨 PORTADA ULTRA PRO — CENTRADO REAL
========================= */

const azulOscuro = "#0a1228";

// Fondo
doc.rect(0, 0, doc.page.width, doc.page.height).fill(azulOscuro);

/* =========================
   📐 MEDIDAS
========================= */
const logoSize = 110;

const gapLogoTitle = 24;
const gapTitleSub = 14;
const gapSubInfo = 18;

// Altura estimada del bloque
const blockHeight =
  logoSize +
  gapLogoTitle +
  40 + // título
  gapTitleSub +
  22 + // subtítulo
  gapSubInfo +
  60; // info

// 🔥 Y inicial centrado REAL
const startY = (doc.page.height - blockHeight) / 2;

/* =========================
   🖼️ LOGO
========================= */
const logoPath = path.join(__dirname, "../public/logo-cj.png");

if (fs.existsSync(logoPath)) {
  doc.image(
    logoPath,
    (doc.page.width - logoSize) / 2,
    startY,
    { width: logoSize }
  );
}

/* =========================
   📝 TÍTULO
========================= */
doc
  .fillColor("white")
  .font("Helvetica-Bold")
  .fontSize(34)
  .text(
    "REPORTE GLOBAL",
    0,
    startY + logoSize + gapLogoTitle,
    {
      width: doc.page.width,
      align: "center"
    }
  );

/* =========================
   📝 SUBTÍTULO
========================= */
doc
  .fontSize(18)
  .fillColor("#8eaaff")
  .text(
    "CJSystem HelpDesk SaaS",
    {
      width: doc.page.width,
      align: "center"
    }
  );

/* =========================
   ℹ️ INFO
========================= */
doc
  .moveDown(1)
  .fontSize(13)
  .fillColor("#dbe2ff")
  .text(`Empresas activas: ${metrics.empresas}`, {
    width: doc.page.width,
    align: "center"
  })
  .text(`Tickets totales: ${metrics.totalTickets}`, {
    width: doc.page.width,
    align: "center"
  })
  .text(`Generado: ${new Date().toLocaleDateString()}`, {
    width: doc.page.width,
    align: "center"
  });

// Siguiente página
doc.addPage();


/* =========================
   📊 KPI DASHBOARD (CENTRADO H + V)
========================= */

const kpis = [
  ["Empresas", metrics.empresas],
  ["Admins", metrics.admins],
  ["Agentes", metrics.agentes],
  ["Usuarios", metrics.usuarios],
  ["Tickets", metrics.totalTickets]
];

// Medidas de las cards
const cardWidth = 100;
const cardHeight = 70;
const gap = 12;

// Ancho total del bloque
const totalCards = kpis.length;
const totalWidth =
  totalCards * cardWidth + (totalCards - 1) * gap;

// 👉 X centrado
let x = (doc.page.width - totalWidth) / 2;

// 👉 Y centrado REAL en la página
let y = (doc.page.height - cardHeight) / 2;

// Dibujar tarjetas
kpis.forEach(([label, value]) => {
  doc.roundedRect(x, y, cardWidth, cardHeight, 12).fill("#1b2f70");

  doc.fillColor("white")
     .fontSize(11)
     .text(label, x + 12, y + 12);

  doc.font("Helvetica-Bold")
     .fontSize(22)
     .text(value ?? 0, x + 12, y + 38);

  doc.font("Helvetica");
  x += cardWidth + gap;
});

/* =========================
   📈 TICKETS GLOBALES – ÚLTIMOS 12 MESES
========================= */
doc.addPage();

// Título
doc
  .fontSize(20)
  .fillColor(azul)
  .text("Tickets creados – últimos 12 meses", {
    align: "center"
  });

// URL gráfica (QuickChart)
const grafica12MesesURL = generarGrafica({
  type: "line",
  data: {
    labels: metrics.labelsMeses,
    datasets: [{
      label: "Tickets",
      data: metrics.meses,
      borderColor: azul,
      backgroundColor: "rgba(75,123,255,0.25)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  },
  options: {
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    }
  }
});

try {
  const img12Meses = await descargarImagen(grafica12MesesURL);

  // Tamaño de la gráfica
  const imgW = 480;
  const imgH = 300;

  // Centrado REAL
  const imgX = (doc.page.width - imgW) / 2;
  const imgY = (doc.page.height - imgH) / 2;

  doc.image(img12Meses, imgX, imgY, {
    width: imgW,
    height: imgH
  });

} catch (e) {
  console.error("❌ Error cargando gráfica:", e.message);

  doc
    .moveDown(6)
    .fontSize(12)
    .fillColor("red")
    .text(
      "No fue posible cargar la gráfica de los últimos 12 meses.",
      { align: "center" }
    );
}

/* =========================
   🏢 EMPRESAS – RESUMEN GLOBAL DE TICKETS
========================= */
doc.addPage();

// Título
doc
  .fontSize(22)
  .fillColor(azul)
  .text("Resumen global por empresa", {
    align: "center"
  });

// ⬇️ NO centrado: arranca desde arriba
const startX = 70;
let tableY = 120;

const colEmpresa = 320;
const colTotal = 120;
const rowHeight = 28;

// Encabezado
doc
  .roundedRect(startX, tableY, colEmpresa + colTotal, rowHeight, 8)
  .fill("#1b2f70");

doc
  .fillColor("white")
  .fontSize(12)
  .font("Helvetica-Bold")
  .text("Empresa", startX + 15, tableY + 8)
  .text("Tickets", startX + colEmpresa + 20, tableY + 8);

tableY += rowHeight + 6;

// Filas
ticketsPorEmpresa.forEach((item, index) => {

  // Salto automático si se llena la página
  if (tableY > doc.page.height - 80) {
    doc.addPage();
    tableY = 80;
  }

  const bgColor = index % 2 === 0 ? "#f2f4ff" : "#ffffff";

  doc
    .roundedRect(startX, tableY, colEmpresa + colTotal, rowHeight, 6)
    .fill(bgColor);

  doc
    .fillColor("#000")
    .font("Helvetica")
    .fontSize(11)
    .text(item.nombre, startX + 15, tableY + 8, {
      width: colEmpresa - 20,
      ellipsis: true
    });

  doc
    .font("Helvetica-Bold")
    .fillColor(item.total === 0 ? "#999999" : azul)
    .text(item.total.toString(), startX + colEmpresa + 35, tableY + 8);

  tableY += rowHeight + 6;
});


/* =========================
   🧠 CONCLUSIÓN EJECUTIVA (PREMIUM)
========================= */
doc.addPage();

// =========================
// 🎯 TÍTULO
// =========================
doc
  .font("Helvetica-Bold")
  .fontSize(26)
  .fillColor(azul)
  .text("Conclusión ejecutiva", {
    align: "center"
  });

// =========================
// 📦 CONTENEDOR PRINCIPAL
// =========================
const cardX = 60;
const cardY = 120;
const cardW = doc.page.width - 120;
const cardH = 420;

doc
  .roundedRect(cardX, cardY, cardW, cardH, 20)
  .fill("#f5f7ff");

// =========================
// 📊 KPIs SUPERIORES
// =========================
const kpiY = cardY + 30;
const kpiW = 150;
const kpiH = 80;
const kpiGap = 20;

const kpisExec = [
  { label: "Empresas activas", value: metrics.empresas ?? 0, color: "#4b7bff" },
  { label: "Tickets gestionados", value: metrics.totalTickets ?? 0, color: "#4b7bff" },
  {
    label: "Cumplimiento SLA",
    value: `${metrics.porcentajeSLA ?? 0}%`,
    color:
      metrics.porcentajeSLA >= 80
        ? "#16a34a"
        : metrics.porcentajeSLA >= 60
          ? "#f59e0b"
          : "#dc2626"
  }
];

// 👉 centrado real
let kpiX =
  cardX +
  (cardW - (kpisExec.length * kpiW + (kpisExec.length - 1) * kpiGap)) / 2;

kpisExec.forEach(k => {
  doc.roundedRect(kpiX, kpiY, kpiW, kpiH, 14).fill("#ffffff");

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#555")
    .text(k.label, kpiX + 12, kpiY + 12);

  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor(k.color)
    .text(k.value, kpiX + 12, kpiY + 38);

  kpiX += kpiW + kpiGap;
});

// =========================
// ➖ DIVISOR
// =========================
const dividerY = kpiY + kpiH + 30;

doc
  .moveTo(cardX + 30, dividerY)
  .lineTo(cardX + cardW - 30, dividerY)
  .strokeColor("#d0d6ff")
  .lineWidth(1)
  .stroke();

// =========================
// 🧠 TEXTO EJECUTIVO
// =========================
const topEmpresa = ticketsPorEmpresa.find(e => e.total > 0);

doc
  .font("Helvetica")
  .fontSize(13)
  .fillColor("#000")
  .text(
    `El sistema CJSystem registra actualmente ${metrics.empresas ?? 0} empresas activas, ` +
    `con un total de ${metrics.totalTickets ?? 0} tickets gestionados.\n\n` +

    `La empresa con mayor volumen de solicitudes es ` +
    `"${topEmpresa?.nombre || "N/A"}", ` +
    `con ${topEmpresa?.total || 0} tickets, lo que evidencia una mayor carga operativa ` +
    `en su mesa de ayuda.\n\n` +

    `El nivel de cumplimiento de los acuerdos de nivel de servicio (SLA) se sitúa en ` +
    `${metrics.porcentajeSLA ?? 0}%, reflejando el desempeño general del servicio y ` +
    `permitiendo identificar oportunidades de mejora, redistribución de cargas ` +
    `y optimización de recursos.`,
    cardX + 30,
    dividerY + 30,
    {
      width: cardW - 60,
      align: "justify",
      lineGap: 5
    }
  );

// =========================
// ✅ FIN DEL PDF
// =========================
doc.end();


  } catch (err) {
  console.error("❌ Error PDF Global:", err);

  if (doc && !doc._ended) {
    doc.end();
  }
}

};
/* ============================================================
   📊 EXCEL GLOBAL ENTERPRISE — CJSystem HelpDesk SaaS (PREMIUM)
============================================================ */
exports.reporteGlobalExcel = async (req, res) => {

  

  try {
    
    const metrics = await getDashboardMetrics();
    const now = new Date();

    /* =========================
       🎫 TICKETS COMPLETOS
    ========================= */
    const tickets = await Ticket.find({
  createdAt: { $gte: new Date(Date.now() - 365 * 86400000) }
})

      .populate("empresa", "nombre")
      .populate("creadoPor", "nombre apellido email")
      .populate("asignadoA", "nombre apellido")
      .lean();

    /* =========================
       🏢 TICKETS POR EMPRESA
    ========================= */
    const ticketsPorEmpresa = await Empresa.aggregate([
      { $match: { activa: true } },
      {
        $lookup: {
          from: "tickets",
          localField: "_id",
          foreignField: "empresa",
          as: "tickets"
        }
      },
      {
        $project: {
          nombre: 1,
          total: { $size: "$tickets" }
        }
      },
      { $sort: { total: -1 } }
    ]);

    /* =========================
       👤 TICKETS POR AGENTE
    ========================= */
    const ticketsPorAgente = {};
    tickets.forEach(t => {
      const key = t.asignadoA
        ? [t.asignadoA.nombre, t.asignadoA.apellido].filter(Boolean).join(" ")
        : "Sin asignar";
      ticketsPorAgente[key] = (ticketsPorAgente[key] || 0) + 1;
    });

    /* =========================
       📘 WORKBOOK
    ========================= */
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CJSystem";
    workbook.created = new Date();

    /* =========================
       🎨 ESTILOS
    ========================= */
    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      alignment: { vertical: "middle", horizontal: "center" },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B2F70" } // Azul CJSystem
      },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      }
    };

    /* =========================
       🖼️ LOGO CJSystem
    ========================= */
    const logoPath = path.join(__dirname, "../public/logo-cj.png");
    let logoId = null;

    if (fs.existsSync(logoPath)) {
      logoId = workbook.addImage({
        filename: logoPath,
        extension: "png"
      });
    }


  /* ============================================================
   📄 HOJA 1 — RESUMEN GLOBAL (SOBRIO / EJECUTIVO)
============================================================ */
const resumen = workbook.addWorksheet("Resumen Global", {
  views: [{ state: "frozen", ySplit: 1 }]
});

/* =========================
   🖼️ LOGO (INTEGRADO, NO FLOTANTE)
========================= */
if (logoId) {
  resumen.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 120, height: 120 }
  });
}

/* =========================
   📝 TÍTULO
========================= */
resumen.mergeCells("C1:F1");
resumen.getCell("C1").value = "REPORTE GLOBAL";
resumen.getCell("C1").font = {
  size: 20,
  bold: true,
  color: { argb: "FF1B2F70" }
};
resumen.getCell("C1").alignment = {
  vertical: "middle",
  horizontal: "left"
};

/* =========================
   📝 SUBTÍTULO
========================= */
resumen.mergeCells("C2:F2");
resumen.getCell("C2").value = "CJSystem HelpDesk SaaS – Superadmin";
resumen.getCell("C2").font = {
  size: 12,
  color: { argb: "FF555555" }
};
resumen.getCell("C2").alignment = {
  vertical: "middle",
  horizontal: "left"
};

/* =========================
   ➖ ESPACIO CONTROLADO
========================= */
resumen.addRow({});

/* =========================
   📊 TABLA RESUMEN
========================= */
resumen.columns = [
  { header: "Métrica", key: "m", width: 40 },
  { header: "Valor", key: "v", width: 20 }
];

// Encabezado tabla
const headerResumen = resumen.addRow({
  m: "Métrica",
  v: "Valor"
});

headerResumen.eachCell(c => {
  c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4B7BFF" } // Azul CJSystem más claro
  };
  c.alignment = { vertical: "middle" };
  c.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" }
  };
});

// Datos
[
  ["Empresas activas", metrics.empresas],
  ["Administradores", metrics.admins],
  ["Agentes", metrics.agentes],
  ["Usuarios", metrics.usuarios],
  ["Tickets totales", metrics.totalTickets],
  ["Cumplimiento SLA (%)", `${metrics.porcentajeSLA}%`]
].forEach(row =>
  resumen.addRow({
    m: row[0],
    v: row[1]
  })
);

/* =========================
   🔍 FILTRO
========================= */
resumen.autoFilter = {
  from: "A4",
  to: "B4"
};


    /* ============================================================
       📄 HOJA 2 — TICKETS POR EMPRESA
    ============================================================ */
    const porEmpresa = workbook.addWorksheet("Tickets por Empresa", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    porEmpresa.columns = [
      { header: "Empresa", key: "empresa", width: 40 },
      { header: "Total Tickets", key: "total", width: 20 }
    ];

    porEmpresa.getRow(1).eachCell(c => (c.style = headerStyle));

    ticketsPorEmpresa.forEach(e =>
      porEmpresa.addRow({ empresa: e.nombre, total: e.total })
    );

    porEmpresa.autoFilter = "A1:B1";

    /* ============================================================
       📄 HOJA 3 — DETALLE DE TICKETS
    ============================================================ */
    const detalle = workbook.addWorksheet("Detalle Tickets", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    detalle.columns = [
      { header: "Código", key: "codigo", width: 18 },
      { header: "Empresa", key: "empresa", width: 30 },
      { header: "Usuario creador", key: "creador", width: 30 },
      { header: "Correo usuario", key: "correo", width: 35 },
      { header: "Agente asignado", key: "agente", width: 30 },
      { header: "Título", key: "titulo", width: 40 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "Prioridad", key: "prioridad", width: 18 },
      { header: "Fecha creación", key: "fecha", width: 20 }
    ];

    detalle.getRow(1).eachCell(c => (c.style = headerStyle));

    tickets.forEach(t => {
      detalle.addRow({
        codigo: t.codigo,
        empresa: t.empresa?.nombre || "—",
        creador: t.creadoPor
          ? [t.creadoPor.nombre, t.creadoPor.apellido].filter(Boolean).join(" ")
          : "—",
        correo: t.creadoPor?.email || "—",
        agente: t.asignadoA
          ? [t.asignadoA.nombre, t.asignadoA.apellido].filter(Boolean).join(" ")
          : "Sin asignar",
        titulo: t.titulo,
        estado: t.estado,
        prioridad: t.prioridad,
        fecha: new Date(t.createdAt).toLocaleDateString()
      });
    });

    detalle.autoFilter = "A1:I1";

    /* ============================================================
       📄 HOJA 4 — SLA (VENCIDO / EN RIESGO)
    ============================================================ */
    const sla = workbook.addWorksheet("SLA", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    sla.columns = [
      { header: "Código", key: "codigo", width: 18 },
      { header: "Empresa", key: "empresa", width: 30 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "Fecha límite", key: "limite", width: 20 },
      { header: "Situación", key: "situacion", width: 22 }
    ];

    sla.getRow(1).eachCell(c => (c.style = headerStyle));

    tickets.forEach(t => {
      if (!t.fechaLimite) return;
      const diff = new Date(t.fechaLimite) - now;
      let situacion = diff < 0 ? "VENCIDO" : diff < 86400000 ? "EN RIESGO" : null;

      if (situacion) {
        sla.addRow({
          codigo: t.codigo,
          empresa: t.empresa?.nombre,
          estado: t.estado,
          limite: new Date(t.fechaLimite).toLocaleDateString(),
          situacion
        });
      }
    });

    sla.autoFilter = "A1:E1";

    /* ============================================================
       📄 HOJA 5 — TICKETS POR AGENTE
    ============================================================ */
    const porAgente = workbook.addWorksheet("Tickets por Agente", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    porAgente.columns = [
      { header: "Agente", key: "agente", width: 35 },
      { header: "Tickets asignados", key: "total", width: 22 }
    ];

    porAgente.getRow(1).eachCell(c => (c.style = headerStyle));

    Object.entries(ticketsPorAgente).forEach(([agente, total]) =>
      porAgente.addRow({ agente, total })
    );

    porAgente.autoFilter = "A1:B1";

    /* =========================
       📤 RESPUESTA
    ========================= */
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reporte-global-cjsystem-enterprise.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ Error Excel Enterprise:", err);
    res.status(500).json({ msg: "Error generando Excel enterprise" });
  }
};
