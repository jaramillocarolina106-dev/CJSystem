// =====================================================
// 🚀 SERVER.JS — CJSystem HelpDesk SaaS (ESTABLE)
// =====================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();
const configEmpresaRoutes = require("./routes/configEmpresaRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// =========================
// 🚀 APP
// =========================
const app = express();

// =========================
// 🛡️ SEGURIDAD
// =========================
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
  })
);

// =========================
// ⏱️ RATE LIMIT
// =========================
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
  })
);

// =========================
// 🍪 COOKIES (ANTES DE RUTAS)
// =========================
app.use(cookieParser());

// =========================
// 🌐 CORS (UNA SOLA VEZ)
// =========================
app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// =========================
// 📦 BODY PARSER (UNA SOLA VEZ)
// =========================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =========================
// 🔌 RUTAS API
// =========================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/empresas", require("./routes/empresaRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/superadmin", require("./routes/superadminRoutes"));
app.use("/api/audit", require("./routes/auditRoutes"));
app.use("/api/branding", require("./routes/brandingRoutes"));
app.use("/api/usuarios", require("./routes/usuariosRoutes"));
app.use("/api/config-empresa", configEmpresaRoutes);
app.use("/api/reportes", require("./routes/reportesRoutes"));
app.use("/api/dashboard", dashboardRoutes);


// =========================
// 📁 ESTÁTICOS
// =========================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "frontend")));


// =========================
// 🧪 PING
// =========================
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, msg: "CJSystem backend activo" });
});

// =========================
// 🗄️ MONGODB
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("📦 MongoDB conectado ✔"))
  .catch(err => console.error("❌ MongoDB error:", err));

// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 CJSystem backend corriendo en http://localhost:${PORT}`);
});
