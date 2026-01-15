// =====================================================
// 🚀 SERVER.JS — CJSystem HelpDesk SaaS
// =====================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
const notificacionesRoutes = require("./routes/notificaciones");
require("dotenv").config();

// =========================
// 🚀 APP (PRIMERO)
// =========================
const app = express();
app.set("trust proxy", true);
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
// 🍪 COOKIES
// =========================
app.use(cookieParser());

// =========================
// 🌐 CORS
// =========================
const allowedOrigins = [
  
  "https://cjsystemhelpdesk.com",
  "https://www.cjsystemhelpdesk.com",
  "https://cjsystem.site",
  "https://www.cjsystem.site",


  "https://cjsystem.netlify.app",
  "https://www.cjsystem.netlify.app",
  /\.netlify\.app$/,

  
  "http://localhost:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];


const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.some(o =>
        o instanceof RegExp ? o.test(origin) : o === origin
      )
    ) {
      return callback(null, true);
    }

    return callback(new Error("CORS no permitido: " + origin));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// =========================
// 📦 BODY PARSER
// =========================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =========================
// 📁 ESTÁTICOS (DESPUÉS DE app)
// =========================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "frontend")));

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
app.use("/api/config-empresa", require("./routes/configEmpresaRoutes"));
app.use("/api/reportes", require("./routes/reportesRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/notificaciones", notificacionesRoutes);


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
