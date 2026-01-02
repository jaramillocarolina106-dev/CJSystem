// ============================================================
// 📌 RUTAS SUPERADMIN — CJSystem HelpDesk SaaS
// ============================================================

const express = require("express");
const router = express.Router();

const Empresa = require("../models/Empresa");
const User = require("../models/User");
const Ticket = require("../models/Ticket");

const verifyToken = require("../middlewares/verifyToken");
const ConfigGlobal = require("../models/ConfigGlobal");
const multer = require("multer");
const path = require("path");

const { getDashboardMetrics } = require("../services/dashboardMetrics");


// ============================================================
// 🔐 Middleware → SOLO SUPERADMIN
// ============================================================
const onlySuperadmin = (req, res, next) => {
  if (req.user.rol !== "superadmin") {
    return res.status(403).json({ msg: "Acceso solo para superadmin" });
  }
  next();
};

// ============================================================
// 📦 MULTER – SUBIDA DE LOGO DEL SISTEMA
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/logos/");
  },
  filename: (req, file, cb) => {
    cb(null, "logo-sistema" + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Formato no permitido"));
  }
});

// ============================================================
// 📊 DASHBOARD GLOBAL SUPERADMIN
// ============================================================
router.get("/dashboard", verifyToken, onlySuperadmin, async (req, res) => {
  try {

    const metrics = await getDashboardMetrics(); // 🔥 GLOBAL

    // Ranking empresas
    const topEmpresas = await Ticket.aggregate([
      { $group: { _id: "$empresa", tickets: { $sum: 1 } } },
      { $sort: { tickets: -1 } },
      { $limit: 5 }
    ]);

    const empresasMap = await Empresa.find({
      _id: { $in: topEmpresas.map(e => e._id) }
    });

    const rankingEmpresas = topEmpresas.map(e => {
      const emp = empresasMap.find(x => String(x._id) === String(e._id));
      return {
        nombre: emp?.nombre || "Empresa eliminada",
        tickets: e.tickets
      };
    });

    // Ranking agentes
    const topAgentes = await Ticket.aggregate([
      { $match: { asignadoA: { $ne: null } } },
      { $group: { _id: "$asignadoA", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    const agentesMap = await User.find({
      _id: { $in: topAgentes.map(a => a._id) }
    });

    const rankingAgentes = topAgentes.map(a => {
      const ag = agentesMap.find(x => String(x._id) === String(a._id));
      return {
        nombre: ag?.nombre || "Agente eliminado",
        total: a.total
      };
    });

    res.json({
      empresas: metrics.empresas,
      admins: metrics.admins,
      agentes: metrics.agentes,
      usuarios: metrics.usuarios,
      tickets: metrics.totalTickets,

      labelsMeses: metrics.labelsMeses,
      meses: metrics.meses,

      topEmpresas: rankingEmpresas,
      topAgentes: rankingAgentes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error dashboard superadmin" });
  }
});


// ============================================================
// 🏢 LISTAR EMPRESAS (CON ADMINS)
// ============================================================
router.get("/empresas", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    const empresas = await Empresa.find().sort({ createdAt: -1 });

    const resultado = await Promise.all(
      empresas.map(async (e) => {

        // ✅ ADMINS
        const adminsCount = await User.countDocuments({
          empresa: e._id,
          rol: "admin"
        });

        // ✅ USUARIOS (todos)
        const usuarios = await User.countDocuments({
          empresa: e._id
        });

        // ✅ AGENTES
        const agentes = await User.countDocuments({
          empresa: e._id,
          rol: "agente"
        });

        // ✅ TICKETS
        const tickets = await Ticket.countDocuments({
          empresa: e._id
        });

        return {
          _id: e._id,
          nombre: e.nombre,
          activa: e.activa,
          admins: adminsCount,   // ✅ nombre explícito
          usuarios,
          agentes,
          tickets,
          ultimaActividad: e.updatedAt
        };
      })
    );

    res.json(resultado);

  } catch (err) {
    console.error("❌ Error listando empresas:", err);
    res.status(500).json({ msg: "Error listando empresas" });
  }
});



// ============================================================
// ➕ CREAR EMPRESA + ADMIN
// ============================================================
router.post("/empresas/crear", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    const { nombre, emailAdmin, passAdmin } = req.body;

    const empresa = await Empresa.create({ nombre });

    await User.create({
      nombre: "Admin",
      email: emailAdmin,
      password: passAdmin,
      rol: "admin",
      empresa: empresa._id
    });

    res.status(201).json({ msg: "Empresa creada correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando empresa" });
  }
});

// ============================================================
// 🔒 ACTIVAR / DESACTIVAR EMPRESA
// ============================================================
router.put("/empresas/:id/toggle", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ msg: "Empresa no encontrada" });

    empresa.activa = !empresa.activa;
    await empresa.save();

    res.json({ msg: "Estado actualizado", activa: empresa.activa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cambiando estado" });
  }
});

// ============================================================
// 🗑️ ELIMINAR EMPRESA (PELIGRO)
// ============================================================
router.delete("/empresas/:id", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    await Empresa.findByIdAndDelete(req.params.id);
    await User.deleteMany({ empresa: req.params.id });
    await Ticket.deleteMany({ empresa: req.params.id });

    res.json({ msg: "Empresa eliminada completamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error eliminando empresa" });
  }
});

