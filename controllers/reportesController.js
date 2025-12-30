const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const https = require("https");
const path = require("path");
const fs = require("fs");

const Empresa = require("../models/Empresa");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
let getDashboardMetrics;

async function loadMetrics() {
  if (!getDashboardMetrics) {
    const mod = await import("../services/dashboardMetrics.js");
    getDashboardMetrics = mod.getDashboardMetrics;


  }
}



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
   📄 PDF POR EMPRESA (CON GRÁFICA)
============================================================ */
exports.reporteEmpresaPDF = async (req, res) => {
  let doc;

  try {

        await loadMetrics();

    /* =========================
       CONTEXTO DE EMPRESA
    ========================= */
    if (!req.user) {
      return res.status(401).json({ msg: "No autenticado" });
    }

    let empresaId = req.user.empresa;

// 🔥 SUPERADMIN IMPERSONANDO EMPRESA (CORRECTO)
if (req.user.rol === "superadmin") {
  if (!req.cookies.empresaActiva) {
    return res.status(400).json({ msg: "Superadmin sin empresa activa" });
  }

  empresaId = new mongoose.Types.ObjectId(req.cookies.empresaActiva);
}


    if (!empresaId) {
      return res.status(401).json({ msg: "No hay empresa activa" });
    }

    const tipo = req.query.tipo || "mensual"; // mensual | anual
    const { desde, hasta } = req.query;


    const empresa = await Empresa.findById(empresaId).lean();
    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

  /* =========================
   RANGO DE FECHAS
========================= */
const hoy = new Date();

let fechaDesde;
let fechaHasta = new Date();

if (req.query.desde && req.query.hasta) {
  fechaDesde = new Date(req.query.desde);
  fechaDesde.setUTCHours(0, 0, 0, 0);

  fechaHasta = new Date(req.query.hasta);
  fechaHasta.setUTCHours(23, 59, 59, 999);
}
 else if (tipo === "anual") {
  // 📌 REPORTE ANUAL
  fechaDesde = new Date(hoy.getFullYear(), 0, 1);
} else {
  // 📌 REPORTE MENSUAL
  fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}



    /* =========================
   FILTRO BASE DE FECHA
========================= */
const filtroFecha = {
  empresa: empresaId,
  createdAt: { $gte: fechaDesde, $lte: fechaHasta }
};

/* =========================
   🎯 TIPO DE FILTRO (PDF)
========================= */
let tipoFiltro = "normal";

if (req.query.hoy === "1") {
  tipoFiltro = "hoy";
}
else if (req.query.semana === "1") {
  tipoFiltro = "semana";
}
else if (req.query.mes === "1") {
  tipoFiltro = "mes";
}
else if (req.query.desde && req.query.hasta) {
  tipoFiltro = "rango";
}



 /* =========================
   MÉTRICAS
========================= */
const metrics = await getDashboardMetrics(
  empresaId,
  {
    desde: fechaDesde,
    hasta: fechaHasta
  },
  tipoFiltro
);




// Total REAL
const totalTickets =
  metrics.estado.abierto +
  metrics.estado.en_progreso +
  metrics.estado.escalado +
  metrics.estado.cerrado;



    /* =========================
   🏆 TOP USUARIOS (CREADORES)
========================= */
const topCreadores = await Ticket.aggregate([
  {
    $match: {
  empresa: empresaId,
  creadoPor: { $ne: null },
  createdAt: { $gte: fechaDesde, $lte: fechaHasta }
}
  },
  {
    $group: {
      _id: "$creadoPor",
      total: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "usuario"
    }
  },
  { $unwind: "$usuario" },
  {
    $project: {
      nombre: {
        $concat: [
          "$usuario.nombre",
          " ",
          { $ifNull: ["$usuario.apellido", ""] }
        ]
      },
      total: 1
    }
  },
  { $sort: { total: -1 } },
  { $limit: 5 }
]);



const rankingUsuarios = topCreadores.map(u => ({
  nombre: u.nombre,
  total: u.total
}));

// =========================
// 🔥 FORZAR RANKING SIEMPRE
// =========================
let rankingForzado = rankingUsuarios;

// Si no hay usuarios, usamos tickets totales
if (!rankingForzado || rankingForzado.length === 0) {
  rankingForzado = [{
  nombre: "Sin usuario",
  total: totalTickets || 1
}];

} 
/* =========================
   🧑‍💻 TOP AGENTES (CASOS ATENDIDOS)
========================= */
const topAgentes = await Ticket.aggregate([
  {
    $match: {
  empresa: empresaId,
  asignadoA: { $ne: null },
  estado: "cerrado",
  createdAt: {
    $gte: fechaDesde,
    $lte: fechaHasta
  }
}

  },
  {
    $group: {
      _id: "$asignadoA",
      total: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "agente"
    }
  },
  { $unwind: "$agente" },
  {
    $project: {
      nombre: {
        $concat: [
          "$agente.nombre",
          " ",
          { $ifNull: ["$agente.apellido", ""] }
        ]
      },
      total: 1
    }
  },
  { $sort: { total: -1 } },
  { $limit: 5 }
]);



const rankingAgentes = topAgentes.map(a => ({
  nombre: a.nombre,
  total: a.total
}));

// 🔥 SI NO HAY DATOS, NO DEJAMOS EL PDF VACÍO
if (rankingAgentes.length === 0) {
  rankingAgentes.push({
    nombre: "Sin actividad en el periodo",
    total: 0
  });
}



/* =========================
   🚨 FALLAS MÁS RECURRENTES
========================= */
const matchFecha = {
  createdAt: { $gte: fechaDesde, $lte: fechaHasta }
};

const fallasFrecuentes = await Ticket.aggregate([
  {
    $match: {
      empresa: empresaId,
      categoria: { $ne: null },
      ...matchFecha
    }
  },

  {
    $group: {
      _id: "$categoria",
      total: { $sum: 1 }
    }
  },
  { $sort: { total: -1 } },
  { $limit: 5 }
]);



const fallasForzadas =
  fallasFrecuentes.length > 0
    ? fallasFrecuentes
    : [{ _id: "Sin fallas registradas", total: 1 }];




    /* =========================
       BRANDING
    ========================= */
    const color = empresa.branding?.colorPrimario || "#4b7bff";
    const nombreEmpresa =
      empresa.branding?.nombreVisible || empresa.nombre;

    /* =========================
       PDF INIT
    ========================= */
    doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte-${nombreEmpresa}-${tipo}.pdf`
    );

    doc.pipe(res);

/* =========================
   🎨 PORTADA PRO – ALTA LEGIBILIDAD
========================= */

const verdeEmpresa = empresa.branding?.colorPrimario || "#b6e35c";

const azulOscuro = "#0f1e46";
const azul = "#4b7bff"; // azul CJSystem


// Fondo principal
doc.rect(0, 0, doc.page.width, 280).fill(verdeEmpresa);

// Overlays
doc.save();
doc.fillColor(azul).opacity(0.35)
  .rect(doc.page.width * 0.4, 0, doc.page.width * 0.6, 280).fill();
doc.restore();

doc.save();
doc.fillColor(azulOscuro).opacity(0.35)
  .rect(doc.page.width * 0.65, 0, doc.page.width * 0.35, 280).fill();
doc.restore();

// Banda de contraste
doc.save();
doc.fillColor("#000").opacity(0.25)
  .roundedRect(40, 60, 520, 170, 18).fill();
doc.restore();

// Texto portada
doc.fillColor("white")
  .font("Helvetica-Bold").fontSize(38)
  .text("CJSystem", 70, 85);

doc.font("Helvetica").fontSize(18)
  .text("Reporte de Tickets", 70, 135);

doc.fontSize(15)
  .text(`${nombreEmpresa} · ${tipo.toUpperCase()}`, 70, 170);

doc.fontSize(11).opacity(0.9)
  .text(`Generado el ${new Date().toLocaleDateString()}`, 70, 200)
  .opacity(1);

// Logo empresa
if (empresa.branding?.logoPath) {
  const logoPath = path.resolve(
    __dirname, "..", "public",
    empresa.branding.logoPath.replace(/^\/+/, "")
  );
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width - 180, 80, { width: 110 });
  }
}

// Línea inferior elegante de la portada
doc.moveTo(60, 280)
  .lineTo(doc.page.width - 60, 280)
  .strokeColor("rgba(255,255,255,0.6)")
  .stroke();

/* ======================================================
   📊 RESUMEN GENERAL (MISMA PÁGINA)
====================================================== */

// Posicionamos el cursor debajo de la portada
doc.y = 320;

doc.fillColor(color)
  .fontSize(26)
  .text("Resumen General", { align: "center" });

doc.moveDown(2);

/* =========================
   DASHBOARD KPIs
========================= */

const startX = 20;
const startY = doc.y;

// 🔻 cards más pequeñas
const cardW = 130;
const cardH = 70;

// 🔻 menos espacio entre cards
const gapX = 15;
const gapY = 15;

// 👉 4 columnas máximo
const drawCard = (col, row, titulo, valor, bg, colorTexto = "white") => {
  const x = startX + col * (cardW + gapX);
  const y = startY + row * (cardH + gapY);

  doc.roundedRect(x, y, cardW, cardH, 12).fill(bg);
  doc.fillColor(colorTexto).fontSize(11).text(titulo, x + 12, y + 10);
  doc.font("Helvetica-Bold").fontSize(22).text(valor, x + 12, y + 36);
  doc.font("Helvetica");
};

drawCard(0, 0, "Abiertos", metrics.estado.abierto, "#4b7bff");
drawCard(1, 0, "En Progreso", metrics.estado.en_progreso, "#ffcc00");
drawCard(2, 0, "Escalados", metrics.estado.escalado, "#ff7b00");
drawCard(3, 0, "Cerrados", metrics.estado.cerrado, "#28a745");

drawCard(0, 1, "Alta", metrics.prioridad.alta, "#ff4b4b");
drawCard(1, 1, "Media", metrics.prioridad.media, "#ffcc00");
drawCard(2, 1, "Baja", metrics.prioridad.baja, "#4b7bff");
drawCard(3, 1, "Total", totalTickets, color);

drawCard(0, 2, "Hoy", metrics.hoy, "#6c757d");
drawCard(1, 2, "Semana", metrics.semana, "#6c757d");
drawCard(2, 2, "30 días", metrics.mes, "#6c757d");
drawCard(3, 2, "SLA", `${metrics.porcentajeSLA}%`, "#0f1e46", "#ff4b4b");



/* ======================================================
   📊 TICKETS POR ESTADO
====================================================== */
doc.addPage();

/* =========================
   TÍTULO (FIJO)
========================= */
const tituloY = 80;

doc.fontSize(18).text("Tickets por Estado", 0, tituloY, {
  align: "center"
});

const graficaEstadoURL = generarGrafica({
  type: "doughnut",
  data: {
    labels: ["Abiertos", "En progreso", "Escalados", "Cerrados"],
    datasets: [{
      data: [
        metrics.estado.abierto,
        metrics.estado.en_progreso,
        metrics.estado.escalado,
        metrics.estado.cerrado
      ],
      backgroundColor: ["#4b7bff","#ffcc00","#ff7b00","#28a745"]
    }]
  },
  options: {
    responsive: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "top",
        align: "center"
      },
      datalabels: {
        color: "#fff",
        font: { weight: "bold", size: 16 },
       formatter: (value, ctx) => {
  if (value === 0) return null; 
  const label = ctx.chart.data.labels[ctx.dataIndex];
  return `${label}\n${value}`;
}

      }
    }
  }
});

const imgEstado = await descargarImagen(graficaEstadoURL);

/* =========================
   CENTRADO REAL DEL DONUT
========================= */
const imgWidth = 420;

// centro horizontal
const x = (doc.page.width - imgWidth) / 2;

// centro vertical real
const y = (doc.page.height - imgWidth) / 2 + 40;

doc.image(imgEstado, x, y, { width: imgWidth });



/* ======================================================
   🏆 TOP USUARIOS (FORZADO)
====================================================== */
doc.addPage();

doc.fontSize(18)
   .fillColor("black")
   .text("Top usuarios que más tickets crean", { align: "center" });

doc.moveDown(2);

// 📊 GRÁFICA
const graficaTopUsuariosURL = generarGrafica({
  type: "bar",
  data: {
    labels: rankingForzado.map(u => u.nombre),
    datasets: [{
      label: "Tickets creados",
      data: rankingForzado.map(u => u.total),
      backgroundColor: "#4b7bff",

      // 🔧 CLAVE PARA EL ANCHO
      barThickness: 60,
      maxBarThickness: 70,
      borderRadius: 8
    }]
  },
  options: {
    responsive: false,
    layout: {
      padding: {
        left: 30,
        right: 30,
        bottom: 20
      }
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 14
          },
          color: "#000"
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          stepSize: 1
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }
});


// 📥 Descargar imagen
const imgTopUsuarios = await descargarImagen(graficaTopUsuariosURL);

  // 📐 Tamaño y centrado
  const topImgWidth = 480; 
  const topImgHeight = 300;

  const topImgX = (doc.page.width - topImgWidth) / 2; 
  const topImgY = (doc.page.height - topImgHeight) / 2 + 40;

  doc.image(imgTopUsuarios, topImgX, topImgY, { 
    width: topImgWidth, 
    height: topImgHeight 
  });

// =========================
// 📋 LISTADO DE USUARIOS DEL MES (ANTES DE LA GRÁFICA)
// =========================
doc.fontSize(14)
   .fillColor("black")
   .text("Usuarios del mes con más casos:");

doc.moveDown(0.5);

if (rankingForzado && rankingForzado.length > 0) {
  rankingForzado.forEach((u, i) => {
    doc.fontSize(12)
       .fillColor("gray")
       .text(
         `${i + 1}. ${u.nombre} — ${u.total} ticket${u.total !== 1 ? "s" : ""}`
       );
  });
} else {
  doc.fontSize(12)
     .fillColor("gray")
     .text("No hubo tickets creados en este periodo.");
}

doc.moveDown(2);

doc.addPage();


  const graficaTopAgentesURL = generarGrafica({
  type: "bar",
  data: {
    labels: rankingAgentes.map(a => a.nombre),
    datasets: [{
      label: "Casos atendidos",
      data: rankingAgentes.map(a => a.total),
      backgroundColor: "#28a745",
      barThickness: 60,
      maxBarThickness: 70,
      borderRadius: 8
    }]
  },
  options: {
    responsive: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }
});

const imgTopAgentes = await descargarImagen(graficaTopAgentesURL);

// centrado
const agImgW = 480;
const agImgH = 300;

doc.image(
  imgTopAgentes,
  (doc.page.width - agImgW) / 2,
  (doc.page.height - agImgH) / 2 - 40,
  { width: agImgW, height: agImgH }
);

doc.moveDown(2);

doc.fontSize(14)
   .fillColor("black")
   .text("Agentes del mes con más casos atendidos:");

doc.moveDown(0.5);

if (rankingAgentes && rankingAgentes.length > 0) {
  rankingAgentes.forEach((a, i) => {
    doc.fontSize(12)
       .fillColor("gray")
       .text(
         `${i + 1}. ${a.nombre} — ${a.total} ticket${a.total !== 1 ? "s" : ""}`
       );
  });
} else {
  doc.fontSize(12)
     .fillColor("gray")
     .text("No hubo tickets asignados a agentes en este periodo.");
}

doc.moveDown(2);




/* ======================================================
   🚨 FALLAS MÁS RECURRENTES
====================================================== */
doc.addPage();

const graficaFallasURL = generarGrafica({
  type: "doughnut",
  data: {
    labels: fallasForzadas.map(f => f._id),
    datasets: [{
      data: fallasForzadas.map(f => f.total),
      backgroundColor: [
        "#4b7bff",
        "#ffcc00",
        "#ff7b00",
        "#28a745",
        "#6c757d"
      ]
    }]
  },
  options: {
    responsive: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "top",
        align: "center"
      }
    }
  }
}, );


const imgFallas = await descargarImagen(graficaFallasURL);

/* ======================================================
   🚨 FALLAS MÁS RECURRENTES
====================================================== */

// ===============================
// FALLAS MÁS RECURRENTES
// ===============================

// Título
doc.fontSize(18)
   .fillColor("black")
   .text("Fallas más recurrentes", { align: "center" });

doc.moveDown(1);

// Espacio después del título
doc.moveDown(1.5);

// Tamaño del donut
const imgFallasSize = 400;

// centro horizontal
const imgFallasX = (doc.page.width - imgFallasSize) / 2;

// centro vertical REAL (compensando título)
const imgFallasY =
  (doc.page.height - imgFallasSize) / 2 + 40;

doc.image(imgFallas, imgFallasX, imgFallasY, {
  width: imgFallasSize
});

/* ======================================================
   📈 TICKETS CREADOS POR MES (ANUAL)
====================================================== */
if (tipo === "anual") {

  doc.addPage();

  const graficaMesesURL = generarGrafica({
    type: "line",
    data: {
      labels: metrics.labelsMeses, // 🔥 MESES REALES
      datasets: [{
        label: "Tickets creados",
        data: metrics.meses,
        borderColor: "#4b7bff",
        backgroundColor: "rgba(75,123,255,0.25)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });

  const imgMeses = await descargarImagen(graficaMesesURL);

  doc.fontSize(18)
     .fillColor("black")
     .text("Tickets creados por mes (últimos 12 meses)", {
       align: "center"
     });

  doc.moveDown(2);

  // 🔥 centrado real
  const imgMesesW = 480;
  const imgMesesX = (doc.page.width - imgMesesW) / 2;

  doc.image(imgMeses, imgMesesX, doc.y, {
    width: imgMesesW
  });
}


/* ======================================================
   ⚡ TICKETS POR PRIORIDAD
====================================================== */
doc.addPage();

const graficaPrioridadURL = generarGrafica({
  type: "bar",
  data: {
    labels: ["Alta", "Media", "Baja"],
   datasets: [{
  label: "Cantidad de tickets",
  data: [
    metrics.prioridad.alta,
    metrics.prioridad.media,
    metrics.prioridad.baja
  ],
  backgroundColor: ["#ff4b4b", "#ffcc00", "#4b7bff"]
}]

  }
});

const imgPrioridad = await descargarImagen(graficaPrioridadURL);

// Título
doc.fontSize(18)
   .fillColor("black")
   .text("Tickets por Prioridad", { align: "center" });

doc.moveDown(2);

// 🔥 CENTRADO REAL
const imgPrioridadW = 360;
const imgPrioridadX = (doc.page.width - imgPrioridadW) / 2;

// 🔥 tamaño visual equilibrado
const imgPrioridadH = 400;

// 🔥 centrado vertical real (como el donut)
const imgPrioridadY =
  (doc.page.height - imgPrioridadH) / 2 + 40;

doc.image(
  imgPrioridad,
  imgPrioridadX,
  imgPrioridadY,
  {
    width: imgPrioridadW,
    height: imgPrioridadH
  }
);



/* =========================
   🧠 CONCLUSIONES — VISTA EJECUTIVA
========================= */
doc.addPage();

/* =========================
   CONTENEDOR PRINCIPAL
========================= */
const boxX = 50;
const boxY = 80;
const boxW = doc.page.width - 100;
const boxH = doc.page.height - 160;

// Fondo suave con branding
doc.roundedRect(boxX, boxY, boxW, boxH, 20)
   .fill("#f5f7fb");

// Posición interna
let contentY = boxY + 30;
const textX = boxX + 35;

/* =========================
   🔹 CONCLUSIÓN 1 — FALLAS
========================= */
doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor(color)
   .text("Categoría con mayor número de incidentes", textX, contentY);

contentY += 24;

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     `Durante el periodo ${tipo}, la categoría que concentró el mayor número de ` +
     `incidentes fue "${fallasFrecuentes[0]?._id || "N/A"}", con ` +
     `${fallasFrecuentes[0]?.total || 0} tickets registrados. ` +
     `Este comportamiento sugiere un punto crítico recurrente que debe ser ` +
     `priorizado dentro de los planes de mejora.`,
     textX,
     contentY,
     { width: boxW - 70 }
   );

contentY += 55;

/* =========================
   🔹 CONCLUSIÓN 2 — USUARIOS
========================= */
doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor("#28a745")
   .text("Usuarios con mayor generación de solicitudes", textX, contentY);

contentY += 24;

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     `El usuario con mayor número de solicitudes fue ` +
     `${rankingUsuarios[0]?.nombre || "N/A"}, quien generó ` +
     `${rankingUsuarios[0]?.total || 0} tickets. ` +
     `Esto puede indicar una alta dependencia del servicio o la necesidad ` +
     `de acompañamiento adicional en su entorno de trabajo.`,
     textX,
     contentY,
     { width: boxW - 70 }
   );

contentY += 55;

/* =========================
   🔹 CONCLUSIÓN 3 — AGENTES
========================= */
doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor("#17a2b8")
   .text("Distribución de carga operativa por agentes", textX, contentY);

contentY += 24;

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     `El agente con mayor volumen de casos atendidos fue ` +
     `${rankingAgentes[0]?.nombre || "N/A"}, con ` +
     `${rankingAgentes[0]?.total || 0} tickets gestionados. ` +
     `Esta información permite identificar posibles concentraciones de carga ` +
     `operativa y evaluar la distribución equitativa del trabajo.`,
     textX,
     contentY,
     { width: boxW - 70 }
   );

contentY += 55;

/* =========================
   🔹 CONCLUSIÓN 4 — PRIORIDAD
========================= */
const prioridadDominante = Object.entries(metrics.prioridad)
  .sort((a, b) => b[1] - a[1])[0];

doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor("#ff7b00")
   .text("Análisis por nivel de prioridad", textX, contentY);

contentY += 24;

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     `La mayor cantidad de tickets se concentró en prioridad ` +
     `"${prioridadDominante[0].toUpperCase()}", con ` +
     `${prioridadDominante[1]} casos. ` +
     `Este patrón refleja el tipo de impacto operativo más frecuente ` +
     `y facilita la definición de estrategias de atención.`,
     textX,
     contentY,
     { width: boxW - 70 }
   );

contentY += 55;



/* =========================
   🔹 CONCLUSIÓN 5 — ESTADOS
========================= */
const estadoDominante = Object.entries(metrics.estado)
  .sort((a, b) => b[1] - a[1])[0];

doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor("#4b7bff")
   .text("Estado operativo de los tickets", textX, contentY);

contentY += 24;

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     `El estado predominante de los tickets fue "${estadoDominante[0]}", ` +
     `con ${estadoDominante[1]} registros. ` +
     `Este resultado permite evaluar el nivel de resolución y control ` +
     `del servicio durante el periodo analizado.`,
     textX,
     contentY,
     { width: boxW - 70 }
   );

contentY += 55;

/* =========================
   🔹 CONCLUSIÓN 6 — SLA
========================= */
const slaTexto =
  metrics.porcentajeSLA >= 90
    ? "un cumplimiento óptimo del nivel de servicio."
    : metrics.porcentajeSLA >= 70
      ? "un cumplimiento aceptable, con oportunidades de mejora."
      : "un nivel crítico que requiere acciones inmediatas.";

doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor("#dc3545")
   .text("Cumplimiento de acuerdos de nivel de servicio (SLA)", textX, contentY);

contentY += 24;

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     `El porcentaje de cumplimiento de SLA fue del ${metrics.porcentajeSLA}%, ` +
     `lo cual indica ${slaTexto} ` +
     `Este indicador es clave para la percepción de calidad del servicio.`,
     textX,
     contentY,
     { width: boxW - 70 }
   );

contentY += 55;

/* =========================
   🔹 CONCLUSIÓN 7 — VISIÓN GENERAL
========================= */
doc.font("Helvetica-Bold")
   .fontSize(14)
   .fillColor(color)
   .text("Conclusión general", textX, contentY);

contentY += 24;

const conclusionFinal =
  tipo === "anual"
    ? "Este reporte anual consolida el comportamiento del servicio a lo largo del año, permitiendo identificar tendencias, recurrencias y oportunidades de mejora estratégica."
    : "Este reporte mensual refleja el comportamiento operativo del servicio, facilitando acciones correctivas inmediatas y seguimiento continuo.";

doc.font("Helvetica")
   .fontSize(12)
   .fillColor("#000")
   .text(
     conclusionFinal,
     textX,
     contentY,
     { width: boxW - 70 }
   );



// ✅ CERRAR PDF
doc.end();

} catch (err) {
  console.error("❌ Error generando reporte PDF:", err);
  if (doc) doc.end();
}
};