// ============================================================
// ⚙️ OBTENER CONFIGURACIÓN GLOBAL
// ============================================================
router.get(
  "/config",
  verifyToken,
  onlySuperadmin,
  async (req, res) => {
    try {
      const config = await ConfigGlobal.getConfig();
      res.json(config);
    } catch (err) {
      console.error("❌ Error obteniendo configuración:", err);
      res.status(500).json({ msg: "Error obteniendo configuración" });
    }
  }
);

router.put(
  "/config",
  verifyToken,
  onlySuperadmin,
  upload.single("logo"), // 👈 AQUÍ ENTRA MULTER
  async (req, res) => {
    try {
      const config = await ConfigGlobal.getConfig();

      config.nombreSistema = req.body.nombreSistema;
      config.modoDefault = req.body.modoDefault;
      config.permitirRegistroEmpresas = req.body.permisoRegistro === "true";
      config.limiteTicketsPorEmpresa = Number(req.body.limiteTickets);

      // 👇 SI SUBIERON LOGO
      if (req.file) {
        config.logoURL = "/logos/" + req.file.filename;
      }

      await config.save();

      res.json({ msg: "Configuración actualizada correctamente" });
    } catch (err) {
      console.error("❌ Error guardando configuración:", err);
      res.status(500).json({ msg: "Error guardando configuración" });
    }
  }
);


// ============================================================
// ⏱ GUARDAR SLA GLOBAL
// ============================================================
router.put("/sla", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    const config = await ConfigGlobal.getConfig();

    config.sla.alta = Number(req.body.alta);
    config.sla.media = Number(req.body.media);
    config.sla.baja = Number(req.body.baja);

    await config.save();

    res.json({ msg: "SLA actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error guardando SLA" });
  }
});

// ============================================================
// 📝 CONFIGURAR LOGS
// ============================================================
router.put("/logs", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    const config = await ConfigGlobal.getConfig();

    config.logsHabilitados = req.body.enabled;

    await config.save();

    res.json({ msg: "Configuración de logs actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error guardando logs" });
  }
});

// ============================================================
// 🔐 CAMBIAR PASSWORD SUPERADMIN
// ============================================================
router.put("/password", verifyToken, onlySuperadmin, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.password = req.body.password;
    await user.save();

    res.json({ msg: "Contraseña actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cambiando contraseña" });
  }
});
// ============================================================
// 🔁 ENTRAR COMO EMPRESA (IMPERSONATION SUPERADMIN)
// ============================================================
router.post(
  "/empresas/:id/entrar",
  verifyToken,
  onlySuperadmin,
  async (req, res) => {
    try {
      const empresaId = req.params.id;

      // ✅ Guardar empresa activa en cookie
     res.cookie("empresaActiva", empresaId, {
  httpOnly: true,
  secure: true,
  sameSite: "none"
});


      res.json({ msg: "Empresa seleccionada correctamente" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error entrando a empresa" });
    }
  }
);

// ============================================================
// 🔙 SALIR DE EMPRESA (SUPERADMIN)
// ============================================================
router.post(
  "/empresas/salir",
  verifyToken,
  onlySuperadmin,
  (req, res) => {
    res.clearCookie("empresaActiva");
    res.json({ msg: "Salida de empresa correcta" });
  }
);

// ============================================================
// 🎨 OBTENER BRANDING DE EMPRESA
// ============================================================
router.get(
  "/empresas/:id/branding",
  verifyToken,
  onlySuperadmin,
  async (req, res) => {
    try {
      const empresa = await Empresa.findById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ msg: "Empresa no encontrada" });
      }

      res.json({
        nombre: empresa.nombre,
        branding: empresa.branding
      });

    } catch (err) {
      console.error("❌ Error obteniendo branding:", err);
      res.status(500).json({ msg: "Error obteniendo branding" });
    }
  }
);
// ============================================================
// 🎨 GUARDAR BRANDING DE EMPRESA
// ============================================================
const storageBranding = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/empresas/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `empresa-${req.params.id}${path.extname(file.originalname)}`
    );
  }
});

const uploadBranding = multer({
  storage: storageBranding,
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.put(
  "/empresas/:id/branding",
  verifyToken,
  onlySuperadmin,
  uploadBranding.single("logo"),
  async (req, res) => {
    try {
      const empresa = await Empresa.findById(req.params.id);
      if (!empresa) {
        return res.status(404).json({ msg: "Empresa no encontrada" });
      }

      empresa.branding.nombreVisible = req.body.nombreVisible;
      empresa.branding.colorPrimario = req.body.colorPrimario;
      empresa.branding.colorSecundario = req.body.colorSecundario;

      if (req.file) {
        empresa.branding.logoPath = `/empresas/${req.file.filename}`;
      }

      await empresa.save();

      res.json({ msg: "Branding actualizado correctamente" });

    } catch (err) {
      console.error("❌ Error guardando branding:", err);
      res.status(500).json({ msg: "Error guardando branding" });
    }
  }
);



module.exports = router;
